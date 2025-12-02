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
} from "lucide-react";
import { toast } from "sonner";
import {
  getInventoryAndBudget,
  addInventoryItem,
  deleteInventoryItem,
  updateItemQuantity,
  scanReceipt,
  updateBudget,
} from "@/app/actions/kitchen";
import { useTranslations, useLocale } from "next-intl"; // <-- locale eklendi

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

export function KitchenWidget({ userRole }: { userRole: string }) {
  const t = useTranslations("Kitchen");
  const tCommon = useTranslations("Common");
  const locale = useLocale(); // <-- Aktif Dili Al

  const [items, setItems] = useState<any[]>([]);
  const [budget, setBudget] = useState(0);
  const [spent, setSpent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isBudgetOpen, setIsBudgetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("ALL");

  const isAdmin = ["owner", "admin"].includes(userRole);

  const loadData = async () => {
    const res = await getInventoryAndBudget();
    if (res.items) {
      setItems(res.items);
      setBudget(res.budget);
      setSpent(res.spent);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const groupedItems = useMemo(() => {
    const groups: Record<string, any[]> = {};
    items.forEach(item => {
      let cat = item.category || "Genel";
      // Kategoriyi Çeviri Anahtarı Olarak Kullanabiliriz veya Basitçe Gösteririz
      // Şimdilik veritabanından gelen kategori ismini kullanıyoruz.
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
  }, [items]);

  const tabs = useMemo(
    () => ["ALL", ...Object.keys(groupedItems)],
    [groupedItems]
  );

  const displayedGroups = useMemo(() => {
    if (activeTab === "ALL") return groupedItems;
    return { [activeTab]: groupedItems[activeTab] };
  }, [activeTab, groupedItems]);

  const percentage = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const barColor =
    percentage > 90
      ? "bg-red-500"
      : percentage > 70
      ? "bg-yellow-500"
      : "bg-green-500";

  // ... (Handle fonksiyonları aynı) ...
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
    setItems(prev =>
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
  const handleDelete = async (id: string) => {
    if (!confirm(tCommon("delete") + "?")) return;
    const res = await deleteInventoryItem(id);
    if (res?.error) toast.error(tCommon("error"));
    else {
      toast.success(tCommon("success"));
      loadData();
    }
  };

  // Ürün İsmini Dile Göre Seçme
  const getProductName = (item: any) => {
    // Eğer dil Türkçe değilse (en, de) ve İngilizce isim varsa onu göster
    if (locale !== "tr" && item.product_name_en) {
      return item.product_name_en;
    }
    // Yoksa orijinal (Türkçe) ismi göster
    return item.product_name;
  };

  return (
    <Card className="h-full flex flex-col border-orange-100 bg-orange-50/30 dark:bg-orange-900/10 dark:border-orange-900/30 shadow-sm">
      <CardHeader className="pb-2 flex flex-col gap-3 space-y-0">
        <div className="flex flex-row items-center justify-between w-full">
          <CardTitle className="text-sm font-bold flex gap-2 text-orange-700 dark:text-orange-500">
            <ShoppingBag className="h-4 w-4" />
            {t("title")}
          </CardTitle>
          <div className="flex gap-1">
            {isAdmin && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-orange-600 hover:bg-orange-100"
                onClick={() => setIsBudgetOpen(true)}
              >
                <Wallet className="h-4 w-4" />
              </Button>
            )}
            {isAdmin && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 hover:bg-orange-100"
                onClick={() => setIsManualOpen(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        {budget > 0 && (
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
                className={`h-full transition-all duration-500 ${barColor}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden flex flex-col gap-3 p-4 pt-0">
        {items.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap border",
                  activeTab === tab
                    ? "bg-orange-600 text-white"
                    : "bg-white text-gray-600"
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
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-xs flex flex-col items-center">
              <ShoppingBag className="h-8 w-8 mb-2 opacity-20" />
              <p>{t("empty")}</p>
            </div>
          ) : (
            Object.entries(displayedGroups as Record<string, any[]>).map(
              ([category, categoryItems]) => {
                const Icon = getCategoryIcon(category);
                if (!categoryItems) return null;
                return (
                  <div
                    key={category}
                    className="space-y-1 animate-in fade-in slide-in-from-bottom-2 duration-300"
                  >
                    {activeTab === "ALL" && (
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
                              {/* DİNAMİK İSİM GÖSTERİMİ */}
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
                              onClick={() => handleQuantityChange(item.id, -1)}
                              className="w-6 h-6 rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-600 text-xs"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => handleQuantityChange(item.id, 1)}
                                className="w-6 h-6 rounded-full bg-gray-100 hover:bg-green-100 hover:text-green-600 text-xs"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            )}
                            {isAdmin && (
                              <button
                                onClick={() => handleDelete(item.id)}
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

        {/* ... (Alt kısımdaki Fiş Yükleme ve Modallar aynı kalabilir, metinler zaten çevrildi) ... */}
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

        <Dialog open={isManualOpen} onOpenChange={setIsManualOpen}>
          {/* ... Modal içeriği aynı, sadece t('key') kullan ... */}
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
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
              <Button type="submit" className="w-full bg-orange-600">
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
      </CardContent>
    </Card>
  );
}
