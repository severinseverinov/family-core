"use client";

import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Chrome } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react"; // searchParams client tarafında suspense gerektirir

// İç Bileşen
function LoginForm() {
  const supabase = createClient();
  const searchParams = useSearchParams();

  // URL'deki 'next' parametresini al (Yoksa /dashboard)
  const next = searchParams.get("next") || "/dashboard";

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // Callback rotasına 'next' parametresini paslıyoruz
        redirectTo: `${
          window.location.origin
        }/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (error) {
      console.error("Giriş Hatası:", error.message);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">FamilyCore</CardTitle>
        <CardDescription>Devam etmek için giriş yapın</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleGoogleSignIn} className="w-full" size="lg">
          <Chrome className="mr-2 h-5 w-5" />
          Google ile Giriş Yap
        </Button>
      </CardContent>
    </Card>
  );
}

// Ana Sayfa (Suspense ile Sarmalanmalı)
export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Suspense fallback={<div>Yükleniyor...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
