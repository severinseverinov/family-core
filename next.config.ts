import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co", // Kendi Supabase URL'ini buraya yazabilirsin
      },
    ],
  },
  reactCompiler: true,
};

export default withNextIntl(nextConfig);
