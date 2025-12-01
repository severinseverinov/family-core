import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// GÜNCELLEME: İkinci parametre olarak 'response' alıyor
export async function updateSession(
  request: NextRequest,
  response: NextResponse // next-intl'den gelen yanıt
) {
  // Eğer response gelmediyse (örn: sadece auth kontrolü) varsayılan oluştur
  let supabaseResponse =
    response ||
    NextResponse.next({
      request,
    });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Çerezleri hem request'e hem response'a yazıyoruz
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // URL'den dil kodunu (örn: /en/dashboard) temizleyip saf yolu bulalım
  const pathname = request.nextUrl.pathname;
  const pathWithoutLocale = pathname.replace(/^\/(en|tr|de)/, "") || "/";

  const protectedRoutes = ["/dashboard", "/calendar", "/pets", "/kitchen"];
  const isProtectedRoute = protectedRoutes.some(route =>
    pathWithoutLocale.startsWith(route)
  );

  // Giriş yapmış ve login sayfasındaysa -> Dashboard
  // Not: URL oluştururken mevcut dili (request.nextUrl.locale) korumalıyız
  if (user && pathWithoutLocale === "/login") {
    const url = request.nextUrl.clone();
    // Mevcut dil neyse (örn: /en/login -> /en/dashboard) onu koru
    url.pathname = pathname.replace("/login", "/dashboard");
    return NextResponse.redirect(url);
  }

  // Giriş yapmamış ve korumalı sayfadaysa -> Login
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(pathWithoutLocale, "/login");
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
