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

// 3. Rutin Ekle (GÜNCELLENDİ: Atama ve Onay)
export async function addPetRoutine(formData: FormData) {
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
  if (!profile?.family_id) return { error: "Hata" };
  if (!["owner", "admin"].includes(profile.role)) return { error: "Yetkisiz" };

  const petId = formData.get("petId") as string;
  const title = formData.get("title") as string;
  const points = parseInt(formData.get("points") as string);
  const frequency = (formData.get("frequency") as string) || "daily";
  const startDate =
    (formData.get("startDate") as string) || new Date().toISOString();

  // Yeni Alanlar
  const requiresVerification = formData.get("requiresVerification") === "on";
  const assignedToRaw = formData.get("assignedTo") as string; // "id1,id2" formatında gelecek
  const assignedTo = assignedToRaw ? assignedToRaw.split(",") : null; // Boşsa null (Herkes)

  const { error } = await supabase.from("pet_routines").insert({
    family_id: profile.family_id,
    pet_id: petId,
    title,
    points,
    frequency,
    created_at: startDate,
    requires_verification: requiresVerification,
    assigned_to: assignedTo,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { success: true };
}

// 4. Görevi Tamamla (GÜNCELLENDİ: Tarih Kontrolü ve Onay Mantığı)
export async function completePetTask(routineId: string, dateStr?: string) {
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

  // Rutin Bilgisini Çek
  const { data: routine } = await supabase
    .from("pet_routines")
    .select("points, title, requires_verification, assigned_to")
    .eq("id", routineId)
    .single();

  if (!routine) return { error: "Rutin bulunamadı" };

  // 1. ATAMA KONTROLÜ: Bu kişi bu görevi yapabilir mi?
  if (routine.assigned_to && routine.assigned_to.length > 0) {
    if (!routine.assigned_to.includes(user.id)) {
      return { error: "Bu görev size atanmamış." };
    }
  }

  // Tarih Ayarları
  const targetDate = dateStr ? new Date(dateStr) : new Date();
  const today = new Date();
  const isToday = targetDate.toDateString() === today.toDateString();

  // 2. TARİH KONTROLÜ (Çocuklar için)
  const isChild = !["owner", "admin"].includes(profile?.role || "");
  if (isChild && !isToday) {
    return { error: "Sadece bugünün görevlerini tamamlayabilirsin." };
  }

  // O gün zaten yapılmış mı?
  const targetDateStart = targetDate.toISOString().split("T")[0] + "T00:00:00";
  const targetDateEnd = targetDate.toISOString().split("T")[0] + "T23:59:59";

  const { data: existingLog } = await supabase
    .from("pet_task_logs")
    .select("id, status")
    .eq("routine_id", routineId)
    .gte("completed_at", targetDateStart)
    .lte("completed_at", targetDateEnd)
    .single();

  if (existingLog) return { error: "Zaten işlem yapılmış." };

  // 3. DURUM BELİRLEME (Pending mi Completed mı?)
  // Eğer onay gerekiyorsa ve yapan çocuksa -> PENDING
  // Eğer onay gerekmiyorsa veya yapan ebeveynse -> COMPLETED
  const status =
    routine.requires_verification && isChild ? "pending" : "completed";

  // Log Oluştur
  const { error: logError } = await supabase.from("pet_task_logs").insert({
    routine_id: routineId,
    profile_id: user.id,
    completed_at: targetDate.toISOString(),
    status: status,
  });

  if (logError) return { error: "Log hatası: " + logError.message };

  // 4. PUAN VERME (Sadece 'completed' ise puan ver)
  if (status === "completed") {
    const { error: pointError } = await supabase.rpc("add_points", {
      target_user_id: user.id,
      points_amount: routine.points,
      reason: `Görev: ${routine.title}`,
    });
    if (pointError) return { error: "Puan eklenemedi" };
    revalidatePath("/dashboard");
    return { success: true, points: routine.points, status: "completed" };
  } else {
    // Onay bekliyor
    revalidatePath("/dashboard");
    return { success: true, message: "Onaya gönderildi", status: "pending" };
  }
}

// 5. Ebeveyn Onayı (YENİ FONKSİYON)
export async function approveTask(logId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Yetki Kontrolü
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id)
    .single();
  if (!["owner", "admin"].includes(profile?.role || ""))
    return { error: "Yetkisiz işlem" };

  // Logu çek
  const { data: log } = await supabase
    .from("pet_task_logs")
    .select("*, pet_routines(points, title)")
    .eq("id", logId)
    .single();
  if (!log || log.status === "completed") return { error: "İşlem yapılamaz" };

  // Durumu güncelle
  await supabase
    .from("pet_task_logs")
    .update({
      status: "completed",
      verified_at: new Date().toISOString(),
    })
    .eq("id", logId);

  // Puanı ver
  await supabase.rpc("add_points", {
    target_user_id: log.profile_id,
    points_amount: log.pet_routines.points,
    reason: `Görev Onaylandı: ${log.pet_routines.title}`,
  });

  revalidatePath("/dashboard");
  return { success: true };
}

// Pet Update/Delete fonksiyonları aynen kalıyor...
export async function updatePet(formData: FormData) {
  /* ... */ return { success: true };
}
export async function deletePet(petId: string) {
  /* ... */ return { success: true };
}
