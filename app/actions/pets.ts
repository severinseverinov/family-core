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

export async function getPets() {
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "You must be signed in to view pets." };
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
    return { pets: [] };
  }

  // Fetch pets for the family
  const { data: pets, error: petsError } = await supabase
    .from("pets")
    .select("*")
    .eq("family_id", profile.family_id)
    .order("created_at", { ascending: false });

  if (petsError) {
    return { error: "Failed to load pets: " + petsError.message };
  }

  return { pets: pets || [] };
}

export async function addPet(formData: FormData) {
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "You must be signed in to add pets." };
  }

  // Get user's profile to find family_id
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("family_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile?.family_id) {
    return { error: "You must belong to a family to add pets." };
  }

  // Extract and validate form data
  const name = formData.get("name")?.toString().trim();
  const type = formData.get("type")?.toString().trim();
  const color = formData.get("color")?.toString().trim() || null;

  if (!name || name.length === 0) {
    return { error: "Pet name is required." };
  }

  if (!type || type.length === 0) {
    return { error: "Pet type is required." };
  }

  // Insert new pet
  const { data: pet, error: insertError } = await supabase
    .from("pets")
    .insert({
      name,
      type,
      color,
      family_id: profile.family_id,
    })
    .select()
    .single();

  if (insertError) {
    return { error: "Failed to add pet: " + insertError.message };
  }

  revalidatePath("/dashboard");

  return { success: true, pet };
}


