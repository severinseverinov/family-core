import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { LogIn } from "lucide-react";
import { UserMenu } from "./UserMenu";
import { Button } from "@/components/ui/button";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server"; // Server Component için

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
  const t = await getTranslations("Navbar"); // Çevirileri çek

  const headersList = await headers();
  const countryCode = headersList.get("x-vercel-ip-country") || "TR";
  const flag = getFlagEmoji(countryCode);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"
            >
              FamilyCore
            </Link>
            <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs border border-gray-200 dark:border-gray-700">
              {flag}
            </span>
          </div>

          <div className="flex items-center">
            {user ? (
              <UserMenu user={user} />
            ) : (
              <Link href="/login">
                <Button
                  variant="default"
                  className="flex items-center space-x-2"
                >
                  <LogIn className="h-4 w-4" />
                  <span>{t("login")}</span> {/* Çeviri Kullanımı */}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
