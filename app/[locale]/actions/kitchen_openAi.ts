"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

  // Benzersiz dosya ismi
  const fileExt = file.name.split(".").pop();
  const fileName = `${user.id}-${Date.now()}.${fileExt}`;
  const filePath = `receipts/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("images") // 'images' bucket'ı oluşturduğundan emin ol
    .upload(filePath, file);

  if (uploadError)
    return { error: "Resim yüklenemedi: " + uploadError.message };

  // Resmin Public URL'ini al
  const {
    data: { publicUrl },
  } = supabase.storage.from("images").getPublicUrl(filePath);

  // 3. OpenAI Vision API ile Analiz Et
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5-nano",
      messages: [
        {
          role: "system",
          content: `Sen uzman bir fiş analistisin. Görüntüdeki market fişini analiz et.
          Ürün isimlerini genel isimlere dönüştür (Örn: "Pınar Süt 1L" -> "Süt").
          Sadece şu JSON formatında yanıt ver:
          {
            "shop_name": "Market Adı",
            "total_amount": 150.50,
            "items": [
              { "name": "Süt", "quantity": 1, "category": "Gıda", "unit": "litre" },
              { "name": "Domates", "quantity": 2, "category": "Sebze", "unit": "kg" }
            ]
          }`,
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Bu fişi analiz et." },
            { type: "image_url", image_url: { url: publicUrl } },
          ],
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) return { error: "AI yanıt veremedi." };

    const result = JSON.parse(content);

    // 4. Veritabanına Kaydet (Transaction benzeri işlem)

    // A) Harcamayı Kaydet
    const { error: expenseError } = await supabase.from("expenses").insert({
      family_id: profile.family_id,
      amount: result.total_amount,
      shop_name: result.shop_name,
      receipt_image_url: publicUrl,
      items_json: result.items, // Kanıt olarak sakla
    });

    if (expenseError) console.error("Harcama kayıt hatası:", expenseError);

    // B) Envantere Ekle (Döngü ile)
    for (const item of result.items) {
      // Bu ürün zaten var mı?
      const { data: existing } = await supabase
        .from("inventory")
        .select("id, quantity")
        .eq("family_id", profile.family_id)
        .ilike("product_name", item.name) // Büyük/küçük harf duyarsız ara
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
  } catch (error) {
    console.error("AI Hatası:", error);
    return { error: "Fiş okunamadı. Lütfen tekrar deneyin." };
  }
}
