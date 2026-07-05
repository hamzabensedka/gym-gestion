"use client";

import { useEffect } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { useT } from "@/components/i18n/locale-provider";
import type { CheckinResult } from "@/lib/checkin";

function playTone(success: boolean) {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = success ? 880 : 220;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc.start();
    osc.stop(ctx.currentTime + 0.36);
    if (success) {
      const osc2 = ctx.createOscillator();
      osc2.connect(gain);
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1320, ctx.currentTime + 0.12);
      osc2.start(ctx.currentTime + 0.12);
      osc2.stop(ctx.currentTime + 0.36);
    }
  } catch {
    /* audio not available */
  }
}

export function CheckinFeedback({
  result,
  onClose,
  autoCloseMs = 2600,
}: {
  result: CheckinResult;
  onClose: () => void;
  autoCloseMs?: number;
}) {
  const t = useT();

  useEffect(() => {
    playTone(result.success);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(result.success ? 120 : [90, 60, 90]);
    }
    const timer = setTimeout(onClose, autoCloseMs);
    return () => clearTimeout(timer);
  }, [result, onClose, autoCloseMs]);

  const subtitle = result.success
    ? `${t("scan.welcome")}${
        result.daysLeft !== undefined
          ? ` · ${result.daysLeft} ${result.daysLeft === 1 ? t("common.day") : t("common.days")}`
          : ""
      }`
    : result.outcome === "FROZEN"
      ? t("scan.frozenMsg")
      : result.outcome === "EXPIRED"
        ? t("scan.expiredMsg")
        : t("scan.notFound");

  return (
    <button
      type="button"
      onClick={onClose}
      aria-label={result.success ? t("scan.granted") : t("scan.denied")}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 px-6 ${
        result.success ? "bg-brand text-primary-foreground" : "bg-muted text-foreground"
      }`}
    >
      <span
        className={`animate-pop flex size-28 items-center justify-center rounded-full backdrop-blur-sm ${
          result.success ? "bg-black/10" : "bg-foreground/10"
        }`}
      >
        {result.success ? (
          <CheckCircle2 className="size-16" strokeWidth={2} />
        ) : (
          <XCircle className="size-16" strokeWidth={2} />
        )}
      </span>
      <div className="animate-fade-up text-center">
        <p className="text-balance text-3xl font-bold tracking-tight">
          {result.success ? t("scan.granted") : t("scan.denied")}
        </p>
        {result.memberName ? (
          <p className="mt-2 text-2xl font-semibold">{result.memberName}</p>
        ) : null}
        <p className="tnum mt-1 text-pretty text-lg opacity-80">{subtitle}</p>
      </div>
    </button>
  );
}
