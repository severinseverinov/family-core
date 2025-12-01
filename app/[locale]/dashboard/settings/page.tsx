import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { MembersWidget } from "@/components/dashboard/settings/MembersWidget";
import { getFamilyMembers, getInvitations } from "@/app/actions/family";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Profil ve Yetki Kontrolü
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile?.family_id) redirect("/dashboard");

  // Verileri Çek (Parallel Fetching)
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

      <div className="grid gap-8">
        {/* ÜYE YÖNETİMİ */}
        <div className="space-y-4">
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

        {/* DİĞER AYARLAR (Gelecek Özellik) */}
        <div className="space-y-4 opacity-50 pointer-events-none grayscale">
          <h2 className="text-xl font-semibold border-b pb-2 text-gray-800 dark:text-gray-200">
            Hesap Ayarları (Yakında)
          </h2>
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded text-sm text-gray-500">
            İsim değiştirme, avatar yükleme ve abonelik yönetimi bu alanda
            olacak.
          </div>
        </div>
      </div>
    </div>
  );
}
