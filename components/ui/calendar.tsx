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
  renderDayContent?: (date: Date) => React.ReactNode;
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
  const [currentMonth, setCurrentMonth] = React.useState(
    selected || new Date()
  );

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = eachDayOfInterval({
    start: startOfWeek(new Date(), { weekStartsOn: 1 }),
    end: endOfWeek(new Date(), { weekStartsOn: 1 }),
  });

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  return (
    <div className={cn("p-3 w-fit mx-auto", className)}>
      {/* ÜST KISIM */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="outline"
          className="h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100"
          onClick={handlePrevMonth}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-base font-semibold capitalize">
          {format(currentMonth, "MMMM yyyy", { locale })}
        </div>
        <Button
          variant="outline"
          className="h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100"
          onClick={handleNextMonth}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* HAFTA GÜNLERİ */}
      <div className="grid grid-cols-7 mb-2 gap-1">
        {weekDays.map(day => (
          <div
            key={day.toString()}
            className="text-muted-foreground rounded-md w-16 text-xs font-medium text-center py-1 uppercase tracking-wide"
          >
            {format(day, "EEE", { locale })}
          </div>
        ))}
      </div>

      {/* GÜNLER IZGARASI */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, idx) => {
          const isSelected = selected ? isSameDay(day, selected) : false;
          const isToday = isSameDay(day, new Date());
          const isOutside = !isSameMonth(day, currentMonth);

          const isHoliday = modifiers?.holiday?.some(h => isSameDay(day, h));
          const holidayStyle = isHoliday ? modifiersStyles?.holiday : {};

          return (
            <div
              key={idx}
              className="relative flex justify-center aspect-square"
            >
              <button
                onClick={() => onSelect?.(day)}
                style={holidayStyle}
                className={cn(
                  "w-16 h-16 relative overflow-hidden rounded-xl transition-all border",
                  "focus:outline-none focus:ring-2 focus:ring-primary/20",
                  // Dışarıdaki günler
                  isOutside
                    ? "bg-transparent border-transparent text-muted-foreground/30 hover:bg-gray-50/50 dark:hover:bg-gray-800/50"
                    : "bg-white dark:bg-gray-800/50 border-gray-100 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700",
                  // Bugün
                  isToday &&
                    !isSelected &&
                    "ring-1 ring-blue-400 bg-blue-50/30 dark:bg-blue-900/10",
                  // Seçili Gün
                  isSelected &&
                    "bg-blue-600 dark:bg-blue-600 border-blue-600 text-white shadow-md ring-2 ring-blue-200 dark:ring-blue-900"
                )}
              >
                {/* Eğer renderDayContent varsa onu kullan, yoksa sadece sayıyı göster */}
                {renderDayContent ? (
                  renderDayContent(day)
                ) : (
                  <span className="text-sm font-medium">
                    {format(day, "d")}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
