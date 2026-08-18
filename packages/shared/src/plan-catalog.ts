import { Plan } from "@prisma/client";
import type { TranslationKey } from "./i18n";

export type PlanCardDef = {
  plan: Plan;
  pitchKey: TranslationKey;
  includeKeys: TranslationKey[];
  staffSeats: number;
};

export const PLAN_CATALOG: PlanCardDef[] = [
  {
    plan: Plan.STARTER,
    pitchKey: "plans.pitch.STARTER",
    staffSeats: 2,
    includeKeys: [
      "plans.feature.members",
      "plans.feature.deskCheckin",
      "plans.feature.bills",
    ],
  },
  {
    plan: Plan.GROWTH,
    pitchKey: "plans.pitch.GROWTH",
    staffSeats: 5,
    includeKeys: [
      "plans.feature.members",
      "plans.feature.deskCheckin",
      "plans.feature.bills",
      "plans.feature.kiosk",
      "plans.feature.classes",
      "plans.feature.drinks",
      "plans.feature.csv",
    ],
  },
  {
    plan: Plan.PRO,
    pitchKey: "plans.pitch.PRO",
    staffSeats: 10,
    includeKeys: [
      "plans.feature.members",
      "plans.feature.deskCheckin",
      "plans.feature.bills",
      "plans.feature.kiosk",
      "plans.feature.classes",
      "plans.feature.drinks",
      "plans.feature.csv",
      "plans.feature.badges",
      "plans.feature.accessExport",
    ],
  },
];
