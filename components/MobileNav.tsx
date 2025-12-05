"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, LogIn, LayoutDashboard, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export function MobileNav({ user }: { user: any }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Menüyü Aç</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 mt-2 p-2">
        {!user ? (
          // GİRİŞ YAPMAMIŞSA
          <>
            <DropdownMenuItem asChild>
              <Link href="#features" className="w-full cursor-pointer py-2">
                Özellikler
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="#pricing" className="w-full cursor-pointer py-2">
                Fiyatlar
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                href="/login"
                className="w-full cursor-pointer py-2 font-semibold text-primary"
              >
                <LogIn className="mr-2 h-4 w-4" /> Giriş Yap
              </Link>
            </DropdownMenuItem>
          </>
        ) : (
          // GİRİŞ YAPMIŞSA
          <>
            <div className="px-2 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Menü
            </div>
            <DropdownMenuItem asChild>
              <Link
                href="/dashboard"
                className="w-full cursor-pointer py-2 flex items-center gap-2"
              >
                <LayoutDashboard className="h-4 w-4" /> Panel
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                href="/dashboard/settings"
                className="w-full cursor-pointer py-2 flex items-center gap-2"
              >
                <Settings className="h-4 w-4" /> Ayarlar
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="w-full cursor-pointer py-2 text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/50 flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" /> Çıkış Yap
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
