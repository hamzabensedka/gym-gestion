"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { MemberStatus } from "@prisma/client";
import { useT } from "@/components/i18n/locale-provider";
import { generateMemberQrPayload } from "@/lib/member-qr";
import {
  type GymCardTheme,
  GYM_CARD_THEMES,
} from "@/lib/gym-card-themes";
import { FitBoxLogo, HazardStripe } from "./cards/fitbox-brand";

type MemberQrScreenProps = {
  memberId: string;
  memberName: string;
  gymName: string;
  validUntil: string;
  status: MemberStatus;
  cardTheme?: GymCardTheme;
};

export function MemberQrScreen({
  memberId,
  memberName,
  gymName,
  validUntil,
  status,
  cardTheme = GYM_CARD_THEMES.default,
}: MemberQrScreenProps) {
  const t = useT();
  const [dataUrl, setDataUrl] = useState("");
  const expired = status === MemberStatus.EXPIRED;
  const isFitBox = cardTheme === GYM_CARD_THEMES.fitboxMahdia;

  const payload = useMemo(() => generateMemberQrPayload(memberId), [memberId]);

  useEffect(() => {
    QRCode.toDataURL(payload, {
      width: 320,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    }).then(setDataUrl);
  }, [payload]);

  if (isFitBox) {
    return (
      <div className="flex min-h-dvh flex-col bg-black">
        <div className="safe-top flex flex-1 flex-col items-center justify-center px-5 py-8">
          {expired ? (
            <div className="mb-6 w-full max-w-sm rounded-lg border-2 border-critical-border bg-critical-muted px-4 py-3 text-center text-sm font-bold uppercase tracking-wide text-critical">
              {t("member.qr.expiredBanner")}
            </div>
          ) : null}

          <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-[#f5c518]/25 bg-[#0a0a0a] shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between px-4 py-3">
              <FitBoxLogo />
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#f5c518]/80">
                {t("member.qr.title")}
              </p>
            </div>

            <HazardStripe className="h-1 w-full" />

            <div className="flex flex-col items-center px-5 py-6">
              {dataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={dataUrl}
                  alt={`QR ${memberName}`}
                  className="size-[min(68vw,260px)] rounded-xl border-2 border-[#f5c518]/50 bg-white p-2.5"
                />
              ) : (
                <div className="size-[min(68vw,260px)] animate-pulse rounded-xl border-2 border-[#f5c518]/20 bg-black" />
              )}

              <p className="mt-4 text-center text-base font-bold uppercase tracking-tight text-white">
                {memberName}
              </p>
              <p className="tnum mt-1.5 text-sm text-[#f5c518]/90">
                {t("detail.cardValid")} {validUntil}
              </p>
            </div>

            <HazardStripe className="h-1 w-full" />
          </div>

          <p className="mt-6 max-w-xs text-center text-xs font-medium uppercase tracking-wide text-white/40">
            {t("member.qr.brightnessHint")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-black">
      <div className="safe-top flex flex-1 flex-col items-center justify-center px-5 py-8">
        {expired ? (
          <div className="mb-6 w-full max-w-sm rounded-xl border border-critical-border bg-critical-muted px-4 py-3 text-center text-sm font-medium text-critical">
            {t("member.qr.expiredBanner")}
          </div>
        ) : null}

        <div className="w-full max-w-sm overflow-hidden rounded-[24px] border border-white/12 bg-[#0a0a0a]">
          <div className="border-b border-white/12 px-5 py-4 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {gymName}
            </p>
            <h1 className="mt-1 text-lg font-bold text-foreground">
              {t("member.qr.title")}
            </h1>
          </div>

          <div className="flex flex-col items-center px-6 py-8">
            {dataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={dataUrl}
                alt={`QR ${memberName}`}
                className="size-[min(72vw,280px)] rounded-2xl bg-white p-3"
              />
            ) : (
              <div className="size-[min(72vw,280px)] animate-pulse rounded-2xl bg-muted" />
            )}

            <p className="mt-5 text-center text-lg font-bold text-foreground">
              {memberName}
            </p>
            <p className="tnum mt-1 text-sm text-muted-foreground">
              {t("detail.cardValid")} {validUntil}
            </p>
          </div>
        </div>

        <p className="mt-6 max-w-xs text-center text-xs text-muted-foreground">
          {t("member.qr.brightnessHint")}
        </p>
      </div>
    </div>
  );
}
