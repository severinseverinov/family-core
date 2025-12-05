"use client";

import * as React from "react";
import { useEffect, useState } from "react"; // DÜZELTME: En üste alındı
import { createClient } from "@/utils/supabase/client";

export type ThemeColor =
  | "zinc"
  | "blue"
  | "green"
  | "orange"
  | "rose"
  | "yellow";

interface ThemeColorProviderProps {
  children: React.ReactNode;
  defaultTheme?: ThemeColor;
}

const ThemeColorContext = React.createContext<{
  themeColor: ThemeColor;
  setThemeColor: (color: ThemeColor) => void;
}>({
  themeColor: "blue",
  setThemeColor: () => {},
});

export function useThemeColor() {
  return React.useContext(ThemeColorContext);
}

export function ThemeColorProvider({
  children,
  defaultTheme = "blue",
}: ThemeColorProviderProps) {
  const [themeColor, setThemeColor] = useState<ThemeColor>(defaultTheme);
  const [mounted, setMounted] = useState(false);

  // 1. Veritabanından kayıtlı temayı çek
  useEffect(() => {
    const fetchTheme = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("theme_color")
          .eq("id", user.id)
          .single();
        if (data?.theme_color) {
          setThemeColor(data.theme_color as ThemeColor);
        }
      }
      setMounted(true);
    };
    fetchTheme();
  }, []);

  // 2. DOM'a (body etiketine) data-theme attribute'unu uygula
  useEffect(() => {
    const body = document.body;
    // Önceki temayı temizle
    body.removeAttribute("data-theme");

    // Eğer Zinc (varsayılan) değilse yeni temayı ekle
    if (themeColor && themeColor !== "zinc") {
      body.setAttribute("data-theme", themeColor);
    }
  }, [themeColor]);

  // Hydration hatasını önlemek için
  if (!mounted) return <>{children}</>;

  return (
    <ThemeColorContext.Provider value={{ themeColor, setThemeColor }}>
      {children}
    </ThemeColorContext.Provider>
  );
}
