import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { CreateFamilyForm } from "@/components/dashboard/CreateFamilyForm";
import { signOut } from "@/app/actions/auth";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server"; // <-- EKLENDİ

// ... (Importlar aynı)

export default async function Dashboard() {
  const t = await getTranslations("Dashboard"); // <-- Çeviri Yükle

  const supabase = await createClient();
  // ... (Auth ve Profil kontrolleri aynı)

  const headersList = await headers();
  const countryCode = headersList.get("x-vercel-ip-country") || "TR";

  // ... (Veri çekme kodları aynı)

  const userName = profile.full_name || user.email?.split("@")[0] || "User";
  const userRole = profile.role || "member";

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* BAŞLIK - ÇEVİRİYE BAĞLANDI */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t("welcome", { name: userName })}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("subtitle", { country: countryCode })}
          </p>
        </div>
      </div>

      {/* ... (Grid yapısı aynı) ... */}
    </div>
  );
}
