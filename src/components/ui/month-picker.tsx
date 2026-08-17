"use client";

import * as React from "react";
import { format } from "date-fns";
import { arTN, fr } from "date-fns/locale";
import { CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/components/i18n/locale-provider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  buildMonthCells,
  parseYearMonth,
  shiftViewYear,
  syncViewYearToSelection,
} from "@/lib/month-picker";
import { cn } from "@/lib/utils";
import { FormValueInput } from "@/components/ui/form-value-input";

type MonthPickerProps = {
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  onChange?: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
  placeholder?: string;
  /** Inclusive bounds as yyyy-MM */
  min?: string;
  max?: string;
};

function MonthPicker({
  name,
  value,
  defaultValue,
  onValueChange,
  onChange,
  required,
  disabled,
  className,
  id,
  placeholder,
  min,
  max,
}: MonthPickerProps) {
  const { locale, t } = useI18n();
  const isControlled = value !== undefined;
  const [internal, setInternal] = React.useState(defaultValue ?? "");
  const [open, setOpen] = React.useState(false);
  const hiddenRef = React.useRef<HTMLInputElement>(null);
  const current = isControlled ? value : internal;
  const selected = parseYearMonth(current);
  const dateLocale = locale === "ar" ? arTN : fr;

  const [viewYear, setViewYear] = React.useState(
    () => selected?.getFullYear() ?? new Date().getFullYear(),
  );

  // Sync grid year only when the selected yyyy-MM string changes — not on every
  // render (a new Date() from parse would otherwise reset year navigation).
  React.useEffect(() => {
    setViewYear((prev) => syncViewYearToSelection(current, prev));
  }, [current]);

  React.useEffect(() => {
    if (isControlled) return;
    const form = hiddenRef.current?.form;
    if (!form) return;
    const onReset = () => setInternal(defaultValue ?? "");
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, [defaultValue, isControlled]);

  function commit(next: string) {
    if (!isControlled) setInternal(next);
    onValueChange?.(next);
    onChange?.(next);
  }

  const label = selected
    ? format(selected, "MMMM yyyy", { locale: dateLocale })
    : (placeholder ?? t("common.pickMonth"));

  const months = buildMonthCells({
    viewYear,
    selectedYearMonth: current || undefined,
    min,
    max,
    locale: dateLocale,
  });

  return (
    <>
      {name ? (
        <FormValueInput
          name={name}
          value={current}
          required={required}
          disabled={disabled}
          inputRef={hiddenRef}
          onValueChange={commit}
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
            <span className="truncate capitalize">{label}</span>
            <CalendarRange className="size-4 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[18.5rem] p-3" align="start">
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setViewYear((y) => shiftViewYear(y, -1));
              }}
              className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:scale-[0.96]"
              aria-label={t("common.prevYear")}
            >
              <ChevronLeft className="size-4 rtl:rotate-180" />
            </button>
            <p className="text-sm font-semibold tabular-nums text-foreground">
              {viewYear}
            </p>
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setViewYear((y) => shiftViewYear(y, 1));
              }}
              className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:scale-[0.96]"
              aria-label={t("common.nextYear")}
            >
              <ChevronRight className="size-4 rtl:rotate-180" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {months.map((month) => (
              <button
                key={month.key}
                type="button"
                disabled={month.disabled}
                onClick={() => {
                  commit(month.key);
                  setOpen(false);
                }}
                className={cn(
                  "rounded-lg px-2 py-2.5 text-sm font-medium capitalize transition-[background-color,color,transform] active:scale-[0.96]",
                  month.selected
                    ? "bg-brand text-primary-foreground"
                    : "text-foreground hover:bg-accent",
                  month.disabled && "pointer-events-none opacity-30",
                )}
              >
                {month.label}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}

export { MonthPicker };
