import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { CreateFamilyForm } from "@/components/dashboard/CreateFamilyForm";
import { signOut } from "@/app/actions/auth";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";

// Widgetlar
import { CalendarWidget } from "@/components/dashboard/widgets/CalendarWidget";
import { TasksWidget } from "@/components/dashboard/widgets/TasksWidget";
import { PetWidget } from "@/components/dashboard/widgets/PetWidget";
import { KitchenWidget } from "@/components/dashboard/widgets/KitchenWidget";
import { GamificationWidget } from "@/components/dashboard/widgets/GamificationWidget";
import { VaultWidget } from "@/components/dashboard/widgets/VaultWidget";
import { FamilyWidget } from "@/components/dashboard/widgets/FamilyWidget";
import { DynamicBackground } from "@/components/dashboard/DynamicBackground";

// Actionlar
import { getDashboardItems, getPublicHolidays } from "@/app/actions/events";
import {
  getLeaderboard,
  getRewards,
  getPointHistory,
  getPointRules,
} from "@/app/actions/gamification";
import { getFamilyMembers, getFamilyDetails } from "@/app/actions/family";

export default async function Dashboard() {
  const t = await getTranslations("Dashboard");
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
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <CreateFamilyForm />
      </div>
    );
  }

  // 3. Konum
  const headersList = await headers();
  const countryCode = headersList.get("x-vercel-ip-country") || "TR";

  // 4. Verileri Çek (Paralel)
  const [
    holidays,
    dashboardData,
    leaderboardData,
    rewardsData,
    historyData,
    rulesData,
    membersData,
    familyRes,
  ] = await Promise.all([
    getPublicHolidays(countryCode),
    getDashboardItems(),
    getLeaderboard(),
    getRewards(),
    getPointHistory(),
    getPointRules(),
    getFamilyMembers(),
    getFamilyDetails(),
  ]);

  const userName =
    profile.full_name || user.email?.split("@")[0] || "Kullanıcı";
  const userRole = profile.role || "member";
  const userGender = profile.gender || "male";

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto relative min-h-screen">
      <DynamicBackground />

      {/* BAŞLIK & AİLE KARTI */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 relative z-10">
        <div className="w-full">
          <FamilyWidget
            familyData={familyRes.family}
            userRole={userRole}
            userName={userName}
            locationName={countryCode}
          />
        </div>
      </div>

      {/* GRID YERLEŞİMİ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        {/* SOL SÜTUN (Geniş - Takvim, Görevler, Mutfak) */}
        <div className="lg:col-span-8 space-y-6">
          {/* 1. Takvim (Hava Durumu ve Tarih) */}
          <div className="h-fit">
            <CalendarWidget
              initialHolidays={holidays}
              // userGender prop'u buradan kaldırıldı
            />
          </div>

          {/* 2. Görevler ve Etkinlikler */}
          <div className="h-[450px]">
            <TasksWidget
              initialItems={dashboardData.items || []}
              userRole={userRole}
              userId={user.id}
              familyMembers={membersData.members || []}
              userGender={userGender} // TasksWidget hala bunu kullanıyor
            />
          </div>

          {/* 3. Mutfak & Stok */}
          <div className="h-[400px]">
            <KitchenWidget userRole={userRole} />
          </div>
        </div>

        {/* SAĞ SÜTUN (Dar - Puan, Pet, Kasa) */}
        <div className="lg:col-span-4 space-y-6">
          {/* 4. Oyunlaştırma */}
          <div className="h-[480px]">
            <GamificationWidget
              initialUsers={leaderboardData.users || []}
              initialRewards={rewardsData.rewards || []}
              initialHistory={historyData.history || []}
              initialRules={rulesData.rules || []}
            />
          </div>

          {/* 5. Evcil Hayvanlar (Form ve Liste) */}
          <div className="h-[320px]">
            <PetWidget familyMembers={membersData.members || []} />
          </div>

          {/* 6. Aile Kasası */}
          <div className="h-[300px]">
            <VaultWidget />
          </div>
        </div>
      </div>
    </div>
  );
}
