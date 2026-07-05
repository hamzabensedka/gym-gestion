import { format } from "date-fns";
import { ar, fr } from "date-fns/locale";
import type { Locale as DateFnsLocale } from "date-fns";
import type { Locale } from "./i18n";

const dateFnsLocales: Record<Locale, DateFnsLocale> = { fr, ar };

function loc(locale: Locale = "fr"): DateFnsLocale {
  return dateFnsLocales[locale] ?? fr;
}

export function formatDate(date: Date | string, locale: Locale = "fr"): string {
  return format(new Date(date), "dd MMM yyyy", { locale: loc(locale) });
}

export function formatDateTime(date: Date | string, locale: Locale = "fr"): string {
  return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: loc(locale) });
}

export function formatTime(date: Date | string, locale: Locale = "fr"): string {
  return format(new Date(date), "HH:mm", { locale: loc(locale) });
}

export function formatDay(date: Date | string, locale: Locale = "fr"): string {
  return format(new Date(date), "EEE", { locale: loc(locale) });
}

export function formatCurrency(amount: number | string): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  return `${value.toLocaleString("fr-FR", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })} TND`;
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\s+/g, "").trim();
}
