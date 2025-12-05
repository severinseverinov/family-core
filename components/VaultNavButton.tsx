"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Lock } from "lucide-react";
import { VaultWidget } from "@/components/dashboard/widgets/VaultWidget";

export function VaultNavButton() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
        >
          <Lock className="h-4 w-4" />
          <span className="hidden lg:inline">Kasa</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl h-[85vh] p-0 overflow-hidden flex flex-col border-none bg-transparent shadow-none">
        {/* DÜZELTME: VisuallyHidden yerine sr-only sınıfı kullanıldı */}
        <DialogTitle className="sr-only">Aile Kasası</DialogTitle>

        <div className="h-full w-full bg-white dark:bg-gray-950 rounded-lg overflow-hidden flex flex-col">
          <VaultWidget className="border-0 shadow-none h-full rounded-none" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
