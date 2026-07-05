"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function MobileHeader({
  gymName,
  userName,
  roleLabel,
}: {
  gymName: string;
  userName: string;
  roleLabel: string;
}) {
  const initials = getInitials(userName) || "?";

  return (
    <header className="ios-blur safe-top sticky top-0 z-20 lg:hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="size-9 border-brand/25 shadow-[0_0_0_1px_rgba(87,204,153,0.08)]">
            <AvatarFallback className="text-[11px] font-bold tracking-wide">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold leading-tight tracking-[-0.02em] text-foreground">
              {gymName}
            </p>
            <p className="mt-0.5 truncate text-xs leading-none text-muted-foreground">
              {userName}
              <span aria-hidden className="mx-1.5 text-border">
                ·
              </span>
              <span className="font-medium text-brand/85">{roleLabel}</span>
            </p>
          </div>
        </div>

        <LanguageSwitcher variant="compact" />
      </div>

      <div
        aria-hidden
        className="h-px bg-gradient-to-r from-transparent via-border to-transparent"
      />
    </header>
  );
}
