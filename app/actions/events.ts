"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export interface Event {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  privacy_level: "family" | "private";
  family_id: string;
  created_by: string;
  created_at: string;
}

export async function getUpcomingEvents() {
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "You must be signed in to view events." };
  }

  // Get user's profile to find family_id
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("family_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return { error: "Failed to load profile." };
  }

  if (!profile?.family_id) {
    return { events: [] };
  }

  // Fetch upcoming events for the family
  // Filter: start_time >= NOW()
  // Order by: start_time ASC
  // Limit: 5 events
  const now = new Date().toISOString();
  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select("*")
    .eq("family_id", profile.family_id)
    .gte("start_time", now)
    .order("start_time", { ascending: true })
    .limit(5);

  if (eventsError) {
    return { error: "Failed to load events: " + eventsError.message };
  }

  return { events: events || [] };
}

export async function getEventsByDate(date: string) {
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "You must be signed in to view events." };
  }

  // Get user's profile to find family_id
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("family_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile?.family_id) {
    return { events: [] };
  }

  // Parse the date and create date range for the day
  const selectedDate = new Date(date);
  const startOfDay = new Date(selectedDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(selectedDate);
  endOfDay.setHours(23, 59, 59, 999);

  // Fetch events for the specific date
  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select("*")
    .eq("family_id", profile.family_id)
    .gte("start_time", startOfDay.toISOString())
    .lte("start_time", endOfDay.toISOString())
    .order("start_time", { ascending: true });

  if (eventsError) {
    return { error: "Failed to load events: " + eventsError.message };
  }

  return { events: events || [] };
}

export async function createEvent(formData: FormData) {
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "You must be signed in to create events." };
  }

  // Get user's profile to find family_id
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("family_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile?.family_id) {
    return { error: "You must belong to a family to create events." };
  }

  // Extract and validate form data
  const title = formData.get("title")?.toString().trim();
  const startTimeInput = formData.get("start_time")?.toString().trim();
  const endTimeInput = formData.get("end_time")?.toString().trim();
  const isAllDay = formData.get("is_all_day") === "true";
  const privacyLevel = formData.get("privacy_level")?.toString().trim() as
    | "family"
    | "private";

  if (!title || title.length === 0) {
    return { error: "Event title is required." };
  }

  if (!startTimeInput || !endTimeInput) {
    return { error: "Start and end times are required." };
  }

  if (
    !privacyLevel ||
    (privacyLevel !== "family" && privacyLevel !== "private")
  ) {
    return { error: "Privacy level must be 'family' or 'private'." };
  }

  // Convert datetime-local input string to ISO string
  // datetime-local format: "YYYY-MM-DDTHH:mm"
  // We need to convert to ISO 8601 format for Supabase
  const startTimeISO = new Date(startTimeInput).toISOString();
  const endTimeISO = new Date(endTimeInput).toISOString();

  // Validate that end time is after start time
  if (new Date(endTimeISO) <= new Date(startTimeISO)) {
    return { error: "End time must be after start time." };
  }

  // Insert new event
  const { data: event, error: insertError } = await supabase
    .from("events")
    .insert({
      title,
      start_time: startTimeISO,
      end_time: endTimeISO,
      is_all_day: isAllDay,
      privacy_level: privacyLevel,
      family_id: profile.family_id,
      created_by: user.id,
    })
    .select()
    .single();

  if (insertError) {
    return { error: "Failed to create event: " + insertError.message };
  }

  revalidatePath("/dashboard");

  return { success: true, event };
}

// Yeni eklenen tip tanımlaması
export interface Holiday {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
}

// Resmi Tatilleri Çeken Fonksiyon (Nager.Date API kullanır - Ücretsizdir)
export async function getPublicHolidays(countryCode: string) {
  const year = new Date().getFullYear();

  try {
    // API'den veriyi çek
    const response = await fetch(
      `https://date.nager.at/api/v3/publicholidays/${year}/${countryCode}`,
      {
        next: { revalidate: 86400 }, // 24 saat önbellekte tut (her gün sorgulama yapmasın)
      }
    );

    if (!response.ok) return [];

    const holidays: Holiday[] = await response.json();
    return holidays;
  } catch (error) {
    console.error("Tatil verisi çekilemedi:", error);
    return [];
  }
}
