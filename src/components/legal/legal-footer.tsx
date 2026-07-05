"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n/locale-provider";

export function LegalFooter({ className }: { className?: string }) {
  const t = useT();

  return (
    <footer className={cn("text-center", className)}>
      <p className="text-xs text-muted-foreground">{t("legal.footer")}</p>
      <nav
        className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs"
        aria-label={t("legal.footer")}
      >
        <Link href="/privacy" className="text-foreground hover:underline">
          {t("legal.privacy")}
        </Link>
        <span className="text-border" aria-hidden>
          ·
        </span>
        <Link href="/terms" className="text-foreground hover:underline">
          {t("legal.terms")}
        </Link>
      </nav>
    </footer>
  );
}
