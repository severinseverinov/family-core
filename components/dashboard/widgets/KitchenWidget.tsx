"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ShoppingBag,
  Plus,
  Trash2,
  ScanLine,
  Upload,
  Apple,
  Milk,
  SprayCan,
} from "lucide-react";
import { toast } from "sonner";
import {
  getInventory,
  addInventoryItem,
  deleteInventoryItem,
  scanReceipt,
} from "@/app/actions/kitchen";

// Kategori İkonları
const ICONS: Record<string, any> = {
  gıda: Apple,
  sebze: Apple,
  meyve: Apple,
  süt: Milk,
  kahvaltılık: Milk,
  temizlik: SprayCan,
  default: ShoppingBag,
};

export function KitchenWidget() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);

  // Envanteri Getir
  const loadInventory = async () => {
    const res = await getInventory();
    if (res.items) setItems(res.items);
    setLoading(false);
  };

  useEffect(() => {
    loadInventory();
  }, []);

  // Fiş Yükleme
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    const fd = new FormData();
    fd.append("receipt", file);

    try {
      const res = await scanReceipt(fd);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(
          `Fiş işlendi! ${res?.data?.items?.length || 0} ürün eklendi.`
        );
        loadInventory(); // Listeyi yenile
      }
    } catch {
      toast.error("Hata oluştu");
    } finally {
      setIsScanning(false);
      e.target.value = ""; // Input'u temizle
    }
  };

  // Manuel Ekleme
  const handleManualAdd = async (fd: FormData) => {
    const res = await addInventoryItem(fd);
    if (res?.error) toast.error(res.error);
    else {
      toast.success("Ürün eklendi");
      setIsManualOpen(false);
      loadInventory();
    }
  };

  // Silme
  const handleDelete = async (id: string) => {
    if (!confirm("Silmek istediğine emin misin?")) return;
    await deleteInventoryItem(id);
    toast.success("Silindi");
    loadInventory();
  };

  return (
    <Card className="h-full flex flex-col border-orange-100 bg-orange-50/30 dark:bg-orange-900/10 dark:border-orange-900/30">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium flex gap-2 text-orange-700 dark:text-orange-500">
          <ShoppingBag className="h-4 w-4" />
          Mutfak & Stok
        </CardTitle>

        {/* Manuel Ekle Butonu */}
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 hover:bg-orange-100 dark:hover:bg-orange-900/50"
          onClick={() => setIsManualOpen(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden flex flex-col gap-3 p-4">
        {/* LİSTE ALANI */}
        <div className="flex-1 overflow-auto space-y-2 pr-1">
          {loading ? (
            <p className="text-xs text-center text-gray-400">Yükleniyor...</p>
          ) : items.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-xs">
              <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p>Dolap boş.</p>
              <p>Fiş yükle veya manuel ekle.</p>
            </div>
          ) : (
            items.map(item => {
              const Icon = ICONS[item.category?.toLowerCase()] || ICONS.default;
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 bg-white rounded-lg border shadow-sm dark:bg-gray-900 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-full dark:bg-orange-900/30 text-orange-600">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.product_name}</p>
                      <p className="text-[10px] text-gray-500 capitalize">
                        {item.quantity} {item.unit} • {item.category}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* FİŞ YÜKLEME BUTONU (ALTTA SABİT) */}
        <div className="mt-auto pt-2 border-t border-orange-100 dark:border-orange-900/30">
          <div className="relative">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              disabled={isScanning}
            />
            <Button
              className="w-full bg-orange-600 hover:bg-orange-700 text-white shadow-sm"
              disabled={isScanning}
            >
              {isScanning ? (
                <>
                  <ScanLine className="h-4 w-4 mr-2 animate-pulse" />
                  Okunuyor...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Fiş Tara & Stok Ekle
                </>
              )}
            </Button>
          </div>
        </div>

        {/* MANUEL EKLEME MODALI */}
        <Dialog open={isManualOpen} onOpenChange={setIsManualOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ürün Ekle</DialogTitle>
            </DialogHeader>
            <form action={handleManualAdd} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Ürün Adı</label>
                <Input name="name" placeholder="Örn: Süt" required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Miktar</label>
                  <Input
                    name="quantity"
                    type="number"
                    step="0.1"
                    placeholder="1"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Birim</label>
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
                <label className="text-xs font-medium">Kategori</label>
                <select
                  name="category"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="Gıda">Gıda</option>
                  <option value="Temizlik">Temizlik</option>
                  <option value="Sebze">Sebze/Meyve</option>
                  <option value="Diğer">Diğer</option>
                </select>
              </div>

              <Button
                type="submit"
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                Kaydet
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
