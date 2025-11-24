"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

interface CreateFamilyResult {
  success: boolean;
  message: string;
  familyId?: string;
}

export async function createFamily(formData: FormData): Promise<CreateFamilyResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      message: authError?.message ?? "You must be signed in to create a family.",
    };
  }

  const familyName = formData.get("familyName")?.toString().trim();

  if (!familyName) {
    return {
      success: false,
      message: "Family name is required.",
    };
  }

  const { data: familyData, error: familyError } = await supabase
    .from("families")
    .insert({
      name: familyName,
      owner_id: user.id,
    })
    .select("id")
    .single();

  if (familyError || !familyData) {
    return {
      success: false,
      message: familyError?.message ?? "Failed to create family.",
    };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      family_id: familyData.id,
      role: "owner",
    })
    .eq("id", user.id);

  if (profileError) {
    return {
      success: false,
      message: profileError.message ?? "Failed to update profile with family.",
    };
  }

  revalidatePath("/dashboard");

  return {
    success: true,
    message: "Family created successfully.",
    familyId: familyData.id,
  };
}


