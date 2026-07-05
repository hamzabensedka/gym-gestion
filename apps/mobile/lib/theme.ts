/** Mirrors `src/app/globals.css` — dark iOS-style design system. */
export const colors = {
  brand: "#57cc99",
  background: "#000000",
  foreground: "#ffffff",
  card: "#0a0a0a",
  primary: "#57cc99",
  primaryForeground: "#000000",
  secondary: "#171717",
  muted: "#171717",
  mutedForeground: "rgba(255, 255, 255, 0.55)",
  accent: "#262626",
  destructive: "#ef233c",
  critical: "#ef233c",
  criticalForeground: "#ffffff",
  criticalMuted: "rgba(239, 35, 60, 0.15)",
  criticalBorder: "rgba(239, 35, 60, 0.35)",
  border: "rgba(255, 255, 255, 0.12)",
  input: "#0a0a0a",
  ring: "#57cc99",
  tabBarBg: "rgba(0, 0, 0, 0.92)",
  brandMuted: "rgba(87, 204, 153, 0.15)",
  brandBorder: "rgba(87, 204, 153, 0.3)",
  brandText: "rgba(87, 204, 153, 0.8)",
  foreground50: "rgba(255, 255, 255, 0.5)",
  foreground25: "rgba(255, 255, 255, 0.25)",
  error: "#ef233c",
  success: "#57cc99",
  bg: "#000000",
  surface: "#0a0a0a",
  text: "#ffffff",
  textMuted: "rgba(255, 255, 255, 0.55)",
  danger: "#ef233c",
  warning: "#f59e0b",
  brandDark: "#57cc99",
};

export const radius = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  logo: 8.8,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const tabBarScreenOptions = {
  tabBarActiveTintColor: colors.brand,
  tabBarInactiveTintColor: colors.foreground50,
  tabBarStyle: {
    backgroundColor: colors.tabBarBg,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    minHeight: 49,
    paddingTop: 4,
  },
  tabBarLabelStyle: {
    fontSize: 10,
    fontWeight: "500" as const,
  },
  headerStyle: {
    backgroundColor: colors.background,
  },
  headerTintColor: colors.brand,
  headerTitleStyle: {
    color: colors.foreground,
    fontWeight: "600" as const,
  },
  sceneStyle: {
    backgroundColor: colors.background,
  },
};
