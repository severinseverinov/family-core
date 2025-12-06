"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Camera,
  Users,
  MapPin,
  Clock,
  Stethoscope,
  Syringe,
  Baby,
  Bell,
} from "lucide-react";
import { toast } from "sonner";
import { updateFamilyImage } from "@/app/actions/family";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { format, isSameDay } from "date-fns";

interface FamilyWidgetProps {
  familyData: any;
  userRole: string;
  userName: string;
  locationName: string;
  todayEvents?: any[];
}

export function FamilyWidget({
  familyData,
  userRole,
  userName,
  locationName,
  todayEvents = [],
}: FamilyWidgetProps) {
  const t = useTranslations("Dashboard");
  const [loading, setLoading] = useState(false);
  const [todaysReminders, setTodaysReminders] = useState<any[]>([]);
  const router = useRouter();
  const isAdmin = ["owner", "admin"].includes(userRole);

  useEffect(() => {
    const today = new Date();
    const filtered = todayEvents.filter(item => {
      if (item.type !== "event") return false;
      if (item.frequency === "none" && item.time) {
        return isSameDay(new Date(item.time), today);
      }
      return true;
    });
    setTodaysReminders(filtered);
  }, [todayEvents]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const fd = new FormData();
    fd.append("image", file);

    const res = await updateFamilyImage(fd);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("Resim güncellendi!");
      router.refresh();
    }
    setLoading(false);
  };

  return (
    // DÜZELTME: Kartın arka planı şeffaf ve blurlu
    <Card className="relative overflow-hidden border-none shadow-lg w-full min-h-[180px] bg-transparent backdrop-blur-md">
      {/* Arka Plan Katmanı - OPAKLIĞI DÜŞÜRÜLDÜ (opacity-70) */}
      <div className="absolute inset-0 z-0 opacity-70">
        {familyData?.image_url ? (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${familyData.image_url})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-blue-900/80 via-blue-800/70 to-indigo-900/80 backdrop-blur-[1px]" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/80 to-indigo-700/80 dark:from-blue-900/80 dark:to-indigo-950/80" />
        )}
      </div>

      <CardContent className="relative z-10 p-6 sm:p-8 flex flex-col md:flex-row items-center md:items-start justify-between gap-6 text-white">
        {/* SOL: Aile Bilgileri ve Logo */}
        <div className="flex items-center gap-5 w-full md:w-auto">
          <div className="relative group shrink-0">
            <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border-4 border-white/10 shadow-inner overflow-hidden">
              {familyData?.image_url ? (
                <img
                  src={familyData.image_url}
                  alt="Family"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Users className="h-10 w-10 text-white opacity-80" />
              )}
            </div>

            {isAdmin && (
              <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 rounded-full cursor-pointer transition-all">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={loading}
                />
                <Camera
                  className={`h-6 w-6 text-white ${
                    loading ? "animate-spin" : ""
                  }`}
                />
              </label>
            )}
          </div>

          <div className="flex flex-col">
            <span className="text-blue-100 text-xs font-semibold uppercase tracking-wider mb-1 opacity-80">
              Family Core
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight shadow-black drop-shadow-md">
              {familyData?.name || "Ailem"}
            </h2>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-1 bg-black/20 px-2 py-1 rounded-full backdrop-blur-sm border border-white/10">
                <MapPin className="h-3 w-3 text-blue-200" />
                <span className="text-[10px] font-medium text-blue-100">
                  {locationName === "TR"
                    ? "Türkiye"
                    : locationName === "DE"
                    ? "Deutschland"
                    : locationName}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SAĞ: Karşılama ve BUGÜNÜN HATIRLATMALARI */}
        <div className="flex flex-col items-center md:items-end text-center md:text-right w-full md:w-auto gap-4 mt-2 md:mt-0">
          <div>
            <h3 className="text-xl sm:text-2xl font-semibold text-blue-50">
              {t("welcome", { name: userName })}
            </h3>
          </div>

          {todaysReminders.length > 0 && (
            <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-xl p-3 w-full max-w-[300px] flex flex-col gap-2 max-h-[130px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent animate-in fade-in slide-in-from-right-4">
              <div className="flex items-center justify-between sticky top-0 bg-transparent z-10 mb-1">
                <span className="text-[10px] font-bold text-blue-100 uppercase tracking-wider flex items-center gap-1">
                  <Bell className="h-3 w-3" /> Bugün ({todaysReminders.length})
                </span>
              </div>

              <div className="space-y-1.5">
                {todaysReminders.map(event => {
                  let EventIcon = Clock;
                  let iconBg = "bg-blue-500/20 text-blue-100";
                  if (event.category === "doctor") {
                    EventIcon = Stethoscope;
                    iconBg = "bg-red-500/20 text-red-100";
                  } else if (event.category === "vaccine") {
                    EventIcon = Syringe;
                    iconBg = "bg-green-500/20 text-green-100";
                  } else if (event.category === "baby") {
                    EventIcon = Baby;
                    iconBg = "bg-purple-500/20 text-purple-100";
                  }

                  return (
                    <div
                      key={event.id}
                      className="flex items-center gap-2 text-left bg-white/5 hover:bg-white/10 p-1.5 rounded transition-colors group"
                    >
                      <div className={`p-1.5 rounded-full shrink-0 ${iconBg}`}>
                        <EventIcon className="h-3 w-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate group-hover:text-blue-100 transition-colors">
                          {event.title}
                        </p>
                        <p className="text-[9px] text-blue-200/70 truncate">
                          {event.time
                            ? format(new Date(event.time), "HH:mm")
                            : "Tüm Gün"}
                          {event.description && ` • ${event.description}`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
