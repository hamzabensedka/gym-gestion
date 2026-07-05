import type { TabIconName } from "@/components/icons";
import type { TranslationKey } from "@gym/shared/i18n";

export type NavItem = {
  route: string;
  labelKey: TranslationKey;
  icon: TabIconName | "more" | "logout";
};

/** Mirrors `src/components/layout/app-shell.tsx` adminNav */
export const adminNav: NavItem[] = [
  { route: "dashboard", labelKey: "nav.dashboard", icon: "dashboard" },
  { route: "members", labelKey: "nav.members", icon: "users" },
  { route: "scan", labelKey: "nav.scan", icon: "scan" },
  { route: "attendance", labelKey: "nav.attendance", icon: "attendance" },
  { route: "manual", labelKey: "nav.manual", icon: "manual" },
  { route: "staff", labelKey: "nav.staff", icon: "staff" },
  { route: "settings", labelKey: "nav.settings", icon: "settings" },
];

/** Mirrors `src/components/layout/app-shell.tsx` staffNav */
export const staffNav: NavItem[] = [
  { route: "scan", labelKey: "nav.scan", icon: "scan" },
  { route: "manual", labelKey: "nav.manual", icon: "manual" },
  { route: "members", labelKey: "nav.members", icon: "users" },
  { route: "today", labelKey: "nav.today", icon: "attendance" },
  { route: "account", labelKey: "nav.account", icon: "settings" },
];

export function getMobilePrimary(nav: NavItem[]) {
  return nav.slice(0, 4);
}

export function getMobileMore(nav: NavItem[]) {
  return nav.slice(4);
}

export function isNavActive(currentRoute: string, itemRoute: string) {
  if (currentRoute === itemRoute) return true;
  if (itemRoute === "members" && currentRoute.startsWith("members")) return true;
  if (itemRoute === "today" && currentRoute === "today") return true;
  return false;
}
