"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Palette, Moon, Sun, Monitor, Globe, Coins, User } from "lucide-react";
import { useTheme } from "next-themes";
import { useThemeColor } from "@/components/providers/theme-color-provider";
import { toast } from "sonner";
import { updatePreferences } from "@/app/actions/settings";
import { useRouter } from "next/navigation";

// Renk seçenekleri (COLORS) dizisi kaldırıldı

interface AppearanceProps {
  initialCurrency?: string;
  initialLanguage?: string;
  initialGender?: string;
}

export function AppearanceWidget({
  initialCurrency,
  initialLanguage,
  initialGender,
}: AppearanceProps) {
  const { setTheme, theme } = useTheme();
  // useThemeColor hook'u arka planda var olan rengi korumak için kalabilir,
  // ancak UI'da değiştirmeyeceğiz.
  const { themeColor } = useThemeColor();
  const router = useRouter();

  const [currency, setCurrency] = useState(initialCurrency || "TL");
  const [language, setLanguage] = useState(initialLanguage || "tr");
  const [gender, setGender] = useState(initialGender || "male");

  const handleSave = async () => {
    const formData = new FormData();
    // Mevcut themeColor'ı bozmadan gönderiyoruz
    formData.append("themeColor", themeColor);
    formData.append("language", language);
    formData.append("currency", currency);
    formData.append("gender", gender);

    const res = await updatePreferences(formData);
    if (res?.error) {
      toast.error("Hata oluştu");
    } else {
      toast.success("Ayarlar kaydedildi!");
      if (language !== initialLanguage) {
        window.location.href = `/${language}/dashboard/settings`;
      } else {
        router.refresh();
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Palette className="h-5 w-5" /> Görünüm & Tercihler
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* 1. AYDINLIK / KARANLIK MOD */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Mod</label>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              className={
                theme === "light" ? "border-2 border-primary bg-accent" : ""
              }
              onClick={() => setTheme("light")}
            >
              <Sun className="h-4 w-4 mr-2" /> Aydınlık
            </Button>
            <Button
              variant="outline"
              className={
                theme === "dark" ? "border-2 border-primary bg-accent" : ""
              }
              onClick={() => setTheme("dark")}
            >
              <Moon className="h-4 w-4 mr-2" /> Karanlık
            </Button>
            <Button
              variant="outline"
              className={
                theme === "system" ? "border-2 border-primary bg-accent" : ""
              }
              onClick={() => setTheme("system")}
            >
              <Monitor className="h-4 w-4 mr-2" /> Sistem
            </Button>
          </div>
        </div>

        {/* --- RENK TEMASI SEÇİCİSİ KALDIRILDI --- */}

        {/* 2. DİĞER AYARLAR (Dil, Para Birimi, Cinsiyet) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Globe className="h-4 w-4" /> Dil
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
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Coins className="h-4 w-4" /> Para Birimi
            </label>
            <select
              className="w-full border p-2 rounded-md bg-background"
              value={currency}
              onChange={e => setCurrency(e.target.value)}
            >
              <option value="TL">TL (₺)</option>
              <option value="EUR">Euro (€)</option>
              <option value="USD">Dolar ($)</option>
              <option value="GBP">Sterlin (£)</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4" /> Cinsiyet
            </label>
            <select
              className="w-full border p-2 rounded-md bg-background"
              value={gender}
              onChange={e => setGender(e.target.value)}
            >
              <option value="male">Erkek (♂)</option>
              <option value="female">Kadın (♀)</option>
            </select>
          </div>
        </div>

        <Button
          onClick={handleSave}
          className="w-full bg-primary text-primary-foreground"
        >
          Değişiklikleri Kaydet
        </Button>
      </CardContent>
    </Card>
  );
}
