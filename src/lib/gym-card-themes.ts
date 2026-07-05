export const GYM_CARD_THEMES = {
  default: "default",
  fitboxMahdia: "fitbox-mahdia",
} as const;

export type GymCardTheme = (typeof GYM_CARD_THEMES)[keyof typeof GYM_CARD_THEMES];

export const GYM_CARD_THEME_OPTIONS: Array<{
  value: GymCardTheme;
  labelKey: "settings.cardThemeDefault" | "settings.cardThemeFitbox";
}> = [
  { value: GYM_CARD_THEMES.default, labelKey: "settings.cardThemeDefault" },
  { value: GYM_CARD_THEMES.fitboxMahdia, labelKey: "settings.cardThemeFitbox" },
];

export function resolveGymCardTheme(
  cardTheme: string | null | undefined,
  gymName: string,
): GymCardTheme {
  if (cardTheme && isGymCardTheme(cardTheme)) {
    return cardTheme;
  }

  if (/fitbox/i.test(gymName)) {
    return GYM_CARD_THEMES.fitboxMahdia;
  }

  return GYM_CARD_THEMES.default;
}

function isGymCardTheme(value: string): value is GymCardTheme {
  return Object.values(GYM_CARD_THEMES).includes(value as GymCardTheme);
}

export const FITBOX_COLORS = {
  black: "#0a0a0a",
  yellow: "#f5c518",
  yellowDim: "#c9a012",
} as const;
