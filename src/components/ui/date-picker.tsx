"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import { arTN as dayArTN, fr as dayFr } from "react-day-picker/locale";
import { format, isValid, parse } from "date-fns";
import { arTN, fr } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { useI18n } from "@/components/i18n/locale-provider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import "react-day-picker/style.css";

type DatePickerProps = {
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Alias for controlled parents that used native input onChange */
  onChange?: (value: string) => void;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
  placeholder?: string;
};

function parseYmd(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const date = parse(value, "yyyy-MM-dd", new Date());
  return isValid(date) ? date : undefined;
}

function DatePicker({
  name,
  value,
  defaultValue,
  onValueChange,
  onChange,
  min,
  max,
  required,
  disabled,
  className,
  id,
  placeholder,
}: DatePickerProps) {
  const { locale, t } = useI18n();
  const isControlled = value !== undefined;
  const [internal, setInternal] = React.useState(defaultValue ?? "");
  const [open, setOpen] = React.useState(false);
  const [displayMonth, setDisplayMonth] = React.useState<Date>(
    () => parseYmd(value ?? defaultValue) ?? new Date(),
  );
  const hiddenRef = React.useRef<HTMLInputElement>(null);
  const current = isControlled ? value : internal;
  const selected = parseYmd(current);
  const dayLocale = locale === "ar" ? dayArTN : dayFr;
  const formatLocale = locale === "ar" ? arTN : fr;

  React.useEffect(() => {
    if (isControlled) return;
    const form = hiddenRef.current?.form;
    if (!form) return;
    const onReset = () => setInternal(defaultValue ?? "");
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, [defaultValue, isControlled]);

  React.useEffect(() => {
    if (open) {
      setDisplayMonth(parseYmd(current) ?? new Date());
    }
  }, [open, current]);

  function commit(next: string) {
    if (!isControlled) setInternal(next);
    onValueChange?.(next);
    onChange?.(next);
  }

  const label = selected
    ? format(selected, locale === "ar" ? "d MMMM yyyy" : "d MMM yyyy", {
        locale: formatLocale,
      })
    : (placeholder ?? t("common.pickDate"));

  return (
    <>
      {name ? (
        <input
          ref={hiddenRef}
          type="hidden"
          name={name}
          value={current}
          required={required}
          disabled={disabled}
          readOnly
        />
      ) : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            disabled={disabled}
            aria-required={required}
            className={cn(
              "flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-border bg-input px-4 py-2 text-start text-base text-foreground shadow-sm outline-none transition-[color,box-shadow,background-color,transform] md:text-sm",
              "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "active:scale-[0.99]",
              !selected && "text-muted-foreground",
              className,
            )}
          >
            <span className="truncate">{label}</span>
            <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[17.5rem] p-2" align="start">
          <DayPicker
            mode="single"
            locale={dayLocale}
            selected={selected}
            onSelect={(date) => {
              if (!date) {
                commit("");
                return;
              }
              commit(format(date, "yyyy-MM-dd"));
              setOpen(false);
            }}
            disabled={[
              ...(min && parseYmd(min) ? [{ before: parseYmd(min)! }] : []),
              ...(max && parseYmd(max) ? [{ after: parseYmd(max)! }] : []),
            ]}
            month={displayMonth}
            onMonthChange={setDisplayMonth}
            fixedWeeks
            showOutsideDays
            className="gym-day-picker"
            classNames={{
              root: "rdp-root gym-day-picker",
              months: "relative",
              month_caption: "flex items-center justify-center px-8 pb-2 pt-1",
              caption_label: "text-sm font-semibold text-foreground",
              nav: "absolute inset-x-0 top-0 flex items-center justify-between px-1",
              button_previous:
                "inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              button_next:
                "inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              weekdays: "flex",
              weekday:
                "size-9 text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground",
              weeks: "flex min-h-[15rem] flex-col",
              week: "mt-1 flex w-full",
              day: "relative size-9 p-0 text-center text-sm",
              day_button:
                "inline-flex size-9 items-center justify-center rounded-lg text-foreground transition-[background-color,color,transform] hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.96]",
              selected:
                "[&_button]:bg-brand [&_button]:font-semibold [&_button]:text-primary-foreground [&_button]:hover:bg-brand/90",
              today: "[&_button]:font-semibold [&_button]:text-brand",
              outside: "[&_button]:text-muted-foreground/40",
              disabled: "[&_button]:pointer-events-none [&_button]:opacity-30",
              chevron: "fill-brand size-4",
            }}
          />
        </PopoverContent>
      </Popover>
    </>
  );
}

export { DatePicker };
