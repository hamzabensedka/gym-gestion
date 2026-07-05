"use client";

import { locales, type Locale } from "@/lib/i18n";
import { useI18n } from "./locale-provider";
import { cn } from "@/lib/utils";

const labels: Record<Locale, string> = {
  fr: "FR",
  ar: "ع",
};

export function LanguageSwitcher({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "compact";
}) {
  const { locale, setLocale, switching } = useI18n();
  const compact = variant === "compact";

  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center text-xs font-bold",
        compact
          ? "rounded-full bg-white/[0.06] p-0.5"
          : "rounded-lg border border-border bg-muted p-0.5",
        switching && "opacity-60",
        className,
      )}
      role="group"
      aria-label="Language"
    >
      {locales.map((code) => (
        <button
          key={code}
          type="button"
          disabled={switching}
          onClick={() => setLocale(code)}
          aria-pressed={locale === code}
          className={cn(
            "relative transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.94]",
            compact
              ? "min-h-7 min-w-[30px] rounded-full px-2 py-1 text-[11px] font-semibold"
              : "min-h-[36px] min-w-[40px] rounded-[8px] px-2.5 py-1.5",
            locale === code
              ? compact
                ? "bg-brand text-primary-foreground shadow-sm"
                : "border border-brand/40 bg-brand/10 text-brand shadow-sm"
              : compact
                ? "text-muted-foreground hover:text-foreground"
                : "text-muted-foreground hover:text-foreground",
          )}
        >
          {labels[code]}
        </button>
      ))}
    </div>
  );
}
