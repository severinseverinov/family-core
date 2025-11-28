"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, ShoppingBag, ScanLine } from "lucide-react";
import { scanReceipt } from "@/app/actions/kitchen";
import { toast } from "sonner";

export function KitchenWidget() {
  const [isScanning, setIsScanning] = useState(false);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    const formData = new FormData();
    formData.append("receipt", file);

    try {
      const result = await scanReceipt(formData);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          `Fiş okundu! ${result.data.items.length} ürün stoğa eklendi.`
        );
      }
    } catch (error) {
      toast.error("Bir hata oluştu.");
    } finally {
      setIsScanning(false);
      // Input'u temizle ki aynı dosyayı tekrar seçebilsin
      event.target.value = "";
    }
  };

  return (
    <Card className="h-full flex flex-col bg-gradient-to-br from-white to-orange-50 dark:from-gray-900 dark:to-gray-900/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-orange-600 dark:text-orange-400">
          <ShoppingBag className="h-4 w-4" />
          Akıllı Mutfak & Stok
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col items-center justify-center gap-4">
        {isScanning ? (
          <div className="text-center space-y-3 animate-pulse">
            <div className="bg-orange-100 p-4 rounded-full inline-block">
              <ScanLine className="h-8 w-8 text-orange-600 animate-bounce" />
            </div>
            <p className="text-sm text-muted-foreground">
              Yapay zeka fişi okuyor...
            </p>
            <p className="text-xs text-gray-400">Ürünler ayrıştırılıyor</p>
          </div>
        ) : (
          <>
            <div className="text-center space-y-1">
              <h3 className="font-semibold text-lg">Fiş Tara</h3>
              <p className="text-xs text-muted-foreground px-4">
                Market fişini yükle, stoklar otomatik güncellensin.
              </p>
            </div>

            <div className="relative">
              <input
                type="file"
                accept="image/*"
                capture="environment" // Mobilde kamerayı açması için
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                disabled={isScanning}
              />
              <Button className="w-full gap-2 bg-orange-600 hover:bg-orange-700 text-white">
                <Upload className="h-4 w-4" />
                Fiş Yükle / Çek
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
