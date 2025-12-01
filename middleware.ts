import { type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { updateSession } from "@/utils/supabase/middleware";

const handleI18n = createMiddleware({
  locales: ["en", "tr", "de"],
  defaultLocale: "tr",
  localePrefix: "always", // /tr/dashboard, /en/dashboard gibi zorlar
});

export async function middleware(request: NextRequest) {
  // 1. Önce Dil Middleware'i çalışsın (Response oluşturur)
  const response = handleI18n(request);

  // 2. Sonra Supabase Auth (Oluşan response'u günceller)
  return await updateSession(request, response);
}

export const config = {
  matcher: [
    // API, statik dosyalar ve resimler hariç her şeyi yakala
    // NOT: 'auth' kelimesini ekledik ki callback rotası etkilenmesin
    "/((?!api|_next|auth|.*\\..*).*)",
  ],
};
