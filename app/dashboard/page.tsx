import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { CreateFamilyForm } from "@/components/dashboard/CreateFamilyForm";
import { signOut } from "@/app/actions/auth";

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
} from "@/app/actions/gamification"; // Yeni eklenenler

export default async function Dashboard() {
  const supabase = await createClient();

  // 1. Auth Kontrol
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  // 2. Profil Kontrol
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
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <CreateFamilyForm />
      </div>
    );
  }

  // 3. TÜM VERİLERİ ÇEK (Parallel Fetching)
  // Promise.all kullanarak hepsini aynı anda çekiyoruz, bu sayfa yüklemesini hızlandırır.
  const [
    holidays,
    dashboardData,
    leaderboardData,
    rewardsData,
    historyData,
    rulesData,
  ] = await Promise.all([
    getPublicHolidays("TR"),
    getDashboardItems(),
    getLeaderboard(),
    getRewards(),
    getPointHistory(),
    getPointRules(),
  ]);

  const userName =
    profile.full_name || user.email?.split("@")[0] || "Kullanıcı";

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          Hoş geldin, {userName} 👋
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SOL SÜTUN */}
        <div className="lg:col-span-2 space-y-6">
          <div className="h-[500px]">
            <CalendarWidget
              initialItems={dashboardData.items || []}
              initialHolidays={holidays}
            />
          </div>
          <div className="h-128">
            <KitchenWidget />
          </div>
        </div>

        {/* SAĞ SÜTUN */}
        <div className="space-y-6">
          <div className="h-[400px]">
            {" "}
            {/* Biraz uzattık ki sekmeler rahat sığsın */}
            <GamificationWidget
              initialUsers={leaderboardData.users || []}
              initialRewards={rewardsData.rewards || []}
              initialHistory={historyData.history || []}
              initialRules={rulesData.rules || []}
            />
          </div>
          <div className="h-80">
            <PetWidget />
          </div>
          <div className="h-64">
            <VaultWidget />
          </div>
        </div>
      </div>
    </div>
  );
}
