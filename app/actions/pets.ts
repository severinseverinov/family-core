"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export interface Pet {
  id: string;
  name: string;
  type: string;
  color: string | null;
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
  const color = formData.get("color") as string;

  const { error } = await supabase.from("pets").insert({
    name,
    type,
    color,
    family_id: profile.family_id,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { success: true };
}

// 3. Rutin Ekle (GÜNCELLENDİ: Sıklık ve Tarih)
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

  // Başlangıç tarihi (Varsayılan: Bugün)
  // Bu tarih, haftalık/aylık tekrarların "hangi gün" olacağını belirler.
  const startDate =
    (formData.get("startDate") as string) || new Date().toISOString();

  const { error } = await supabase.from("pet_routines").insert({
    family_id: profile.family_id,
    pet_id: petId,
    title,
    points,
    frequency,
    created_at: startDate, // Başlangıç tarihini referans olarak created_at'e kaydediyoruz
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
    .select("points, title, family_id")
    .eq("id", routineId)
    .single();

  if (!routine) return { error: "Rutin bulunamadı" };

  // Hangi gün için yapılıyor? (Varsayılan: Bugün)
  const targetDate = dateStr ? new Date(dateStr) : new Date();
  const targetDateStart = targetDate.toISOString().split("T")[0] + "T00:00:00";
  const targetDateEnd = targetDate.toISOString().split("T")[0] + "T23:59:59";

  // O gün zaten yapılmış mı?
  const { data: existingLog } = await supabase
    .from("pet_task_logs")
    .select("id")
    .eq("routine_id", routineId)
    .gte("completed_at", targetDateStart)
    .lte("completed_at", targetDateEnd)
    .single();

  if (existingLog) return { error: "Bu görev o gün zaten yapılmış!" };

  // Log Oluştur (Tarih olarak seçilen günü kaydediyoruz)
  const { error: logError } = await supabase.from("pet_task_logs").insert({
    routine_id: routineId,
    profile_id: user.id,
    completed_at: targetDate.toISOString(), // Seçilen güne işle
  });

  if (logError) return { error: "Log hatası: " + logError.message };

  // Puan Ver
  const { error: pointError } = await supabase.rpc("add_points", {
    target_user_id: user.id,
    points_amount: routine.points,
    reason: `Görev: ${routine.title}`,
  });

  if (pointError) return { error: "Puan eklenemedi" };

  revalidatePath("/dashboard");
  return { success: true, points: routine.points };
}
