import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { MembersWidget } from "@/components/dashboard/settings/MembersWidget";
import { AppearanceWidget } from "@/components/dashboard/settings/AppearanceWidget"; // <-- YENİ
import { getFamilyMembers, getInvitations } from "@/app/actions/family";
import { PreferencesWidget } from "@/components/dashboard/settings/PreferencesWidget"; // <-- YENİ

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
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Ayarlar
        </h1>
        <p className="text-gray-500">
          Ailenizi ve hesap ayarlarınızı buradan yönetebilirsiniz.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* SOL: ÜYE YÖNETİMİ */}
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

        {/* SAĞ: TERCİHLER (YENİ) */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold border-b pb-2 text-gray-800 dark:text-gray-200">
            Uygulama Ayarları
          </h2>
          <PreferencesWidget />
        </div>

        {/* DİĞER: HESAP */}
        <div className="space-y-4 lg:col-span-2">
          <h2 className="text-xl font-semibold border-b pb-2 text-gray-800 dark:text-gray-200">
            Görünüm
          </h2>
          <AppearanceWidget />
        </div>
      </div>
    </div>
  );
}
