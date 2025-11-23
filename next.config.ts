import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com", // Google giriş avatarları için
      },
      {
        protocol: "https",
        // BURAYI KENDİ SUPABASE URL'İNİN BAŞI İLE DEĞİŞTİR
        // Örn: 'xyzproject.supabase.co'
        hostname: "**.supabase.co",
      },
    ],
  },
  /* config options here */
  reactCompiler: true,
};

export default nextConfig;
