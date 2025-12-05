import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { LogIn, Layers, LayoutDashboard, Settings } from "lucide-react";
import { UserMenu } from "./UserMenu";
import { Button } from "@/components/ui/button";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { MobileNav } from "./MobileNav";
import { VaultNavButton } from "./VaultNavButton"; // <-- YENİ: Kasa Butonu Eklendi

function getFlagEmoji(countryCode: string) {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const t = await getTranslations("Navbar");

  const headersList = await headers();
  const countryCode = headersList.get("x-vercel-ip-country") || "TR";
  // const flag = getFlagEmoji(countryCode); // İsteğe bağlı bayrak

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* SOL: LOGO */}
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="flex items-center gap-2 text-xl font-bold text-foreground transition-colors hover:text-primary"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Layers className="h-5 w-5" />
              </div>
              <span>FamilyCore</span>
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
                {/* YENİ: Aile Kasası Butonu (Masaüstü için) */}
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
