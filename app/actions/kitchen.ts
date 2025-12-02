"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// --- STOK (INVENTORY) FONKSİYONLARI ---

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

  // Stok
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
    .order("is_checked", { ascending: true }) // Yapılmamışlar üstte
    .order("created_at", { ascending: false });

  // Bütçe
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

// Bütçe Güncelle
export async function updateBudget(amount: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id, role")
    .eq("id", user?.id)
    .single();
  if (!profile || !["owner", "admin"].includes(profile.role))
    return { error: "Yetkisiz" };

  await supabase
    .from("families")
    .update({ kitchen_budget: amount })
    .eq("id", profile.family_id);
  revalidatePath("/dashboard");
  return { success: true };
}

// Stok Ekle
export async function addInventoryItem(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id, role")
    .eq("id", user?.id)
    .single();

  if (!profile || !["owner", "admin"].includes(profile.role))
    return { error: "Yetkisiz işlem" };

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

// Stok Güncelle
export async function updateItemQuantity(itemId: string, change: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, family_id")
    .eq("id", user?.id)
    .single();

  const { data: item } = await supabase
    .from("inventory")
    .select("quantity, last_price, product_name")
    .eq("id", itemId)
    .single();
  if (!item) return { error: "Ürün yok" };

  if (change > 0) {
    if (!["owner", "admin"].includes(profile?.role || ""))
      return { error: "Sadece ebeveynler artırabilir." };
    if (item.last_price > 0) {
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

export async function deleteInventoryItem(id: string) {
  const supabase = await createClient();
  await supabase.from("inventory").delete().eq("id", id);
  revalidatePath("/dashboard");
  return { success: true };
}

// --- ALIŞVERİŞ LİSTESİ (SHOPPING LIST) FONKSİYONLARI ---

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

  const name = formData.get("name") as string;

  const { error } = await supabase.from("shopping_list").insert({
    family_id: profile.family_id,
    product_name: name,
    added_by: user?.id,
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

  await supabase
    .from("shopping_list")
    .delete()
    .eq("family_id", profile?.family_id)
    .eq("is_checked", true);

  revalidatePath("/dashboard");
  return { success: true };
}

// --- FİŞ OKUMA VE ENTEGRASYON ---

export async function scanReceipt(formData: FormData) {
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

  const file = formData.get("receipt") as File;
  const fileExt = file.name.split(".").pop();
  const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
  const filePath = `receipts/${fileName}`;

  await supabase.storage.from("images").upload(filePath, file);
  const {
    data: { publicUrl },
  } = supabase.storage.from("images").getPublicUrl(filePath);

  try {
    if (!genAI) throw new Error("API Key Eksik");
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString("base64");

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const prompt = `
      Market fişini analiz et.
      JSON: { "shop_name": string, "total_amount": number, "items": [{ "name": string, "name_en": string, "quantity": number, "unit": string, "category": string, "unit_price": number }] }
      Ürün isimlerini sadeleştir (Örn: "Pınar Süt" -> "Süt"). name_en: İngilizce karşılığı.
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

    // Harcama Kaydet
    await supabase.from("expenses").insert({
      family_id: profile.family_id,
      amount: data.total_amount,
      shop_name: data.shop_name,
      receipt_image_url: publicUrl,
      items_json: data.items,
    });

    for (const item of data.items) {
      // 1. Stoğa Ekle
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
            product_name_en: item.name_en,
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
        });
      }

      // 2. ALIŞVERİŞ LİSTESİNDEN DÜŞ (OTOMATİK SİLME)
      // Fişte "Süt" var, listede "Süt" veya "Milk" varsa sil.
      const { error: delError } = await supabase
        .from("shopping_list")
        .delete()
        .eq("family_id", profile.family_id)
        .ilike("product_name", item.name); // Tam isim eşleşmesi arar

      // Alternatif: Eğer Türkçe isimle bulamazsa, İngilizce isimle de dene (Opsiyonel)
      // if (item.name_en) ...
    }

    revalidatePath("/dashboard");
    return { success: true, data };
  } catch (error: any) {
    return { error: "Fiş okunamadı: " + error.message };
  }
}
