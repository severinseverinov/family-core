"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Users, MapPin } from "lucide-react";
import { toast } from "sonner";
import { updateFamilyImage } from "@/app/actions/family";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

interface FamilyWidgetProps {
  familyData: any;
  userRole: string;
  userName: string; // Yeni: Kullanıcı Adı
  locationName: string; // Yeni: Konum (TR, DE vb.)
}

export function FamilyWidget({
  familyData,
  userRole,
  userName,
  locationName,
}: FamilyWidgetProps) {
  const t = useTranslations("Dashboard"); // Çeviri için
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const isAdmin = ["owner", "admin"].includes(userRole);

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
    <Card className="relative overflow-hidden border-none shadow-lg w-full">
      {/* Arka Plan Katmanı (Varsa Resim, Yoksa Gradyan) */}
      <div className="absolute inset-0 z-0">
        {familyData?.image_url ? (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${familyData.image_url})` }}
            />
            {/* Resmin üzerine koyu perde çekiyoruz ki yazılar okunsun */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-900/90 via-blue-800/80 to-indigo-900/90 backdrop-blur-[2px]" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-blue-900 dark:to-indigo-950" />
        )}
      </div>

      <CardContent className="relative z-10 p-6 sm:p-8 flex flex-col md:flex-row items-center md:items-end justify-between gap-6 text-white">
        {/* SOL: Aile Bilgileri */}
        <div className="flex items-center gap-5 w-full md:w-auto">
          {/* Logo / İkon Alanı */}
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

            {/* Resim Yükleme Butonu (Sadece Adminler - Hoverda çıkar) */}
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
          </div>
        </div>

        {/* SAĞ: Kullanıcı Karşılama ve Durum */}
        <div className="flex flex-col items-center md:items-end text-center md:text-right w-full md:w-auto mt-2 md:mt-0">
          <h3 className="text-xl sm:text-2xl font-semibold text-blue-50">
            {t("welcome", { name: userName })}
          </h3>

          <div className="flex items-center gap-2 mt-2 bg-black/20 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
            <MapPin className="h-3.5 w-3.5 text-blue-200" />
            <span className="text-sm font-medium text-blue-100">
              {locationName === "TR"
                ? "Türkiye"
                : locationName === "DE"
                ? "Deutschland"
                : locationName}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
