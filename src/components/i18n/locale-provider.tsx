"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import {
  createTranslator,
  isRtl,
  type Locale,
  type Translator,
} from "@/lib/i18n";
import { setLocaleAction } from "@/app/actions/locale";

type LocaleContextValue = {
  locale: Locale;
  rtl: boolean;
  t: Translator;
  setLocale: (locale: Locale) => void;
  switching: boolean;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [switching, startTransition] = useTransition();

  const t = useMemo(() => createTranslator(locale), [locale]);

  const setLocale = useCallback(
    (next: Locale) => {
      startTransition(async () => {
        await setLocaleAction(next);
        router.refresh();
      });
    },
    [router],
  );

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, rtl: isRtl(locale), t, setLocale, switching }),
    [locale, t, setLocale, switching],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useI18n(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useI18n must be used within a LocaleProvider");
  }
  return ctx;
}

export function useT(): Translator {
  return useI18n().t;
}
