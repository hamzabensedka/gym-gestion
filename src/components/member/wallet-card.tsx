"use client";

import { MemberStatus } from "@prisma/client";
import {
  type GymCardTheme,
  GYM_CARD_THEMES,
} from "@/lib/gym-card-themes";
import {
  DefaultWalletCard,
  FitBoxMahdiaWalletCard,
} from "./cards/wallet-card-variants";

type WalletCardProps = {
  gymName: string;
  memberName: string;
  subscriptionEnd: string;
  status: MemberStatus;
  href: string;
  cardTheme?: GymCardTheme;
};

export function WalletCard({
  cardTheme = GYM_CARD_THEMES.default,
  ...props
}: WalletCardProps) {
  if (cardTheme === GYM_CARD_THEMES.fitboxMahdia) {
    return <FitBoxMahdiaWalletCard {...props} />;
  }

  return <DefaultWalletCard {...props} />;
}
