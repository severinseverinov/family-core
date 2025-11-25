"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { tr } from "date-fns/locale"; // Türkçe takvim
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { createEvent } from "@/app/actions/events";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CalendarWidget() {
  const router = useRouter();

  // Dialog ve Tarih State'leri
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  );

  // Takvimde güne tıklanınca çalışacak
  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setIsDialogOpen(true);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Takvim & Etkinlikler
        </CardTitle>

        {/* Manuel Açma Butonu */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => setIsDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col md:flex-row gap-4">
        {/* SOL: TAKVİM */}
        <div className="border rounded-md p-2 flex justify-center bg-white dark:bg-black/20">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            onDayClick={handleDayClick}
            locale={tr}
            className="rounded-md border shadow-sm"
          />
        </div>

        {/* SAĞ: LİSTE (Şimdilik boş, sonra dolduracağız) */}
        <div className="flex-1 flex flex-col justify-center items-center text-muted-foreground text-sm border rounded-md bg-gray-50 dark:bg-gray-900/50 p-4">
          <p>Bugün için planlanmış etkinlik yok.</p>
          <p className="text-xs mt-2">Tarihe tıklayarak ekleyebilirsin.</p>
        </div>

        {/* DIALOG (MODAL) */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Etkinlik Ekle</DialogTitle>
              <DialogDescription>
                {selectedDate
                  ? format(selectedDate, "d MMMM yyyy", { locale: tr })
                  : "Tarih seçiniz"}
              </DialogDescription>
            </DialogHeader>

            {/* FORM */}
            <form
              action={async formData => {
                const result = await createEvent(formData);

                if (result?.error) {
                  toast.error(result.error);
                  return;
                }

                setIsDialogOpen(false);
                router.refresh();
                toast.success("Etkinlik eklendi");
              }}
              className="space-y-4"
            >
              {/* Gizli tarih verisi */}
              <input
                type="hidden"
                name="date"
                value={selectedDate?.toISOString()}
              />

              <div className="space-y-2">
                <label className="text-sm font-medium">Başlık</label>
                <input
                  name="title"
                  placeholder="Örn: Doktor Randevusu"
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Başlangıç</label>
                  <input
                    type="datetime-local"
                    name="start_time"
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Bitiş</label>
                  <input
                    type="datetime-local"
                    name="end_time"
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Görünürlük</label>
                <select
                  name="privacy_level"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="family">Tüm Aile</option>
                  <option value="private">Sadece Ben</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsDialogOpen(false)}
                >
                  İptal
                </Button>
                <Button type="submit">Kaydet</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
