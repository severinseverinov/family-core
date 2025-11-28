"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// 1. Liderlik Tablosunu ve Kullanıcıları Çek
export async function getLeaderboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { users: [] };

  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id")
    .eq("id", user.id)
    .single();
  if (!profile?.family_id) return { users: [] };

  const { data: users } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, current_points, role")
    .eq("family_id", profile.family_id)
    .order("current_points", { ascending: false });

  return { users: users || [] };
}

// 2. Ödülleri Çek
export async function getRewards() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { rewards: [] };

  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id")
    .eq("id", user.id)
    .single();
  if (!profile?.family_id) return { rewards: [] };

  const { data: rewards } = await supabase
    .from("rewards")
    .select("*")
    .eq("family_id", profile.family_id)
    .order("cost", { ascending: true });

  return { rewards: rewards || [] };
}

// 3. Ödül Ekle
export async function createReward(formData: FormData) {
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

  if (!profile || !profile.family_id) return { error: "Profil bulunamadı." };
  if (!["owner", "admin"].includes(profile.role || ""))
    return { error: "Yetkisiz işlem" };

  const title = formData.get("title") as string;
  const cost = parseInt(formData.get("cost") as string);
  const icon = formData.get("icon") as string;

  const { error } = await supabase.from("rewards").insert({
    family_id: profile.family_id,
    title,
    cost,
    icon,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { success: true };
}

// 4. Ödül Satın Al (Puan Düş)
export async function redeemReward(
  rewardId: string,
  cost: number,
  rewardTitle: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Hata" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("current_points")
    .eq("id", user.id)
    .single();
  if ((profile?.current_points || 0) < cost) return { error: "Yetersiz Puan!" };

  const { error } = await supabase.rpc("add_points", {
    target_user_id: user.id,
    points_amount: -cost,
    reason: `Ödül alındı: ${rewardTitle}`,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { success: true };
}

// 5. Puan Ver (Manuel)
export async function givePoints(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum açın" };

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!["owner", "admin"].includes(adminProfile?.role || ""))
    return { error: "Yetkisiz işlem" };

  const targetUserId = formData.get("targetUserId") as string;
  const amount = parseInt(formData.get("amount") as string);
  const reason = formData.get("reason") as string;

  if (!targetUserId || !amount || !reason) return { error: "Eksik bilgi" };

  const { error } = await supabase.rpc("add_points", {
    target_user_id: targetUserId,
    points_amount: amount,
    reason: reason,
  });

  if (error) return { error: "İşlem başarısız: " + error.message };
  revalidatePath("/dashboard");
  return { success: true };
}

// 6. Puan Geçmişi
export async function getPointHistory() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { history: [] };

  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id")
    .eq("id", user.id)
    .single();
  if (!profile?.family_id) return { history: [] };

  const { data: history } = await supabase
    .from("point_history")
    .select(`id, amount, description, created_at, profiles (full_name)`)
    .eq("family_id", profile.family_id)
    .order("created_at", { ascending: false })
    .limit(15);

  return { history: history || [] };
}

// --------------------------------------------------------
// YENİ EKLENENLER: PUAN CETVELİ (RULES)
// --------------------------------------------------------

// 7. Puan Kurallarını Getir
export async function getPointRules() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { rules: [] };

  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id")
    .eq("id", user.id)
    .single();
  if (!profile?.family_id) return { rules: [] };

  const { data: rules } = await supabase
    .from("point_rules")
    .select("*")
    .eq("family_id", profile.family_id)
    .order("points", { ascending: true });

  return { rules: rules || [] };
}

// 8. Yeni Kural Ekle
export async function createPointRule(formData: FormData) {
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

  if (!profile || !profile.family_id) return { error: "Hata" };
  if (!["owner", "admin"].includes(profile.role || ""))
    return { error: "Yetkisiz" };

  const title = formData.get("title") as string;
  const points = parseInt(formData.get("points") as string);

  const { error } = await supabase.from("point_rules").insert({
    family_id: profile.family_id,
    title,
    points,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { success: true };
}

// 9. Kural Sil
export async function deletePointRule(id: string) {
  const supabase = await createClient();
  await supabase.from("point_rules").delete().eq("id", id);
  revalidatePath("/dashboard");
}
