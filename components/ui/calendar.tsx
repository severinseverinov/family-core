"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayButton, DayPicker, getDefaultClassNames } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"];
  renderDay?: (date: Date) => React.ReactNode;
};

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  components,
  renderDay,
  ...props
}: CalendarProps) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: date =>
          date.toLocaleString("default", { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-full", defaultClassNames.root),
        months: cn(
          "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 w-full",
          defaultClassNames.months
        ),
        month: cn("space-y-4 w-full", defaultClassNames.month),

        // BAŞLIK (AY/YIL)
        month_caption: cn(
          "flex justify-center pt-1 relative items-center mb-4",
          defaultClassNames.month_caption
        ),
        caption_label: cn(
          "text-sm font-medium",
          defaultClassNames.caption_label
        ),

        // NAVİGASYON
        nav: cn("space-x-1 flex items-center", defaultClassNames.nav),
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 z-10 absolute left-1",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 z-10 absolute right-1",
          defaultClassNames.button_next
        ),

        // --- TABLO YAPISI (DÜZELTİLDİ) ---
        // month_grid: Tablonun kendisi (v9'da table yerine month_grid kullanılır)
        month_grid: "border-collapse space-y-1 table-fixed",

        // weekdays: Başlık satırı (tr)
        weekdays: "mb-2",

        // weekday: Başlık hücresi (th) - Pzt, Sal...
        weekday:
          "text-muted-foreground rounded-md w-12 font-normal text-[0.8rem] h-8 align-middle",

        // week: Gün satırı (tr)
        week: "mt-2",

        // day: Gün hücresi (td) - İçine buton gelecek
        // h-14 w-12: Yüksekliği artırdık ki hava durumu sığsın
        day: "h-14 w-12 p-0 text-center text-sm relative [&:has([aria-selected].range-end)]:rounded-r-md [&:has([aria-selected].outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",

        // day_button: Gün butonu (td içindeki button)
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "size-full p-0 font-normal aria-selected:opacity-100 !rounded-md" // !rounded-md ile KARE zorlaması
        ),

        // SEÇİLİ GÜN
        selected:
          "bg-blue-600 text-white hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white !rounded-md",

        // BUGÜN
        today:
          "bg-accent text-accent-foreground !rounded-md border-rounded-md border-blue-200 dark:border-blue-800",

        outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",

        disabled: "text-muted-foreground opacity-50",

        range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",

        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return (
              <ChevronLeft className={cn("h-4 w-4", className)} {...props} />
            );
          }
          return (
            <ChevronRight className={cn("h-4 w-4", className)} {...props} />
          );
        },
        // Özel İçerik Render'ı
        DayButton: dayButtonProps => {
          const content = renderDay
            ? renderDay(dayButtonProps.day.date)
            : dayButtonProps.day.date.getDate();

          return (
            <CalendarDayButton {...dayButtonProps}>{content}</CalendarDayButton>
          );
        },
        ...components,
      }}
      {...props}
    />
  );
}

// Özel Buton
function CalendarDayButton({
  className,
  day,
  modifiers,
  children,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const ref = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  return (
    <Button
      ref={ref}
      variant="ghost"
      className={cn(
        // size-full: TD'yi doldur
        // flex-col: Tarih ve İkonu alt alta diz
        "size-full p-0 font-normal aria-selected:opacity-100 !rounded-md flex flex-col items-center justify-center gap-0.5",

        modifiers.selected &&
          "bg-blue-600 text-white hover:bg-blue-700 hover:text-white !rounded-md",

        modifiers.today &&
          !modifiers.selected &&
          "bg-accent text-accent-foreground !rounded-md",

        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
}

export { Calendar };
