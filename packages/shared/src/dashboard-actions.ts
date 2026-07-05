export const ACTION_ITEM_CATEGORIES = [
  "PAYMENT_FOLLOWUP",
  "EXPIRED",
  "EXPIRING",
  "INACTIVE",
] as const;

export type ActionItemCategory = (typeof ACTION_ITEM_CATEGORIES)[number];

export type ActionMemberRow = {
  id: string;
  fullName: string;
  phone: string;
  subscriptionEnd: Date | string;
  monthlyFee: number | { toString(): string };
};

export type ActionItem = {
  memberId: string;
  fullName: string;
  phone: string;
  category: ActionItemCategory;
  subscriptionEnd: string;
  monthlyFee: number;
};

export type ActionItemsData = {
  items: ActionItem[];
  counts: Record<ActionItemCategory, number>;
};

const DEFAULT_MAX_ITEMS = 10;
const DEFAULT_PER_CATEGORY = 5;

function toActionItem(member: ActionMemberRow, category: ActionItemCategory): ActionItem {
  return {
    memberId: member.id,
    fullName: member.fullName,
    phone: member.phone,
    category,
    subscriptionEnd: new Date(member.subscriptionEnd).toISOString(),
    monthlyFee: Number(member.monthlyFee),
  };
}

export function buildActionItems(input: {
  expiring: ActionMemberRow[];
  expired: ActionMemberRow[];
  inactive: ActionMemberRow[];
  paymentFollowup: ActionMemberRow[];
  maxItems?: number;
  perCategory?: number;
}): ActionItemsData {
  const maxItems = input.maxItems ?? DEFAULT_MAX_ITEMS;
  const perCategory = input.perCategory ?? DEFAULT_PER_CATEGORY;
  const seen = new Set<string>();
  const items: ActionItem[] = [];

  const counts: Record<ActionItemCategory, number> = {
    PAYMENT_FOLLOWUP: input.paymentFollowup.length,
    EXPIRED: input.expired.length,
    EXPIRING: input.expiring.length,
    INACTIVE: input.inactive.length,
  };

  const addFrom = (rows: ActionMemberRow[], category: ActionItemCategory) => {
    let added = 0;
    for (const row of rows) {
      if (seen.has(row.id) || added >= perCategory || items.length >= maxItems) {
        if (items.length >= maxItems) return;
        continue;
      }
      seen.add(row.id);
      items.push(toActionItem(row, category));
      added += 1;
    }
  };

  addFrom(input.paymentFollowup, "PAYMENT_FOLLOWUP");
  addFrom(input.expired, "EXPIRED");
  addFrom(input.expiring, "EXPIRING");
  addFrom(input.inactive, "INACTIVE");

  return { items, counts };
}
