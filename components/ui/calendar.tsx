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
        // ANA KAPSAYICI: Genişliği içeriğe göre ayarla
        root: cn("w-fit h-full", defaultClassNames.root),

        months: cn(
          "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
          defaultClassNames.months
        ),
        month: cn("space-y-4", defaultClassNames.month),

        // BAŞLIK (AY/YIL)
        // relative: Navigasyon butonları buna göre konumlanacak
        caption: cn(
          "flex justify-center pt-1 relative items-center mb-4 h-10",
          defaultClassNames.caption
        ),
        caption_label: cn(
          "text-sm font-medium",
          defaultClassNames.caption_label
        ),

        // NAVİGASYON (OKLAR)
        // absolute değil, flex içinde normal akışta bırakıyoruz ama butonlara absolute veriyoruz
        nav: cn("space-x-1 flex items-center", defaultClassNames.nav),

        // SOL OK (Mutlak Konum: En Sol)
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute left-1 top-1 z-10"
        ),

        // SAĞ OK (Mutlak Konum: En Sağ)
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute right-1 top-1 z-10"
        ),

        // --- TABLO YAPISI (KESİN ÇÖZÜM) ---
        // w-full: Genişliği doldur
        // border-collapse: Hücre aralarını kapat
        // table-fixed: Sütunları EŞİT genişliğe zorla (Kaymayı önler)
        table: "w-full border-collapse space-y-1 table-fixed",

        // BAŞLIK SATIRI (TR)
        head_row: "flex w-full mb-2",

        // BAŞLIK HÜCRESİ (TH)
        // w-10: Sabit genişlik (40px)
        head_cell:
          "text-muted-foreground rounded-md w-10 font-normal text-[0.8rem] text-center",

        // GÜN SATIRI (TR)
        row: "flex w-full mt-2",

        // GÜN HÜCRESİ (TD)
        // h-10 w-10: Sabit kare (40px)
        cell: "h-10 w-10 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",

        // GÜN BUTONU
        // size-full: Hücreyi doldur
        // !rounded-md: Kare yap
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-10 w-10 p-0 font-normal aria-selected:opacity-100 !rounded-md"
        ),

        // Seçili Gün
        day_selected:
          "bg-blue-600 text-white hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white !rounded-md",

        // Bugün
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
        "h-10 w-10 p-0 font-normal aria-selected:opacity-100 !rounded-md flex flex-col items-center justify-center gap-0",
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
