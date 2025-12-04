"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers"; // Çerez yönetimi için

export async function updatePreferences(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Oturum açın" };

  const language = formData.get("language") as string;
  const currency = formData.get("currency") as string;
  const themeColor = formData.get("themeColor") as string;

  // 1. Veritabanını Güncelle
  const { error } = await supabase
    .from("profiles")
    .update({
      preferred_language: language,
      preferred_currency: currency,
      theme_color: themeColor,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  // 2. Dil Çerezini Güncelle (next-intl için)
  // Bu sayede middleware bir sonraki istekte dili buna göre ayarlayacak
  (await cookies()).set("NEXT_LOCALE", language);

  revalidatePath("/dashboard");
  return { success: true };
}

export async function getPreferences() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { language: "tr", currency: "TL" };

  const { data } = await supabase
    .from("profiles")
    .select("preferred_language, preferred_currency")
    .eq("id", user.id)
    .single();

  return {
    language: data?.preferred_language || "tr",
    currency: data?.preferred_currency || "TL",
  };
}
