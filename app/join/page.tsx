import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { acceptInvitation } from "@/app/actions/family";
import { Users, ArrowRight } from "lucide-react";

// Next.js 15+ uyumlu (Promise tabanlı searchParams)
export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token;

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="p-8 text-center bg-white dark:bg-black rounded-xl shadow-lg border border-red-100 max-w-sm">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 font-bold text-xl">
            !
          </div>
          <h2 className="text-lg font-bold text-red-600 mb-2">
            Geçersiz Bağlantı
          </h2>
          <p className="text-sm text-gray-500">
            Bu davet linki hatalı veya süresi dolmuş olabilir.
          </p>
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Giriş Yapmamışsa -> Login'e yönlendir (Token'ı kaybetmeden)
  if (!user) {
    const nextUrl = encodeURIComponent(`/join?token=${token}`);
    redirect(`/login?next=${nextUrl}`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md text-center shadow-xl border-t-4 border-t-blue-600">
        <CardHeader className="pb-2">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600 dark:text-blue-400">
            <Users className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-bold">Aileye Katıl</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-2">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-sm text-blue-800 dark:text-blue-300">
            <p>Davet edildiğiniz aile grubuna katılmak üzeresiniz.</p>
            <p className="mt-1 opacity-80">
              Tüm takvim, görevler ve kasa verilerine erişebileceksiniz.
            </p>
          </div>

          <form
            action={async () => {
              "use server";
              const res = await acceptInvitation(token);
              if (res?.error) {
                console.error(res.error);
                redirect("/dashboard?error=" + encodeURIComponent(res.error));
              } else {
                redirect("/dashboard");
              }
            }}
          >
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg h-14 shadow-lg shadow-blue-200 dark:shadow-none transition-transform active:scale-95">
              Daveti Kabul Et <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </form>

          <p className="text-xs text-gray-400">
            Giriş yapan kullanıcı:{" "}
            <span className="font-medium text-gray-600 dark:text-gray-300">
              {user.email}
            </span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
