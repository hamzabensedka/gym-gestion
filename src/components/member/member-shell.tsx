"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, CreditCard, LogOut } from "lucide-react";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { Logo } from "@/components/ui/logo";
import { useT } from "@/components/i18n/locale-provider";
import { memberLogoutAction } from "@/app/actions/member-auth";
import { LogoutConfirmButton } from "@/components/auth/logout-confirm-button";
import { cn } from "@/lib/utils";

function tabClass(active: boolean) {
  return cn(
    "relative flex min-h-[49px] w-full min-w-0 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium leading-none",
    "border-0 bg-transparent p-0 appearance-none outline-none transition-[color,transform] duration-150",
    "active:scale-[0.96]",
    active ? "text-brand" : "text-foreground/50",
  );
}

export function MemberShell({
  children,
  title,
  showClassesNav = false,
}: {
  children: React.ReactNode;
  title?: string;
  showClassesNav?: boolean;
}) {
  const t = useT();
  const pathname = usePathname();
  const cardActive = pathname === "/member";
  const classesActive = pathname.startsWith("/member/classes");

  return (
    <div
      className={cn(
        "flex h-dvh min-h-dvh flex-col overflow-hidden bg-black safe-top",
        !showClassesNav && "safe-bottom",
      )}
    >
      <header className="flex shrink-0 items-center justify-between px-5 py-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <Logo className="size-9" />
          <span className="truncate text-sm font-semibold text-balance text-foreground">
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
      <main
        className={cn(
          "flex min-h-0 flex-1 flex-col px-5 pb-8",
          showClassesNav && "pb-[calc(5.25rem+env(safe-area-inset-bottom))]",
        )}
      >
        {children}
      </main>

      {showClassesNav ? (
        <nav
          className="ios-tab-bar fixed inset-x-0 bottom-0 z-20 px-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1"
          role="tablist"
          aria-label={t("member.wallet.title")}
        >
          <div className="mx-auto grid max-w-lg grid-cols-2">
            <Link
              href="/member"
              prefetch
              role="tab"
              aria-selected={cardActive}
              className={tabClass(cardActive)}
            >
              <CreditCard
                className="size-6 shrink-0"
                strokeWidth={cardActive ? 2.25 : 1.75}
              />
              <span className="w-full min-w-0 truncate text-center leading-none">
                {t("member.wallet.title")}
              </span>
            </Link>
            <Link
              href="/member/classes"
              prefetch
              role="tab"
              aria-selected={classesActive}
              className={tabClass(classesActive)}
            >
              <CalendarDays
                className="size-6 shrink-0"
                strokeWidth={classesActive ? 2.25 : 1.75}
              />
              <span className="w-full min-w-0 truncate text-center leading-none">
                {t("nav.classes")}
              </span>
            </Link>
          </div>
        </nav>
      ) : null}
    </div>
  );
}
