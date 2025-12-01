import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// GÜNCELLEME: İkinci parametre olarak 'response' alıyor ve onu kullanıyoruz
export async function updateSession(
  request: NextRequest,
  response: NextResponse // next-intl'den gelen yanıt (Redirect olabilir)
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
          // Çerezleri hem request'e hem de gelen response'a işliyoruz
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );

          // Kritik Kısım: next-intl'den gelen response'a çerezleri ekle
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

  const pathname = request.nextUrl.pathname;

  // Dil önekini (/en, /tr) temizleyip saf yolu bulalım
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
    // Ancak next-intl middleware zaten redirect verdiyse onu bozmamalıyız.
    // Burada sadece "sayfa içeriği" login ise yönlendiriyoruz.

    // Basitçe path'i değiştiriyoruz, locale başta duruyor
    url.pathname = pathname.replace("/login", "/dashboard");
    return NextResponse.redirect(url);
  }

  // Giriş yapmamış ve korumalı sayfadaysa -> Login
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(pathWithoutLocale, "/login");
    return NextResponse.redirect(url);
  }

  // next-intl'den gelen orijinal yanıtı (çerezleri işlenmiş halde) döndür
  return supabaseResponse;
}
