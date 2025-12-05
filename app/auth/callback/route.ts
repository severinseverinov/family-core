import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // 'next' parametresi varsa oraya, yoksa dashboard'a git
  const next = searchParams.get("next") || "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Başarılı girişten sonra yönlendir
      // Not: Middleware sizi otomatik olarak varsayılan dile (/tr/dashboard) yönlendirecektir.
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Hata varsa login sayfasına geri at
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
