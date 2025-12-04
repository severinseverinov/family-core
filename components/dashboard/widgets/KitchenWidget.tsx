"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ShoppingBag,
  Plus,
  Trash2,
  ScanLine,
  Upload,
  Minus,
  Apple,
  Milk,
  SprayCan,
  Coffee,
  Carrot,
  Utensils,
  Package,
  Wallet,
  ShoppingCart,
  CheckSquare,
  Square,
  Maximize2,
  Share2,
  QrCode,
  Store,
  Flame,
  ArrowUpDown,
  Calendar as CalendarIcon,
  Edit2,
} from "lucide-react";
import { toast } from "sonner";
import {
  getInventoryAndBudget,
  addInventoryItem,
  deleteInventoryItem,
  updateItemQuantity,
  updateBudget,
  addToShoppingList,
  toggleShoppingItem,
  deleteShoppingItem,
  clearCompletedShoppingItems,
  toggleShoppingItemUrgency,
  analyzeReceipt, // <-- YENİ
  saveReceipt, // <-- YENİ
} from "@/app/actions/kitchen";
import { useTranslations, useLocale } from "next-intl";
import QRCode from "react-qr-code";
import { useTheme } from "next-themes";

// ... (İkonlar ve Helperlar aynı)
const CATEGORY_ICONS: Record<string, any> = {
  gıda: Utensils,
  yiyecek: Utensils,
  sebze: Carrot,
  meyve: Apple,
  süt: Milk,
  "süt ürünleri": Milk,
  kahvaltılık: Coffee,
  temizlik: SprayCan,
  genel: Package,
  diğer: ShoppingBag,
};
const getCategoryIcon = (category: string) => {
  const normalized = category?.toLowerCase().trim() || "diğer";
  if (CATEGORY_ICONS[normalized]) return CATEGORY_ICONS[normalized];
  const key = Object.keys(CATEGORY_ICONS).find(k => normalized.includes(k));
  return key ? CATEGORY_ICONS[key] : CATEGORY_ICONS["diğer"];
};
const getMarketColor = (marketName: string | null) => {
  if (!marketName)
    return "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400";
  const colors = [
    "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800",
    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-800",
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800",
    "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300 border-pink-200 dark:border-pink-800",
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
    "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-800",
  ];
  let hash = 0;
  for (let i = 0; i < marketName.length; i++)
    hash = marketName.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

export function KitchenWidget({ userRole }: { userRole: string }) {
  const t = useTranslations("Kitchen");
  const tCommon = useTranslations("Common");
  const locale = useLocale();
  const { resolvedTheme } = useTheme();

  const [mainTab, setMainTab] = useState<"inventory" | "shopping_list">(
    "inventory"
  );
  const [inventory, setInventory] = useState<any[]>([]);
  const [shoppingList, setShoppingList] = useState<any[]>([]);
  const [budget, setBudget] = useState(0);
  const [spent, setSpent] = useState(0);

  const [sortBy, setSortBy] = useState<"date" | "urgency" | "market">(
    "urgency"
  );

  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isBudgetOpen, setIsBudgetOpen] = useState(false);
  const [isShoppingModeOpen, setIsShoppingModeOpen] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);

  // YENİ: Fiş Önizleme Modalı
  const [isReceiptReviewOpen, setIsReceiptReviewOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  const [activeInvTab, setActiveInvTab] = useState("ALL");
  const [qrData, setQrData] = useState("");

  const isAdmin = ["owner", "admin"].includes(userRole);

  const loadData = async () => {
    const res = await getInventoryAndBudget();
    if (res.items) {
      setInventory(res.items);
      setShoppingList(res.shoppingList || []);
      setBudget(res.budget);
      setSpent(res.spent);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- FİŞ YÜKLEME VE ANALİZ ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsScanning(true);
    const fd = new FormData();
    fd.append("receipt", file);

    try {
      // 1. Sadece Analiz Et (Kaydetme)
      const res = await analyzeReceipt(fd);

      if (res?.error) {
        toast.error(res.error);
      } else {
        // 2. Sonucu State'e at ve Onay Penceresini Aç
        setReceiptData(res.data);
        setIsReceiptReviewOpen(true);
      }
    } catch {
      toast.error(tCommon("error"));
    } finally {
      setIsScanning(false);
      e.target.value = "";
    }
  };

  // --- FİŞ ONAYLAMA VE KAYDETME ---
  const handleConfirmReceipt = async () => {
    if (!receiptData) return;
    setIsScanning(true); // Loading göster
    try {
      await saveReceipt(receiptData);
      toast.success(tCommon("success"));
      setIsReceiptReviewOpen(false);
      setReceiptData(null);
      loadData();
    } catch {
      toast.error(tCommon("error"));
    } finally {
      setIsScanning(false);
    }
  };

  // Fiş Düzenleme (Miktar/Fiyat değiştirme)
  const updateReceiptItem = (index: number, field: string, value: any) => {
    const newData = { ...receiptData };
    newData.items[index][field] = value;

    // Toplam tutarı güncelle (Basitçe)
    if (field === "unit_price" || field === "quantity") {
      let newTotal = 0;
      newData.items.forEach((item: any) => {
        newTotal +=
          parseFloat(item.unit_price || 0) * parseFloat(item.quantity || 0);
      });
      // Eğer AI toplamı bulduysa onu bozmayalım ama sapma çoksa uyarabiliriz.
      // Şimdilik sadece item'ı güncelleyelim.
    }

    setReceiptData(newData);
  };

  // ... (Diğer handlerlar - Aynı) ...
  const sortedShoppingList = useMemo(() => {
    const list = [...shoppingList];
    list.sort((a, b) => Number(a.is_checked) - Number(b.is_checked));
    list.sort((a, b) => {
      if (a.is_checked && b.is_checked) return 0;
      if (sortBy === "urgency") {
        if (a.is_urgent !== b.is_urgent) return a.is_urgent ? -1 : 1;
      } else if (sortBy === "market") {
        if (!a.market_name) return 1;
        if (!b.market_name) return -1;
        return a.market_name.localeCompare(b.market_name);
      } else if (sortBy === "date") {
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }
      return 0;
    });
    return list;
  }, [shoppingList, sortBy]);

  const handleToggleUrgency = async (id: string, current: boolean) => {
    setShoppingList(prev =>
      prev.map(i => (i.id === id ? { ...i, is_urgent: !current } : i))
    );
    await toggleShoppingItemUrgency(id, !current);
    loadData();
  };
  const handleShareList = () => {
    const activeItems = shoppingList.filter(i => !i.is_checked);
    if (activeItems.length === 0) {
      toast.error(t("empty"));
      return;
    }
    const listText = activeItems
      .map(
        i => `- ${i.product_name} ${i.market_name ? `(${i.market_name})` : ""}`
      )
      .join("\n");
    setQrData(listText);
    setIsQrOpen(true);
  };
  const handleManualAdd = async (fd: FormData) => {
    const res = await addInventoryItem(fd);
    if (res?.error) toast.error(tCommon("error"));
    else {
      toast.success(tCommon("success"));
      setIsManualOpen(false);
      loadData();
    }
  };
  const handleBudgetUpdate = async (fd: FormData) => {
    const amount = parseFloat(fd.get("budget") as string);
    const res = await updateBudget(amount);
    if (res?.error) toast.error(tCommon("error"));
    else {
      toast.success(tCommon("success"));
      setIsBudgetOpen(false);
      loadData();
    }
  };
  const handleQuantityChange = async (id: string, change: number) => {
    setInventory(prev =>
      prev.map(i =>
        i.id === id ? { ...i, quantity: Math.max(0, i.quantity + change) } : i
      )
    );
    const res = await updateItemQuantity(id, change);
    if (res?.error) {
      toast.error(res.error);
      loadData();
    } else {
      loadData();
    }
  };
  const handleDeleteInventory = async (id: string) => {
    if (!confirm(tCommon("delete") + "?")) return;
    await deleteInventoryItem(id);
    loadData();
  };
  const handleAddShoppingItem = async (fd: FormData) => {
    const res = await addToShoppingList(fd);
    if (res?.error) toast.error(res.error);
    else {
      toast.success(tCommon("success"));
      (document.getElementById("shopInput") as HTMLInputElement).value = "";
      (document.getElementById("marketInput") as HTMLInputElement).value = "";
      loadData();
    }
  };
  const handleToggleShoppingItem = async (
    id: string,
    currentStatus: boolean
  ) => {
    setShoppingList(prev =>
      prev.map(i => (i.id === id ? { ...i, is_checked: !currentStatus } : i))
    );
    await toggleShoppingItem(id, !currentStatus);
    loadData();
  };
  const handleDeleteShoppingItem = async (id: string) => {
    setShoppingList(prev => prev.filter(i => i.id !== id));
    await deleteShoppingItem(id);
  };
  const handleClearCompleted = async () => {
    await clearCompletedShoppingItems();
    loadData();
  };

  const groupedInventory = useMemo(() => {
    const groups: Record<string, any[]> = {};
    inventory.forEach(item => {
      let cat = item.category || "Genel";
      cat = cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return Object.keys(groups)
      .sort()
      .reduce((obj: any, key) => {
        obj[key] = groups[key];
        return obj;
      }, {});
  }, [inventory]);
  const invTabs = useMemo(
    () => ["ALL", ...Object.keys(groupedInventory)],
    [groupedInventory]
  );
  const displayedInventory = useMemo(() => {
    if (activeInvTab === "ALL") return groupedInventory;
    return { [activeInvTab]: groupedInventory[activeInvTab] };
  }, [activeInvTab, groupedInventory]);

  const percentage = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const barColor =
    percentage > 90
      ? "bg-red-500"
      : percentage > 70
      ? "bg-yellow-500"
      : "bg-green-500";
  const qrBgColor = resolvedTheme === "dark" ? "#111827" : "#ffffff";
  const qrFgColor = resolvedTheme === "dark" ? "#ffffff" : "#000000";
  const getProductName = (item: any) =>
    locale !== "tr" && item.product_name_en
      ? item.product_name_en
      : item.product_name;

  return (
    <Card className="h-full flex flex-col border-orange-100 bg-orange-50/30 dark:bg-orange-900/10 dark:border-orange-900/30 shadow-sm relative">
      <CardHeader className="pb-2 flex flex-col gap-3 space-y-0">
        <div className="flex items-center justify-between w-full">
          <div className="flex gap-2 bg-white/50 p-1 rounded-lg dark:bg-gray-800/50">
            <button
              onClick={() => setMainTab("inventory")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-2 transition-all",
                mainTab === "inventory"
                  ? "bg-white shadow text-orange-600 dark:bg-gray-700 dark:text-orange-400"
                  : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              )}
            >
              <ShoppingBag className="h-3.5 w-3.5" /> {t("title")}
            </button>
            <button
              onClick={() => setMainTab("shopping_list")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-2 transition-all",
                mainTab === "shopping_list"
                  ? "bg-white shadow text-blue-600 dark:bg-gray-700 dark:text-blue-400"
                  : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              )}
            >
              <ShoppingCart className="h-3.5 w-3.5" /> List (
              {shoppingList.filter(i => !i.is_checked).length})
            </button>
          </div>

          {mainTab === "inventory" && (
            <div className="flex gap-1">
              {isAdmin && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-orange-600 hover:bg-orange-100 dark:text-orange-400 dark:hover:bg-orange-900/30"
                  onClick={() => setIsBudgetOpen(true)}
                >
                  <Wallet className="h-4 w-4" />
                </Button>
              )}
              {isAdmin && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 hover:bg-orange-100 dark:hover:bg-orange-900/30"
                  onClick={() => setIsManualOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
          {mainTab === "shopping_list" && (
            <div className="flex gap-1 items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                    title={t("sortBy")}
                  >
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-40">
                  <DropdownMenuItem
                    onClick={() => setSortBy("urgency")}
                    className={cn(
                      sortBy === "urgency" &&
                        "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                    )}
                  >
                    <Flame className="h-4 w-4 mr-2" /> {t("sortUrgency")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSortBy("market")}
                    className={cn(
                      sortBy === "market" &&
                        "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                    )}
                  >
                    <Store className="h-4 w-4 mr-2" /> {t("sortMarket")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSortBy("date")}
                    className={cn(
                      sortBy === "date" &&
                        "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                    )}
                  >
                    <CalendarIcon className="h-4 w-4 mr-2" /> {t("sortDate")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                onClick={handleShareList}
                title={t("shareList")}
              >
                <Share2 className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-blue-600 dark:text-blue-400"
                onClick={() => setIsShoppingModeOpen(true)}
                title="Alışveriş Modu"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {mainTab === "inventory" && budget > 0 && (
          <div className="w-full space-y-1">
            <div className="flex justify-between text-[10px] font-medium text-gray-500 dark:text-gray-400">
              <span>
                {t("spent")}:{" "}
                {spent.toLocaleString(locale === "tr" ? "tr-TR" : "de-DE")}₺
              </span>
              <span>
                {t("limit")}:{" "}
                {budget.toLocaleString(locale === "tr" ? "tr-TR" : "de-DE")}₺
              </span>
            </div>
            <div className="h-2 w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${barColor}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden flex flex-col gap-3 p-4 pt-0">
        {/* ENVANTER İÇERİĞİ */}
        {mainTab === "inventory" && (
          <>
            {inventory.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {invTabs.map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveInvTab(tab)}
                    className={cn(
                      "px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap border transition-colors",
                      activeInvTab === tab
                        ? "bg-orange-600 text-white border-orange-600 dark:bg-orange-600"
                        : "bg-white text-gray-600 border-gray-200 hover:bg-orange-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700"
                    )}
                  >
                    {tab === "ALL" ? t("tabAll") : tab}
                  </button>
                ))}
              </div>
            )}
            <div className="flex-1 overflow-auto space-y-4 pr-1 scrollbar-thin">
              {loading ? (
                <p className="text-xs text-center text-gray-400 py-4">
                  {tCommon("loading")}
                </p>
              ) : inventory.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-xs flex flex-col items-center">
                  <ShoppingBag className="h-8 w-8 mb-2 opacity-20" />
                  <p>{t("empty")}</p>
                </div>
              ) : (
                Object.entries(displayedInventory as Record<string, any[]>).map(
                  ([category, categoryItems]) => {
                    const Icon = getCategoryIcon(category);
                    if (!categoryItems) return null;
                    return (
                      <div key={category} className="space-y-1">
                        {activeInvTab === "ALL" && (
                          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase px-1 py-1">
                            <Icon className="h-3 w-3" />
                            {category}
                          </div>
                        )}
                        <div className="space-y-1">
                          {categoryItems.map(item => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between p-2 bg-white rounded-lg border shadow-sm dark:bg-gray-900 dark:border-gray-800 group hover:border-orange-200 dark:hover:border-orange-900 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-orange-50 rounded-md dark:bg-orange-900/20 text-orange-600 dark:text-orange-400">
                                  <Icon className="h-4 w-4" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                    {getProductName(item)}
                                  </p>
                                  <div className="flex gap-2 text-[10px] text-gray-500 dark:text-gray-400 capitalize">
                                    <span>
                                      {item.quantity} {item.unit}
                                    </span>
                                    {item.last_price > 0 && (
                                      <span className="text-green-600 dark:text-green-400">
                                        {item.last_price}₺
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() =>
                                    handleQuantityChange(item.id, -1)
                                  }
                                  className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-600 text-gray-600 text-xs dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-red-900/50 dark:hover:text-red-400"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                {isAdmin && (
                                  <button
                                    onClick={() =>
                                      handleQuantityChange(item.id, 1)
                                    }
                                    className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 hover:bg-green-100 hover:text-green-600 text-gray-600 text-xs dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-green-900/50 dark:hover:text-green-400"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                )}
                                {isAdmin && (
                                  <button
                                    onClick={() =>
                                      handleDeleteInventory(item.id)
                                    }
                                    className="text-gray-300 hover:text-red-500 p-1 dark:text-gray-600 dark:hover:text-red-400"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                )
              )}
            </div>
            <div className="mt-auto pt-2 border-t border-orange-100 dark:border-orange-900/30">
              <div className="relative group">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  disabled={isScanning}
                />
                <Button
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white shadow-sm transition-all group-active:scale-[0.98]"
                  disabled={isScanning}
                >
                  {isScanning ? (
                    <>
                      <ScanLine className="h-4 w-4 mr-2 animate-pulse" />{" "}
                      {t("scanning")}
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" /> {t("scanReceipt")}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}

        {/* ALIŞVERİŞ LİSTESİ GÖRÜNÜMÜ */}
        {mainTab === "shopping_list" && (
          <div className="flex flex-col h-full">
            {/* ... (Form kısmı aynı) */}
            <form
              action={async fd => {
                await handleAddShoppingItem(fd);
                (
                  document.getElementById("shopInput") as HTMLInputElement
                ).value = "";
                (
                  document.getElementById("marketInput") as HTMLInputElement
                ).value = "";
              }}
              className="flex gap-2 mb-4"
            >
              <Input
                id="shopInput"
                name="name"
                placeholder={t("productName")}
                required
                className="h-9 text-sm dark:bg-gray-800 dark:border-gray-700 flex-[2]"
              />
              <Input
                id="marketInput"
                name="marketName"
                list="markets"
                placeholder={t("marketPlaceholder")}
                className="h-9 text-sm dark:bg-gray-800 dark:border-gray-700 flex-1"
              />
              <datalist id="markets">
                <option value="Migros" />
                <option value="BİM" />
                <option value="A101" />
                <option value="Şok" />
                <option value="CarrefourSA" />
                <option value="Pazar" />
                <option value="Manav" />
              </datalist>
              <Button
                type="submit"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </form>

            <div className="flex-1 overflow-auto space-y-2 pr-1">
              {shoppingList.length === 0 && (
                <div className="text-center text-xs text-gray-400 py-6">
                  Liste boş.
                </div>
              )}
              {sortedShoppingList.map(item => (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-lg border transition-all",
                    item.is_checked
                      ? "bg-gray-50 border-gray-100 opacity-60 dark:bg-gray-800/50 dark:border-gray-800"
                      : item.is_urgent
                      ? "bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-900"
                      : "bg-white border-blue-100 shadow-sm dark:bg-gray-900 dark:border-gray-800"
                  )}
                >
                  <div
                    className="flex items-center gap-3 cursor-pointer flex-1"
                    onClick={() =>
                      handleToggleShoppingItem(item.id, item.is_checked)
                    }
                  >
                    {item.is_checked ? (
                      <CheckSquare className="h-5 w-5 text-green-500" />
                    ) : (
                      <Square className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    )}
                    <div className="flex flex-col">
                      <span
                        className={cn(
                          "text-sm font-medium",
                          item.is_checked
                            ? "line-through text-gray-500 dark:text-gray-500"
                            : "text-gray-900 dark:text-gray-100"
                        )}
                      >
                        {item.product_name}
                        {item.is_urgent && (
                          <span className="text-xs text-red-500 ml-2 font-bold">
                            🔥 Acil
                          </span>
                        )}
                      </span>
                      {item.market_name && (
                        <span
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-sm w-fit mt-0.5 border",
                            getMarketColor(item.market_name)
                          )}
                        >
                          <Store className="h-2.5 w-2.5 inline mr-1 mb-0.5" />
                          {item.market_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!item.is_checked && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className={cn(
                          "h-7 w-7",
                          item.is_urgent
                            ? "text-red-500"
                            : "text-gray-300 hover:text-red-400"
                        )}
                        onClick={() =>
                          handleToggleUrgency(item.id, item.is_urgent)
                        }
                        title={t("markUrgent")}
                      >
                        <Flame
                          className={cn(
                            "h-4 w-4",
                            item.is_urgent && "fill-current"
                          )}
                        />
                      </Button>
                    )}
                    <button
                      onClick={() => handleDeleteShoppingItem(item.id)}
                      className="text-gray-300 hover:text-red-500 p-1 dark:text-gray-600 dark:hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {shoppingList.some(i => i.is_checked) && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                onClick={handleClearCompleted}
              >
                Tamamlananları Temizle
              </Button>
            )}
          </div>
        )}

        {/* --- MODALLAR --- */}

        {/* YENİ: FİŞ ONAY/DÜZENLEME MODALI */}
        <Dialog
          open={isReceiptReviewOpen}
          onOpenChange={setIsReceiptReviewOpen}
        >
          <DialogContent className="sm:max-w-lg h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Fiş Önizleme</DialogTitle>
            </DialogHeader>

            {receiptData && (
              <div className="flex-1 overflow-auto space-y-4 p-1">
                <div className="flex justify-between items-center bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
                  <Input
                    value={receiptData.shop_name}
                    onChange={e =>
                      setReceiptData({
                        ...receiptData,
                        shop_name: e.target.value,
                      })
                    }
                    className="font-bold border-none bg-transparent w-1/2"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Toplam:</span>
                    <Input
                      type="number"
                      value={receiptData.total_amount}
                      onChange={e =>
                        setReceiptData({
                          ...receiptData,
                          total_amount: parseFloat(e.target.value),
                        })
                      }
                      className="font-bold w-20 h-8 text-right"
                    />
                    <span className="text-sm font-bold">TL</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-500 uppercase px-1">
                    Tespit Edilen Ürünler
                  </p>
                  {receiptData.items.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2 border rounded bg-white dark:bg-gray-900 dark:border-gray-700"
                    >
                      <div className="flex-1">
                        <Input
                          value={item.name}
                          onChange={e =>
                            updateReceiptItem(idx, "name", e.target.value)
                          }
                          className="h-8 text-sm border-none shadow-none p-0 focus-visible:ring-0"
                        />
                        <div className="flex gap-2 text-xs text-gray-400">
                          <input
                            className="bg-transparent w-12 border-b border-gray-200 focus:outline-none"
                            value={item.quantity}
                            type="number"
                            onChange={e =>
                              updateReceiptItem(
                                idx,
                                "quantity",
                                parseFloat(e.target.value)
                              )
                            }
                          />
                          <span>{item.unit || "adet"}</span>
                        </div>
                      </div>
                      <div className="w-20">
                        <Input
                          type="number"
                          step="0.01"
                          value={item.unit_price || 0}
                          onChange={e =>
                            updateReceiptItem(
                              idx,
                              "unit_price",
                              parseFloat(e.target.value)
                            )
                          }
                          className="h-8 text-xs text-right"
                          placeholder="Fiyat"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-red-400"
                        onClick={() => {
                          const newData = { ...receiptData };
                          newData.items.splice(idx, 1);
                          setReceiptData(newData);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsReceiptReviewOpen(false)}
              >
                {tCommon("cancel")}
              </Button>
              <Button
                onClick={handleConfirmReceipt}
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={isScanning}
              >
                {isScanning ? t("scanning") : "Onayla ve Kaydet"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ... Diğer Modallar (Manuel Ekle, Bütçe, Alışveriş Modu, QR) aynı kalacak ... */}
        <Dialog open={isManualOpen} onOpenChange={setIsManualOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("manualAdd")}</DialogTitle>
            </DialogHeader>
            <form action={handleManualAdd} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium">
                  {t("productName")}
                </label>
                <Input name="name" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">{t("amount")}</label>
                  <Input name="quantity" type="number" step="0.1" required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">{t("unit")}</label>
                  <select
                    name="unit"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
                  >
                    <option value="adet">Adet</option>
                    <option value="kg">Kg</option>
                    <option value="litre">Litre</option>
                    <option value="paket">Paket</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">{t("price")}</label>
                <Input name="price" type="number" step="0.01" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">{t("category")}</label>
                <Input list="categories" name="category" required />
                <datalist id="categories">
                  <option value="Gıda" />
                  <option value="Temizlik" />
                </datalist>
              </div>
              <Button type="submit" className="w-full bg-orange-600 text-white">
                {tCommon("save")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        <Dialog open={isBudgetOpen} onOpenChange={setIsBudgetOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("budget")}</DialogTitle>
            </DialogHeader>
            <form action={handleBudgetUpdate} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium">{t("limit")}</label>
                <Input
                  name="budget"
                  type="number"
                  defaultValue={budget}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                {tCommon("update")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        <Dialog open={isShoppingModeOpen} onOpenChange={setIsShoppingModeOpen}>
          <DialogContent className="sm:max-w-md h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <ShoppingCart className="h-6 w-6 text-blue-600" /> Alışveriş
                Modu
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-auto py-4 space-y-4">
              {shoppingList.length === 0 && (
                <p className="text-center text-gray-500">
                  Listeniz boş, iyi alışverişler!
                </p>
              )}
              {shoppingList.map(item => (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer",
                    item.is_checked
                      ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900"
                      : item.is_urgent
                      ? "bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-900"
                      : "bg-white border-gray-200 dark:bg-gray-900 dark:border-gray-700"
                  )}
                  onClick={() =>
                    handleToggleShoppingItem(item.id, item.is_checked)
                  }
                >
                  {item.is_checked ? (
                    <CheckSquare className="h-8 w-8 text-green-600" />
                  ) : (
                    <Square className="h-8 w-8 text-gray-300 dark:text-gray-600" />
                  )}
                  <div className="flex flex-col">
                    <span
                      className={cn(
                        "text-lg font-medium",
                        item.is_checked
                          ? "line-through text-gray-400 dark:text-gray-500"
                          : "text-gray-900 dark:text-gray-100"
                      )}
                    >
                      {item.product_name}
                      {item.is_urgent && (
                        <span className="text-xs text-red-500 ml-2 font-bold">
                          🔥
                        </span>
                      )}
                    </span>
                    {item.market_name && (
                      <span
                        className={cn(
                          "text-xs px-2 py-0.5 rounded-sm w-fit mt-1 border",
                          getMarketColor(item.market_name)
                        )}
                      >
                        <Store className="h-3 w-3 inline mr-1 mb-0.5" />
                        {item.market_name}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-center mt-auto pt-2">
              <Button
                className="w-full bg-blue-600 h-12 text-lg text-white"
                onClick={() => setIsShoppingModeOpen(false)}
              >
                Kapat
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={isQrOpen} onOpenChange={setIsQrOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-center flex items-center justify-center gap-2">
                <QrCode className="h-5 w-5" />
                {t("qrTitle")}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center p-4 space-y-4">
              <div className="bg-white p-4 rounded-lg shadow-sm border dark:bg-gray-900 dark:border-gray-800">
                <QRCode
                  value={qrData}
                  size={200}
                  bgColor={qrBgColor}
                  fgColor={qrFgColor}
                />
              </div>
              <div className="text-center space-y-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t("qrHelp")}
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
