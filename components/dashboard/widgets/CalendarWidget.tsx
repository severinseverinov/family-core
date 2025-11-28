"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { tr } from "date-fns/locale"; // Türkçe takvim desteği
import { Plus } from "lucide-react";
import { toast } from "sonner";

// Server Actions ve Tipler
import {
  createEvent,
  getPublicHolidays,
  type Holiday,
} from "@/app/actions/events";

// UI Bileşenleri
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

  // State Yönetimi
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  );
  const [holidays, setHolidays] = useState<Holiday[]>([]); // Tatiller burada tutulur

  // Sayfa yüklendiğinde Tatilleri Çek
  useEffect(() => {
    async function loadHolidays() {
      // Varsayılan olarak 'TR' tatillerini çekiyoruz.
      // İleride buraya kullanıcının ülke kodunu parametre olarak geçebiliriz.
      const data = await getPublicHolidays("TR");
      setHolidays(data);
    }
    loadHolidays();
  }, []);

  // Takvimde güne tıklama olayı
  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setIsDialogOpen(true); // Ekleme pencresini aç
  };

  // Seçili tarihte tatil var mı kontrol et
  const getHolidayForDate = (date: Date) => {
    // API tarihi 'YYYY-MM-DD' formatında dönüyor, eşleştiriyoruz
    const dateStr = format(date, "yyyy-MM-dd");
    return holidays.find(h => h.date === dateStr);
  };

  return (
    <Card className="h-full flex flex-col shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-bold text-gray-700 dark:text-gray-200">
          Takvim & Etkinlikler
        </CardTitle>

        {/* Ekleme Butonu (Manuel) */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => setIsDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col md:flex-row gap-4 p-4 pt-0">
        {/* SOL: TAKVİM ALANI */}
        <div className="border rounded-xl p-3 flex justify-center bg-white dark:bg-black/20 shadow-sm">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            onDayClick={handleDayClick}
            locale={tr}
            className="rounded-md"
            // Tatil Günlerini İşaretle (Stil)
            modifiers={{
              holiday: holidays.map(h => new Date(h.date)),
            }}
            modifiersStyles={{
              holiday: {
                color: "#ef4444", // Kırmızı
                fontWeight: "bold",
                textDecoration: "underline",
              },
            }}
          />
        </div>

        {/* SAĞ: GÜNLÜK AKIŞ VE LİSTE */}
        <div className="flex-1 flex flex-col gap-3 p-3 overflow-auto border rounded-xl bg-gray-50 dark:bg-gray-900/50">
          {/* Seçili Gün Başlığı */}
          <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 border-b pb-2">
            {selectedDate
              ? format(selectedDate, "d MMMM yyyy, EEEE", { locale: tr })
              : "Tarih Seçiniz"}
          </h4>

          {/* 1. EĞER TATİLSE GÖSTER */}
          {selectedDate && getHolidayForDate(selectedDate) && (
            <div className="p-3 bg-red-100 border border-red-200 rounded-lg text-red-800 text-sm font-medium flex items-center gap-2 animate-in slide-in-from-left-2">
              🎉 {getHolidayForDate(selectedDate)?.localName}
            </div>
          )}

          {/* 2. ETKİNLİK LİSTESİ (Buraya DB verileri gelecek) */}
          <div className="flex-1 flex flex-col items-center justify-center text-xs text-muted-foreground space-y-2 opacity-70">
            <span>📅 Bu gün için planlanmış özel bir etkinlik yok.</span>
            <span className="text-[10px]">
              Eklemek için takvimdeki güne tıklayın.
            </span>
          </div>
        </div>

        {/* POP-UP: YENİ ETKİNLİK EKLEME */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Etkinlik Planla</DialogTitle>
              <DialogDescription>
                {selectedDate
                  ? format(selectedDate, "d MMMM yyyy", { locale: tr })
                  : "Tarih seçiniz"}
              </DialogDescription>
            </DialogHeader>

            <form
              action={async formData => {
                const result = await createEvent(formData);

                if (result?.error) {
                  toast.error(result.error);
                  return;
                }

                setIsDialogOpen(false); // Kapat
                router.refresh(); // Verileri Yenile
                toast.success("Etkinlik başarıyla eklendi");
              }}
              className="space-y-4 pt-2"
            >
              {/* Gizli Tarih Inputu */}
              <input
                type="hidden"
                name="date"
                value={selectedDate?.toISOString()}
              />

              <div className="space-y-2">
                <label className="text-sm font-medium">Etkinlik Adı</label>
                <input
                  name="title"
                  placeholder="Örn: Dişçi Randevusu"
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Başlangıç Saati</label>
                  <input
                    type="time" // Sadece saat, tarih zaten seçili
                    name="start_time"
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Bitiş Saati</label>
                  <input
                    type="time"
                    name="end_time"
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Kimler Görebilir?</label>
                <select
                  name="privacy_level"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="family">👨‍👩‍👧‍👦 Tüm Aile</option>
                  <option value="private">🔒 Sadece Ben</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Vazgeç
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
