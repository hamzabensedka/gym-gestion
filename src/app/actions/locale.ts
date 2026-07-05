"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE, resolveLocale } from "@/lib/i18n";

export async function setLocaleAction(value: string) {
  const locale = resolveLocale(value);
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
