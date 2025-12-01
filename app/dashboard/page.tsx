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

// Actionlar (Veri Çekme)
import { getDashboardItems, getPublicHolidays } from "@/app/actions/events";
import {
  getLeaderboard,
  getRewards,
  getPointHistory,
  getPointRules,
} from "@/app/actions/gamification";

export default async function Dashboard() {
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

  // Profil yoksa (Hata durumu)
  if (!profile) {
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-4">
        <h1 className="text-xl font-bold text-red-600">Profil Bulunamadı</h1>
        <p className="text-gray-500">Lütfen çıkış yapıp tekrar deneyin.</p>
        <form action={signOut}>
          <button className="bg-black text-white px-4 py-2 rounded">
            Çıkış Yap
          </button>
        </form>
      </div>
    );
  }

  // Aileye üye değilse -> Aile Kurma Ekranı
  if (!profile.family_id) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <CreateFamilyForm />
      </div>
    );
  }

  // 3. TÜM VERİLERİ SUNUCUDA ÇEK (Parallel Fetching)
  // Promise.all ile hepsini aynı anda başlatıyoruz, sayfa çok daha hızlı yüklenir.
  const [
    holidays,
    dashboardData,
    leaderboardData,
    rewardsData,
    historyData,
    rulesData,
  ] = await Promise.all([
    getPublicHolidays("TR"), // Varsayılan TR, ileride user.country yapılabilir
    getDashboardItems(), // Takvim etkinlikleri ve görevler
    getLeaderboard(), // Puan durumu
    getRewards(), // Ödül listesi
    getPointHistory(), // Puan geçmişi
    getPointRules(), // Puan cetveli
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
            Hoş geldin, {userName} 👋
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Ailenizin durumu bir bakışta burada.
          </p>
        </div>
      </div>

      {/* GRID YERLEŞİMİ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SOL SÜTUN (Geniş - 8 birim) */}
        <div className="lg:col-span-8 space-y-6">
          {/* 1. Takvim & Görevler */}
          <div className="h-[520px]">
            <CalendarWidget
              initialItems={dashboardData.items || []}
              initialHolidays={holidays}
            />
          </div>

          {/* 2. Mutfak & Stok (Rol bilgisini gönderiyoruz) */}
          <div className="h-[400px]">
            <KitchenWidget userRole={userRole} />
          </div>
        </div>

        {/* SAĞ SÜTUN (Dar - 4 birim) */}
        <div className="lg:col-span-4 space-y-6">
          {/* 3. Oyunlaştırma (Puanlar) */}
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
