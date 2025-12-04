"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// 1. Envanteri ve Bütçe Durumunu Getir
export async function getInventoryAndBudget() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { items: [], budget: 0, spent: 0, shoppingList: [] };

  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id")
    .eq("id", user.id)
    .single();
  if (!profile || !profile.family_id)
    return { items: [], budget: 0, spent: 0, shoppingList: [] };

  const { data: items } = await supabase
    .from("inventory")
    .select("*")
    .eq("family_id", profile.family_id)
    .order("created_at", { ascending: false });

  const { data: shoppingList } = await supabase
    .from("shopping_list")
    .select("*")
    .eq("family_id", profile.family_id)
    .order("is_checked", { ascending: true })
    .order("is_urgent", { ascending: false })
    .order("created_at", { ascending: false });

  const { data: family } = await supabase
    .from("families")
    .select("kitchen_budget")
    .eq("id", profile.family_id)
    .single();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // Harcamaları çekerken para birimi dönüşümü yapmıyoruz, sadece toplam tutarı alıyoruz.
  // İleride kur dönüşümü eklenebilir. Şimdilik sadece TL varsayıyoruz veya karışık topluyoruz.
  const { data: expenses } = await supabase
    .from("expenses")
    .select("amount, currency") // currency'yi de çekebiliriz
    .eq("family_id", profile.family_id)
    .gte("created_at", startOfMonth.toISOString());

  const totalSpent = expenses?.reduce((sum, item) => sum + item.amount, 0) || 0;

  return {
    items: items || [],
    shoppingList: shoppingList || [],
    budget: family?.kitchen_budget || 0,
    spent: totalSpent,
  };
}

// ... (updateBudget, addInventoryItem, updateItemQuantity, deleteInventoryItem AYNI KALIYOR - Yer kazanmak için kısalttım) ...
export async function updateBudget(amount: number) {
  /* ... */ return { success: true };
}
export async function addInventoryItem(formData: FormData) {
  /* ... */ return { success: true };
}
export async function updateItemQuantity(itemId: string, change: number) {
  /* ... */ return { success: true };
}
export async function deleteInventoryItem(id: string) {
  /* ... */ return { success: true };
}
export async function addToShoppingList(formData: FormData) {
  /* ... */ return { success: true };
}
export async function toggleShoppingItem(id: string, isChecked: boolean) {
  /* ... */ return { success: true };
}
export async function toggleShoppingItemUrgency(id: string, isUrgent: boolean) {
  /* ... */ return { success: true };
}
export async function deleteShoppingItem(id: string) {
  /* ... */ return { success: true };
}
export async function clearCompletedShoppingItems() {
  /* ... */ return { success: true };
}

// 6. Fiş Okuma (Analiz) - GÜNCELLENDİ
export async function analyzeReceipt(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum açın" };

  const file = formData.get("receipt") as File;
  if (!file) return { error: "Dosya yok" };

  const fileExt = file.name.split(".").pop();
  const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
  const filePath = `receipts/${fileName}`;

  await supabase.storage.from("images").upload(filePath, file);
  const {
    data: { publicUrl },
  } = supabase.storage.from("images").getPublicUrl(filePath);

  try {
    if (!genAI) throw new Error("API Anahtarı eksik");

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString("base64");

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    // PROMPT GÜNCELLENDİ: Para birimini özellikle istiyoruz
    const prompt = `
      Market fişini analiz et.
      JSON Formatı: 
      { 
        "shop_name": string, 
        "total_amount": number, 
        "currency": "TL" | "EUR" | "USD" | "GBP", // Fişteki para birimi sembolüne bak (€ -> EUR, $ -> USD)
        "items": [
          { "name": "string", "name_en": "string", "quantity": number, "unit": "string", "category": "string", "unit_price": number }
        ] 
      }
      Eğer para birimi sembolü yoksa veya anlaşılamıyorsa varsayılan "TL" yap.
      Birim fiyat yoksa toplam fiyattan hesapla. Sadece JSON ver.
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

    // Eğer AI para birimini bulamadıysa varsayılan 'TL' ata
    if (!data.currency) data.currency = "TL";

    return { success: true, data: { ...data, receipt_image_url: publicUrl } };
  } catch (error: any) {
    return { error: "Fiş okunamadı: " + error.message };
  }
}

// 7. Fiş Kaydetme - GÜNCELLENDİ
export async function saveReceipt(receiptData: any) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id")
    .eq("id", user?.id)
    .single();

  if (!profile || !profile.family_id) return { error: "Hata" };

  // Harcama Kaydet (Currency ile)
  await supabase.from("expenses").insert({
    family_id: profile.family_id,
    amount: receiptData.total_amount,
    currency: receiptData.currency, // <-- YENİ
    shop_name: receiptData.shop_name,
    receipt_image_url: receiptData.receipt_image_url,
    items_json: receiptData.items,
  });

  for (const item of receiptData.items) {
    const { data: existing } = await supabase
      .from("inventory")
      .select("id, quantity")
      .eq("family_id", profile.family_id)
      .ilike("product_name", item.name)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("inventory")
        .update({
          quantity: existing.quantity + item.quantity,
          last_price: item.unit_price,
          last_price_currency: receiptData.currency, // <-- YENİ
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("inventory").insert({
        family_id: profile.family_id,
        product_name: item.name,
        product_name_en: item.name_en,
        quantity: item.quantity,
        unit: item.unit || "adet",
        category: item.category || "Genel",
        last_price: item.unit_price,
        last_price_currency: receiptData.currency, // <-- YENİ
      });
    }

    await supabase
      .from("shopping_list")
      .delete()
      .eq("family_id", profile.family_id)
      .ilike("product_name", item.name);
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function scanReceipt(formData: FormData) {
  return { error: "Bu fonksiyon güncellendi. analyzeReceipt kullanın." };
}
