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
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  getInventoryAndBudget,
  addInventoryItem,
  deleteInventoryItem,
  updateItemQuantity,
  scanReceipt,
  updateBudget,
  addToShoppingList,
  toggleShoppingItem,
  deleteShoppingItem,
  clearCompletedShoppingItems,
} from "@/app/actions/kitchen";
import { useTranslations, useLocale } from "next-intl";

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
  const key = Object.keys(CATEGORY_ICONS).find(k => normalized.includes(k));
  return key ? CATEGORY_ICONS[key] : CATEGORY_ICONS["diğer"];
};

export function KitchenWidget({ userRole }: { userRole: string }) {
  const t = useTranslations("Kitchen");
  const tCommon = useTranslations("Common");
  const locale = useLocale();

  // Ana Sekme: 'inventory' | 'shopping_list'
  const [mainTab, setMainTab] = useState<"inventory" | "shopping_list">(
    "inventory"
  );

  const [inventory, setInventory] = useState<any[]>([]);
  const [shoppingList, setShoppingList] = useState<any[]>([]);
  const [budget, setBudget] = useState(0);
  const [spent, setSpent] = useState(0);

  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isBudgetOpen, setIsBudgetOpen] = useState(false);
  const [isShoppingModeOpen, setIsShoppingModeOpen] = useState(false); // Büyük ekran modu

  // Envanter Filtreleme
  const [activeInvTab, setActiveInvTab] = useState("ALL");

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

  // --- ENVANTER MANTIKLARI ---
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

  // --- HANDLERLAR ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsScanning(true);
    const fd = new FormData();
    fd.append("receipt", file);
    try {
      const res = await scanReceipt(fd);
      if (res?.error) toast.error(tCommon("error"));
      else {
        toast.success(tCommon("success"));
        loadData();
      }
    } catch {
      toast.error(tCommon("error"));
    } finally {
      setIsScanning(false);
      e.target.value = "";
    }
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

  const handleQuantityChange = async (id: string, change: number) => {
    setInventory(prev =>
      prev.map(i =>
        i.id === id ? { ...i, quantity: Math.max(0, i.quantity + change) } : i
      )
    );
    await updateItemQuantity(id, change);
    loadData();
  };

  const handleDeleteInventory = async (id: string) => {
    if (!confirm(tCommon("delete") + "?")) return;
    await deleteInventoryItem(id);
    loadData();
  };

  // --- ALIŞVERİŞ LİSTESİ HANDLERLARI ---
  const handleAddShoppingItem = async (fd: FormData) => {
    const res = await addToShoppingList(fd);
    if (res?.error) toast.error(tCommon("error"));
    else {
      toast.success(tCommon("success"));
      loadData();
    }
  };

  const handleToggleShoppingItem = async (
    id: string,
    currentStatus: boolean
  ) => {
    // Optimistic Update
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
    if (!confirm("Tamamlananları sil?")) return;
    await clearCompletedShoppingItems();
    loadData();
  };

  // İsim Gösterimi (Dil Desteği)
  const getProductName = (item: any) =>
    locale !== "tr" && item.product_name_en
      ? item.product_name_en
      : item.product_name;

  return (
    <Card className="h-full flex flex-col border-orange-100 bg-orange-50/30 dark:bg-orange-900/10 dark:border-orange-900/30 shadow-sm relative">
      {/* ÜST BAŞLIK VE SEKME SEÇİMİ */}
      <CardHeader className="pb-2 flex flex-col gap-3 space-y-0">
        <div className="flex items-center justify-between">
          <div className="flex gap-2 bg-white/50 p-1 rounded-lg dark:bg-gray-800/50">
            <button
              onClick={() => setMainTab("inventory")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-2 transition-all",
                mainTab === "inventory"
                  ? "bg-white shadow text-orange-600"
                  : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
              )}
            >
              <ShoppingBag className="h-3.5 w-3.5" /> {t("title")}
            </button>
            <button
              onClick={() => setMainTab("shopping_list")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-2 transition-all",
                mainTab === "shopping_list"
                  ? "bg-white shadow text-blue-600"
                  : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
              )}
            >
              <ShoppingCart className="h-3.5 w-3.5" /> Alışveriş (
              {shoppingList.filter(i => !i.is_checked).length})
            </button>
          </div>

          {/* Butonlar (Sadece Inventory'de) */}
          {mainTab === "inventory" && (
            <div className="flex gap-1">
              {isAdmin && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-orange-600"
                  onClick={() => setIsBudgetOpen(true)}
                >
                  <Wallet className="h-4 w-4" />
                </Button>
              )}
              {isAdmin && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => setIsManualOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
          {/* Butonlar (Sadece Shopping List'de) */}
          {mainTab === "shopping_list" && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-blue-600"
              onClick={() => setIsShoppingModeOpen(true)}
              title="Alışveriş Modu"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Bütçe Barı (Sadece Inventory'de) */}
        {mainTab === "inventory" && budget > 0 && (
          <div className="w-full space-y-1">
            <div className="flex justify-between text-[10px] font-medium text-gray-500">
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
                className={`h-full transition-all duration-500 ${
                  budget > 0 && spent / budget > 0.9
                    ? "bg-red-500"
                    : "bg-green-500"
                }`}
                style={{ width: `${Math.min((spent / budget) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
      </CardHeader>

      {/* --- İÇERİK ALANI --- */}
      <CardContent className="flex-1 overflow-hidden flex flex-col gap-3 p-4 pt-0">
        {/* 1. ENVANTER GÖRÜNÜMÜ */}
        {mainTab === "inventory" && (
          <>
            {/* Alt Sekmeler (Kategoriler) */}
            {inventory.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {invTabs.map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveInvTab(tab)}
                    className={cn(
                      "px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap border",
                      activeInvTab === tab
                        ? "bg-orange-600 text-white"
                        : "bg-white text-gray-600"
                    )}
                  >
                    {tab === "ALL" ? t("tabAll") : tab}
                  </button>
                ))}
              </div>
            )}

            {/* Liste */}
            <div className="flex-1 overflow-auto space-y-4 pr-1 scrollbar-thin">
              {loading ? (
                <p className="text-xs text-center text-gray-400 py-4">
                  {tCommon("loading")}
                </p>
              ) : inventory.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-xs">
                  <p>{t("empty")}</p>
                </div>
              ) : (
                Object.entries(displayedGroups as Record<string, any[]>).map(
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
                              className="flex items-center justify-between p-2 bg-white rounded-lg border shadow-sm dark:bg-gray-900"
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-orange-50 rounded-md text-orange-600">
                                  <Icon className="h-4 w-4" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium">
                                    {getProductName(item)}
                                  </p>
                                  <div className="flex gap-2 text-[10px] text-gray-500">
                                    <span>
                                      {item.quantity} {item.unit}
                                    </span>
                                    {item.last_price > 0 && (
                                      <span className="text-green-600">
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
                                  className="w-6 h-6 rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-600 text-xs"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                {isAdmin && (
                                  <button
                                    onClick={() =>
                                      handleQuantityChange(item.id, 1)
                                    }
                                    className="w-6 h-6 rounded-full bg-gray-100 hover:bg-green-100 hover:text-green-600 text-xs"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                )}
                                {isAdmin && (
                                  <button
                                    onClick={() =>
                                      handleDeleteInventory(item.id)
                                    }
                                    className="text-gray-300 hover:text-red-500 p-1"
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

            {/* Fiş Yükleme */}
            <div className="mt-auto pt-2 border-t border-orange-100">
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
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white"
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

        {/* 2. ALIŞVERİŞ LİSTESİ GÖRÜNÜMÜ */}
        {mainTab === "shopping_list" && (
          <div className="flex flex-col h-full">
            {/* Hızlı Ekle */}
            <form action={handleAddShoppingItem} className="flex gap-2 mb-4">
              <Input
                name="name"
                placeholder="Eklenecek ürün..."
                required
                className="h-9 text-sm"
              />
              <Button
                type="submit"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </form>

            {/* Liste */}
            <div className="flex-1 overflow-auto space-y-2 pr-1">
              {shoppingList.length === 0 && (
                <div className="text-center text-xs text-gray-400 py-6">
                  Liste boş.
                </div>
              )}
              {shoppingList.map(item => (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-lg border transition-all",
                    item.is_checked
                      ? "bg-gray-50 border-gray-100 opacity-60"
                      : "bg-white border-blue-100 shadow-sm"
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
                      <Square className="h-5 w-5 text-gray-400" />
                    )}
                    <span
                      className={cn(
                        "text-sm",
                        item.is_checked && "line-through text-gray-500"
                      )}
                    >
                      {item.product_name}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteShoppingItem(item.id)}
                    className="text-gray-300 hover:text-red-500 p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Alt Buton */}
            {shoppingList.some(i => i.is_checked) && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-xs text-red-500 hover:bg-red-50"
                onClick={handleClearCompleted}
              >
                Tamamlananları Temizle
              </Button>
            )}
          </div>
        )}

        {/* --- MODALLAR --- */}

        {/* Manuel Ekle (Envanter) */}
        <Dialog open={isManualOpen} onOpenChange={setIsManualOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("manualAdd")}</DialogTitle>
            </DialogHeader>
            <form action={handleManualAdd} className="space-y-4">
              <Input name="name" placeholder={t("productName")} required />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  name="quantity"
                  type="number"
                  step="0.1"
                  placeholder="1"
                  required
                />
                <select
                  name="unit"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="adet">Adet</option>
                  <option value="kg">Kg</option>
                  <option value="lt">Litre</option>
                </select>
              </div>
              <Input
                list="categories"
                name="category"
                placeholder="Kategori"
                required
              />
              <datalist id="categories">
                <option value="Gıda" />
                <option value="Temizlik" />
              </datalist>
              <Button type="submit" className="w-full bg-orange-600">
                {tCommon("save")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Bütçe */}
        <Dialog open={isBudgetOpen} onOpenChange={setIsBudgetOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("budget")}</DialogTitle>
            </DialogHeader>
            <form action={handleBudgetUpdate} className="space-y-4">
              <Input
                name="budget"
                type="number"
                defaultValue={budget}
                required
              />
              <Button type="submit" className="w-full">
                {tCommon("update")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* ALIŞVERİŞ MODU (BÜYÜK EKRAN) */}
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
                      ? "bg-green-50 border-green-200"
                      : "bg-white border-gray-200"
                  )}
                  onClick={() =>
                    handleToggleShoppingItem(item.id, item.is_checked)
                  }
                >
                  {item.is_checked ? (
                    <CheckSquare className="h-8 w-8 text-green-600" />
                  ) : (
                    <Square className="h-8 w-8 text-gray-300" />
                  )}
                  <span
                    className={cn(
                      "text-lg font-medium",
                      item.is_checked && "line-through text-gray-400"
                    )}
                  >
                    {item.product_name}
                  </span>
                </div>
              ))}
            </div>
            <DialogFooter className="sm:justify-center">
              <Button
                className="w-full bg-blue-600 h-12 text-lg"
                onClick={() => setIsShoppingModeOpen(false)}
              >
                Kapat
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
