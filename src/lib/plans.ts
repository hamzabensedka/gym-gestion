import { AccessMode, Plan } from "@prisma/client";

export type PlanFeature =
  | "kiosk"
  | "csv_export"
  | "badge_numbers"
  | "access_export";

export type EntryAnswer =
  | "desk"
  | "open_kiosk"
  | "badge_pc"
  | "vendor"
  | "new_kit";

const PLAN_CONFIG: Record<
  Plan,
  { maxStaff: number; features: PlanFeature[]; modes: AccessMode[] }
> = {
  STARTER: {
    maxStaff: 2,
    features: [],
    modes: [AccessMode.DESK_ONLY],
  },
  GROWTH: {
    maxStaff: 5,
    features: ["kiosk", "csv_export"],
    modes: [AccessMode.DESK_ONLY, AccessMode.KIOSK],
  },
  PRO: {
    maxStaff: 10,
    features: ["kiosk", "csv_export", "badge_numbers", "access_export"],
    modes: [
      AccessMode.DESK_ONLY,
      AccessMode.KIOSK,
      AccessMode.BADGE_PC_EXTENSION,
      AccessMode.VENDOR_CONNECTOR,
      AccessMode.NEW_ACCESS_KIT,
    ],
  },
};

export function getPlanLimits(plan: Plan) {
  return {
    maxStaff: PLAN_CONFIG[plan].maxStaff,
    features: PLAN_CONFIG[plan].features,
  };
}

export function planHasFeature(plan: Plan, feature: PlanFeature): boolean {
  return PLAN_CONFIG[plan].features.includes(feature);
}

export function modesAllowedForPlan(plan: Plan): AccessMode[] {
  return PLAN_CONFIG[plan].modes;
}

export function suggestFromEntryAnswer(answer: EntryAnswer): {
  plan: Plan;
  accessMode: AccessMode;
} {
  switch (answer) {
    case "desk":
      return { plan: Plan.STARTER, accessMode: AccessMode.DESK_ONLY };
    case "open_kiosk":
      return { plan: Plan.GROWTH, accessMode: AccessMode.KIOSK };
    case "badge_pc":
      return { plan: Plan.PRO, accessMode: AccessMode.BADGE_PC_EXTENSION };
    case "vendor":
      return { plan: Plan.PRO, accessMode: AccessMode.VENDOR_CONNECTOR };
    case "new_kit":
      return { plan: Plan.GROWTH, accessMode: AccessMode.NEW_ACCESS_KIT };
  }
}
