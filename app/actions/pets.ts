"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export interface Pet {
  id: string;
  name: string;
  type: string;
  color: string | null;
  gender: string | null;
  image_url: string | null;
  family_id: string;
  created_at: string;
}

export interface PetRoutine {
  id: string;
  pet_id: string;
  title: string;
  points: number;
  frequency: string;
}

// 1. Hayvanları Getir
export async function getPets() {
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
  if (!profile?.family_id) return { pets: [] };

  const { data: pets } = await supabase
    .from("pets")
    .select("*")
    .eq("family_id", profile.family_id)
    .order("created_at", { ascending: false });

  return { pets: pets || [] };
}

// 2. Yeni Hayvan Ekle
export async function addPet(formData: FormData) {
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
  const type = formData.get("type") as string;
  const gender = (formData.get("gender") as string) || "male";
  let color = formData.get("color") as string;

  if (!color || color === "#000000") {
    color = gender === "female" ? "#ec4899" : "#3b82f6";
  }

  let image_url = null;

  const file = formData.get("image") as File;
  if (file && file.size > 0) {
    const fileExt = file.name.split(".").pop();
    const fileName = `pets/${user.id}-${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from("images")
      .upload(fileName, file);

    if (!uploadError) {
      const {
        data: { publicUrl },
      } = supabase.storage.from("images").getPublicUrl(fileName);
      image_url = publicUrl;
    }
  }

  const { error } = await supabase.from("pets").insert({
    name,
    type,
    color,
    gender,
    image_url,
    family_id: profile.family_id,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { success: true };
}

// 3. Rutin Ekle
export async function addPetRoutine(formData: FormData) {
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
  if (!profile?.family_id) return { error: "Hata" };

  const petId = formData.get("petId") as string;
  const title = formData.get("title") as string;
  const points = parseInt(formData.get("points") as string);
  const frequency = (formData.get("frequency") as string) || "daily";
  const startDate =
    (formData.get("startDate") as string) || new Date().toISOString();

  const { error } = await supabase.from("pet_routines").insert({
    family_id: profile.family_id,
    pet_id: petId,
    title,
    points,
    frequency,
    created_at: startDate,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { success: true };
}

// 4. Görevi Tamamla
export async function completePetTask(routineId: string, dateStr?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum açın" };

  const { data: routine } = await supabase
    .from("pet_routines")
    .select("points, title")
    .eq("id", routineId)
    .single();
  if (!routine) return { error: "Rutin bulunamadı" };

  const targetDate = dateStr ? new Date(dateStr) : new Date();
  const targetDateStart = targetDate.toISOString().split("T")[0] + "T00:00:00";
  const targetDateEnd = targetDate.toISOString().split("T")[0] + "T23:59:59";

  const { data: existingLog } = await supabase
    .from("pet_task_logs")
    .select("id")
    .eq("routine_id", routineId)
    .gte("completed_at", targetDateStart)
    .lte("completed_at", targetDateEnd)
    .single();

  if (existingLog) return { error: "Bu görev zaten yapılmış!" };

  const { error: logError } = await supabase.from("pet_task_logs").insert({
    routine_id: routineId,
    profile_id: user.id,
    completed_at: targetDate.toISOString(),
  });

  if (logError) return { error: "Log hatası" };

  await supabase.rpc("add_points", {
    target_user_id: user.id,
    points_amount: routine.points,
    reason: `Görev: ${routine.title}`,
  });

  revalidatePath("/dashboard");
  return { success: true, points: routine.points };
}

// 5. Pet Güncelle (YENİ)
export async function updatePet(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum açın" };

  const petId = formData.get("petId") as string;
  const name = formData.get("name") as string;
  const type = formData.get("type") as string;
  const gender = formData.get("gender") as string;
  const color = formData.get("color") as string;

  // Güncellenecek veriler
  const updates: any = { name, type, gender, color };

  // Yeni resim var mı?
  const file = formData.get("image") as File;
  if (file && file.size > 0) {
    const fileExt = file.name.split(".").pop();
    const fileName = `pets/${user.id}-${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from("images")
      .upload(fileName, file);

    if (!uploadError) {
      const {
        data: { publicUrl },
      } = supabase.storage.from("images").getPublicUrl(fileName);
      updates.image_url = publicUrl;
    }
  }

  const { error } = await supabase.from("pets").update(updates).eq("id", petId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { success: true };
}

// 6. Pet Sil (YENİ)
export async function deletePet(petId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Yetkisiz" };

  // Önce bağlı rutinleri ve logları silmek gerekebilir (Cascade açıksa gerek yok)
  // Biz Cascade eklemiştik, direkt silinebilir.
  const { error } = await supabase.from("pets").delete().eq("id", petId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { success: true };
}
