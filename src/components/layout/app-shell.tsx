"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Role } from "@prisma/client";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  ScanLine,
  Search,
  UserCog,
  Settings,
  LogOut,
  MoreHorizontal,
  Tablet,
  Receipt,
  CupSoda,
  CalendarDays,
  type LucideIcon,
} from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { LogoutConfirmButton } from "@/components/auth/logout-confirm-button";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { MobileHeader } from "@/components/layout/mobile-header";
import { useT } from "@/components/i18n/locale-provider";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { TranslationKey } from "@/lib/i18n";

type NavItem = {
  href: string;
  labelKey: TranslationKey;
  icon: LucideIcon;
};

const kioskNavItem: NavItem = {
  href: "/kiosk",
  labelKey: "nav.kiosk",
  icon: Tablet,
};

const billsNavItem: NavItem = {
  href: "/bills",
  labelKey: "nav.bills",
  icon: Receipt,
};

const drinksNavItem: NavItem = {
  href: "/drinks",
  labelKey: "nav.drinks",
  icon: CupSoda,
};

const classesNavItem: NavItem = {
  href: "/classes",
  labelKey: "nav.classes",
  icon: CalendarDays,
};

const adminNavBase: NavItem[] = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { href: "/members", labelKey: "nav.members", icon: Users },
  { href: "/scan", labelKey: "nav.scan", icon: ScanLine },
  { href: "/attendance", labelKey: "nav.attendance", icon: CalendarCheck },
  { href: "/manual", labelKey: "nav.manual", icon: Search },
  { href: "/staff", labelKey: "nav.staff", icon: UserCog },
  { href: "/settings", labelKey: "nav.settings", icon: Settings },
];

const staffNavBase: NavItem[] = [
  { href: "/scan", labelKey: "nav.scan", icon: ScanLine },
  { href: "/manual", labelKey: "nav.manual", icon: Search },
  { href: "/members", labelKey: "nav.members", icon: Users },
  { href: "/today", labelKey: "nav.today", icon: CalendarCheck },
  { href: "/account", labelKey: "nav.account", icon: Settings },
];

function buildNav(
  role: Role,
  showKioskNav: boolean,
  showBillsNav: boolean,
  showDrinksNav: boolean,
  showClassesNav: boolean,
): NavItem[] {
  let base = role === Role.ADMIN ? adminNavBase : staffNavBase;
  if (showKioskNav) {
    const scanIndex = base.findIndex((item) => item.href === "/scan");
    const insertAt = scanIndex >= 0 ? scanIndex + 1 : base.length;
    base = [...base.slice(0, insertAt), kioskNavItem, ...base.slice(insertAt)];
  }
  if (showBillsNav && role === Role.ADMIN) {
    const staffIndex = base.findIndex((item) => item.href === "/staff");
    const insertAt = staffIndex >= 0 ? staffIndex : base.length;
    base = [...base.slice(0, insertAt), billsNavItem, ...base.slice(insertAt)];
  }
  if (showDrinksNav && role === Role.ADMIN) {
    const staffIndex = base.findIndex((item) => item.href === "/staff");
    const insertAt = staffIndex >= 0 ? staffIndex : base.length;
    base = [...base.slice(0, insertAt), drinksNavItem, ...base.slice(insertAt)];
  }
  if (showClassesNav) {
    const afterHref = role === Role.ADMIN ? "/attendance" : "/members";
    const afterIndex = base.findIndex((item) => item.href === afterHref);
    const insertAt = afterIndex >= 0 ? afterIndex + 1 : base.length;
    base = [...base.slice(0, insertAt), classesNavItem, ...base.slice(insertAt)];
  }
  return base;
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function mobileTabClass(active: boolean) {
  return cn(
    "relative flex min-h-[49px] w-full min-w-0 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium leading-none transition-colors",
    "border-0 bg-transparent p-0 appearance-none outline-none",
    active ? "text-brand" : "text-foreground/50",
  );
}

function MobileTabLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="w-full min-w-0 truncate text-center leading-none">{children}</span>
  );
}

function NavLink({
  item,
  pathname,
  onNavigate,
  className,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
  className?: string;
}) {
  const t = useT();
  const active = isActive(pathname, item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
        active
          ? "border border-brand/30 bg-brand/10 text-brand shadow-sm"
          : "text-foreground hover:bg-accent hover:text-foreground",
        className,
      )}
    >
      <Icon className="size-5" strokeWidth={active ? 2.25 : 1.75} />
      {t(item.labelKey)}
    </Link>
  );
}

function MoreNavLink({
  item,
  pathname,
  onSelect,
}: {
  item: NavItem;
  pathname: string;
  onSelect: (href: string) => void;
}) {
  const t = useT();
  const active = isActive(pathname, item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      prefetch
      onClick={(event) => {
        event.preventDefault();
        onSelect(item.href);
      }}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
        active
          ? "border border-brand/30 bg-brand/10 text-brand shadow-sm"
          : "text-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <Icon className="size-5" strokeWidth={active ? 2.25 : 1.75} />
      {t(item.labelKey)}
    </Link>
  );
}

export function AppShell({
  userName,
  role,
  gymName,
  showKioskNav = false,
  showBillsNav = false,
  showDrinksNav = false,
  showClassesNav = false,
  children,
}: {
  userName: string;
  role: Role;
  gymName: string;
  showKioskNav?: boolean;
  showBillsNav?: boolean;
  showDrinksNav?: boolean;
  showClassesNav?: boolean;
  children: React.ReactNode;
}) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [instantDismiss, setInstantDismiss] = useState(false);

  const nav = buildNav(role, showKioskNav, showBillsNav, showDrinksNav, showClassesNav);
  const mobilePrimary = nav.slice(0, 4);
  const mobileMore = nav.slice(4);
  const showMoreMenu = mobileMore.length > 0;
  const moreActive = mobileMore.some((item) => isActive(pathname, item.href));
  const roleLabel = role === Role.ADMIN ? t("staff.roleAdmin") : t("staff.roleStaff");

  useEffect(() => {
    for (const item of nav) {
      router.prefetch(item.href);
    }
  }, [nav, router]);

  const handleMoreSelect = useCallback(
    (href: string) => {
      setInstantDismiss(true);
      setMoreOpen(false);
      router.push(href);
    },
    [router],
  );

  if (pathname === "/kiosk" && showKioskNav) {
    return <div className="min-h-dvh bg-background">{children}</div>;
  }

  return (
    <div className="relative flex min-h-dvh bg-background">
      <aside className="ios-blur sticky top-0 hidden h-dvh w-72 shrink-0 flex-col border-e border-border px-4 py-6 lg:flex">
        <div className="flex items-center gap-3 px-2 py-2">
          <Logo />
          <div>
            <p className="text-sm font-semibold leading-tight">{t("app.name")}</p>
            <p className="text-xs text-muted-foreground">{gymName}</p>
          </div>
        </div>

        <nav className="mt-6 flex flex-1 flex-col gap-1 px-1">
          {nav.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </nav>

        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <LanguageSwitcher />
          <div className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{userName}</p>
              <p className="text-xs text-muted-foreground">{roleLabel}</p>
            </div>
            <LogoutConfirmButton
              onLogout={logoutAction}
              title={t("nav.logout")}
              aria-label={t("nav.logout")}
              className="flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground"
            >
              <LogOut className="size-4" strokeWidth={1.75} />
            </LogoutConfirmButton>
          </div>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <MobileHeader gymName={gymName} userName={userName} roleLabel={roleLabel} />

        <main
          className={cn(
            "mx-auto w-full flex-1 px-4 py-5 pb-28 lg:px-8 lg:py-8",
            pathname === "/classes" ? "flex min-h-0 max-w-6xl flex-col" : "max-w-3xl",
          )}
        >
          {children}
        </main>
      </div>

      <nav
        className="ios-tab-bar fixed inset-x-0 bottom-0 z-20 px-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1 lg:hidden"
        role="tablist"
        aria-label={t("app.name")}
      >
        <div
          className="mx-auto grid max-w-lg"
          style={{
            gridTemplateColumns: `repeat(${mobilePrimary.length + 1}, minmax(0, 1fr))`,
          }}
        >
          {mobilePrimary.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                role="tab"
                aria-selected={active}
                className={mobileTabClass(active)}
              >
                <Icon className="size-6 shrink-0" strokeWidth={active ? 2.25 : 1.75} />
                <MobileTabLabel>{t(item.labelKey)}</MobileTabLabel>
              </Link>
            );
          })}

          {showMoreMenu ? (
            <Sheet
              open={moreOpen}
              onOpenChange={(open) => {
                setMoreOpen(open);
                if (open) setInstantDismiss(false);
              }}
            >
              <SheetTrigger asChild>
                <button
                  type="button"
                  role="tab"
                  aria-selected={moreActive}
                  className={cn(mobileTabClass(moreActive), "cursor-pointer")}
                >
                  <MoreHorizontal
                    className={cn(
                      "size-6 shrink-0 transition-transform duration-300 ease-out",
                      moreOpen && "scale-110",
                    )}
                    strokeWidth={moreActive || moreOpen ? 2.25 : 1.75}
                  />
                  <MobileTabLabel>{t("nav.more")}</MobileTabLabel>
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" dismissInstantly={instantDismiss}>
                <SheetHeader className="animate-fade-up">
                  <SheetTitle>{t("nav.more")}</SheetTitle>
                </SheetHeader>
                <div key={moreOpen ? "open" : "closed"} className="more-menu-stagger space-y-1">
                  {mobileMore.map((item) => (
                    <MoreNavLink
                      key={item.href}
                      item={item}
                      pathname={pathname}
                      onSelect={handleMoreSelect}
                    />
                  ))}
                  <Separator className="my-2" />
                  <LogoutConfirmButton
                    onLogout={async () => {
                      setMoreOpen(false);
                      await logoutAction();
                    }}
                    className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="size-5 shrink-0" strokeWidth={1.75} />
                    {t("nav.logout")}
                  </LogoutConfirmButton>
                </div>
              </SheetContent>
            </Sheet>
          ) : (
            <LogoutConfirmButton
              onLogout={logoutAction}
              role="tab"
              aria-selected={false}
              title={t("nav.logout")}
              aria-label={t("nav.logout")}
              className={cn(mobileTabClass(false), "cursor-pointer")}
            >
              <LogOut className="size-6 shrink-0" strokeWidth={1.75} />
              <MobileTabLabel>{t("nav.logoutTab")}</MobileTabLabel>
            </LogoutConfirmButton>
          )}
        </div>
      </nav>
    </div>
  );
}
