import { CreateFamilyForm } from "@/components/dashboard/CreateFamilyForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, family_id")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("Failed to load profile:", profileError.message);
  }

  if (!profile?.family_id) {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
        <CreateFamilyForm />
      </main>
    );
  }

  const userName =
    profile?.full_name ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "there";

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10">
      <header className="space-y-2 text-left">
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-50">
          Welcome back, {userName}!
        </h1>
        <p className="text-base text-gray-600 dark:text-gray-300">
          Here's what's happening across your family workspace today.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <PlaceholderCard title="CalendarWidget">
            Your shared family calendar will appear here.
          </PlaceholderCard>
          <PlaceholderCard title="KitchenWidget">
            Smart kitchen insights and inventory live in this section.
          </PlaceholderCard>
        </div>
        <div className="space-y-6 md:col-span-1">
          <PlaceholderCard title="GamificationWidget">
            Points, rewards, and family challenges will show up here.
          </PlaceholderCard>
          <PlaceholderCard title="PetWidget">
            Track pet routines, vaccines, and reminders in this panel.
          </PlaceholderCard>
        </div>
      </div>
    </main>
  );
}

function PlaceholderCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="min-h-[160px]">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-50">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-gray-600 dark:text-gray-300">
        {children}
      </CardContent>
    </Card>
  );
}


