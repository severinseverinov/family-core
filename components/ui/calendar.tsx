"use client";

import * as React from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
  Locale,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface CalendarProps {
  mode?: "single";
  selected?: Date;
  onSelect?: (date: Date) => void;
  className?: string;
  locale?: Locale;
  /** Gün hücresinin içine ekstra içerik basmak için (Hava durumu vb.) */
  renderDayContent?: (date: Date) => React.ReactNode;
  /** Özel günleri (Tatil vb.) işaretlemek için */
  modifiers?: {
    holiday?: Date[];
  };
  modifiersStyles?: {
    holiday?: React.CSSProperties;
  };
}

export function Calendar({
  className,
  selected,
  onSelect,
  locale,
  renderDayContent,
  modifiers,
  modifiersStyles,
}: CalendarProps) {
  // Takvimin o an gösterdiği ay (Gezinme için)
  const [currentMonth, setCurrentMonth] = React.useState(
    selected || new Date()
  );

  // Ayın başı ve sonu
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);

  // Takvim ızgarasının başı (Önceki aydan sarkan günler dahil)
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Pzt başlasın
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  // Tüm günlerin listesi
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  // Haftanın gün isimleri (Pzt, Sal...)
  const weekDays = eachDayOfInterval({
    start: startOfWeek(new Date(), { weekStartsOn: 1 }),
    end: endOfWeek(new Date(), { weekStartsOn: 1 }),
  });

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const handleDayClick = (day: Date) => {
    if (onSelect) onSelect(day);
  };

  return (
    <div className={cn("p-3 w-fit mx-auto", className)}>
      {/* ÜST KISIM: AY İSMİ VE BUTONLAR */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="outline"
          className="h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
          onClick={handlePrevMonth}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-sm font-medium capitalize">
          {format(currentMonth, "MMMM yyyy", { locale })}
        </div>
        <Button
          variant="outline"
          className="h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
          onClick={handleNextMonth}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* HAFTA GÜNLERİ BAŞLIKLARI */}
      <div className="grid grid-cols-7 mb-2">
        {weekDays.map(day => (
          <div
            key={day.toString()}
            className="text-muted-foreground rounded-md w-10 text-[0.8rem] font-normal text-center"
          >
            {format(day, "EEEEE", { locale })} {/* T, F, S gibi tek harf */}
          </div>
        ))}
      </div>

      {/* GÜNLER IZGARASI */}
      <div className="grid grid-cols-7 gap-y-2">
        {calendarDays.map((day, idx) => {
          const isSelected = selected ? isSameDay(day, selected) : false;
          const isToday = isSameDay(day, new Date());
          const isOutside = !isSameMonth(day, currentMonth);

          // Tatil kontrolü
          const isHoliday = modifiers?.holiday?.some(h => isSameDay(day, h));
          const holidayStyle = isHoliday ? modifiersStyles?.holiday : {};

          return (
            <div key={idx} className="relative flex justify-center">
              <button
                onClick={() => handleDayClick(day)}
                style={holidayStyle}
                className={cn(
                  "h-10 w-10 p-0 text-sm flex flex-col items-center justify-center rounded-md transition-all relative z-10",
                  "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none",
                  isSelected &&
                    "bg-blue-600 text-white hover:bg-blue-700 hover:text-white focus:bg-blue-700",
                  isToday &&
                    !isSelected &&
                    "bg-accent text-accent-foreground font-bold border border-blue-200 dark:border-blue-800",
                  isOutside &&
                    "text-muted-foreground opacity-50 bg-transparent hover:bg-transparent"
                )}
              >
                <span className="z-10 leading-none">{format(day, "d")}</span>

                {/* Dışarıdan gelen içerik (Hava durumu ikonu vb.) */}
                {renderDayContent && (
                  <div className="mt-0.5">{renderDayContent(day)}</div>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
