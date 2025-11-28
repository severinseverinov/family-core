import { createClient } from "@/utils/supabase/server";
import { PetWidget } from "@/components/dashboard/widgets/PetWidget";
import { redirect } from "next/navigation";
import { CreateFamilyForm } from "@/components/dashboard/CreateFamilyForm";
import { signOut } from "@/app/actions/auth";
import { CalendarWidget } from "@/components/dashboard/widgets/CalendarWidget";
import { KitchenWidget } from "@/components/dashboard/widgets/KitchenWidget";
import { GamificationWidget } from "@/components/dashboard/widgets/GamificationWidget";
import { headers } from "next/headers";
import { VaultWidget } from "@/components/dashboard/widgets/VaultWidget";

export default async function Dashboard() {
  const supabase = await createClient();

  // 1. Kullanıcı Giriş Yapmış mı?
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect("/login");
  }

  // 2. Profili Çek (Hata Korumalı Yöntem)
  // .single() yerine .maybeSingle() kullanıyoruz ki uygulama çökmesin.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  // Eğer veritabanı hatası varsa (Bağlantı vs.)
  if (profileError) {
    console.error("Profil çekme hatası:", profileError);
    return <div>Veritabanı hatası oluştu: {profileError.message}</div>;
  }

  // 3. Eğer Profil Yoksa (Kritik Durum)
  // Kullanıcı Auth'da var ama Profiles tablosunda yoksa, manuel oluşturalım veya uyaralım.
  if (!profile) {
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-4">
        <h1 className="text-xl font-bold text-red-600">Profil Bulunamadı</h1>
        <p>Hesabınız oluşturulmuş ancak profil bilgileriniz eksik.</p>
        <p className="text-sm text-gray-500">
          Lütfen çıkış yapıp tekrar üye olmayı deneyin.
        </p>
        <form action={signOut}>
          <button
            type="submit"
            className="bg-black text-white px-4 py-2 rounded"
          >
            Çıkış Yap
          </button>
        </form>
      </div>
    );
  }

  // 4. Aile Kontrolü
  // Eğer aileyi henüz kurmamışsa form göster
  if (!profile.family_id) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <CreateFamilyForm />
      </div>
    );
  }

  // 5. Her şey tamamsa Dashboard'u göster
  // Fallback logic for user name display
  const userName =
    profile.full_name ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "there";
  const headersList = await headers();
  const countryCode = headersList.get("x-vercel-ip-country") || "TR";

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Hoş geldin, {userName}</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* SOL SÜTUN */}
        <div className="md:col-span-2 space-y-6">
          <div className="h-full">
            <CalendarWidget countryCode={countryCode} />
          </div>
          <div className="h-64">
            <KitchenWidget />
          </div>
        </div>

        {/* SAĞ SÜTUN */}
        <div className="space-y-6">
          <div className="h-64">
            <GamificationWidget />
          </div>
          <div className="h-64">
            <PetWidget />
          </div>
          <div className="h-128">
            <VaultWidget />
          </div>
        </div>
      </div>
    </div>
  );
}
