"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createFamily(formData: FormData) {
  const supabase = await createClient();

  // 1. Kullanıcı Oturumu Kontrolü
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Kullanıcı oturumu bulunamadı." };
  }

  // ---------------------------------------------------------
  // BUG FİX: GÜVENLİ VERİ DOĞRULAMA (VALIDATION)
  // ---------------------------------------------------------
  const rawName = formData.get("familyName");

  // 1. Veri var mı? 2. String mi? 3. Boşlukları silince boş mu kalıyor?
  if (!rawName || typeof rawName !== "string" || rawName.trim().length === 0) {
    return { error: "Lütfen geçerli bir aile adı giriniz." };
  }

  // Temizlenmiş veriyi al
  const familyName = rawName.trim();
  // ---------------------------------------------------------

  console.log(
    "İşlem Başlıyor: Kullanıcı ID:",
    user.id,
    "Aile Adı:",
    familyName
  );

  // 2. Aile Tablosuna Ekleme
  const { data: family, error: familyError } = await supabase
    .from("families")
    .insert({
      name: familyName,
      owner_id: user.id,
    })
    .select()
    .single();

  if (familyError) {
    console.error("KRİTİK HATA - Aile Oluşturulamadı:", familyError.message);
    return { error: "Aile oluşturulamadı: " + familyError.message };
  }

  console.log("Aile oluşturuldu. Family ID:", family.id);

  // 3. Profil Güncelleme
  const { data: updatedProfile, error: profileError } = await supabase
    .from("profiles")
    .update({
      family_id: family.id,
      role: "owner",
    })
    .eq("id", user.id)
    .select();

  if (profileError) {
    console.error("KRİTİK HATA - Profil Güncellenemedi:", profileError.message);
    // Not: Aile oluştu ama profil güncellenemedi, burada transaction yapısı daha iyi olurdu
    // ama şimdilik basit tutuyoruz.
    return { error: "Profil güncellenemedi." };
  }

  if (!updatedProfile || updatedProfile.length === 0) {
    console.error("GİZLİ HATA - RLS Engeli");
    return { error: "Güvenlik politikası profil güncellemesini engelledi." };
  }

  console.log("BAŞARILI! Profil güncellendi.");

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
