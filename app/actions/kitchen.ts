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
  if (!user) return { items: [], budget: 0, spent: 0 };

  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.family_id) return { items: [], budget: 0, spent: 0 };

  // Envanter
  const { data: items } = await supabase
    .from("inventory")
    .select("*")
    .eq("family_id", profile.family_id)
    .order("created_at", { ascending: false });

  // Aile Bütçesi
  const { data: family } = await supabase
    .from("families")
    .select("kitchen_budget")
    .eq("id", profile.family_id)
    .single();

  // Bu Ayki Harcamalar
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: expenses } = await supabase
    .from("expenses")
    .select("amount")
    .eq("family_id", profile.family_id)
    .gte("created_at", startOfMonth.toISOString());

  const totalSpent = expenses?.reduce((sum, item) => sum + item.amount, 0) || 0;

  return {
    items: items || [],
    budget: family?.kitchen_budget || 0,
    spent: totalSpent,
  };
}

// 2. Bütçe Limiti Ayarla (HATA BURADAYDI - DÜZELTİLDİ)
export async function updateBudget(amount: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Yetkisiz" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id, role")
    .eq("id", user.id)
    .single();

  // DÜZELTME: Profilin varlığını kesin kontrol ediyoruz
  if (!profile) return { error: "Profil bulunamadı." };

  if (!["owner", "admin"].includes(profile.role || "")) {
    return { error: "Sadece ebeveynler bütçe ayarlayabilir." };
  }

  // family_id'nin var olduğunu yukarıda garantiye aldık (profile varsa family_id de vardır veya null olsa bile sql hata vermez, ama biz yine de logic olarak profile var sayıyoruz)
  // Daha güvenli olması için:
  if (!profile.family_id) return { error: "Bir aileye bağlı değilsiniz." };

  await supabase
    .from("families")
    .update({ kitchen_budget: amount })
    .eq("id", profile.family_id);
  revalidatePath("/dashboard");
  return { success: true };
}

// 3. Manuel Ürün Ekle (Fiyatlı)
export async function addInventoryItem(formData: FormData) {
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

  if (!profile || !profile.family_id) return { error: "Aile bulunamadı" };

  // YETKİ KONTROLÜ
  if (!["owner", "admin"].includes(profile.role || "")) {
    return { error: "Yetkisiz işlem." };
  }

  const name = formData.get("name") as string;
  const quantity = parseFloat(formData.get("quantity") as string);
  const unit = formData.get("unit") as string;
  const category = formData.get("category") as string;
  const price = parseFloat(formData.get("price") as string) || 0;

  // Ürünü Ekle
  const { error } = await supabase.from("inventory").insert({
    family_id: profile.family_id,
    product_name: name,
    quantity,
    unit,
    category,
    last_price: price,
  });

  if (error) return { error: error.message };

  // Eğer fiyat varsa Harcamalara da ekle
  if (price > 0) {
    await supabase.from("expenses").insert({
      family_id: profile.family_id,
      amount: price * quantity,
      shop_name: "Manuel Ekleme",
      items_json: [{ name, quantity, price }],
    });
  }

  revalidatePath("/dashboard");
  return { success: true };
}

// 4. Miktar Güncelleme (+/-)
export async function updateItemQuantity(itemId: string, change: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum açın" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, family_id")
    .eq("id", user.id)
    .single();
  if (!profile) return { error: "Profil yok" };

  const { data: item } = await supabase
    .from("inventory")
    .select("quantity, last_price, product_name")
    .eq("id", itemId)
    .single();

  if (!item) return { error: "Ürün bulunamadı" };

  const newQuantity = item.quantity + change;

  // KURAL: Artış varsa (+) ve ebeveyn değilse engelle
  if (change > 0) {
    if (!["owner", "admin"].includes(profile.role || "")) {
      return { error: "Stok artırmayı sadece ebeveynler yapabilir." };
    }

    // ARTIŞ VARSA HARCAMAYA EKLE
    if (item.last_price > 0) {
      const cost = item.last_price * change;
      await supabase.from("expenses").insert({
        family_id: profile.family_id,
        amount: cost,
        shop_name: "Stok Güncelleme",
        items_json: [
          { name: item.product_name, quantity: change, price: item.last_price },
        ],
      });
    }
  }

  if (newQuantity < 0) return { error: "Stok yetersiz." };

  const { error } = await supabase
    .from("inventory")
    .update({ quantity: newQuantity })
    .eq("id", itemId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { success: true };
}

// 5. Ürün Sil
export async function deleteInventoryItem(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum açın" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile) return { error: "Profil yok" };

  if (!["owner", "admin"].includes(profile.role || "")) {
    return { error: "Yetkisiz işlem." };
  }

  await supabase.from("inventory").delete().eq("id", id);
  revalidatePath("/dashboard");
  return { success: true };
}

// 6. Fiş Okuma
export async function scanReceipt(formData: FormData) {
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
  if (!profile || !profile.family_id) return { error: "Aile yok" };

  const file = formData.get("receipt") as File;
  if (!file) return { error: "Dosya yok" };

  const fileExt = file.name.split(".").pop();
  const fileName = `${user.id}-${Date.now()}.${fileExt}`;
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

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      Market fişini analiz et. Ürünlerin BİRİM FİYATINI (unit_price) da çıkar.
      JSON Formatı: 
      { 
        "shop_name": string, 
        "total_amount": number, 
        "items": [
          { "name": string, "quantity": number, "unit": string, "category": string, "unit_price": number }
        ] 
      }
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

    await supabase.from("expenses").insert({
      family_id: profile.family_id,
      amount: data.total_amount,
      shop_name: data.shop_name,
      receipt_image_url: publicUrl,
      items_json: data.items,
    });

    for (const item of data.items) {
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
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("inventory").insert({
          family_id: profile.family_id,
          product_name: item.name,
          quantity: item.quantity,
          unit: item.unit || "adet",
          category: item.category || "Genel",
          last_price: item.unit_price,
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
