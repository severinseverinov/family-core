"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Plus, Calendar as CalIcon, PawPrint, Repeat } from "lucide-react";
import { toast } from "sonner";

import {
  createEvent,
  getDashboardItems,
  type Holiday,
  type DashboardItem,
} from "@/app/actions/events";
import { completePetTask } from "@/app/actions/pets";

import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Günler Listesi (JS getDay() uyumlu: 1=Pzt ... 0=Pz)
const WEEKDAYS = [
  { id: 1, label: "Pt" },
  { id: 2, label: "Sa" },
  { id: 3, label: "Ça" },
  { id: 4, label: "Pe" },
  { id: 5, label: "Cu" },
  { id: 6, label: "Ct" },
  { id: 0, label: "Pz" },
];

interface CalendarWidgetProps {
  initialItems: DashboardItem[];
  initialHolidays: Holiday[];
}

export function CalendarWidget({
  initialItems,
  initialHolidays,
}: CalendarWidgetProps) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  );

  const [items, setItems] = useState<DashboardItem[]>(initialItems);
  const [holidays, setHolidays] = useState<Holiday[]>(initialHolidays);
  const [loading, setLoading] = useState(false);

  // Form State
  const [frequency, setFrequency] = useState("none");
  const [selectedWeekDays, setSelectedWeekDays] = useState<number[]>([]);

  // Tarih değiştiğinde
  const fetchItemsForDate = async (date: Date) => {
    setLoading(true);
    try {
      const dateStr = date.toISOString();
      const res = await getDashboardItems(dateStr);
      if (res.items) setItems(res.items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    fetchItemsForDate(date);
  };

  const handleCompleteTask = async (routineId: string, points: number) => {
    const dateStr = selectedDate
      ? selectedDate.toISOString()
      : new Date().toISOString();
    const res = await completePetTask(routineId, dateStr);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(`Harika! +${points} Puan kazandın 🎉`);
      if (selectedDate) fetchItemsForDate(selectedDate);
      router.refresh();
    }
  };

  const getHolidayForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return holidays.find(h => h.date === dateStr);
  };

  // Gün seçimi değiştirme
  const toggleWeekDay = (dayId: number) => {
    setSelectedWeekDays(prev =>
      prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]
    );
  };

  return (
    <Card className="h-full flex flex-col shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-bold text-gray-700 dark:text-gray-200">
          Takvim & Görevler
        </CardTitle>
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
        {/* SOL: TAKVİM */}
        <div className="border rounded-xl p-3 flex justify-center bg-white dark:bg-black/20 shadow-sm">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            onDayClick={handleDayClick}
            locale={tr}
            className="rounded-md"
            modifiers={{ holiday: holidays.map(h => new Date(h.date)) }}
            modifiersStyles={{
              holiday: { color: "#ef4444", fontWeight: "bold" },
            }}
          />
        </div>

        {/* SAĞ: LİSTE */}
        <div className="flex-1 flex flex-col gap-3 p-3 overflow-auto border rounded-xl bg-gray-50 dark:bg-gray-900/50">
          <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 border-b pb-2 flex justify-between">
            <span>
              {selectedDate
                ? format(selectedDate, "d MMMM yyyy, EEEE", { locale: tr })
                : "Bugün"}
            </span>
            {loading && (
              <span className="text-xs text-gray-400 animate-pulse">
                Yükleniyor...
              </span>
            )}
          </h4>

          {selectedDate && getHolidayForDate(selectedDate) && (
            <div className="p-2 bg-red-100 border border-red-200 rounded text-red-800 text-xs font-bold flex items-center gap-2">
              <span>🎉</span>
              {getHolidayForDate(selectedDate)?.localName}
            </div>
          )}

          <div className="space-y-2">
            {/* ETKİNLİKLER */}
            {items
              .filter(i => i.type === "event")
              .map(event => (
                <div
                  key={event.id}
                  className="flex items-center gap-2 p-2 bg-white rounded border border-l-4 border-l-blue-500 shadow-sm"
                >
                  <CalIcon className="h-4 w-4 text-blue-500" />
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                        {event.title}
                      </p>
                      {event.frequency && event.frequency !== "none" && (
                        <Repeat
                          className="h-3 w-3 text-gray-400"
                          title="Tekrarlı"
                        />
                      )}
                    </div>
                    <p className="text-[10px] text-gray-500">
                      {event.time
                        ? format(new Date(event.time), "HH:mm")
                        : "Tüm Gün"}
                    </p>
                  </div>
                </div>
              ))}

            {/* GÖREVLER */}
            {items
              .filter(i => i.type === "task")
              .map(task => (
                <div
                  key={task.id}
                  className={`flex items-center justify-between p-2 rounded border shadow-sm transition-all ${
                    task.is_completed
                      ? "bg-green-50 border-green-200 opacity-60"
                      : "bg-white border-orange-200 hover:border-orange-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs shadow-sm"
                      style={{ backgroundColor: task.pet_color || "#ccc" }}
                      title={task.pet_name}
                    >
                      <PawPrint className="h-4 w-4" />
                    </div>
                    <div>
                      <p
                        className={`text-xs font-bold ${
                          task.is_completed
                            ? "line-through text-gray-500"
                            : "text-gray-800 dark:text-gray-200"
                        }`}
                      >
                        {task.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-semibold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-1.5 py-0.5 rounded">
                          {task.pet_name}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {task.is_completed
                            ? `✅ ${task.completed_by}`
                            : `+${task.points} P`}
                        </span>
                      </div>
                    </div>
                  </div>
                  {!task.is_completed && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-orange-600 hover:bg-orange-100 hover:text-orange-700"
                      onClick={() =>
                        handleCompleteTask(task.routine_id!, task.points!)
                      }
                    >
                      Yap
                    </Button>
                  )}
                </div>
              ))}

            {!loading && items.length === 0 && (
              <div className="text-center text-xs text-gray-400 py-6 flex flex-col items-center gap-1">
                <span>😴</span>
                <span>Yapılacak bir şey yok</span>
              </div>
            )}
          </div>
        </div>

        {/* YENİ ETKİNLİK MODALI */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Yeni Etkinlik</DialogTitle>
              <DialogDescription>
                Takvime yeni bir etkinlik ekle.
              </DialogDescription>
            </DialogHeader>
            <form
              action={async fd => {
                // Seçilen tarihi form data'ya ekle
                const dateVal = selectedDate
                  ? format(selectedDate, "yyyy-MM-dd")
                  : format(new Date(), "yyyy-MM-dd");
                const startTime = fd.get("start_time_only") as string;
                const endTime = fd.get("end_time_only") as string;

                fd.append("start_time", `${dateVal}T${startTime}`);
                fd.append("end_time", `${dateVal}T${endTime}`);

                // Seçilen günleri gönder (Haftalık ise)
                if (frequency === "weekly" && selectedWeekDays.length > 0) {
                  fd.append("recurrence_days", selectedWeekDays.join(","));
                }

                const res = await createEvent(fd);
                if (res?.error) toast.error(res.error);
                else {
                  setIsDialogOpen(false);
                  toast.success("Eklendi");
                  setFrequency("none"); // Reset
                  setSelectedWeekDays([]); // Reset
                  if (selectedDate) fetchItemsForDate(selectedDate);
                }
              }}
              className="space-y-3"
            >
              <div className="space-y-1">
                <label className="text-xs font-medium">Başlık</label>
                <input
                  name="title"
                  placeholder="Örn: Akşam Yemeği"
                  className="w-full border p-2 rounded text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Başlangıç</label>
                  <input
                    type="time"
                    name="start_time_only"
                    required
                    className="w-full border p-2 rounded text-sm"
                    defaultValue="09:00"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Bitiş</label>
                  <input
                    type="time"
                    name="end_time_only"
                    required
                    className="w-full border p-2 rounded text-sm"
                    defaultValue="10:00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Görünürlük</label>
                  <select
                    name="privacy_level"
                    className="w-full border p-2 rounded text-sm bg-background"
                  >
                    <option value="family">Tüm Aile</option>
                    <option value="private">Gizli</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Tekrar</label>
                  <select
                    name="frequency"
                    className="w-full border p-2 rounded text-sm bg-background"
                    value={frequency}
                    onChange={e => setFrequency(e.target.value)}
                  >
                    <option value="none">Tek Seferlik</option>
                    <option value="daily">Her Gün</option>
                    <option value="weekly">Haftalık</option>
                    <option value="monthly">Her Ay</option>
                    <option value="yearly">Her Yıl</option>
                  </select>
                </div>
              </div>

              {/* GÜN SEÇİCİ (Sadece Haftalık seçilirse görünür) */}
              {frequency === "weekly" && (
                <div className="space-y-2 bg-gray-50 p-2 rounded border border-dashed">
                  <label className="text-xs font-medium text-gray-500">
                    Hangi Günler?
                  </label>
                  <div className="flex justify-between">
                    {WEEKDAYS.map(day => (
                      <button
                        type="button"
                        key={day.id}
                        onClick={() => toggleWeekDay(day.id)}
                        className={`w-8 h-8 rounded-full text-xs font-medium transition-all ${
                          selectedWeekDays.includes(day.id)
                            ? "bg-blue-600 text-white shadow-md scale-110"
                            : "bg-white border text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-400 text-center">
                    Hiçbiri seçilmezse sadece{" "}
                    {selectedDate
                      ? format(selectedDate, "EEEE", { locale: tr })
                      : "seçili gün"}{" "}
                    tekrar eder.
                  </p>
                </div>
              )}

              <Button type="submit" className="w-full mt-2">
                Kaydet
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
