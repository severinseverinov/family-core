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

// GÜNCELLENDİ: Hata Düzeltildi
export async function getDashboardItems(dateStr?: string) {
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

  // A) Tek Seferlikler
  oneTimeEvents?.forEach(e => {
    dashboardItems.push({
      id: e.id,
      type: "event",
      title: e.title,
      time: e.start_time,
      frequency: "none",
    });
  });

  // B) Tekrarlayanlar
  if (recurringEvents) {
    for (const event of recurringEvents) {
      const startDate = new Date(event.start_time);
      let shouldShow = false;

      if (event.frequency === "daily") {
        shouldShow = true;
      } else if (event.frequency === "weekly") {
        if (event.recurrence_days && event.recurrence_days.length > 0) {
          if (event.recurrence_days.includes(targetDate.getDay())) {
            shouldShow = true;
          }
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

  // C) Rutinler
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

        // --- HATA DÜZELTME KISMI ---
        // TypeScript'in kafası karışmaması için 'any' olarak alıp elle kontrol ediyoruz.
        // Supabase bazen join verisini dizi, bazen obje olarak dönebilir.
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
        // ----------------------------

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
  const privacy_level = formData.get("privacy_level") as string;
  const frequency = (formData.get("frequency") as string) || "none";

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
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { success: true };
}
