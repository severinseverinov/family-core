"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type Holiday } from "@/app/actions/events";

// Hava Durumu İkon Seçici
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
  // Sadece görsel veriler lazım, userRole vb. buraya gerekmiyor artık
}

export function CalendarWidget({ initialHolidays }: CalendarWidgetProps) {
  const t = useTranslations("Calendar");
  const locale = useLocale();
  const dateLocale = locale === "tr" ? tr : locale === "de" ? de : enUS;

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  );
  const [holidays] = useState<Holiday[]>(initialHolidays);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather, setWeather] = useState<any>(null);
  const [locationName, setLocationName] = useState(t("detectingLocation"));

  // 1. Canlı Saat
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // 2. Hava Durumu Çekme
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async position => {
          const { latitude, longitude } = position.coords;
          try {
            const res = await fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto&past_days=7`
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
              "Konum";
            setLocationName(city);
          } catch {
            setLocationName("Hava durumu yok");
          }
        },
        () => setLocationName(t("locationDenied"))
      );
    } else {
      setLocationName("Desteklenmiyor");
    }
  }, [t]);

  // Yardımcı: Tatil Bul
  const getHolidayForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return holidays.find(h => h.date === dateStr);
  };

  // Yardımcı: Günlük Detaylı Hava Durumu
  const getSelectedDayWeather = () => {
    if (!weather || !selectedDate || !weather.daily || !weather.daily.time)
      return null;
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const index = weather.daily.time.indexOf(dateStr);

    if (index === -1) return null;

    const isToday = isSameDay(selectedDate, new Date());

    return {
      code: weather.daily.weather_code[index],
      max: Math.round(weather.daily.temperature_2m_max[index]),
      min: Math.round(weather.daily.temperature_2m_min[index]),
      sunrise: weather.daily.sunrise[index],
      sunset: weather.daily.sunset[index],
      // Bugünse anlık, değilse null
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

  // Yardımcı: Saatlik Filtre
  const getHourlyWeather = () => {
    if (!weather || !weather.hourly || !selectedDate) return [];
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
      if (hDate !== selDateStr) return false;
      if (isToday) return hHour >= currentHour; // Bugünse şu andan sonrası
      return hHour >= 6 && hHour <= 23; // Diğer günler 06-23 arası
    });
  };

  const dayWeather = getSelectedDayWeather();
  const hourlyForecast = getHourlyWeather();
  const WeatherIcon = dayWeather ? getWeatherIcon(dayWeather.code).icon : Sun;
  const weatherInfo = dayWeather ? getWeatherIcon(dayWeather.code) : null;

  return (
    <Card className="h-full flex flex-col shadow-sm relative overflow-hidden bg-white dark:bg-gray-900">
      {/* HEADER */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 z-10 shrink-0">
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

      {/* İÇERİK */}
      <CardContent className="flex-1 flex flex-col md:flex-row gap-0 p-0 overflow-hidden min-h-0 items-stretch">
        {/* SOL: TAKVİM (SABİT) */}
        <div className="p-4 border-r dark:border-gray-800 flex justify-center items-start bg-gray-50/30 dark:bg-black/20 shrink-0">
          <Calendar
            key={weather ? "weather-loaded" : "weather-loading"}
            selected={selectedDate}
            onSelect={date => setSelectedDate(date)}
            locale={dateLocale}
            className="rounded-md"
            // Tatil Günleri
            modifiers={{ holiday: holidays.map(h => new Date(h.date)) }}
            modifiersStyles={{
              holiday: { color: "#ef4444", fontWeight: "bold" },
            }}
            // HAVA DURUMU İÇERİĞİ
            renderDayContent={date => {
              const dayStr = format(date, "yyyy-MM-dd");

              // Hava durumu verisini bul
              const weatherIndex = weather?.daily?.time
                ? weather.daily.time.indexOf(dayStr)
                : -1;

              let info = null;
              if (weatherIndex > -1 && weather?.daily?.weather_code) {
                info = getWeatherIcon(weather.daily.weather_code[weatherIndex]);
              }

              // Sadece ikonu döndür (Gün numarası Calendar bileşeninin içinde zaten var)
              if (info) {
                return <info.icon className={`h-3 w-3 ${info.color}`} />;
              }
              // Hizalama bozulmasın diye boşluk
              return <div className="h-3 w-3" />;
            }}
          />
        </div>

        {/* SAĞ: DETAYLI HAVA DURUMU (ESNEK) */}
        <div className="flex-1 flex flex-col min-w-0 bg-gradient-to-br from-blue-50/50 to-white dark:from-gray-900 dark:to-gray-800">
          {/* Üst: Büyük Bilgi */}
          <div className="flex-1 flex flex-col items-center justify-center p-4 text-center overflow-y-auto no-scrollbar">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1">
              {selectedDate
                ? format(selectedDate, "d MMMM yyyy", { locale: dateLocale })
                : ""}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium mb-4">
              {selectedDate
                ? format(selectedDate, "EEEE", { locale: dateLocale })
                : ""}
            </p>

            {selectedDate && getHolidayForDate(selectedDate) && (
              <div className="mb-4 bg-red-100 text-red-600 text-[10px] font-bold px-3 py-1 rounded-full animate-pulse">
                🎉 {getHolidayForDate(selectedDate)?.localName}
              </div>
            )}

            {dayWeather ? (
              <div className="flex flex-col items-center w-full max-w-xs animate-in zoom-in duration-500">
                {/* Ana İkon ve Derece */}
                <div className="flex items-center justify-center gap-6 mb-6">
                  <WeatherIcon
                    className={`h-16 w-16 ${weatherInfo?.color} drop-shadow-sm`}
                  />
                  <div className="text-left">
                    <span className="text-5xl font-bold text-gray-900 dark:text-white block">
                      {dayWeather.current
                        ? dayWeather.current.temp
                        : dayWeather.max}
                      °
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-medium block mt-1">
                      {weatherInfo?.label}
                    </span>
                  </div>
                </div>

                {/* Detaylar Grid */}
                <div className="grid grid-cols-2 gap-3 w-full text-xs text-gray-600 dark:text-gray-300">
                  <div className="bg-white/60 dark:bg-black/20 p-2 rounded-lg flex items-center gap-2">
                    <Thermometer className="h-4 w-4 text-orange-500" />
                    <div>
                      <span className="block text-[9px] text-gray-400">
                        Sıcaklık
                      </span>
                      <span className="font-semibold">
                        {dayWeather.min}° / {dayWeather.max}°
                      </span>
                    </div>
                  </div>
                  {dayWeather.current && (
                    <div className="bg-white/60 dark:bg-black/20 p-2 rounded-lg flex items-center gap-2">
                      <Wind className="h-4 w-4 text-blue-400" />
                      <div>
                        <span className="block text-[9px] text-gray-400">
                          Rüzgar
                        </span>
                        <span className="font-semibold">
                          {dayWeather.current.wind} km/s
                        </span>
                      </div>
                    </div>
                  )}
                  {dayWeather.current && (
                    <div className="bg-white/60 dark:bg-black/20 p-2 rounded-lg flex items-center gap-2">
                      <Droplets className="h-4 w-4 text-blue-600" />
                      <div>
                        <span className="block text-[9px] text-gray-400">
                          Nem
                        </span>
                        <span className="font-semibold">
                          {dayWeather.current.humidity}%
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="bg-white/60 dark:bg-black/20 p-2 rounded-lg flex items-center gap-2">
                    <Sunrise className="h-4 w-4 text-yellow-600" />
                    <div>
                      <span className="block text-[9px] text-gray-400">
                        Gündoğumu
                      </span>
                      <span className="font-semibold">
                        {dayWeather.sunrise
                          ? format(new Date(dayWeather.sunrise), "HH:mm")
                          : "--:--"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-gray-400 flex flex-col items-center my-auto">
                <Cloud className="h-12 w-12 mb-2 opacity-20" />
                <p className="text-xs">Veri bekleniyor...</p>
              </div>
            )}
          </div>

          {/* Alt: Saatlik Şerit */}
          {hourlyForecast.length > 0 && (
            <div className="w-full bg-white/40 dark:bg-black/30 border-t dark:border-gray-700 p-2 overflow-x-auto no-scrollbar flex items-center gap-3 shrink-0 h-20">
              {hourlyForecast.map((h: any, i: number) => {
                const info = getWeatherIcon(h.code);
                return (
                  <div
                    key={i}
                    className="flex flex-col items-center justify-between h-full min-w-[35px] snap-start py-1"
                  >
                    <span className="text-[9px] text-gray-500 dark:text-gray-400 font-medium">
                      {format(new Date(h.time), "HH")}
                    </span>
                    <info.icon className={`h-4 w-4 ${info.color}`} />
                    <span className="text-[10px] font-bold text-gray-700 dark:text-gray-200">
                      {Math.round(h.temp)}°
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
