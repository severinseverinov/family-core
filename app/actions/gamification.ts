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

// 3. Ödül Ekle (DÜZELTİLEN KISIM)
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

  // HATA ÇÖZÜMÜ: Profilin kesinlikle var olduğunu kontrol et
  if (!profile) {
    return { error: "Kullanıcı profili bulunamadı." };
  }

  // Aile ID'si var mı kontrol et
  if (!profile.family_id) {
    return { error: "Bir aileye bağlı değilsiniz." };
  }

  // Yetki kontrolü
  if (!["owner", "admin"].includes(profile.role || "")) {
    return { error: "Sadece ebeveynler ödül ekleyebilir." };
  }

  const title = formData.get("title") as string;
  const cost = parseInt(formData.get("cost") as string);
  const icon = formData.get("icon") as string;

  // Artık profile.family_id'nin string olduğunu biliyoruz
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

// 4. Ödül Satın Al (Redeem)
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

  if ((profile?.current_points || 0) < cost) {
    return { error: "Yetersiz Puan!" };
  }

  const { error } = await supabase.rpc("add_points", {
    target_user_id: user.id,
    points_amount: -cost,
    reason: `Ödül alındı: ${rewardTitle}`,
  });

  if (error) return { error: "İşlem başarısız: " + error.message };

  revalidatePath("/dashboard");
  return { success: true };
}
