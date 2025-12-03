import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { CreateFamilyForm } from "@/components/dashboard/CreateFamilyForm";
import { signOut } from "@/app/actions/auth";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";

// Widgetlar
import { CalendarWidget } from "@/components/dashboard/widgets/CalendarWidget";
import { PetWidget } from "@/components/dashboard/widgets/PetWidget";
import { KitchenWidget } from "@/components/dashboard/widgets/KitchenWidget";
import { GamificationWidget } from "@/components/dashboard/widgets/GamificationWidget";
import { VaultWidget } from "@/components/dashboard/widgets/VaultWidget";

// Actionlar
import { getDashboardItems, getPublicHolidays } from "@/app/actions/events";
import {
  getLeaderboard,
  getRewards,
  getPointHistory,
  getPointRules,
} from "@/app/actions/gamification";
import { getFamilyMembers } from "@/app/actions/family"; // <-- EKLENDİ

export default async function Dashboard() {
  const t = await getTranslations("Dashboard");
  const supabase = await createClient();

  // 1. Auth Kontrol
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  // 2. Profil ve Aile Kontrolü
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-4">
        <h1 className="text-xl font-bold text-red-600">Profil Bulunamadı</h1>
        <form action={signOut}>
          <button className="bg-black text-white px-4 py-2 rounded">
            Çıkış Yap
          </button>
        </form>
      </div>
    );
  }

  if (!profile.family_id) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <CreateFamilyForm />
      </div>
    );
  }

  // 3. KONUM BİLGİSİNİ AL
  const headersList = await headers();
  const countryCode = headersList.get("x-vercel-ip-country") || "TR";

  // 4. TÜM VERİLERİ SUNUCUDA ÇEK
  const [
    holidays,
    dashboardData,
    leaderboardData,
    rewardsData,
    historyData,
    rulesData,
    membersData, // <-- Yeni
  ] = await Promise.all([
    getPublicHolidays(countryCode),
    getDashboardItems(),
    getLeaderboard(),
    getRewards(),
    getPointHistory(),
    getPointRules(),
    getFamilyMembers(), // <-- Yeni
  ]);

  const userName =
    profile.full_name || user.email?.split("@")[0] || "Kullanıcı";
  const userRole = profile.role || "member";

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* BAŞLIK */}
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

      {/* GRID YERLEŞİMİ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SOL SÜTUN */}
        <div className="lg:col-span-8 space-y-6">
          {/* 1. Takvim & Görevler */}
          <div className="h-[520px]">
            <CalendarWidget
              initialItems={dashboardData.items || []}
              initialHolidays={holidays}
              familyMembers={membersData.members || []} // <-- Üyeleri gönderdik
            />
          </div>

          {/* 2. Mutfak & Stok */}
          <div className="h-[400px]">
            <KitchenWidget userRole={userRole} />
          </div>
        </div>

        {/* SAĞ SÜTUN */}
        <div className="lg:col-span-4 space-y-6">
          {/* 3. Oyunlaştırma */}
          <div className="h-[480px]">
            <GamificationWidget
              initialUsers={leaderboardData.users || []}
              initialRewards={rewardsData.rewards || []}
              initialHistory={historyData.history || []}
              initialRules={rulesData.rules || []}
            />
          </div>

          {/* 4. Evcil Hayvanlar */}
          <div className="h-[320px]">
            <PetWidget />
          </div>

          {/* 5. Aile Kasası */}
          <div className="h-[300px]">
            <VaultWidget />
          </div>
        </div>
      </div>
    </div>
  );
}
