"use client";

import * as React from "react";
import { createClient } from "@/utils/supabase/client";

type ThemeColor = "zinc" | "blue" | "green" | "orange" | "rose" | "yellow";

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
  const [themeColor, setThemeColor] = React.useState<ThemeColor>(defaultTheme);
  const [mounted, setMounted] = React.useState(false);

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

  useEffect(() => {
    const body = document.body;
    body.removeAttribute("data-theme");
    if (themeColor !== "zinc") {
      body.setAttribute("data-theme", themeColor);
    }
  }, [themeColor]);

  // Hydration hatasını önlemek için mounted kontrolü
  if (!mounted) return <>{children}</>;

  return (
    <ThemeColorContext.Provider value={{ themeColor, setThemeColor }}>
      {children}
    </ThemeColorContext.Provider>
  );
}

// React.useEffect için kısayol
import { useEffect } from "react";
