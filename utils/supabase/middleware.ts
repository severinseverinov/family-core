import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Artık ikinci parametre olarak 'response' alıyor
export async function updateSession(
  request: NextRequest,
  response: NextResponse
) {
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
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // URL'den dil kodunu (örn: /en/dashboard) görmezden gelerek path kontrolü yap
  // Ancak middleware matcher zaten path'i veriyor.
  const pathname = request.nextUrl.pathname;

  // Basit koruma mantığı (Locale path'ini temizleyip kontrol et)
  // Örn: /en/dashboard -> /dashboard
  const pathWithoutLocale = pathname.replace(/^\/(en|tr|de)/, "") || "/";

  const protectedRoutes = ["/dashboard", "/calendar", "/pets", "/kitchen"];
  const isProtectedRoute = protectedRoutes.some(route =>
    pathWithoutLocale.startsWith(route)
  );

  // Giriş yapmış ve login sayfasındaysa -> Dashboard
  if (user && pathWithoutLocale === "/login") {
    const url = request.nextUrl.clone();
    // Mevcut locale'i koruyarak dashboard'a at
    // request.nextUrl.locale kullanılabilir veya path manipülasyonu
    url.pathname = pathname.replace("/login", "/dashboard");
    return NextResponse.redirect(url);
  }

  // Giriş yapmamış ve korumalı sayfadaysa -> Login
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(pathWithoutLocale, "/login");
    return NextResponse.redirect(url);
  }

  return response;
}
