"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AccessMode, Plan } from "@prisma/client";
import { Building2, CreditCard, KeyRound, Languages, Check, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, GroupedSection, GroupedRow } from "@/components/ui/card";
import { Input, Field } from "@/components/ui/input";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { LegalFooter } from "@/components/legal/legal-footer";
import { useT } from "@/components/i18n/locale-provider";
import {
  updateGymAction,
  changePasswordAction,
  updatePlanAndAccessAction,
} from "@/app/actions/settings";
import type { TranslationKey } from "@/lib/i18n";
import { GYM_CARD_THEME_OPTIONS } from "@/lib/gym-card-themes";
import { getPlanLimits, modesAllowedForPlan } from "@/lib/plans";

const PLANS = Object.values(Plan);

const PLAN_LABEL: Record<Plan, TranslationKey> = {
  STARTER: "onboarding.plan.STARTER",
  GROWTH: "onboarding.plan.GROWTH",
  PRO: "onboarding.plan.PRO",
};

const MODE_LABEL: Record<AccessMode, TranslationKey> = {
  DESK_ONLY: "settings.mode.DESK_ONLY",
  KIOSK: "settings.mode.KIOSK",
  BADGE_PC_EXTENSION: "settings.mode.BADGE_PC_EXTENSION",
  VENDOR_CONNECTOR: "settings.mode.VENDOR_CONNECTOR",
  NEW_ACCESS_KIT: "settings.mode.NEW_ACCESS_KIT",
};

function clampMode(plan: Plan, mode: AccessMode): AccessMode {
  return modesAllowedForPlan(plan).includes(mode) ? mode : AccessMode.DESK_ONLY;
}

function Saved({ show }: { show: boolean }) {
  const t = useT();
  if (!show) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-brand">
      <Check className="size-3.5" aria-hidden />
      {t("settings.saved")}
    </span>
  );
}

export function SettingsForms({
  gymName,
  gymLocation,
  cardTheme,
  plan: initialPlan,
  accessMode: initialAccessMode,
}: {
  gymName: string;
  gymLocation: string;
  cardTheme: string;
  plan: Plan;
  accessMode: AccessMode;
}) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [gymSaved, setGymSaved] = useState(false);
  const [gymError, setGymError] = useState<string | null>(null);
  const [pwSaved, setPwSaved] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [planSaved, setPlanSaved] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan>(initialPlan);
  const [accessMode, setAccessMode] = useState<AccessMode>(
    clampMode(initialPlan, initialAccessMode),
  );

  useEffect(() => {
    setPlan(initialPlan);
    setAccessMode(clampMode(initialPlan, initialAccessMode));
  }, [initialPlan, initialAccessMode]);

  const allowedModes = useMemo(() => modesAllowedForPlan(plan), [plan]);
  const previewMaxStaff = getPlanLimits(plan).maxStaff;

  function onPlanChange(next: Plan) {
    setPlan(next);
    setAccessMode((current) => clampMode(next, current));
  }

  function saveGym(formData: FormData) {
    setGymError(null);
    setGymSaved(false);
    startTransition(async () => {
      const result = await updateGymAction(formData);
      if (result && "error" in result && result.error) {
        setGymError(result.error);
        return;
      }
      setGymSaved(true);
      router.refresh();
      setTimeout(() => setGymSaved(false), 2500);
    });
  }

  function savePassword(formData: FormData) {
    setPwError(null);
    setPwSaved(false);
    startTransition(async () => {
      const result = await changePasswordAction(formData);
      if (result && "error" in result && result.error) {
        setPwError(result.error);
        return;
      }
      setPwSaved(true);
      setTimeout(() => setPwSaved(false), 2500);
    });
  }

  function savePlanAccess() {
    setPlanError(null);
    setPlanSaved(false);
    const formData = new FormData();
    formData.set("plan", plan);
    formData.set("accessMode", accessMode);
    startTransition(async () => {
      const result = await updatePlanAndAccessAction(formData);
      if (result && "error" in result && result.error) {
        setPlanError(result.error);
        return;
      }
      setPlanSaved(true);
      router.refresh();
      setTimeout(() => setPlanSaved(false), 2500);
    });
  }

  return (
    <div className="space-y-6">
      <GroupedSection title={t("settings.language")}>
        <GroupedRow className="justify-between">
          <div className="flex items-center gap-3">
            <Languages className="size-5 text-foreground" strokeWidth={1.75} />
            <span className="text-[17px]">{t("settings.language")}</span>
          </div>
          <LanguageSwitcher />
        </GroupedRow>
      </GroupedSection>

      <Card>
        <div className="mb-4 flex items-center gap-2">
          <CreditCard className="size-5 text-foreground" strokeWidth={1.75} />
          <h3 className="text-[17px] font-semibold">{t("settings.subscription")}</h3>
          <Saved show={planSaved} />
        </div>
        <form
          action={savePlanAccess}
          className="space-y-4"
          data-lpignore="true"
          data-1p-ignore=""
          data-lastpass-ignore=""
        >
          <Field label={t("settings.plan")}>
            <select
              name="plan"
              value={plan}
              onChange={(e) => onPlanChange(e.target.value as Plan)}
              className="flex h-11 w-full rounded-lg border border-border bg-input px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              {PLANS.map((value) => (
                <option key={value} value={value}>
                  {t(PLAN_LABEL[value])}
                </option>
              ))}
            </select>
          </Field>
          <p className="text-xs text-muted-foreground">
            {t("settings.maxStaffHint", { n: previewMaxStaff })}
          </p>
          <Field label={t("settings.accessMode")}>
            <select
              name="accessMode"
              value={accessMode}
              onChange={(e) => setAccessMode(e.target.value as AccessMode)}
              className="flex h-11 w-full rounded-lg border border-border bg-input px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              {allowedModes.map((value) => (
                <option key={value} value={value}>
                  {t(MODE_LABEL[value])}
                </option>
              ))}
            </select>
          </Field>
          {planError ? (
            <p
              role="alert"
              className="rounded-lg border border-border bg-muted px-3 py-2 text-sm font-medium text-foreground"
            >
              {t(planError as TranslationKey)}
            </p>
          ) : null}
          <Button type="submit" disabled={pending}>
            {t("settings.savePlanAccess")}
          </Button>
        </form>
      </Card>

      <Card>
        <div className="mb-4 flex items-center gap-2">
          <Building2 className="size-5 text-foreground" strokeWidth={1.75} />
          <h3 className="text-[17px] font-semibold">{t("settings.gymInfo")}</h3>
          <Saved show={gymSaved} />
        </div>
        <form
          action={saveGym}
          className="space-y-4"
          data-lpignore="true"
          data-1p-ignore=""
          data-lastpass-ignore=""
        >
          <Field label={t("settings.gymName")}>
            <Input name="name" defaultValue={gymName} required />
          </Field>
          <Field label={t("settings.gymLocation")}>
            <Input name="location" defaultValue={gymLocation} />
          </Field>
          <Field label={t("settings.cardTheme")}>
            <select
              name="cardTheme"
              defaultValue={cardTheme || "default"}
              className="flex h-11 w-full rounded-lg border border-border bg-input px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              {GYM_CARD_THEME_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </option>
              ))}
            </select>
          </Field>
          <p className="text-xs text-muted-foreground">{t("settings.cardThemeHint")}</p>
          {gymError ? (
            <p
              role="alert"
              className="rounded-lg border border-border bg-muted px-3 py-2 text-sm font-medium text-foreground"
            >
              {t(gymError as TranslationKey)}
            </p>
          ) : null}
          <Button type="submit" disabled={pending}>
            {t("settings.saveGym")}
          </Button>
        </form>
      </Card>

      <Card>
        <div className="mb-4 flex items-center gap-2">
          <KeyRound className="size-5 text-foreground" strokeWidth={1.75} />
          <h3 className="text-[17px] font-semibold">{t("settings.account")}</h3>
          <Saved show={pwSaved} />
        </div>
        <form
          action={savePassword}
          className="space-y-4"
          data-lpignore="true"
          data-1p-ignore=""
          data-lastpass-ignore=""
        >
          <Field label={t("settings.currentPassword")}>
            <Input name="currentPassword" type="password" required autoComplete="current-password" />
          </Field>
          <Field label={t("settings.newPassword")}>
            <Input name="newPassword" type="password" required minLength={6} autoComplete="new-password" />
          </Field>
          {pwError ? (
            <p
              role="alert"
              className="rounded-lg border border-border bg-muted px-3 py-2 text-sm font-medium text-foreground"
            >
              {t(pwError as TranslationKey)}
            </p>
          ) : null}
          <Button type="submit" disabled={pending}>
            {t("settings.updatePassword")}
          </Button>
        </form>
      </Card>

      <GroupedSection title={t("settings.legal")}>
        <Link href="/privacy" className="ios-row ios-row-interactive gap-3 text-sm text-foreground">
          <FileText className="size-5 shrink-0" strokeWidth={1.75} />
          {t("legal.privacy")}
        </Link>
        <Link href="/terms" className="ios-row ios-row-interactive gap-3 text-sm text-foreground">
          <FileText className="size-5 shrink-0" strokeWidth={1.75} />
          {t("legal.terms")}
        </Link>
      </GroupedSection>

      <LegalFooter />
    </div>
  );
}
