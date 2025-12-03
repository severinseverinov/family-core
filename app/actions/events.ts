"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export interface Holiday {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
}

export interface DashboardItem {
  id: string;
  type: "event" | "task";
  title: string;
  time?: string;
  is_completed?: boolean;
  completed_by?: string;
  points?: number;
  pet_name?: string;
  pet_color?: string;
  routine_id?: string;
  frequency?: string;
  privacy_level?: string; // Yeni
  assigned_to?: string; // Yeni
}

export async function getPublicHolidays(countryCode: string = "TR") {
  const year = new Date().getFullYear();
  try {
    const response = await fetch(
      `https://date.nager.at/api/v3/publicholidays/${year}/${countryCode}`,
      {
        next: { revalidate: 86400 },
      }
    );
    if (!response.ok) return [];
    return (await response.json()) as Holiday[];
  } catch (error) {
    return [];
  }
}

// GÜNCELLENDİ: Görünürlük Filtresi Eklendi
export async function getDashboardItems(dateStr?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { items: [] };

  // Kullanıcının rolünü de çekiyoruz
  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id, role, id")
    .eq("id", user.id)
    .single();

  if (!profile?.family_id) return { items: [] };

  const isAdmin = ["owner", "admin"].includes(profile.role || "");

  // Hedef Tarih
  const targetDate = dateStr ? new Date(dateStr) : new Date();
  const targetDateStart = targetDate.toISOString().split("T")[0] + "T00:00:00";
  const targetDateEnd = targetDate.toISOString().split("T")[0] + "T23:59:59";

  // 1. TEK SEFERLİK ETKİNLİKLER
  const { data: oneTimeEvents } = await supabase
    .from("events")
    .select("*")
    .eq("family_id", profile.family_id)
    .or("frequency.eq.none,frequency.is.null")
    .gte("start_time", targetDateStart)
    .lte("start_time", targetDateEnd)
    .order("start_time", { ascending: true });

  // 2. TEKRARLAYAN ETKİNLİKLER
  const { data: recurringEvents } = await supabase
    .from("events")
    .select("*")
    .eq("family_id", profile.family_id)
    .neq("frequency", "none")
    .lte("start_time", targetDateEnd);

  // 3. EVCİL HAYVAN RUTİNLERİ
  const { data: routines } = await supabase
    .from("pet_routines")
    .select(`id, title, points, frequency, created_at, pets (name, color)`)
    .eq("family_id", profile.family_id);

  const dashboardItems: DashboardItem[] = [];

  // --- GÖRÜNÜRLÜK KONTROLÜ FONKSİYONU ---
  const canViewEvent = (event: any) => {
    // 1. Tüm Aile
    if (event.privacy_level === "family" || !event.privacy_level) return true;

    // 2. Sadece Ebeveynler
    if (event.privacy_level === "parents") {
      return isAdmin; // Sadece adminler görebilir
    }

    // 3. Belirli Kişi (Member)
    if (event.privacy_level === "member") {
      // Atanan kişi, Oluşturan kişi veya Adminler görebilir
      return (
        isAdmin || event.assigned_to === user.id || event.created_by === user.id
      );
    }

    // 4. Tamamen Gizli (Private - Eski koddan kalan varsa)
    if (event.privacy_level === "private") {
      return event.created_by === user.id;
    }

    return true;
  };

  // A) Tek Seferlikleri Ekle (Filtreli)
  oneTimeEvents?.forEach(e => {
    if (canViewEvent(e)) {
      dashboardItems.push({
        id: e.id,
        type: "event",
        title: e.title,
        time: e.start_time,
        frequency: "none",
      });
    }
  });

  // B) Tekrarlayanları Hesapla ve Ekle (Filtreli)
  if (recurringEvents) {
    for (const event of recurringEvents) {
      if (!canViewEvent(event)) continue; // Görme yetkisi yoksa atla

      const startDate = new Date(event.start_time);
      let shouldShow = false;

      if (event.frequency === "daily") {
        shouldShow = true;
      } else if (event.frequency === "weekly") {
        if (event.recurrence_days && event.recurrence_days.length > 0) {
          if (event.recurrence_days.includes(targetDate.getDay()))
            shouldShow = true;
        } else {
          if (startDate.getDay() === targetDate.getDay()) shouldShow = true;
        }
      } else if (event.frequency === "monthly") {
        if (startDate.getDate() === targetDate.getDate()) shouldShow = true;
      } else if (event.frequency === "yearly") {
        if (
          startDate.getDate() === targetDate.getDate() &&
          startDate.getMonth() === targetDate.getMonth()
        )
          shouldShow = true;
      }

      if (shouldShow) {
        dashboardItems.push({
          id: event.id,
          type: "event",
          title: event.title,
          time: event.start_time,
          frequency: event.frequency,
        });
      }
    }
  }

  // C) Rutinleri Ekle
  if (routines) {
    for (const routine of routines) {
      const startDate = new Date(routine.created_at);
      if (
        startDate > targetDate &&
        startDate.toDateString() !== targetDate.toDateString()
      )
        continue;

      let shouldShow = false;
      if (routine.frequency === "daily") shouldShow = true;
      else if (
        routine.frequency === "weekly" &&
        startDate.getDay() === targetDate.getDay()
      )
        shouldShow = true;
      else if (
        routine.frequency === "monthly" &&
        startDate.getDate() === targetDate.getDate()
      )
        shouldShow = true;
      else if (
        routine.frequency === "yearly" &&
        startDate.getDate() === targetDate.getDate() &&
        startDate.getMonth() === targetDate.getMonth()
      )
        shouldShow = true;

      if (shouldShow) {
        const { data: log } = await supabase
          .from("pet_task_logs")
          .select("profiles(full_name)")
          .eq("routine_id", routine.id)
          .gte("completed_at", targetDateStart)
          .lte("completed_at", targetDateEnd)
          .maybeSingle();

        const petData = routine.pets as any;
        const petName = Array.isArray(petData)
          ? petData[0]?.name
          : petData?.name;
        const petColor = Array.isArray(petData)
          ? petData[0]?.color
          : petData?.color;

        const logData = log as any;
        const completedBy =
          logData?.profiles?.full_name ||
          (Array.isArray(logData?.profiles)
            ? logData.profiles[0]?.full_name
            : null);

        dashboardItems.push({
          id: routine.id,
          routine_id: routine.id,
          type: "task",
          title: routine.title,
          points: routine.points,
          pet_name: petName,
          pet_color: petColor,
          is_completed: !!log,
          completed_by: completedBy,
        });
      }
    }
  }

  return { items: dashboardItems };
}

// GÜNCELLENDİ: assigned_to Eklendi
export async function createEvent(formData: FormData) {
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
  if (!profile?.family_id) return { error: "Aile yok" };

  const title = formData.get("title") as string;
  const start_time = new Date(
    formData.get("start_time") as string
  ).toISOString();
  const end_time = new Date(formData.get("end_time") as string).toISOString();
  const privacy_level = formData.get("privacy_level") as string; // 'family', 'parents', 'member'
  const frequency = (formData.get("frequency") as string) || "none";

  // Atanan kişiyi al
  const assigned_to = (formData.get("assigned_to") as string) || null;

  const recurrenceDaysStr = formData.get("recurrence_days") as string;
  const recurrence_days = recurrenceDaysStr
    ? recurrenceDaysStr.split(",").map(Number)
    : null;

  const { error } = await supabase.from("events").insert({
    family_id: profile.family_id,
    created_by: user.id,
    title,
    start_time,
    end_time,
    privacy_level,
    frequency,
    recurrence_days,
    assigned_to, // Yeni alan
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { success: true };
}
