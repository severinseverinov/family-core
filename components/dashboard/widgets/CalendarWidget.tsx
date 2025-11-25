"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { tr } from "date-fns/locale"; // Türkçe takvim için
import { Calendar as CalendarIcon, Plus, Lock, Users } from "lucide-react";
import { toast } from "sonner"; // Veya shadcn toast

import { createEvent } from "@/app/actions/events";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  // DialogTrigger sildik, ihtiyacımız yok
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ... (fetch edilen veriler props olarak gelebilir veya component içinde server action çağrılabilir)

export function CalendarWidget() {
  const router = useRouter();

  // 1. DIALOG DURUMUNU YÖNETEN STATE
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  );

  // Takvimde güne tıklanınca çalışacak fonksiyon
  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setIsDialogOpen(true); // Diyaloğu aç
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Takvim & Etkinlikler
        </CardTitle>

        {/* 2. BUTON (DialogTrigger YERİNE NORMAL BUTTON) */}
        {/* Bu buton Dialog'un dışında olabilir, hata vermez çünkü state kullanıyoruz */}
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
        <div className="border rounded-md p-2">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            onDayClick={handleDayClick} // Tıklayınca açılmasını sağlar
            locale={tr}
            className="rounded-md border"
          />
        </div>

        {/* SAĞ: LİSTE (Buraya event listesi kodların gelecek...) */}
        <div className="flex-1">{/* ... Event Listesi ... */}</div>

        {/* 3. DIALOG (SAYFANIN EN ALTINDA OLABİLİR) */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          {/* İçinde Trigger yok, sadece Content var */}
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
                // Hata kontrolü vs...
                setIsDialogOpen(false); // Başarılıysa kapat
                router.refresh();
                toast.success("Etkinlik eklendi");
              }}
              className="space-y-4"
            >
              {/* Gizli input ile seçili tarihi gönderiyoruz */}
              <input
                type="hidden"
                name="date"
                value={selectedDate?.toISOString()}
              />

              <div className="space-y-2">
                <input
                  name="title"
                  placeholder="Etkinlik Başlığı"
                  required
                  className="w-full border rounded p-2 text-sm"
                />
              </div>

              {/* Diğer inputlar (Saat, Gizlilik vs.) */}

              <div className="flex justify-end gap-2">
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
