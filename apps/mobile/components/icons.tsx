import { Feather, Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

type FeatherName = ComponentProps<typeof Feather>["name"];

export function FeatherIcon({
  name,
  color,
  size = 24,
}: {
  name: FeatherName;
  color: string;
  size?: number;
}) {
  return <Feather name={name} size={size} color={color} />;
}

const tabIcons = {
  dashboard: "layout",
  users: "users",
  attendance: "calendar",
  staff: "user-check",
  settings: "settings",
  scan: "camera",
  manual: "search",
  wallet: "credit-card",
} as const satisfies Record<string, FeatherName>;

export type TabIconName = keyof typeof tabIcons;

export function TabIcon({
  name,
  color,
  size = 24,
}: {
  name: TabIconName;
  color: string;
  size?: number;
}) {
  return <Feather name={tabIcons[name]} size={size} color={color} />;
}

/** For tab layouts that use a separate qr tab name */
export function QrTabIcon({ color, size = 24 }: { color: string; size?: number }) {
  return <Ionicons name="qr-code-outline" size={size} color={color} />;
}
