"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { GoogleGenerativeAI } from "@google/generative-ai";

// API Anahtarı Kontrolü
const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// 1. Envanteri Getir
export async function getInventory() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { items: [] };

  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id")
    .eq("id", user.id)
    .single();
  if (!profile?.family_id) return { items: [] };

  const { data } = await supabase
    .from("inventory")
    .select("*")
    .eq("family_id", profile.family_id)
    .order("created_at", { ascending: false }); // En son eklenen en üstte

  return { items: data || [] };
}

// 2. Manuel Ürün Ekle
export async function addInventoryItem(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum açın" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id")
    .eq("id", user.id)
    .single();
  if (!profile?.family_id) return { error: "Aile bulunamadı" };

  const name = formData.get("name") as string;
  const quantity = parseFloat(formData.get("quantity") as string);
  const unit = formData.get("unit") as string;
  const category = formData.get("category") as string;

  const { error } = await supabase.from("inventory").insert({
    family_id: profile.family_id,
    product_name: name,
    quantity,
    unit,
    category,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { success: true };
}

// 3. Ürün Sil
export async function deleteInventoryItem(id: string) {
  const supabase = await createClient();
  await supabase.from("inventory").delete().eq("id", id);
  revalidatePath("/dashboard");
  return { success: true };
}

// 4. Fiş Okuma (Gemini AI)
export async function scanReceipt(formData: FormData) {
  const supabase = await createClient();

  // Kullanıcı ve Aile Kontrolü
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum açın" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id")
    .eq("id", user.id)
    .single();
  if (!profile?.family_id) return { error: "Aile yok" };

  // Dosya Yükleme
  const file = formData.get("receipt") as File;
  if (!file) return { error: "Dosya yok" };

  const fileExt = file.name.split(".").pop();
  const fileName = `${user.id}-${Date.now()}.${fileExt}`;
  const filePath = `receipts/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("images")
    .upload(filePath, file);
  if (uploadError) console.error("Upload hatası:", uploadError);

  const {
    data: { publicUrl },
  } = supabase.storage.from("images").getPublicUrl(filePath);

  // AI Analizi
  try {
    if (!genAI) throw new Error("API Anahtarı eksik (GEMINI_API_KEY)");

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString("base64");

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash-latest",
    });

    const prompt = `
      Market fişini analiz et ve ürünleri JSON olarak ver.
      Format: { "shop_name": string, "total_amount": number, "items": [{ "name": string, "quantity": number, "unit": string, "category": string }] }
      Ürün isimlerini sadeleştir. Birim yoksa "adet" yaz. Kategori örnekleri: Gıda, Temizlik, Sebze.
      Sadece JSON ver.
    `;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Data, mimeType: file.type || "image/jpeg" } },
    ]);

    const response = await result.response;
    const text = response
      .text()
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    const data = JSON.parse(text);

    // Veritabanına Yazma
    await supabase.from("expenses").insert({
      family_id: profile.family_id,
      amount: data.total_amount,
      shop_name: data.shop_name,
      receipt_image_url: publicUrl,
      items_json: data.items,
    });

    for (const item of data.items) {
      // Aynı ürün varsa miktarını artır, yoksa ekle
      const { data: existing } = await supabase
        .from("inventory")
        .select("id, quantity")
        .eq("family_id", profile.family_id)
        .ilike("product_name", item.name)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("inventory")
          .update({ quantity: existing.quantity + item.quantity })
          .eq("id", existing.id);
      } else {
        await supabase.from("inventory").insert({
          family_id: profile.family_id,
          product_name: item.name,
          quantity: item.quantity,
          unit: item.unit || "adet",
          category: item.category || "Genel",
        });
      }
    }

    revalidatePath("/dashboard");
    return { success: true, data };
  } catch (error: any) {
    console.error("AI Hatası:", error);
    return { error: "Fiş okunamadı: " + error.message };
  }
}
