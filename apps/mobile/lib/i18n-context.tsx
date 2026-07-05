import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { I18nManager } from "react-native";
import * as SecureStore from "expo-secure-store";
import { createTranslator, isRtl, resolveLocale, type Locale, type TranslationKey } from "@gym/shared/i18n";

const LOCALE_KEY = "gym_locale";

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  rtl: boolean;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fr");

  useEffect(() => {
    I18nManager.allowRTL(true);
    void SecureStore.getItemAsync(LOCALE_KEY).then((stored) => {
      if (stored) {
        setLocaleState(resolveLocale(stored));
      }
    });
  }, []);

  const setLocale = useCallback((next: Locale) => {
    const resolved = resolveLocale(next);
    setLocaleState(resolved);
    void SecureStore.setItemAsync(LOCALE_KEY, resolved);
  }, []);

  const t = useMemo(() => createTranslator(locale), [locale]);
  const rtl = isRtl(locale);

  const value = useMemo(
    () => ({ locale, setLocale, t, rtl }),
    [locale, setLocale, t, rtl],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
