"use client";

import { useEffect, useState } from "react";

const getBackgroundStyle = (code: number, isDay: boolean) => {
  if (!isDay)
    return "bg-[url('https://images.unsplash.com/photo-1536768078358-756ef452243e?q=80&w=2038&auto=format&fit=crop')]"; // Gece

  if (code === 0)
    return "bg-[url('https://images.unsplash.com/photo-1622396481328-9b1b78cdd9fd?q=80&w=1974&auto=format&fit=crop')]"; // Açık
  if (code >= 1 && code <= 3)
    return "bg-[url('https://images.unsplash.com/photo-1534088568595-a066f410bcda?q=80&w=1951&auto=format&fit=crop')]"; // Bulutlu
  if (code >= 51)
    return "bg-[url('https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?q=80&w=1974&auto=format&fit=crop')]"; // Yağmurlu/Diğer

  return "bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-black";
};

export function DynamicBackground() {
  const [bgImage, setBgImage] = useState("");

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async position => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=weather_code,is_day`
          );
          const data = await res.json();

          const code = data.current.weather_code;
          const isDay = data.current.is_day === 1;

          setBgImage(getBackgroundStyle(code, isDay));
        } catch {
          /* Hata olursa varsayılan kalır */
        }
      });
    }
  }, []);

  if (!bgImage) return null;

  return (
    <div
      className={`fixed inset-0 -z-50 bg-cover bg-center bg-no-repeat bg-fixed transition-all duration-1000 ${bgImage}`}
    >
      <div className="absolute inset-0 bg-white/85 dark:bg-black/80 backdrop-blur-sm" />
    </div>
  );
}
