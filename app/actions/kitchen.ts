"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Gemini İstemcisini Başlat
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

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

  // 2. Dosyayı Al
  const file = formData.get("receipt") as File;
  if (!file) return { error: "Dosya bulunamadı." };

  // 3. Dosyayı Supabase Storage'a Yükle (Arşiv için)
  const fileExt = file.name.split(".").pop();
  const fileName = `${user.id}-${Date.now()}.${fileExt}`;
  const filePath = `receipts/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("images")
    .upload(filePath, file);

  if (uploadError) {
    console.error("Upload hatası:", uploadError);
    // Storage hatası olsa bile analize devam edebiliriz, ama resim linki bozuk olur.
  }

  // Resmin Public URL'ini al (Veritabanına kaydetmek için)
  const {
    data: { publicUrl },
  } = supabase.storage.from("images").getPublicUrl(filePath);

  // 4. Gemini AI ile Analiz Et
  try {
    // Dosyayı Base64'e çevir (Gemini'ye göndermek için)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString("base64");

    // Modeli Seç (Gemini 1.5 Flash hızlı ve ekonomiktir)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Sen uzman bir fiş analistisin. Görüntüdeki market fişini analiz et.
      Ürün isimlerini genel, sade isimlere dönüştür (Örn: "Pınar Yarım Yağlı Süt 1L" -> "Süt").
      
      Çıktıyı SADECE aşağıdaki JSON formatında ver, markdown veya 'json' etiketi kullanma:
      {
        "shop_name": "Market Adı",
        "total_amount": 150.50,
        "items": [
          { "name": "Süt", "quantity": 1, "category": "Gıda", "unit": "litre" },
          { "name": "Domates", "quantity": 2, "category": "Sebze", "unit": "kg" }
        ]
      }
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: file.type || "image/jpeg",
        },
      },
    ]);

    const response = await result.response;
    let text = response.text();

    // Temizlik: Gemini bazen ```json ... ``` blokları içinde yanıt verir, onları silelim.
    text = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const data = JSON.parse(text);

    // 5. Veritabanına Kaydet

    // A) Harcamayı Kaydet
    const { error: expenseError } = await supabase.from("expenses").insert({
      family_id: profile.family_id,
      amount: data.total_amount,
      shop_name: data.shop_name,
      receipt_image_url: publicUrl,
      items_json: data.items,
    });

    if (expenseError)
      throw new Error("Harcama kaydedilemedi: " + expenseError.message);

    // B) Envantere Ekle (Döngü ile)
    for (const item of data.items) {
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
    return { success: true, data: data };
  } catch (error: any) {
    console.error("Gemini Hatası:", error);
    return { error: "Fiş okunamadı: " + (error.message || "Bilinmeyen hata") };
  }
}
