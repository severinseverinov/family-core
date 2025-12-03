"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, getDefaultClassNames, DayButton } from "react-day-picker";

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

        // ÜST BAŞLIK (AY/YIL)
        caption: cn(
          "flex justify-center pt-1 relative items-center mb-4",
          defaultClassNames.caption
        ),
        caption_label: cn(
          "text-sm font-medium",
          defaultClassNames.caption_label
        ),

        // OKLAR
        nav: cn("space-x-1 flex items-center", defaultClassNames.nav),
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 z-10"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",

        // --- TABLO YAPISI (KESİN ÇÖZÜM) ---
        // table-fixed: Sütunların eşit genişlikte olmasını zorlar. Kaymayı önler.
        table: "w-full border-collapse space-y-1 table-fixed",

        // BAŞLIK SATIRI (TR) - Flex/Grid YOK
        head_row: "mb-2",

        // BAŞLIK HÜCRESİ (TH)
        head_cell:
          "text-muted-foreground rounded-md font-normal text-[0.8rem] h-8 align-middle",

        // GÜN SATIRI (TR) - Flex/Grid YOK
        row: "mt-2",

        // GÜN HÜCRESİ (TD)
        // h-14: Yüksekliği artırdık (Hava durumu ikonu için yer)
        cell: "h-16 p-0 text-center text-sm relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",

        // GÜN BUTONU
        // size-full: Hücreyi tamamen kapla
        // !rounded-md: Kare yap (önemli)
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "size-full p-0 font-normal aria-selected:opacity-100 !rounded-md"
        ),

        // SEÇİLİ GÜN
        day_selected:
          "bg-blue-600 text-white hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white !rounded-md",

        // BUGÜN
        day_today:
          "bg-accent text-accent-foreground !rounded-md border border-blue-200 dark:border-blue-800",

        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
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
