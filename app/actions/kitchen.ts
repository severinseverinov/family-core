"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
// import OpenAI from "openai"; // OpenAI'ı şimdilik kapattık

// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function scanReceipt(formData: FormData) {
  const supabase = await createClient();

  // 1. Kullanıcı Kontrolü
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum açmanız gerekiyor." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id")
    .eq("id", user.id)
    .single();

  if (!profile?.family_id) return { error: "Bir aileye bağlı değilsiniz." };

  // 2. Dosyayı Al ve Supabase Storage'a Yükle
  const file = formData.get("receipt") as File;
  if (!file) return { error: "Dosya bulunamadı." };

  // Dosya yükleme işlemi (Bu kısım gerçek çalışsın ki Storage test edilsin)
  const fileExt = file.name.split(".").pop();
  const fileName = `${user.id}-${Date.now()}.${fileExt}`;
  const filePath = `receipts/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("images")
    .upload(filePath, file);

  if (uploadError) {
    console.error("Upload hatası:", uploadError);
    // Hata olsa bile devam edelim (Test için), normalde return ederdik.
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("images").getPublicUrl(filePath);

  // ------------------------------------------------------------
  // 3. MOCK DATA (YAPAY ZEKA YERİNE SABİT VERİ)
  // ------------------------------------------------------------
  // OpenAI bakiyesi olmadığı için burayı elle simüle ediyoruz.

  console.log("⚠️ MOCK MODE: OpenAI yerine sahte veri kullanılıyor.");

  // Sanki AI fişi okumuş gibi bu sonucu üretiyoruz:
  const result = {
    shop_name: "Migros (Test Fişi)",
    total_amount: 245.5,
    items: [
      { name: "Tam Yağlı Süt", quantity: 2, category: "Gıda", unit: "litre" },
      {
        name: "Köy Yumurtası",
        quantity: 1,
        category: "Gıda",
        unit: "paket (15li)",
      },
      {
        name: "Bulaşık Deterjanı",
        quantity: 1,
        category: "Temizlik",
        unit: "adet",
      },
      { name: "Çeri Domates", quantity: 0.5, category: "Sebze", unit: "kg" },
    ],
  };

  // ------------------------------------------------------------
  // 4. Veritabanı Kayıt İşlemleri (Gerçek Çalışacak)
  // ------------------------------------------------------------

  try {
    // A) Harcamayı Kaydet
    const { error: expenseError } = await supabase.from("expenses").insert({
      family_id: profile.family_id,
      amount: result.total_amount,
      shop_name: result.shop_name,
      receipt_image_url: publicUrl,
      items_json: result.items,
    });

    if (expenseError)
      throw new Error("Harcama kaydedilemedi: " + expenseError.message);

    // B) Envantere Ekle (Döngü ile)
    for (const item of result.items) {
      // Bu ürün zaten var mı?
      const { data: existing } = await supabase
        .from("inventory")
        .select("id, quantity")
        .eq("family_id", profile.family_id)
        .ilike("product_name", item.name)
        .maybeSingle();

      if (existing) {
        // Varsa üstüne ekle
        await supabase
          .from("inventory")
          .update({ quantity: existing.quantity + item.quantity })
          .eq("id", existing.id);
      } else {
        // Yoksa yeni oluştur
        await supabase.from("inventory").insert({
          family_id: profile.family_id,
          product_name: item.name,
          quantity: item.quantity,
          unit: item.unit || "adet",
          category: item.category || "genel",
        });
      }
    }

    revalidatePath("/dashboard");
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Veritabanı Hatası:", error);
    return { error: error.message || "İşlem başarısız." };
  }
}
