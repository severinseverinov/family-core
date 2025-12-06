"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  format,
  addDays,
  isSameDay,
  startOfDay,
  endOfDay,
  isWithinInterval,
} from "date-fns";
import { tr, enUS, de } from "date-fns/locale";
import {
  CheckCircle2,
  PawPrint,
  ChevronLeft,
  ChevronRight,
  Lock,
  Calendar as CalendarIcon,
  ListTodo,
  Plus,
  Clock,
  Stethoscope,
  Syringe,
  FileText,
  Baby,
  Check,
  PlayCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils";

import {
  getDashboardItems,
  createEvent,
  completeEvent,
  type DashboardItem,
} from "@/app/actions/events";
import { completePetTask, approveTask } from "@/app/actions/pets";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface TasksWidgetProps {
  initialItems: DashboardItem[];
  userRole: string;
  userId: string;
  familyMembers: any[];
  userGender?: string;
}

const WEEKDAYS = [
  { id: 1, label: "Pt" },
  { id: 2, label: "Sa" },
  { id: 3, label: "Ça" },
  { id: 4, label: "Pe" },
  { id: 5, label: "Cu" },
  { id: 6, label: "Ct" },
  { id: 0, label: "Pz" },
];

export function TasksWidget({
  initialItems,
  userRole,
  userId,
  familyMembers,
  userGender = "male",
}: TasksWidgetProps) {
  const t = useTranslations("Calendar");
  const tCommon = useTranslations("Common");
  const locale = useLocale();

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialDate = searchParams.get("date")
    ? new Date(searchParams.get("date")!)
    : new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);

  const [items, setItems] = useState<DashboardItem[]>(initialItems || []);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"tasks" | "events">("events");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [modalTab, setModalTab] = useState("standard");
  const [frequency, setFrequency] = useState("none");
  const [privacyLevel, setPrivacyLevel] = useState("family");
  const [selectedWeekDays, setSelectedWeekDays] = useState<number[]>([]);
  const [appointmentType, setAppointmentType] = useState("doctor");
  const [lastPeriodDate, setLastPeriodDate] = useState("");
  const [cycleLength, setCycleLength] = useState(28);

  const dateLocale = locale === "tr" ? tr : locale === "de" ? de : enUS;

  const taskList = (items || []).filter(i => i.type === "task");

  const eventList = (items || []).filter(i => {
    if (i.type !== "event") return false;
    if (i.frequency === "none" && i.time) {
      const eventDate = new Date(i.time);
      return isWithinInterval(eventDate, {
        start: startOfDay(selectedDate),
        end: endOfDay(selectedDate),
      });
    }
    return true;
  });

  useEffect(() => {
    const dateParam = searchParams.get("date");
    if (dateParam) {
      const newDate = new Date(dateParam);
      if (!isSameDay(newDate, selectedDate)) {
        setSelectedDate(newDate);
        fetchItems(newDate);
      }
    }
  }, [searchParams]);

  const fetchItems = async (date: Date) => {
    setLoading(true);
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const res = await getDashboardItems(dateStr);
      if (res && Array.isArray(res.items)) {
        setItems(res.items);
      } else {
        setItems([]);
      }
    } catch (e) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (days: number) => {
    const newDate = addDays(selectedDate, days);
    setSelectedDate(newDate);
    fetchItems(newDate);
    const dateStr = format(newDate, "yyyy-MM-dd");
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", dateStr);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleCompleteTask = async (routineId: string, points: number) => {
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const res = await completePetTask(routineId, dateStr);
    if (res.error) toast.error(res.error);
    else {
      toast.success(
        res.status === "pending"
          ? "Onaya gönderildi ⏳"
          : t("successTask", { points })
      );
      fetchItems(selectedDate);
      router.refresh();
    }
  };

  const handleApprove = async (logId: string) => {
    const res = await approveTask(logId);
    if (res?.error) toast.error("Hata");
    else {
      toast.success("Onaylandı!");
      router.refresh();
      fetchItems(selectedDate);
    }
  };

  const handleEventComplete = async (eventId: string) => {
    const res = await completeEvent(eventId);
    if (res?.error) toast.error(res.error);
    else {
      toast.success("İşaretlendi ✅");
      fetchItems(selectedDate);
      router.refresh();
    }
  };

  const toggleWeekDay = (dayId: number) => {
    setSelectedWeekDays(prev =>
      prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]
    );
  };

  return (
    // DÜZELTME: Arka plan şeffaflaştırıldı
    <Card className="h-full flex flex-col shadow-sm bg-white/60 dark:bg-gray-900/50 backdrop-blur-md border-orange-100 dark:border-orange-900/30 relative overflow-hidden">
      <CardHeader className="pb-2 pt-3 px-3 flex flex-col gap-3 space-y-0 border-b border-orange-50/50 dark:border-gray-800/50">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <div className="flex bg-white/50 dark:bg-gray-800/50 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab("tasks")}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-all",
                  activeTab === "tasks"
                    ? "bg-white dark:bg-gray-700 shadow text-orange-600 dark:text-orange-400"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                <ListTodo className="h-3.5 w-3.5" /> Görev ({taskList.length})
              </button>
              <button
                onClick={() => setActiveTab("events")}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-all",
                  activeTab === "events"
                    ? "bg-white dark:bg-gray-700 shadow text-blue-600 dark:text-blue-400"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                <CalendarIcon className="h-3.5 w-3.5" /> Hatırlatma (
                {eventList.length})
              </button>
            </div>
          </div>
          <Button
            size="sm"
            variant="default"
            className="h-7 bg-blue-600 hover:bg-blue-700 text-white gap-1 ml-2 px-2 text-xs"
            onClick={() => setIsDialogOpen(true)}
          >
            <Plus className="h-3 w-3" /> {tCommon("add")}
          </Button>
        </div>

        <div className="flex items-center justify-center gap-2 bg-white/40 dark:bg-gray-800/40 p-1 rounded-md">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => handleDateChange(-1)}
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <span className="text-xs font-medium w-24 text-center text-gray-700 dark:text-gray-300 truncate">
            {isSameDay(selectedDate, new Date())
              ? t("today")
              : format(selectedDate, "d MMM", { locale: dateLocale })}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => handleDateChange(1)}
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto p-3 space-y-2">
        {loading ? (
          <p className="text-xs text-center text-gray-400 py-4 animate-pulse">
            {tCommon("loading")}
          </p>
        ) : (
          <>
            {activeTab === "tasks" &&
              (taskList.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-xs opacity-60">
                  Görev yok.
                </div>
              ) : (
                taskList.map(task => {
                  const isDone = task.status === "completed";
                  const isPending = task.status === "pending";
                  const isChild = !["owner", "admin"].includes(userRole);
                  const isAssignedToMe =
                    !task.assigned_to || task.assigned_to.includes(userId);

                  return (
                    // Liste öğesi arka planı: bg-white/60
                    <div
                      key={task.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border shadow-sm transition-all bg-white/60 dark:bg-gray-900/40 border-orange-100 hover:border-orange-300 dark:border-gray-800",
                        isDone && "bg-green-50/40 border-green-200 opacity-70"
                      )}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs shadow-sm shrink-0",
                            isDone ? "bg-green-500" : "bg-orange-400"
                          )}
                          style={
                            !isDone && task.pet_color
                              ? { backgroundColor: task.pet_color }
                              : {}
                          }
                        >
                          {isDone ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <PawPrint className="h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p
                            className={cn(
                              "text-sm font-semibold truncate dark:text-gray-200",
                              isDone && "line-through text-gray-500"
                            )}
                          >
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400">
                            <span className="bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 px-1.5 py-0.5 rounded">
                              {task.pet_name}
                            </span>
                            {isDone ? (
                              <span>✅ {task.completed_by}</span>
                            ) : (
                              <span>+{task.points} P</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-1">
                        {isDone ? (
                          <span className="text-[10px] text-green-600 font-bold bg-green-50/50 px-2 py-1 rounded">
                            Yapıldı
                          </span>
                        ) : isPending ? (
                          isChild ? (
                            <span className="text-[10px] text-orange-500 animate-pulse font-medium bg-orange-50 px-2 py-1 rounded">
                              Onay Bekliyor
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              className="h-7 bg-green-600 hover:bg-green-700 text-white text-xs"
                              onClick={() => handleApprove(task.log_id!)}
                            >
                              Onayla
                            </Button>
                          )
                        ) : isAssignedToMe ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-3 text-xs font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 dark:text-orange-400"
                            onClick={() =>
                              handleCompleteTask(task.routine_id!, task.points!)
                            }
                          >
                            Yap
                          </Button>
                        ) : (
                          <span className="text-[10px] text-gray-300 px-2 flex items-center gap-1">
                            <Lock className="h-3 w-3" /> Kilitli
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              ))}

            {activeTab === "events" &&
              (eventList.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-xs opacity-60">
                  Hatırlatma yok.
                </div>
              ) : (
                eventList.map(event => {
                  let EventIcon = Clock;
                  let iconColor = "text-blue-600";
                  let bgColor = "bg-blue-50 dark:bg-blue-900/20";
                  if (event.category === "doctor") {
                    EventIcon = Stethoscope;
                    iconColor = "text-red-600";
                    bgColor = "bg-red-50 dark:bg-red-900/20";
                  } else if (event.category === "vaccine") {
                    EventIcon = Syringe;
                    iconColor = "text-green-600";
                    bgColor = "bg-green-50 dark:bg-green-900/20";
                  } else if (event.category === "baby") {
                    EventIcon = Baby;
                    iconColor = "text-purple-600";
                    bgColor = "bg-purple-50 dark:bg-purple-900/20";
                  }

                  const eventTime = event.time
                    ? new Date(event.time)
                    : new Date();
                  const isPast = eventTime < new Date();
                  const isCompleted = event.is_completed;
                  const canComplete = event.frequency === "none";

                  return (
                    // Liste öğesi arka planı: bg-white/60
                    <div
                      key={event.id}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border shadow-sm transition-all bg-white/60 dark:bg-gray-900/40 border-l-4",
                        isCompleted
                          ? "bg-green-50/40 border-green-100 border-l-green-500"
                          : "dark:border-gray-800",
                        !isCompleted &&
                          (event.category === "doctor"
                            ? "border-l-red-500"
                            : event.category === "vaccine"
                            ? "border-l-green-500"
                            : "border-l-blue-500")
                      )}
                    >
                      <div
                        className={cn(
                          "p-2 rounded mt-0.5",
                          isCompleted ? "bg-green-100 text-green-600" : bgColor,
                          !isCompleted && iconColor
                        )}
                      >
                        {isCompleted ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <EventIcon className="h-4 w-4" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <p
                            className={cn(
                              "text-sm font-bold truncate pr-2",
                              isCompleted
                                ? "text-gray-500 line-through"
                                : "text-gray-800 dark:text-gray-200"
                            )}
                          >
                            {event.title}
                          </p>
                          {event.privacy_level === "private" && (
                            <Lock className="h-3.5 w-3.5 text-gray-300 shrink-0" />
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <p className="text-xs text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-gray-800/50 px-1.5 py-0.5 rounded w-fit">
                            {event.time
                              ? format(new Date(event.time), "HH:mm")
                              : "Tüm Gün"}
                          </p>
                          {isCompleted && (
                            <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">
                              {event.completed_by
                                ? `✅ ${event.completed_by}`
                                : "Tamamlandı"}
                            </span>
                          )}
                          {event.description && !isCompleted && (
                            <div className="group relative">
                              <FileText className="h-3.5 w-3.5 text-gray-400" />
                              <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block bg-black text-white text-[10px] p-2 rounded w-48 z-50">
                                {event.description}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {!isCompleted && canComplete && isPast && (
                        <div className="shrink-0">
                          {event.category === "health" ? (
                            <Button
                              size="sm"
                              className="h-7 text-[10px] bg-pink-500 hover:bg-pink-600 text-white gap-1 px-2"
                              onClick={() => handleEventComplete(event.id)}
                            >
                              <PlayCircle className="h-3 w-3" /> Başladı?
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] border-green-200 hover:bg-green-50 text-green-700 gap-1 px-2"
                              onClick={() => handleEventComplete(event.id)}
                            >
                              <Check className="h-3 w-3" /> Yapıldı
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ))}
          </>
        )}
      </CardContent>
      {/* Dialog aynı */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        {/* ... Dialog içeriği (aynı) ... */}
        {/* (Kısaltmak için buraya koymadım ama var olan dialog kodunu kullanın) */}
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("addReminder")}</DialogTitle>
            <DialogDescription>
              {format(selectedDate, "d MMMM yyyy", { locale: dateLocale })}
            </DialogDescription>
          </DialogHeader>

          <Tabs
            defaultValue="standard"
            className="w-full"
            onValueChange={setModalTab}
          >
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="standard">Standart</TabsTrigger>
              <TabsTrigger value="appointment">Randevu/Aşı</TabsTrigger>
              {userGender === "female" ? (
                <TabsTrigger value="health">Döngü</TabsTrigger>
              ) : (
                <TabsTrigger value="care">Bakım</TabsTrigger>
              )}
            </TabsList>

            <form
              action={async fd => {
                const formDate = fd.get("date") as string;
                let dateVal = formDate || format(selectedDate, "yyyy-MM-dd");
                let title = fd.get("title") as string;
                let category = "general";

                if (modalTab === "appointment") {
                  category = appointmentType;
                  if (!title) {
                    if (appointmentType === "doctor")
                      title = "Doktor Randevusu";
                    else if (appointmentType === "vaccine") title = "Aşı Günü";
                    else if (appointmentType === "baby")
                      title = "Bebek Kontrolü";
                  }
                } else if (modalTab === "health") {
                  const lastDate = new Date(lastPeriodDate);
                  if (!isNaN(lastDate.getTime())) {
                    const nextDate = addDays(lastDate, cycleLength);
                    dateVal = format(nextDate, "yyyy-MM-dd");
                    title = "Tahmini Regl Başlangıcı ❤️";
                    fd.set("frequency", "monthly");
                    category = "health";
                  }
                }

                fd.set("title", title);
                fd.append("category", category);
                fd.append(
                  "start_time",
                  `${dateVal}T${fd.get("start_time_only") || "09:00"}`
                );
                fd.append(
                  "end_time",
                  `${dateVal}T${fd.get("end_time_only") || "10:00"}`
                );
                if (frequency === "weekly" && selectedWeekDays.length > 0)
                  fd.append("recurrence_days", selectedWeekDays.join(","));

                const res = await createEvent(fd);
                if (res?.error) toast.error(res.error);
                else {
                  setIsDialogOpen(false);
                  toast.success(t("successAdd"));
                  const newDate = new Date(dateVal);
                  if (!isSameDay(newDate, selectedDate)) {
                    handleDateChange(0);
                  } else {
                    fetchItems(selectedDate);
                  }
                }
              }}
              className="space-y-3"
            >
              <div className="space-y-1">
                <label className="text-xs font-medium">Tarih</label>
                <Input
                  type="date"
                  name="date"
                  defaultValue={format(selectedDate, "yyyy-MM-dd")}
                  className="bg-white dark:bg-gray-800"
                />
              </div>

              <TabsContent value="standard" className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">
                    {t("reminderTitle")}
                  </label>
                  <input
                    name="title"
                    className="w-full border p-2 rounded text-sm dark:bg-gray-800 dark:border-gray-700"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Not / Açıklama</label>
                  <textarea
                    name="description"
                    className="w-full border p-2 rounded text-sm dark:bg-gray-800 dark:border-gray-700 resize-none h-16"
                    placeholder="Detay ekle..."
                  />
                </div>
              </TabsContent>

              <TabsContent value="appointment" className="space-y-3">
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setAppointmentType("doctor")}
                    className={cn(
                      "flex flex-col items-center justify-center p-2 rounded border transition-all text-xs gap-1",
                      appointmentType === "doctor"
                        ? "bg-red-50 border-red-500 text-red-700"
                        : "bg-white border-gray-200 text-gray-500"
                    )}
                  >
                    <Stethoscope className="h-5 w-5" /> Doktor
                  </button>
                  <button
                    type="button"
                    onClick={() => setAppointmentType("vaccine")}
                    className={cn(
                      "flex flex-col items-center justify-center p-2 rounded border transition-all text-xs gap-1",
                      appointmentType === "vaccine"
                        ? "bg-green-50 border-green-500 text-green-700"
                        : "bg-white border-gray-200 text-gray-500"
                    )}
                  >
                    <Syringe className="h-5 w-5" /> Aşı
                  </button>
                  <button
                    type="button"
                    onClick={() => setAppointmentType("baby")}
                    className={cn(
                      "flex flex-col items-center justify-center p-2 rounded border transition-all text-xs gap-1",
                      appointmentType === "baby"
                        ? "bg-purple-50 border-purple-500 text-purple-700"
                        : "bg-white border-gray-200 text-gray-500"
                    )}
                  >
                    <Baby className="h-5 w-5" /> Bebek
                  </button>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">
                    Başlık (Opsiyonel)
                  </label>
                  <input
                    name="title"
                    placeholder={
                      appointmentType === "vaccine"
                        ? "Örn: 2. Ay Aşısı"
                        : "Örn: Göz Doktoru"
                    }
                    className="w-full border p-2 rounded text-sm dark:bg-gray-800 dark:border-gray-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Önemli Notlar</label>
                  <textarea
                    name="description"
                    className="w-full border p-2 rounded text-sm dark:bg-gray-800 dark:border-gray-700 resize-none h-20"
                    placeholder="Doktor adı, alınacak ilaçlar, aşı detayları..."
                  />
                </div>
              </TabsContent>

              {userGender === "female" && (
                <TabsContent value="health" className="space-y-3">
                  <div className="p-3 bg-pink-50 dark:bg-pink-900/20 rounded-lg border border-pink-100 dark:border-pink-900">
                    <p className="text-xs text-pink-600 dark:text-pink-400 mb-3 font-medium">
                      Bir sonraki döngüyü otomatik hesaplayıp takvime ekler.
                    </p>
                    <div className="space-y-2">
                      <label className="text-xs font-medium">
                        {t("lastCycleDate")}
                      </label>
                      <Input
                        type="date"
                        value={lastPeriodDate}
                        onChange={e => setLastPeriodDate(e.target.value)}
                        required
                        className="bg-white dark:bg-gray-900"
                      />
                    </div>
                    <div className="space-y-2 mt-2">
                      <label className="text-xs font-medium">
                        {t("cycleDuration")}
                      </label>
                      <Input
                        type="number"
                        value={cycleLength}
                        onChange={e => setCycleLength(parseInt(e.target.value))}
                        className="bg-white dark:bg-gray-900"
                      />
                    </div>
                  </div>
                </TabsContent>
              )}

              <TabsContent value="care" className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Bakım Türü</label>
                  <input
                    name="title"
                    placeholder="Örn: Saç Tıraşı"
                    className="w-full border p-2 rounded text-sm dark:bg-gray-800 dark:border-gray-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Not</label>
                  <input
                    name="description"
                    className="w-full border p-2 rounded text-sm dark:bg-gray-800 dark:border-gray-700"
                  />
                </div>
              </TabsContent>

              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium">{t("start")}</label>
                  <input
                    type="time"
                    name="start_time_only"
                    className="w-full border p-2 rounded text-sm dark:bg-gray-800 dark:border-gray-700"
                    defaultValue="09:00"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">{t("end")}</label>
                  <input
                    type="time"
                    name="end_time_only"
                    className="w-full border p-2 rounded text-sm dark:bg-gray-800 dark:border-gray-700"
                    defaultValue="10:00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t dark:border-gray-800">
                <div className="space-y-1">
                  <label className="text-xs font-medium">{t("privacy")}</label>
                  <select
                    name="privacy_level"
                    className="w-full border p-2 rounded text-sm bg-background dark:bg-gray-800 dark:border-gray-700"
                    value={privacyLevel}
                    onChange={e => setPrivacyLevel(e.target.value)}
                  >
                    <option value="family">{t("family")}</option>
                    <option value="parents">{t("parents")}</option>
                    <option value="member">{t("member")}</option>
                    <option value="private">{t("private")}</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">{t("repeat")}</label>
                  <select
                    name="frequency"
                    className="w-full border p-2 rounded text-sm bg-background dark:bg-gray-800 dark:border-gray-700"
                    value={frequency}
                    onChange={e => setFrequency(e.target.value)}
                  >
                    <option value="none">{t("recurrence_none")}</option>
                    <option value="daily">{t("recurrence_daily")}</option>
                    <option value="weekly">{t("recurrence_weekly")}</option>
                    <option value="monthly">{t("recurrence_monthly")}</option>
                    <option value="yearly">{t("recurrence_yearly")}</option>
                  </select>
                </div>
              </div>

              {privacyLevel === "member" && (
                <div className="space-y-1">
                  <label className="text-xs font-medium">Kişi Seç</label>
                  <select
                    name="assigned_to"
                    className="w-full border p-2 rounded text-sm bg-background dark:bg-gray-800 dark:border-gray-700"
                  >
                    {familyMembers.map((m: any) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {frequency === "weekly" && (
                <div className="space-y-2 bg-gray-50 p-2 rounded border border-dashed dark:bg-gray-800 dark:border-gray-700">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {t("weekDays")}
                  </label>
                  <div className="flex justify-between">
                    {WEEKDAYS.map(day => (
                      <button
                        type="button"
                        key={day.id}
                        onClick={() => toggleWeekDay(day.id)}
                        className={`w-8 h-8 rounded-full text-xs font-medium transition-all ${
                          selectedWeekDays.includes(day.id)
                            ? "bg-blue-600 text-white shadow-md"
                            : "bg-white border text-gray-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
                        }`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 mt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsDialogOpen(false)}
                >
                  {t("cancel")}
                </Button>
                <Button type="submit">{t("save")}</Button>
              </div>
            </form>
          </Tabs>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
