"use client";

import { useMemo } from "react";
import { useT } from "@/components/i18n/locale-provider";
import { Select, type SelectOption } from "@/components/ui/select";

const STEP_MINUTES = 5;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function buildTimeOptions(extra?: string): SelectOption[] {
  const options: SelectOption[] = [];
  for (let minutes = 0; minutes < 24 * 60; minutes += STEP_MINUTES) {
    const value = `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
    options.push({ value, label: value });
  }
  if (extra && /^\d{2}:\d{2}$/.test(extra) && !options.some((option) => option.value === extra)) {
    options.push({ value: extra, label: extra });
    options.sort((a, b) => a.value.localeCompare(b.value));
  }
  return options;
}

export function TimePicker({
  name,
  value,
  defaultValue,
  onValueChange,
  required,
  disabled,
  className,
  id,
}: {
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
}) {
  const t = useT();
  const current = value ?? defaultValue;
  const options = useMemo(() => buildTimeOptions(current), [current]);

  return (
    <Select
      name={name}
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      options={options}
      placeholder={t("common.pickTime")}
      required={required}
      disabled={disabled}
      className={`${className ?? ""} tabular-nums`.trim()}
      id={id}
    />
  );
}
