"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";

// 1. Aile Oluşturma
export async function createFamily(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum açın" };

  const rawName = formData.get("familyName");
  if (!rawName || typeof rawName !== "string" || rawName.trim().length === 0) {
    return { error: "Geçerli bir isim giriniz." };
  }
  const familyName = rawName.trim();

  // Aile oluştur
  const { data: family, error: familyError } = await supabase
    .from("families")
    .insert({ name: familyName })
    .select()
    .single();

  if (familyError)
    return { error: "Aile oluşturulamadı: " + familyError.message };

  // Profili güncelle
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ family_id: family.id, role: "owner" })
    .eq("id", user.id);

  if (profileError) return { error: "Profil güncellenemedi." };

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

// ----------------------------------------------------
// YENİ: ÜYE VE DAVET YÖNETİMİ
// ----------------------------------------------------

// 2. Aile Üyelerini Getir
export async function getFamilyMembers() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { members: [] };

  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id")
    .eq("id", user.id)
    .single();

  // Profil veya aile yoksa boş dön
  if (!profile || !profile.family_id) return { members: [] };

  const { data: members } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, avatar_url")
    .eq("family_id", profile.family_id)
    .order("role", { ascending: false }); // Owner/Admin en üstte

  return { members: members || [] };
}

// 3. Bekleyen Davetleri Getir
export async function getInvitations() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { invitations: [] };

  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id, role")
    .eq("id", user.id)
    .single();

  // HATA ÇÖZÜMÜ: Profilin varlığını kesin kontrol et
  if (!profile) return { invitations: [] };

  // Sadece ebeveynler görebilir
  if (!["owner", "admin"].includes(profile.role || ""))
    return { invitations: [] };

  const { data: invitations } = await supabase
    .from("invitations")
    .select("*")
    .eq("family_id", profile.family_id) // Artık profile.family_id güvenli
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return { invitations: invitations || [] };
}

// 4. Davet Oluştur
export async function createInvitation(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum açın" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id, role")
    .eq("id", user.id)
    .single();

  if (!profile) return { error: "Profil bulunamadı" };
  if (!["owner", "admin"].includes(profile.role || ""))
    return { error: "Yetkisiz işlem" };
  if (!profile.family_id) return { error: "Bir aileye bağlı değilsiniz" };

  const email = formData.get("email") as string;
  const role = (formData.get("role") as string) || "member";

  // Benzersiz Token Oluştur (Link için)
  const token = randomBytes(16).toString("hex");

  const { error } = await supabase.from("invitations").insert({
    family_id: profile.family_id,
    email,
    role,
    token,
  });

  if (error) return { error: "Davet oluşturulamadı: " + error.message };

  revalidatePath("/dashboard/settings");
  // Davet linkini döndür (Canlı URL veya Localhost)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return { success: true, link: `${baseUrl}/join?token=${token}` };
}

// 5. Daveti İptal Et
export async function cancelInvitation(id: string) {
  const supabase = await createClient();
  await supabase.from("invitations").delete().eq("id", id);
  revalidatePath("/dashboard/settings");
  return { success: true };
}

// 6. Üye Çıkar
export async function removeMember(memberId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("role, family_id")
    .eq("id", user?.id)
    .single();

  if (!myProfile) return { error: "Profiliniz bulunamadı" };
  if (!["owner", "admin"].includes(myProfile.role || ""))
    return { error: "Yetkisiz" };

  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("role, family_id")
    .eq("id", memberId)
    .single();

  if (!targetProfile) return { error: "Hedef kullanıcı bulunamadı" };
  if (targetProfile.role === "owner") return { error: "Aile reisi silinemez." };
  if (targetProfile.family_id !== myProfile.family_id)
    return { error: "Bu kullanıcı ailenizde değil." };

  // Kullanıcının family_id'sini sıfırla
  const { error } = await supabase
    .from("profiles")
    .update({ family_id: null, role: "member" })
    .eq("id", memberId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/settings");
  return { success: true };
}

// 7. Daveti Kabul Et (Join)
export async function acceptInvitation(token: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Lütfen önce giriş yapın." };

  // RPC ile daveti bul (Security Definer sayesinde RLS'i aşar)
  const { data: invitation, error } = await supabase.rpc(
    "get_invitation_by_token",
    { token_input: token }
  );

  if (error || !invitation || invitation.length === 0) {
    return { error: "Davet geçersiz veya süresi dolmuş." };
  }

  const invite = invitation[0];

  if (invite.status !== "pending")
    return { error: "Bu davet zaten kullanılmış." };

  // Profili Güncelle (Aileye Katıl)
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      family_id: invite.family_id,
      role: invite.role,
    })
    .eq("id", user.id);

  if (updateError) return { error: "Katılım başarısız." };

  // Daveti 'accepted' yap
  await supabase.rpc("mark_invitation_accepted", { invite_id: invite.id });

  revalidatePath("/dashboard");
  return { success: true };
}
