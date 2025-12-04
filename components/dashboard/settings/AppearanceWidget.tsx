"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Palette, Moon, Sun, Monitor, Globe, Coins, Check } from "lucide-react";
import { useTheme } from "next-themes";
import { useThemeColor } from "@/components/providers/theme-color-provider";
import { toast } from "sonner";
import { updatePreferences } from "@/app/actions/settings";
import { useRouter } from "next/navigation";

const COLORS = [
  { name: "blue", label: "Mavi", color: "bg-blue-500" },
  { name: "green", label: "Yeşil", color: "bg-green-500" },
  { name: "orange", label: "Turuncu", color: "bg-orange-500" },
  { name: "rose", label: "Gül", color: "bg-pink-500" },
  { name: "yellow", label: "Sarı", color: "bg-yellow-500" },
  { name: "zinc", label: "Gri", color: "bg-zinc-500" },
];

export function AppearanceWidget() {
  const { setTheme, theme } = useTheme();
  const { themeColor, setThemeColor } = useThemeColor();
  const router = useRouter();

  const handleSave = async () => {
    const formData = new FormData();
    formData.append("themeColor", themeColor);

    const res = await updatePreferences(formData);
    if (res?.error) {
      toast.error("Hata oluştu");
    } else {
      toast.success("Tema ayarlar kaydedildi!");

      router.refresh();
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

        {/* 2. RENK TEMASI */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Renk Teması</label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {COLORS.map(c => (
              <button
                key={c.name}
                onClick={() => setThemeColor(c.name as any)}
                className={`
                            flex flex-col items-center justify-center gap-2 p-2 rounded-lg border-2 transition-all
                            ${
                              themeColor === c.name
                                ? "border-primary bg-accent"
                                : "border-transparent hover:bg-accent/50"
                            }
                        `}
              >
                <div
                  className={`h-6 w-6 rounded-full ${c.color} flex items-center justify-center text-white`}
                >
                  {themeColor === c.name && <Check className="h-3 w-3" />}
                </div>
                <span className="text-xs font-medium capitalize">
                  {c.label}
                </span>
              </button>
            ))}
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
