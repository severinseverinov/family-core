import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { LogIn, LayoutDashboard, Settings } from "lucide-react";
import { UserMenu } from "./UserMenu";
import { Button } from "@/components/ui/button";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { MobileNav } from "./MobileNav";
import { VaultNavButton } from "./VaultNavButton"; // Aile Kasası butonu

// --- 1. LOGO BİLEŞENİ (Buraya eklendi) ---
export function FamilyCoreLogo({
  className = "w-10 h-10",
}: {
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Üst Yay */}
      <path
        d="M 25 35 Q 50 10 75 35"
        stroke="currentColor"
        strokeWidth="10"
        className="text-blue-600 dark:text-blue-400"
      />
      {/* Alt Yay */}
      <path
        d="M 25 65 Q 50 90 75 65"
        stroke="currentColor"
        strokeWidth="10"
        className="text-blue-600 dark:text-blue-400"
      />

      {/* Merkez Çekirdek */}
      <circle cx="50" cy="50" r="14" className="fill-orange-500" />

      {/* Yan Bağlantılar */}
      <path
        d="M 20 40 L 20 60"
        stroke="currentColor"
        strokeWidth="8"
        className="text-blue-600 dark:text-blue-400 opacity-80"
      />
      <path
        d="M 80 40 L 80 60"
        stroke="currentColor"
        strokeWidth="8"
        className="text-blue-600 dark:text-blue-400 opacity-80"
      />
    </svg>
  );
}

// --- 2. NAVBAR BİLEŞENİ ---
export async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const t = await getTranslations("Navbar");

  const headersList = await headers();
  // const countryCode = headersList.get("x-vercel-ip-country") || "TR"; // İhtiyaç olursa

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* SOL: LOGO */}
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="flex items-center gap-2 text-xl font-bold text-foreground transition-colors hover:text-primary group"
            >
              {/* FamilyCoreLogo Kullanımı */}
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/20 group-hover:scale-105 transition-transform duration-300">
                <FamilyCoreLogo className="h-8 w-8" />
              </div>

              <div className="flex flex-col leading-none">
                <span className="text-lg font-bold tracking-tight">
                  FamilyCore
                </span>
                <span className="text-[10px] text-gray-500 font-medium tracking-widest uppercase">
                  OS
                </span>
              </div>
            </Link>

            {/* MASAÜSTÜ MENÜ (Giriş Yapılmışsa) */}
            {user ? (
              <nav className="hidden md:flex items-center gap-1">
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    {t("dashboard")}
                  </Button>
                </Link>
                <Link href="/dashboard/settings">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Settings className="h-4 w-4" />
                    {t("settings")}
                  </Button>
                </Link>
              </nav>
            ) : (
              /* GİRİŞ YAPILMAMIŞSA */
              <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
                <Link
                  href="#features"
                  className="hover:text-foreground transition-colors"
                >
                  Özellikler
                </Link>
                <Link
                  href="#pricing"
                  className="hover:text-foreground transition-colors"
                >
                  Fiyatlar
                </Link>
              </nav>
            )}
          </div>

          {/* SAĞ: AKSİYONLAR */}
          <div className="flex items-center gap-4">
            {user ? (
              <>
                {/* Aile Kasası Butonu */}
                <VaultNavButton />
                <UserMenu user={user} />
              </>
            ) : (
              <Link href="/login">
                <Button variant="default" size="sm" className="gap-2 shadow-sm">
                  <LogIn className="h-4 w-4" />
                  <span>{t("login")}</span>
                </Button>
              </Link>
            )}

            {/* Mobil Menü */}
            <div className="md:hidden">
              <MobileNav user={user} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
