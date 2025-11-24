import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { LogIn } from "lucide-react";
import { UserMenu } from "./UserMenu";
import { Button } from "@/components/ui/button";

export async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Left side: Logo */}
          <div className="flex items-center">
            <Link
              href="/"
              className="text-xl font-bold text-gray-900 dark:text-white"
            >
              FamilyCore
            </Link>
          </div>

          {/* Right side: Login button or User Menu */}
          <div className="flex items-center">
            {user ? (
              <UserMenu user={user} />
            ) : (
              <Link href="/login">
                <Button variant="default" className="flex items-center space-x-2">
                  <LogIn className="h-4 w-4" />
                  <span>Login</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

