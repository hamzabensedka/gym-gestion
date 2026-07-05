"use client";

import { LogOut } from "lucide-react";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { Logo } from "@/components/ui/logo";
import { useT } from "@/components/i18n/locale-provider";
import { memberLogoutAction } from "@/app/actions/member-auth";
import { LogoutConfirmButton } from "@/components/auth/logout-confirm-button";

export function MemberShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const t = useT();

  return (
    <div className="safe-top safe-bottom min-h-dvh bg-black">
      <header className="flex items-center justify-between px-5 py-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <Logo className="size-9" />
          <span className="truncate text-sm font-semibold text-foreground">
            {title ?? t("member.wallet.title")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher variant="compact" />
          <LogoutConfirmButton
            onLogout={memberLogoutAction}
            aria-label={t("nav.logout")}
            className="flex size-9 items-center justify-center rounded-full bg-white/[0.06] text-muted-foreground transition-colors hover:text-foreground"
          >
            <LogOut className="size-4" />
          </LogoutConfirmButton>
        </div>
      </header>
      <main className="px-5 pb-8">{children}</main>
    </div>
  );
}
