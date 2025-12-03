"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format, isSameDay } from "date-fns";
import { tr, enUS, de } from "date-fns/locale";
import {
  Plus,
  Calendar as CalIcon,
  PawPrint,
  Repeat,
  Lock,
  Cloud,
  Sun,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  CloudDrizzle,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations, useLocale } from "next-intl";

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

const WEEKDAYS = [
  { id: 1, label: "Pt" },
  { id: 2, label: "Sa" },
  { id: 3, label: "Ça" },
  { id: 4, label: "Pe" },
  { id: 5, label: "Cu" },
  { id: 6, label: "Ct" },
  { id: 0, label: "Pz" },
];

const getWeatherIcon = (code: number) => {
  if (code === 0)
    return { icon: Sun, label: "clear", color: "text-yellow-500" };
  if (code >= 1 && code <= 3)
    return { icon: Cloud, label: "cloudy", color: "text-gray-400" };
  if (code >= 45 && code <= 48)
    return { icon: CloudFog, label: "fog", color: "text-gray-400" };
  if (code >= 51 && code <= 57)
    return { icon: CloudDrizzle, label: "drizzle", color: "text-blue-400" };
  if (code >= 61 && code <= 82)
    return { icon: CloudRain, label: "rain", color: "text-blue-600" };
  if (code >= 71 && code <= 77)
    return { icon: CloudSnow, label: "snow", color: "text-cyan-300" };
  if (code >= 95)
    return { icon: CloudLightning, label: "thunder", color: "text-purple-500" };
  return { icon: Sun, label: "clear", color: "text-yellow-500" };
};

interface CalendarWidgetProps {
  initialItems: DashboardItem[];
  initialHolidays: Holiday[];
  familyMembers: any[];
}

export function CalendarWidget({
  initialItems,
  initialHolidays,
  familyMembers,
}: CalendarWidgetProps) {
  const t = useTranslations("Calendar");
  const tCommon = useTranslations("Common");
  const locale = useLocale();
  const router = useRouter();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  );
  const [items, setItems] = useState<DashboardItem[]>(initialItems);
  const [holidays, setHolidays] = useState<Holiday[]>(initialHolidays);
  const [loading, setLoading] = useState(false);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather, setWeather] = useState<any>(null);
  const [locationName, setLocationName] = useState(t("detectingLocation"));

  const [frequency, setFrequency] = useState("none");
  const [privacyLevel, setPrivacyLevel] = useState("family");
  const [selectedWeekDays, setSelectedWeekDays] = useState<number[]>([]);

  const dateLocale = locale === "tr" ? tr : locale === "de" ? de : enUS;

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // HAVA DURUMU ÇEKME (API GÜNCELLENDİ: past_days=7 eklendi)
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async position => {
          const { latitude, longitude } = position.coords;
          try {
            // past_days=7 parametresi ile geçmiş günlerin verisini de alıyoruz
            const res = await fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&past_days=7`
            );
            const data = await res.json();
            setWeather(data);

            const locRes = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            );
            const locData = await locRes.json();
            const city =
              locData.address?.city ||
              locData.address?.town ||
              locData.address?.village ||
              locData.address?.state;
            setLocationName(city || "Konum");
          } catch (error) {
            setLocationName("Hava durumu alınamadı");
          }
        },
        error => setLocationName(t("locationDenied"))
      );
    } else {
      setLocationName("Desteklenmiyor");
    }
  }, [t]);

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
    if (res.error) toast.error(res.error);
    else {
      toast.success(t("successTask", { points }));
      if (selectedDate) fetchItemsForDate(selectedDate);
      router.refresh();
    }
  };

  const getHolidayForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return holidays.find(h => h.date === dateStr);
  };

  const toggleWeekDay = (dayId: number) => {
    setSelectedWeekDays(prev =>
      prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]
    );
  };

  const getHourlyWeather = () => {
    if (!weather || !weather.hourly || !weather.hourly.time || !selectedDate)
      return [];

    const selDateStr = format(selectedDate, "yyyy-MM-dd");
    const currentHour = new Date().getHours();
    const isToday = isSameDay(selectedDate, new Date());

    const hourlyData = weather.hourly.time.map(
      (time: string, index: number) => ({
        time: time,
        temp: weather.hourly.temperature_2m[index],
        code: weather.hourly.weather_code[index],
      })
    );

    return hourlyData.filter((h: any) => {
      const hDate = h.time.substring(0, 10);
      const hHour = new Date(h.time).getHours();
      if (isToday) return hDate === selDateStr && hHour >= currentHour;
      return hDate === selDateStr && hHour >= 6 && hHour <= 22;
    });
  };

  const hourlyForecast = getHourlyWeather();

  return (
    <Card className="h-full flex flex-col shadow-sm relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 z-10">
        <div className="flex items-center gap-3">
          <CardTitle className="text-sm font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
            {t("title")}
          </CardTitle>
          {locationName && (
            <div className="hidden md:flex items-center text-[10px] text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full transition-all hover:bg-blue-50 dark:hover:bg-blue-900/30">
              <MapPin className="h-3 w-3 mr-1 text-blue-500" />
              {locationName}
            </div>
          )}
        </div>
        <div className="text-2xl font-bold text-gray-300 dark:text-gray-700 tabular-nums leading-none">
          {format(currentTime, "HH:mm")}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col md:flex-row gap-4 p-4 pt-0 z-10">
        {/* SOL: TAKVİM */}
        <div className="border rounded-xl p-3 flex justify-center bg-white dark:bg-black/20 dark:border-gray-800 shadow-sm h-fit">
          {/* key={weather ? 'loaded' : 'loading'} ekleyerek veriler gelince yeniden render zorluyoruz */}
          <Calendar
            key={weather ? "weather-loaded" : "weather-loading"}
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            onDayClick={handleDayClick}
            locale={dateLocale}
            className="rounded-md"
            // GÜN KUTUCUĞU TASARIMI (FLEX COLUMN)
            components={{
              DayContent: props => {
                const dayStr = format(props.date, "yyyy-MM-dd");
                const weatherIndex = weather?.daily?.time
                  ? weather.daily.time.indexOf(dayStr)
                  : -1;
                let weatherInfo = null;

                if (weatherIndex > -1 && weather?.daily) {
                  weatherInfo = getWeatherIcon(
                    weather.daily.weather_code[weatherIndex]
                  );
                }

                return (
                  <div className="w-full h-full flex flex-col items-center justify-center pt-1">
                    {/* Tarih Sayısı */}
                    <span className="text-sm font-medium leading-none">
                      {props.date.getDate()}
                    </span>
                    {/* Hava Durumu İkonu */}
                    {weatherInfo ? (
                      <div className="mt-1">
                        <weatherInfo.icon
                          className={`h-3 w-3 ${weatherInfo.color}`}
                        />
                      </div>
                    ) : (
                      // Boşluk tutucu (Hizalama bozulmasın diye)
                      <div className="h-3 w-3 mt-1"></div>
                    )}
                  </div>
                );
              },
            }}
            modifiers={{ holiday: holidays.map(h => new Date(h.date)) }}
            modifiersStyles={{
              holiday: { color: "#ef4444", fontWeight: "bold" },
            }}
          />
        </div>

        {/* SAĞ: LİSTE */}
        <div className="flex-1 flex flex-col gap-0 overflow-hidden border rounded-xl bg-gray-50 dark:bg-gray-900/50 dark:border-gray-800 relative">
          {/* SAATLİK HAVA DURUMU */}
          {hourlyForecast.length > 0 && (
            <div className="w-full bg-white dark:bg-gray-800/50 border-b dark:border-gray-700 p-3 overflow-x-auto no-scrollbar flex items-center gap-4">
              {hourlyForecast.map((h: any, i: number) => {
                const info = getWeatherIcon(h.code);
                return (
                  <div
                    key={i}
                    className="flex flex-col items-center gap-1 min-w-[40px] snap-start"
                  >
                    <span className="text-[10px] text-gray-400 font-medium">
                      {format(new Date(h.time), "HH:mm")}
                    </span>
                    <info.icon className={`h-5 w-5 ${info.color}`} />
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-200">
                      {Math.round(h.temp)}°
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="p-3 flex-1 flex flex-col gap-3 overflow-auto">
            <div className="flex justify-between items-center border-b dark:border-gray-700 pb-2">
              <div className="flex flex-col">
                <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {selectedDate
                    ? format(selectedDate, "d MMMM, EEEE", {
                        locale: dateLocale,
                      })
                    : t("today")}
                </h4>
                {selectedDate && getHolidayForDate(selectedDate) && (
                  <span className="text-[10px] text-red-500 font-bold flex items-center gap-1">
                    🎉 {getHolidayForDate(selectedDate)?.localName}
                  </span>
                )}
              </div>

              {/* ANLIK HAVA (SADECE BUGÜNSE) */}
              {isSameDay(selectedDate || new Date(), new Date()) &&
                weather &&
                weather.current && (
                  <div className="flex items-center gap-2 px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/20">
                    {(() => {
                      const info = getWeatherIcon(weather.current.weather_code);
                      return <info.icon className={`h-4 w-4 ${info.color}`} />;
                    })()}
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-200">
                      {Math.round(weather.current.temperature_2m)}°C
                    </span>
                  </div>
                )}

              <Button
                size="sm"
                variant="default"
                className="h-8 bg-blue-600 hover:bg-blue-700 text-white gap-1 ml-2"
                onClick={() => setIsDialogOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" /> {tCommon("add")}
              </Button>
            </div>

            {/* LİSTE İÇERİĞİ */}
            <div className="space-y-2">
              {loading && (
                <p className="text-xs text-center text-gray-400 animate-pulse">
                  {tCommon("loading")}
                </p>
              )}

              {items
                .filter(i => i.type === "event")
                .map(event => (
                  <div
                    key={event.id}
                    className="flex items-center gap-3 p-2.5 bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-800 border-l-4 border-l-blue-500 shadow-sm"
                  >
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-1.5 rounded text-blue-600">
                      <CalIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                          {event.title}
                        </p>
                        {event.frequency && event.frequency !== "none" && (
                          <Repeat className="h-3 w-3 text-gray-400" />
                        )}
                      </div>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">
                        {event.time
                          ? format(new Date(event.time), "HH:mm")
                          : "Tüm Gün"}
                      </p>
                    </div>
                    {event.privacy_level === "private" && (
                      <Lock className="h-3 w-3 text-gray-300" />
                    )}
                  </div>
                ))}

              {items
                .filter(i => i.type === "task")
                .map(task => (
                  <div
                    key={task.id}
                    className={`flex items-center justify-between p-2.5 rounded-lg border shadow-sm transition-all ${
                      task.is_completed
                        ? "bg-green-50/50 border-green-200 opacity-70 dark:bg-green-900/10 dark:border-green-900"
                        : "bg-white border-orange-200 hover:border-orange-300 dark:bg-gray-900 dark:border-orange-900/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs shadow-sm"
                        style={{ backgroundColor: task.pet_color || "#ccc" }}
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
                          <span className="text-[10px] font-semibold text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-1.5 py-0.5 rounded">
                            {task.pet_name}
                          </span>
                          <span className="text-[10px] text-gray-500 dark:text-gray-400">
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
                        className="h-7 px-3 text-xs text-orange-600 bg-orange-50 hover:bg-orange-100 hover:text-orange-700 dark:bg-orange-900/20 dark:hover:bg-orange-900/40"
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
                <div className="text-center text-xs text-gray-400 py-8 flex flex-col items-center gap-2 opacity-60">
                  <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-full">
                    <CalIcon className="h-6 w-6 text-gray-300" />
                  </div>
                  <span>{t("noEvents")}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MODAL (Değişmedi) */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{t("addEvent")}</DialogTitle>
              <DialogDescription>
                {selectedDate
                  ? format(selectedDate, "d MMMM yyyy", { locale: dateLocale })
                  : ""}
              </DialogDescription>
            </DialogHeader>
            <form
              action={async fd => {
                const dateVal = selectedDate
                  ? format(selectedDate, "yyyy-MM-dd")
                  : format(new Date(), "yyyy-MM-dd");
                const startTime = fd.get("start_time_only") as string;
                const endTime = fd.get("end_time_only") as string;
                fd.append("start_time", `${dateVal}T${startTime}`);
                fd.append("end_time", `${dateVal}T${endTime}`);
                if (frequency === "weekly" && selectedWeekDays.length > 0) {
                  fd.append("recurrence_days", selectedWeekDays.join(","));
                }
                const res = await createEvent(fd);
                if (res?.error) toast.error(res.error);
                else {
                  setIsDialogOpen(false);
                  toast.success(t("successAdd"));
                  setFrequency("none");
                  setPrivacyLevel("family");
                  setSelectedWeekDays([]);
                  if (selectedDate) fetchItemsForDate(selectedDate);
                }
              }}
              className="space-y-3"
            >
              <div className="space-y-1">
                <label className="text-xs font-medium">{t("eventTitle")}</label>
                <input
                  name="title"
                  className="w-full border p-2 rounded text-sm dark:bg-gray-800 dark:border-gray-700"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">{t("start")}</label>
                  <input
                    type="time"
                    name="start_time_only"
                    required
                    className="w-full border p-2 rounded text-sm dark:bg-gray-800 dark:border-gray-700"
                    defaultValue="09:00"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">{t("end")}</label>
                  <input
                    type="time"
                    name="end_time_only"
                    required
                    className="w-full border p-2 rounded text-sm dark:bg-gray-800 dark:border-gray-700"
                    defaultValue="10:00"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">{t("privacy")}</label>
                  <select
                    name="privacy_level"
                    className="w-full border p-2 rounded text-sm bg-background dark:bg-gray-800 dark:border-gray-700"
                    value={privacyLevel}
                    onChange={e => setPrivacyLevel(e.target.value)}
                  >
                    <option value="family">{t("family")}</option>
                    <option value="parents">Parents</option>
                    <option value="member">Member</option>
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
                  <label className="text-xs font-medium">Member</label>
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
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
