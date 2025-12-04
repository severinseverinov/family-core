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

  // Envanter
  const { data: items } = await supabase
    .from("inventory")
    .select("*")
    .eq("family_id", profile.family_id)
    .order("created_at", { ascending: false });

  // Alışveriş Listesi
  const { data: shoppingList } = await supabase
    .from("shopping_list")
    .select("*")
    .eq("family_id", profile.family_id)
    .order("is_checked", { ascending: true })
    .order("is_urgent", { ascending: false })
    .order("created_at", { ascending: false });

  // Aile Bütçesi
  const { data: family } = await supabase
    .from("families")
    .select("kitchen_budget")
    .eq("id", profile.family_id)
    .single();

  // Harcama
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
    shoppingList: shoppingList || [],
    budget: family?.kitchen_budget || 0,
    spent: totalSpent,
  };
}

// 2. Bütçe Limiti Ayarla
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

  if (!profile || !profile.family_id) return { error: "Profil bulunamadı." };

  if (!["owner", "admin"].includes(profile.role || "")) {
    return { error: "Sadece ebeveynler bütçe ayarlayabilir." };
  }

  await supabase
    .from("families")
    .update({ kitchen_budget: amount })
    .eq("id", profile.family_id);
  revalidatePath("/dashboard");
  return { success: true };
}

// 3. Manuel Ürün Ekle
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
  if (!["owner", "admin"].includes(profile.role || ""))
    return { error: "Yetkisiz işlem." };

  const name = formData.get("name") as string;
  const quantity = parseFloat(formData.get("quantity") as string);
  const unit = formData.get("unit") as string;
  const category = formData.get("category") as string;
  const price = parseFloat(formData.get("price") as string) || 0;

  const { error } = await supabase.from("inventory").insert({
    family_id: profile.family_id,
    product_name: name,
    product_name_en: name,
    quantity,
    unit,
    category,
    last_price: price,
  });

  if (error) return { error: error.message };

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

// 4. Miktar Güncelleme (GÜNCELLENDİ)
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

  // DÜZELTME: Hem profilin hem de family_id'nin varlığını kontrol ediyoruz
  if (!profile || !profile.family_id)
    return { error: "Profil veya aile bilgisi eksik" };

  const { data: item } = await supabase
    .from("inventory")
    .select("quantity, last_price, product_name")
    .eq("id", itemId)
    .single();

  if (!item) return { error: "Ürün bulunamadı" };

  if (change > 0) {
    if (!["owner", "admin"].includes(profile.role || ""))
      return { error: "Sadece ebeveynler artırabilir." };
    if (item.last_price > 0) {
      // profile.family_id artık güvenli (string)
      await supabase.from("expenses").insert({
        family_id: profile.family_id,
        amount: item.last_price * change,
        shop_name: "Stok Güncelleme",
        items_json: [
          { name: item.product_name, quantity: change, price: item.last_price },
        ],
      });
    }
  }

  const newQuantity = Math.max(0, item.quantity + change);
  await supabase
    .from("inventory")
    .update({ quantity: newQuantity })
    .eq("id", itemId);

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

// --- ALIŞVERİŞ LİSTESİ ---

export async function addToShoppingList(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id")
    .eq("id", user?.id)
    .single();

  if (!profile?.family_id) return { error: "Hata" };

  const name = (formData.get("name") as string).trim();
  const marketName = (formData.get("marketName") as string)?.trim() || null;

  const { data: existingItem } = await supabase
    .from("shopping_list")
    .select("id")
    .eq("family_id", profile.family_id)
    .eq("is_checked", false)
    .ilike("product_name", name)
    .maybeSingle();

  if (existingItem) {
    return { error: "Bu ürün zaten listenizde var." };
  }

  const { error } = await supabase.from("shopping_list").insert({
    family_id: profile.family_id,
    product_name: name,
    market_name: marketName,
    added_by: user?.id,
    is_urgent: false,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { success: true };
}

export async function toggleShoppingItem(id: string, isChecked: boolean) {
  const supabase = await createClient();
  await supabase
    .from("shopping_list")
    .update({ is_checked: isChecked })
    .eq("id", id);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function toggleShoppingItemUrgency(id: string, isUrgent: boolean) {
  const supabase = await createClient();
  await supabase
    .from("shopping_list")
    .update({ is_urgent: isUrgent })
    .eq("id", id);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteShoppingItem(id: string) {
  const supabase = await createClient();
  await supabase.from("shopping_list").delete().eq("id", id);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function clearCompletedShoppingItems() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id")
    .eq("id", user?.id)
    .single();

  if (profile?.family_id) {
    await supabase
      .from("shopping_list")
      .delete()
      .eq("family_id", profile.family_id)
      .eq("is_checked", true);
  }
  revalidatePath("/dashboard");
  return { success: true };
}

// 6. Fiş Okuma (Analiz)
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

    const prompt = `
      Market fişini analiz et.
      JSON Formatı: 
      { 
        "shop_name": string, 
        "total_amount": number, 
        "currency": "TL",
        "items": [
          { "name": "string", "quantity": number, "unit": "string", "category": "string", "unit_price": number }
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

    return { success: true, data: { ...data, receipt_image_url: publicUrl } };
  } catch (error: any) {
    return { error: "Fiş okunamadı: " + error.message };
  }
}

// 7. Fiş Kaydetme
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

  // Harcama Kaydet
  await supabase.from("expenses").insert({
    family_id: profile.family_id,
    amount: receiptData.total_amount,
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
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("inventory").insert({
        family_id: profile.family_id,
        product_name: item.name,
        product_name_en: item.name,
        quantity: item.quantity,
        unit: item.unit || "adet",
        category: item.category || "Genel",
        last_price: item.unit_price,
      });
    }

    // Alışveriş Listesinden Düş
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
