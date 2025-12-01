import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Desteklenen diller. Eşleşmezse varsayılan 'tr' olsun.
  if (!locale || !["en", "tr", "de"].includes(locale)) {
    locale = "tr";
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
