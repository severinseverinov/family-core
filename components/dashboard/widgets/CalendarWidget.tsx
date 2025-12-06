"use client";

import { useState, useEffect, useMemo } from "react";
import { format, isSameDay } from "date-fns";
import { tr, enUS, de } from "date-fns/locale";
import {
  Cloud,
  Sun,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  CloudDrizzle,
  MapPin,
  Thermometer,
  Wind,
  Droplets,
  Sunrise,
  Sunset,
  Umbrella,
  Heart,
  Stethoscope,
  Syringe,
  Baby,
  SunDim,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type Holiday, type DashboardItem } from "@/app/actions/events";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

// İkon Seçici
const getWeatherIcon = (code: number) => {
  if (code === 0) return { icon: Sun, label: "Açık", color: "text-yellow-500" };
  if (code >= 1 && code <= 3)
    return { icon: Cloud, label: "Bulutlu", color: "text-gray-400" };
  if (code >= 45 && code <= 48)
    return { icon: CloudFog, label: "Sisli", color: "text-gray-400" };
  if (code >= 51 && code <= 57)
    return { icon: CloudDrizzle, label: "Çiseleme", color: "text-blue-400" };
  if (code >= 61 && code <= 82)
    return { icon: CloudRain, label: "Yağmurlu", color: "text-blue-600" };
  if (code >= 71 && code <= 77)
    return { icon: CloudSnow, label: "Karlı", color: "text-cyan-300" };
  if (code >= 95)
    return { icon: CloudLightning, label: "Fırtına", color: "text-purple-500" };
  return { icon: Sun, label: "Açık", color: "text-yellow-500" };
};

interface CalendarWidgetProps {
  initialHolidays: Holiday[];
  events: DashboardItem[];
}

export function CalendarWidget({
  initialHolidays,
  events = [],
}: CalendarWidgetProps) {
  const t = useTranslations("Calendar");
  const locale = useLocale();
  const dateLocale = locale === "tr" ? tr : locale === "de" ? de : enUS;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialDate = searchParams.get("date")
    ? new Date(searchParams.get("date")!)
    : new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);

  const [holidays] = useState<Holiday[]>(initialHolidays);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather, setWeather] = useState<any>(null);
  const [locationName, setLocationName] = useState(t("detectingLocation"));

  useEffect(() => {
    const dateParam = searchParams.get("date");
    if (dateParam) {
      const newDate = new Date(dateParam);
      if (!isSameDay(newDate, selectedDate)) {
        setSelectedDate(newDate);
      }
    }
  }, [searchParams]);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);
    const dateStr = format(date, "yyyy-MM-dd");
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", dateStr);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async position => {
          const { latitude, longitude } = position.coords;
          try {
            const res = await fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code,precipitation_probability,apparent_temperature&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max,apparent_temperature_max,apparent_temperature_min,wind_speed_10m_max,uv_index_max&timezone=auto&past_days=1`
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
              locData.address?.district ||
              "Konum";
            setLocationName(city);
          } catch {
            setLocationName("Hava durumu yok");
          }
        },
        () => setLocationName(t("locationDenied"))
      );
    }
  }, [t]);

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      if (event.time && isSameDay(new Date(event.time), date)) return true;
      const evtDate = new Date(event.time || new Date());
      if (event.frequency === "daily") return true;
      if (event.frequency === "weekly" && evtDate.getDay() === date.getDay())
        return true;
      if (event.frequency === "monthly" && evtDate.getDate() === date.getDate())
        return true;
      if (
        event.frequency === "yearly" &&
        evtDate.getDate() === date.getDate() &&
        evtDate.getMonth() === date.getMonth()
      )
        return true;
      return false;
    });
  };

  const getSelectedDayWeather = () => {
    if (!weather || !selectedDate || !weather.daily) return null;
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const index = weather.daily.time.indexOf(dateStr);
    if (index === -1) return null;

    const isToday = isSameDay(selectedDate, new Date());
    const daily = weather.daily;

    let avgHumidity = 0;
    if (weather.hourly && weather.hourly.relative_humidity_2m) {
      const startIdx = index * 24;
      const endIdx = startIdx + 24;
      const dayHumidities = weather.hourly.relative_humidity_2m.slice(
        startIdx,
        endIdx
      );
      if (dayHumidities.length > 0) {
        const sum = dayHumidities.reduce((a: number, b: number) => a + b, 0);
        avgHumidity = Math.round(sum / dayHumidities.length);
      }
    }

    return {
      code: daily.weather_code[index],
      max: Math.round(daily.temperature_2m_max[index]),
      min: Math.round(daily.temperature_2m_min[index]),
      sunrise: daily.sunrise[index],
      sunset: daily.sunset[index],
      rainProb: daily.precipitation_probability_max
        ? daily.precipitation_probability_max[index]
        : 0,
      feelsLikeMax: daily.apparent_temperature_max
        ? Math.round(daily.apparent_temperature_max[index])
        : null,
      feelsLikeMin: daily.apparent_temperature_min
        ? Math.round(daily.apparent_temperature_min[index])
        : null,
      windMax: daily.wind_speed_10m_max
        ? daily.wind_speed_10m_max[index]
        : null,
      uvIndex: daily.uv_index_max ? daily.uv_index_max[index] : 0,
      humidity:
        isToday && weather.current
          ? weather.current.relative_humidity_2m
          : avgHumidity,
      current:
        isToday && weather.current
          ? {
              temp: Math.round(weather.current.temperature_2m),
              feelsLike: Math.round(weather.current.apparent_temperature),
              wind: weather.current.wind_speed_10m,
              humidity: weather.current.relative_humidity_2m,
            }
          : null,
    };
  };

  const getHourlyForecast = () => {
    if (!weather || !weather.hourly || !selectedDate) return [];
    const selDateStr = format(selectedDate, "yyyy-MM-dd");
    const currentHour = new Date().getHours();
    const isToday = isSameDay(selectedDate, new Date());

    const hourlyData = weather.hourly.time.map(
      (time: string, index: number) => ({
        time: time,
        temp: Math.round(weather.hourly.temperature_2m[index]),
        code: weather.hourly.weather_code[index],
        rain: weather.hourly.precipitation_probability
          ? weather.hourly.precipitation_probability[index]
          : 0,
      })
    );

    return hourlyData.filter((h: any) => {
      const hDate = h.time.substring(0, 10);
      const hHour = new Date(h.time).getHours();
      if (hDate !== selDateStr) return false;
      if (isToday) return hHour >= currentHour;
      return hHour >= 6;
    });
  };

  const dayWeather = getSelectedDayWeather();
  const hourlyForecast = getHourlyForecast();
  const WeatherIcon = dayWeather ? getWeatherIcon(dayWeather.code).icon : Sun;
  const weatherInfo = dayWeather ? getWeatherIcon(dayWeather.code) : null;

  return (
    <Card className="h-full flex flex-col shadow-sm relative overflow-hidden bg-white dark:bg-gray-900 border-none">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 z-10 shrink-0 border-b dark:border-gray-800">
        <div className="flex items-center gap-3">
          <CardTitle className="text-sm font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
            {t("title")}
          </CardTitle>
          {locationName && (
            <div className="hidden md:flex items-center text-[10px] text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
              <MapPin className="h-3 w-3 mr-1 text-blue-500" />
              {locationName}
            </div>
          )}
        </div>
        <div className="text-2xl font-bold text-gray-300 dark:text-gray-700 tabular-nums leading-none">
          {format(currentTime, "HH:mm")}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col md:flex-row gap-0 p-0 overflow-hidden min-h-0 items-stretch">
        {/* SOL: TAKVİM (%50) */}
        <div className="w-full md:w-1/2 p-4 border-r dark:border-gray-800 flex justify-center items-start bg-gray-50/30 dark:bg-black/20 shrink-0 overflow-auto">
          <Calendar
            key={weather ? "weather-loaded" : "weather-loading"}
            selected={selectedDate}
            onSelect={handleDateSelect}
            locale={dateLocale}
            className="rounded-md"
            modifiers={{ holiday: holidays.map(h => new Date(h.date)) }}
            modifiersStyles={{ holiday: { color: "#ef4444" } }}
            renderDayContent={date => {
              const dayStr = format(date, "yyyy-MM-dd");

              // 1. Hava Durumu
              const weatherIndex = weather?.daily?.time
                ? weather.daily.time.indexOf(dayStr)
                : -1;
              let wInfo = null;
              if (weatherIndex > -1 && weather?.daily?.weather_code) {
                wInfo = getWeatherIcon(
                  weather.daily.weather_code[weatherIndex]
                );
              }

              // 2. Etkinlikler
              const dayEvents = getEventsForDate(date);
              const hasHealth = dayEvents.some(e => e.category === "health");
              const hasDoctor = dayEvents.some(e => e.category === "doctor");
              const hasVaccine = dayEvents.some(e => e.category === "vaccine");
              const hasBaby = dayEvents.some(e => e.category === "baby");

              // Eğer özel ikonlardan HİÇBİRİ YOKSA ve başka bir event varsa mavi nokta koy
              const hasSpecialIcon =
                hasHealth || hasDoctor || hasVaccine || hasBaby;
              const hasOther = dayEvents.length > 0 && !hasSpecialIcon;

              return (
                <div className="w-full h-full flex flex-col justify-between items-center py-1">
                  {/* ÜST: ETKİNLİK İKONLARI */}
                  <div className="h-3 flex items-end justify-center gap-0.5 w-full">
                    {hasHealth && (
                      <Heart className="h-2.5 w-2.5 text-pink-500 fill-current" />
                    )}
                    {hasDoctor && (
                      <Stethoscope className="h-2.5 w-2.5 text-red-500" />
                    )}
                    {hasVaccine && (
                      <Syringe className="h-2.5 w-2.5 text-green-600" />
                    )}
                    {hasBaby && (
                      <Baby className="h-2.5 w-2.5 text-purple-500" />
                    )}
                  </div>

                  {/* ORTA: GÜN SAYISI */}
                  <span
                    className={cn(
                      "text-lg font-bold leading-none z-10",
                      isSameDay(date, selectedDate)
                        ? "text-white"
                        : "text-gray-700 dark:text-gray-300"
                    )}
                  >
                    {date.getDate()}
                  </span>

                  {/* ALT: HAVA DURUMU */}
                  <div className="h-3 flex items-start justify-center w-full">
                    {wInfo && (
                      <wInfo.icon
                        className={cn(
                          "h-3 w-3",
                          wInfo.color,
                          isSameDay(date, selectedDate)
                            ? "opacity-100 text-white"
                            : "opacity-70"
                        )}
                      />
                    )}
                  </div>
                </div>
              );
            }}
          />
        </div>

        {/* SAĞ: HAVA DURUMU DETAYLARI (%50) */}
        <div className="w-full md:w-1/2 flex flex-col border-l dark:border-gray-800 bg-gradient-to-b from-white to-blue-50/30 dark:from-gray-900 dark:to-black">
          <div className="p-3 text-center border-b dark:border-gray-800 bg-white/50 dark:bg-black/20">
            <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">
              {format(selectedDate, "d MMMM yyyy", { locale: dateLocale })}
            </h2>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {format(selectedDate, "EEEE", { locale: dateLocale })}
            </p>
          </div>

          {dayWeather ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 flex flex-col items-center justify-center p-4 space-y-4 overflow-y-auto no-scrollbar">
                <div className="text-center animate-in zoom-in duration-500">
                  <WeatherIcon
                    className={`h-16 w-16 mx-auto ${weatherInfo?.color} drop-shadow-md mb-2`}
                  />
                  <span className="text-4xl font-bold text-gray-900 dark:text-white tracking-tighter">
                    {dayWeather.current
                      ? dayWeather.current.temp
                      : dayWeather.max}
                    °
                  </span>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 block mt-1">
                    {weatherInfo?.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 w-full text-xs text-gray-600 dark:text-gray-300">
                  <div className="bg-white/60 dark:bg-gray-800/40 p-2 rounded-lg flex flex-col items-center justify-center border border-gray-100 dark:border-gray-800">
                    <span className="text-[9px] text-gray-400 mb-0.5">
                      Hissedilen
                    </span>
                    <div className="flex items-center gap-1 font-semibold">
                      <Thermometer className="h-3 w-3 text-orange-500" />
                      {dayWeather.current
                        ? dayWeather.current.feelsLike
                        : `${dayWeather.feelsLikeMin}° / ${dayWeather.feelsLikeMax}°`}
                    </div>
                  </div>

                  <div className="bg-white/60 dark:bg-gray-800/40 p-2 rounded-lg flex flex-col items-center justify-center border border-gray-100 dark:border-gray-800">
                    <span className="text-[9px] text-gray-400 mb-0.5">
                      Rüzgar
                    </span>
                    <div className="flex items-center gap-1 font-semibold">
                      <Wind className="h-3 w-3 text-blue-400" />
                      {dayWeather.current
                        ? dayWeather.current.wind
                        : dayWeather.windMax}{" "}
                      km/s
                    </div>
                  </div>

                  <div className="bg-white/60 dark:bg-gray-800/40 p-2 rounded-lg flex flex-col items-center justify-center border border-gray-100 dark:border-gray-800">
                    <span className="text-[9px] text-gray-400 mb-0.5">Nem</span>
                    <div className="flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400">
                      <Droplets className="h-3 w-3" />%{dayWeather.humidity}
                    </div>
                  </div>

                  <div className="bg-white/60 dark:bg-gray-800/40 p-2 rounded-lg flex flex-col items-center justify-center border border-gray-100 dark:border-gray-800">
                    <span className="text-[9px] text-gray-400 mb-0.5">
                      UV İndeksi
                    </span>
                    <div className="flex items-center gap-1 font-semibold text-yellow-600 dark:text-yellow-400">
                      <SunDim className="h-3 w-3" />
                      {dayWeather.uvIndex?.toFixed(1) || "-"}
                    </div>
                  </div>

                  <div className="bg-white/60 dark:bg-gray-800/40 p-2 rounded-lg flex items-center justify-around border border-gray-100 dark:border-gray-800 col-span-2">
                    <div className="flex flex-col items-center">
                      <Sunrise className="h-4 w-4 text-yellow-500 mb-1" />
                      <span className="font-semibold text-[10px]">
                        {dayWeather.sunrise
                          ? format(new Date(dayWeather.sunrise), "HH:mm")
                          : "-"}
                      </span>
                    </div>
                    <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-2" />
                    <div className="flex flex-col items-center">
                      <Sunset className="h-4 w-4 text-orange-500 mb-1" />
                      <span className="font-semibold text-[10px]">
                        {dayWeather.sunset
                          ? format(new Date(dayWeather.sunset), "HH:mm")
                          : "-"}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white/60 dark:bg-gray-800/40 p-2 rounded-lg flex flex-col items-center justify-center border border-gray-100 dark:border-gray-800 col-span-2">
                    <span className="text-[9px] text-gray-400 mb-0.5">
                      Yağış İhtimali
                    </span>
                    <div className="flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400">
                      <Umbrella className="h-3 w-3" />%{dayWeather.rainProb}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t dark:border-gray-800 bg-white/80 dark:bg-black/40 backdrop-blur-sm h-28 shrink-0">
                <div className="flex items-center overflow-x-auto gap-3 px-4 h-full no-scrollbar snap-x scroll-pl-4">
                  {hourlyForecast.map((h: any, i: number) => {
                    const info = getWeatherIcon(h.code);
                    return (
                      <div
                        key={i}
                        className="flex flex-col items-center justify-between min-w-[3.5rem] w-[3.5rem] shrink-0 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-transparent hover:border-blue-200 dark:hover:border-blue-800 transition-all snap-start"
                      >
                        <span className="text-[10px] text-gray-500 font-mono mb-1">
                          {format(new Date(h.time), "HH:mm")}
                        </span>
                        <info.icon className={`h-5 w-5 ${info.color} mb-1`} />
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-200">
                          {h.temp}°
                        </span>
                        {h.rain > 20 && (
                          <span className="text-[8px] text-blue-500 font-bold mt-1">
                            %{h.rain}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-xs">
              Veri bekleniyor...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
