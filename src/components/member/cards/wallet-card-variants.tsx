"use client";

import Link from "next/link";
import { MemberStatus } from "@prisma/client";
import { ChevronRight } from "lucide-react";
import { useT } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";
import { FitBoxLogo, HazardStripe } from "./fitbox-brand";

type WalletCardBaseProps = {
  gymName: string;
  memberName: string;
  subscriptionEnd: string;
  status: MemberStatus;
  href: string;
};

export function DefaultWalletCard({
  gymName,
  memberName,
  subscriptionEnd,
  status,
  href,
}: WalletCardBaseProps) {
  const t = useT();
  const expired = status === MemberStatus.EXPIRED;

  return (
    <Link
      href={href}
      className={cn(
        "group relative block overflow-hidden rounded-[22px] border transition-transform duration-150 ease-out active:scale-[0.98]",
        expired
          ? "border-white/8 bg-[#0a0a0a]"
          : "border-white/12 bg-[#0a0a0a] shadow-[0_8px_32px_rgba(87,204,153,0.12)]",
      )}
    >
      {!expired ? (
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-brand to-transparent opacity-80" />
      ) : null}

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {gymName}
            </p>
            <h2 className="mt-2 truncate text-2xl font-bold text-foreground">
              {memberName}
            </h2>
          </div>
          <div
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold",
              expired
                ? "bg-muted text-muted-foreground"
                : "bg-brand/15 text-brand",
            )}
          >
            {gymName.charAt(0).toUpperCase()}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
              expired
                ? "bg-critical-muted text-critical"
                : "bg-brand/15 text-brand",
            )}
          >
            {expired ? t("common.expired") : t("common.active")}
          </span>
          <p className="tnum text-xs text-muted-foreground">
            {t("member.wallet.until")} {subscriptionEnd}
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>{t("member.wallet.tapToShowQr")}</span>
          <ChevronRight className="size-4 opacity-60 transition-transform group-hover:translate-x-0.5 flip-rtl" />
        </div>
      </div>
    </Link>
  );
}

export function FitBoxMahdiaWalletCard({
  memberName,
  subscriptionEnd,
  status,
  href,
}: WalletCardBaseProps) {
  const t = useT();
  const expired = status === MemberStatus.EXPIRED;

  return (
    <Link
      href={href}
      className={cn(
        "group relative mx-auto block aspect-[1.72/1] w-full max-w-[340px] overflow-hidden rounded-2xl border transition-[transform,box-shadow] duration-150 ease-out active:scale-[0.98]",
        expired
          ? "border-white/10 bg-[#111] shadow-none"
          : "border-[#f5c518]/25 bg-[#0a0a0a] shadow-[0_8px_28px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(245,197,24,0.12)]",
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 100% 0%, rgba(245,197,24,0.18), transparent 55%)",
        }}
        aria-hidden
      />

      <div className="relative flex h-full flex-col px-4 pb-3 pt-3.5">
        <div className="flex items-start justify-between gap-2">
          <FitBoxLogo compact className="shrink-0" />
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
              expired
                ? "bg-critical-muted text-critical"
                : "bg-[#f5c518]/15 text-[#f5c518]",
            )}
          >
            {expired ? t("common.expired") : t("common.active")}
          </span>
        </div>

        <div className="mt-auto min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/40">
            {t("member.wallet.member")}
          </p>
          <h2 className="mt-0.5 truncate text-lg font-bold uppercase tracking-tight text-white">
            {memberName}
          </h2>
          <p className="tnum mt-1 text-xs text-white/55">
            {t("member.wallet.until")}{" "}
            <span className={cn("font-semibold", expired ? "text-critical" : "text-[#f5c518]")}>
              {subscriptionEnd}
            </span>
          </p>
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-2">
          <HazardStripe className="h-1 flex-1 rounded-full opacity-90" />
          <span className="flex shrink-0 items-center gap-0.5 text-[9px] font-medium uppercase tracking-wide text-white/35">
            {t("member.wallet.tapToShowQr")}
            <ChevronRight className="size-3 text-[#f5c518]/70 transition-transform group-hover:translate-x-0.5 flip-rtl" />
          </span>
        </div>
      </div>
    </Link>
  );
}
