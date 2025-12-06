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
  description?: string;
  category?: string;
  time?: string;
  is_completed?: boolean;
  completed_by?: string;
  points?: number;
  pet_name?: string;
  pet_color?: string;
  routine_id?: string;
  frequency?: string;
  privacy_level?: string;
  assigned_to?: string[] | null;
  status?: "pending" | "completed";
  log_id?: string;
  requires_verification?: boolean;
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

export async function getDashboardItems(dateStr?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { items: [] };

  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id, role, id")
    .eq("id", user.id)
    .single();
  if (!profile?.family_id) return { items: [] };

  const isAdmin = ["owner", "admin"].includes(profile.role || "");

  const targetDate = dateStr ? new Date(dateStr) : new Date();

  // Tarih aralığı (Saat dilimi farklarını kapsamak için genişletildi)
  const queryStart = new Date(targetDate);
  queryStart.setDate(queryStart.getDate() - 1);
  const queryStartStr = queryStart.toISOString().split("T")[0] + "T00:00:00";

  const queryEnd = new Date(targetDate);
  queryEnd.setDate(queryEnd.getDate() + 1);
  const queryEndStr = queryEnd.toISOString().split("T")[0] + "T23:59:59";

  const targetDateStart = targetDate.toISOString().split("T")[0] + "T00:00:00";
  const targetDateEnd = targetDate.toISOString().split("T")[0] + "T23:59:59";

  // 1. EVENTLER - DÜZELTME: .select('*') kullanıyoruz, join'i kaldırdık
  const { data: oneTimeEvents } = await supabase
    .from("events")
    .select("*")
    .eq("family_id", profile.family_id)
    .or("frequency.eq.none,frequency.is.null")
    .gte("start_time", queryStartStr)
    .lte("start_time", queryEndStr)
    .order("start_time", { ascending: true });

  const { data: recurringEvents } = await supabase
    .from("events")
    .select("*")
    .eq("family_id", profile.family_id)
    .neq("frequency", "none")
    .lte("start_time", targetDateEnd);

  const { data: routines } = await supabase
    .from("pet_routines")
    .select(
      `
      id, title, points, frequency, created_at, requires_verification, assigned_to,
      pets (name, color)
    `
    )
    .eq("family_id", profile.family_id);

  const dashboardItems: DashboardItem[] = [];

  const canViewEvent = (event: any) => {
    if (event.privacy_level === "family" || !event.privacy_level) return true;
    if (event.privacy_level === "parents") return isAdmin;
    if (event.privacy_level === "member")
      return (
        isAdmin || event.assigned_to === user.id || event.created_by === user.id
      );
    if (event.privacy_level === "private") return event.created_by === user.id;
    return true;
  };

  oneTimeEvents?.forEach((e: any) => {
    if (canViewEvent(e)) {
      dashboardItems.push({
        id: e.id,
        type: "event",
        title: e.title,
        description: e.description,
        category: e.category,
        time: e.start_time,
        is_completed: e.is_completed,
        // HATA BURADAYDI: null yerine undefined kullanıyoruz
        completed_by: e.is_completed ? "Tamamlandı" : undefined,
        frequency: "none",
        privacy_level: e.privacy_level,
        assigned_to: e.assigned_to ? e.assigned_to.split(",") : null,
      });
    }
  });

  if (recurringEvents) {
    for (const event of recurringEvents) {
      if (!canViewEvent(event)) continue;
      const startDate = new Date(event.start_time);
      let shouldShow = false;
      if (event.frequency === "daily") shouldShow = true;
      else if (event.frequency === "weekly") {
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
          description: event.description,
          category: event.category,
          time: event.start_time,
          frequency: event.frequency,
          privacy_level: event.privacy_level,
          is_completed: false,
        });
      }
    }
  }

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
          .select("id, status, profiles(full_name)")
          .eq("routine_id", routine.id)
          .gte("completed_at", targetDateStart)
          .lte("completed_at", targetDateEnd)
          .maybeSingle();

        const petData = routine.pets as any;
        const logData = log as any;
        dashboardItems.push({
          id: routine.id,
          routine_id: routine.id,
          type: "task",
          title: routine.title,
          points: routine.points,
          pet_name: Array.isArray(petData) ? petData[0]?.name : petData?.name,
          pet_color: Array.isArray(petData)
            ? petData[0]?.color
            : petData?.color,
          is_completed: !!log,
          status: log?.status as "pending" | "completed",
          log_id: log?.id,
          completed_by:
            logData?.profiles?.full_name ||
            (Array.isArray(logData?.profiles)
              ? logData.profiles[0]?.full_name
              : null),
          requires_verification: routine.requires_verification,
          assigned_to: routine.assigned_to,
        });
      }
    }
  }
  return { items: dashboardItems };
}

export async function getAllEvents() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { items: [] };
  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id, role, id")
    .eq("id", user.id)
    .single();
  if (!profile?.family_id) return { items: [] };
  const isAdmin = ["owner", "admin"].includes(profile.role || "");
  const { data: allEvents } = await supabase
    .from("events")
    .select("*")
    .eq("family_id", profile.family_id);
  const { data: routines } = await supabase
    .from("pet_routines")
    .select("id, title, frequency, created_at, pets(name, color)")
    .eq("family_id", profile.family_id);
  const dashboardItems: DashboardItem[] = [];
  const canViewEvent = (event: any) => {
    if (event.privacy_level === "family" || !event.privacy_level) return true;
    if (event.privacy_level === "parents") return isAdmin;
    if (event.privacy_level === "member")
      return (
        isAdmin || event.assigned_to === user.id || event.created_by === user.id
      );
    if (event.privacy_level === "private") return event.created_by === user.id;
    return true;
  };
  allEvents?.forEach(e => {
    if (canViewEvent(e)) {
      dashboardItems.push({
        id: e.id,
        type: "event",
        title: e.title,
        description: e.description,
        category: e.category,
        time: e.start_time,
        frequency: e.frequency,
        privacy_level: e.privacy_level,
        is_completed: e.is_completed,
      });
    }
  });
  routines?.forEach((r: any) => {
    dashboardItems.push({
      id: r.id,
      type: "task",
      title: r.title,
      category: "pet",
      time: r.created_at,
      frequency: r.frequency,
    });
  });
  return { items: dashboardItems };
}

export async function completeEvent(eventId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum açın" };
  const { error } = await supabase
    .from("events")
    .update({ is_completed: true, completed_by: user.id })
    .eq("id", eventId);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { success: true };
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
  const description = formData.get("description") as string;
  const category = formData.get("category") as string;
  const start_time = new Date(
    formData.get("start_time") as string
  ).toISOString();
  const end_time = new Date(formData.get("end_time") as string).toISOString();
  const privacy_level = formData.get("privacy_level") as string;
  const frequency = (formData.get("frequency") as string) || "none";
  const assigned_to = (formData.get("assigned_to") as string) || null;
  const recurrenceDaysStr = formData.get("recurrence_days") as string;
  const recurrence_days = recurrenceDaysStr
    ? recurrenceDaysStr.split(",").map(Number)
    : null;
  const { error } = await supabase.from("events").insert({
    family_id: profile.family_id,
    created_by: user.id,
    title,
    description,
    category,
    start_time,
    end_time,
    privacy_level,
    frequency,
    recurrence_days,
    assigned_to,
  });
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { success: true };
}
