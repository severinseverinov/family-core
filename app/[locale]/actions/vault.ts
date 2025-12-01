"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { encrypt, decrypt } from "@/utils/encryption";

// Listeyi Getir
export async function getVaultItems() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { items: [] };

  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || !["owner", "admin"].includes(profile.role)) {
    return { error: "Erişim yetkiniz yok." };
  }

  const { data: items } = await supabase
    .from("vault_items")
    .select("*") // Hepsini çekelim
    .eq("family_id", profile.family_id)
    .order("created_at", { ascending: false });

  return { items: items || [] };
}

// Şifre Çöz (Metinler İçin)
export async function revealSecret(itemId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: item } = await supabase
    .from("vault_items")
    .select("encrypted_data")
    .eq("id", itemId)
    .single();

  if (!item || !item.encrypted_data) return { error: "Veri yok" };

  try {
    const secret = decrypt(item.encrypted_data);
    return { secret };
  } catch (e) {
    return { error: "Şifre çözülemedi." };
  }
}

// Dosya İçin İmzalı Link Al (Güvenli Erişim)
export async function getFileUrl(path: string) {
  const supabase = await createClient();

  // 1 Saatlik geçici link oluştur (Signed URL)
  const { data, error } = await supabase.storage
    .from("vault_files")
    .createSignedUrl(path, 3600); // 3600 saniye = 1 saat

  if (error) return { error: "Dosya erişim hatası" };
  return { url: data.signedUrl };
}

// Ekleme (Metin veya Dosya)
export async function addVaultItem(formData: FormData) {
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

  const title = formData.get("title") as string;
  const category = formData.get("category") as string;
  const type = formData.get("type") as "text" | "file";

  let dbData: any = {
    family_id: profile.family_id,
    title,
    category,
    type,
    encrypted_data: "", // Default boş
  };

  if (type === "text") {
    const value = formData.get("value") as string;
    dbData.encrypted_data = encrypt(value);
  } else if (type === "file") {
    const file = formData.get("file") as File;
    if (!file) return { error: "Dosya seçilmedi" };

    // Dosyayı Aile Klasörüne Yükle (Güvenlik İçin Önemli)
    const fileExt = file.name.split(".").pop();
    const filePath = `${profile.family_id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("vault_files")
      .upload(filePath, file);

    if (uploadError) return { error: "Yükleme hatası: " + uploadError.message };

    dbData.file_path = filePath;
    dbData.mime_type = file.type;
    dbData.encrypted_data = "FILE"; // Placeholder
  }

  const { error } = await supabase.from("vault_items").insert(dbData);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { success: true };
}

// Silme (Dosya varsa onu da siler)
export async function deleteVaultItem(id: string, filePath?: string) {
  const supabase = await createClient();

  // Önce DB'den sil
  await supabase.from("vault_items").delete().eq("id", id);

  // Eğer dosya varsa Storage'dan da sil
  if (filePath) {
    await supabase.storage.from("vault_files").remove([filePath]);
  }

  revalidatePath("/dashboard");
}
