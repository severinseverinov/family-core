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

// GÜNCELLENDİ: Tarihe göre verileri getir
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

  // 1. Etkinlikleri Çek (O güne ait olanlar)
  const { data: events } = await supabase
    .from("events")
    .select("id, title, start_time")
    .eq("family_id", profile.family_id)
    .gte("start_time", targetDateStart)
    .lte("start_time", targetDateEnd)
    .order("start_time", { ascending: true });

  // 2. Rutinleri Çek
  const { data: routines } = await supabase
    .from("pet_routines")
    .select(
      `
      id, title, points, frequency, created_at,
      pets (name, color)
    `
    )
    .eq("family_id", profile.family_id);

  const dashboardItems: DashboardItem[] = [];

  // Etkinlikleri Listeye Ekle
  events?.forEach(e => {
    dashboardItems.push({
      id: e.id,
      type: "event",
      title: e.title,
      time: e.start_time,
    });
  });

  // Rutinleri Filtrele ve Listeye Ekle
  if (routines) {
    for (const routine of routines) {
      const startDate = new Date(routine.created_at);

      // Gelecekteki görevleri gösterme
      if (
        startDate > targetDate &&
        startDate.toDateString() !== targetDate.toDateString()
      )
        continue;

      let shouldShow = false;

      // SIKLIK KONTROLÜ
      if (routine.frequency === "daily") {
        shouldShow = true;
      } else if (routine.frequency === "weekly") {
        // Haftanın aynı günü mü? (0-6)
        if (startDate.getDay() === targetDate.getDay()) shouldShow = true;
      } else if (routine.frequency === "monthly") {
        // Ayın aynı günü mü? (1-31)
        if (startDate.getDate() === targetDate.getDate()) shouldShow = true;
      } else if (routine.frequency === "yearly") {
        // Yılın aynı ayı ve günü mü?
        if (
          startDate.getDate() === targetDate.getDate() &&
          startDate.getMonth() === targetDate.getMonth()
        )
          shouldShow = true;
      }

      if (shouldShow) {
        // O gün yapılmış mı?
        const { data: log } = await supabase
          .from("pet_task_logs")
          .select("profiles(full_name)")
          .eq("routine_id", routine.id)
          .gte("completed_at", targetDateStart)
          .lte("completed_at", targetDateEnd)
          .maybeSingle();

        dashboardItems.push({
          id: routine.id,
          routine_id: routine.id,
          type: "task",
          title: routine.title,
          points: routine.points,
          // @ts-ignore
          pet_name: routine.pets?.name,
          // @ts-ignore
          pet_color: routine.pets?.color,
          is_completed: !!log,
          // @ts-ignore
          completed_by: log?.profiles?.full_name || null,
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

  const { error } = await supabase.from("events").insert({
    family_id: profile.family_id,
    created_by: user.id,
    title,
    start_time,
    end_time,
    privacy_level,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { success: true };
}
