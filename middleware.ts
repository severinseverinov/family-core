import { type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { updateSession } from "@/utils/supabase/middleware";

const handleI18n = createMiddleware({
  locales: ["en", "tr", "de"],
  defaultLocale: "tr",
  localePrefix: "always",
});

export async function middleware(request: NextRequest) {
  const response = handleI18n(request);
  return await updateSession(request, response);
}

export const config = {
  matcher: [
    // 'auth' kelimesini buraya ekleyerek onu çeviri sisteminden hariç tutuyoruz
    "/((?!api|_next|auth|.*\\..*).*)",
  ],
};
