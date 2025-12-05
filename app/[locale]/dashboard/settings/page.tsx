import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { MembersWidget } from "@/components/dashboard/settings/MembersWidget";
import { AppearanceWidget } from "@/components/dashboard/settings/AppearanceWidget";
import { getFamilyMembers, getInvitations } from "@/app/actions/family";
// PreferencesWidget importunu kaldırdık çünkü artık kullanmıyoruz.

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile?.family_id) redirect("/dashboard");

  // Verileri Çek
  const [membersRes, invitesRes] = await Promise.all([
    getFamilyMembers(),
    getInvitations(),
  ]);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Ayarlar
        </h1>
        <p className="text-gray-500">
          Ailenizi ve hesap ayarlarınızı buradan yönetebilirsiniz.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* SOL: ÜYE YÖNETİMİ (Tam Genişlik) */}
        <div className="space-y-4 md:col-span-2">
          <h2 className="text-xl font-semibold border-b pb-2 text-gray-800 dark:text-gray-200">
            Aile Üyeleri
          </h2>
          <MembersWidget
            initialMembers={membersRes.members}
            initialInvites={invitesRes.invitations}
            currentUserRole={profile.role}
            currentUserId={user.id}
          />
        </div>

        {/* GÖRÜNÜM VE TERCİHLER (Tek parça halinde, tam genişlik veya yarım olabilir) */}
        <div className="space-y-4 md:col-span-2">
          <h2 className="text-xl font-semibold border-b pb-2 text-gray-800 dark:text-gray-200">
            Görünüm ve Uygulama Ayarları
          </h2>
          {/* AppearanceWidget zaten dil, para birimi ve cinsiyet ayarlarını içeriyor */}
          <AppearanceWidget
            initialCurrency={profile.preferred_currency}
            initialLanguage={profile.preferred_language}
            initialGender={profile.gender}
          />
        </div>
      </div>
    </div>
  );
}
