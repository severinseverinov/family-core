"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings2, Globe, Coins } from "lucide-react";
import { toast } from "sonner";
import { getPreferences, updatePreferences } from "@/app/actions/settings";

export function PreferencesWidget() {
  const router = useRouter();
  const pathname = usePathname(); // Mevcut yolu al (örn: /tr/dashboard/settings)

  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState("tr");
  const [currency, setCurrency] = useState("TL");

  useEffect(() => {
    async function load() {
      const res = await getPreferences();
      setLanguage(res.language);
      setCurrency(res.currency);
      setLoading(false);
    }
    load();
  }, []);

  const handleSave = async () => {
    const formData = new FormData();
    formData.append("language", language);
    formData.append("currency", currency);

    const res = await updatePreferences(formData);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("Ayarlar güncellendi! Sayfa yenileniyor...");

      // DİL DEĞİŞİKLİĞİNİ UYGULA (URL Yönlendirme)
      // Mevcut path'in başındaki dil kodunu yenisiyle değiştir
      // Örn: /tr/dashboard -> /en/dashboard
      const newPath = pathname.replace(/^\/(tr|en|de)/, `/${language}`);

      // Eğer path değişmediyse (aynı dil seçildiyse) sadece refresh yap
      if (newPath === pathname) {
        router.refresh();
      } else {
        window.location.href = newPath; // Tam yenileme ile dile geçiş yap
      }
    }
  };

  if (loading)
    return (
      <div className="p-4 text-sm text-gray-500">Ayarlar yükleniyor...</div>
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Settings2 className="h-5 w-5" /> Uygulama Tercihleri
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* DİL SEÇİMİ */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Globe className="h-4 w-4 text-blue-500" /> Dil (Language)
          </label>
          <select
            className="w-full border p-2 rounded-md bg-background"
            value={language}
            onChange={e => setLanguage(e.target.value)}
          >
            <option value="tr">Türkçe</option>
            <option value="en">English</option>
            <option value="de">Deutsch</option>
          </select>
          <p className="text-[10px] text-gray-500">
            Uygulamanın kullanılacağı dili seçin. (Otomatik konumu geçersiz
            kılar)
          </p>
        </div>

        {/* PARA BİRİMİ SEÇİMİ */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Coins className="h-4 w-4 text-yellow-500" /> Para Birimi
          </label>
          <select
            className="w-full border p-2 rounded-md bg-background"
            value={currency}
            onChange={e => setCurrency(e.target.value)}
          >
            <option value="TL">Türk Lirası (₺)</option>
            <option value="EUR">Euro (€)</option>
            <option value="USD">Amerikan Doları ($)</option>
            <option value="GBP">İngiliz Sterlini (£)</option>
          </select>
          <p className="text-[10px] text-gray-500">
            Mutfak harcamaları ve ürün fiyatları bu birimde gösterilecek.
          </p>
        </div>

        <Button onClick={handleSave} className="w-full">
          Kaydet ve Uygula
        </Button>
      </CardContent>
    </Card>
  );
}
