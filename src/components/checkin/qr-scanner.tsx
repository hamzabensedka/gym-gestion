"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { ScanLine, Loader2, CameraOff } from "lucide-react";
import { CheckinFeedback } from "./checkin-feedback";
import { useT } from "@/components/i18n/locale-provider";
import type { CheckinResult } from "@/lib/checkin";

const READER_ID = "qr-reader";

async function stopScanner(scanner: Html5Qrcode) {
  if (scanner.getState() === Html5QrcodeScannerState.NOT_STARTED) return;
  try {
    await scanner.stop();
  } catch {
    // stop() throws synchronously when the camera never started
  }
}

export function QrScanner() {
  const t = useT();
  const tRef = useRef(t);
  tRef.current = t;
  const busyRef = useRef(false);
  const onScanRef = useRef<(decodedText: string) => Promise<void>>(async () => {});
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraDenied, setCameraDenied] = useState(false);

  useEffect(() => {
    let mounted = true;
    const scanner = new Html5Qrcode(READER_ID, { verbose: false });

    async function onScan(decodedText: string) {
      if (busyRef.current) return;
      busyRef.current = true;
      try {
        const response = await fetch("/api/checkin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qrData: decodedText }),
        });
        const data = (await response.json()) as CheckinResult;
        if (mounted) setResult(data);
      } catch {
        if (mounted) setResult({ success: false, outcome: "INVALID" });
      }
    }

    onScanRef.current = onScan;

    if (process.env.NEXT_PUBLIC_E2E_TEST === "true") {
      (
        window as Window & { __gymSimulateQrScan?: (decodedText: string) => void }
      ).__gymSimulateQrScan = (decodedText: string) => {
        void onScan(decodedText);
      };
    }

    async function startScanner() {
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 12, qrbox: { width: 240, height: 240 } },
          onScan,
          undefined,
        );
        if (!mounted) {
          await stopScanner(scanner);
          return;
        }
        setReady(true);
      } catch (err) {
        if (!mounted) return;
        const name = err instanceof Error ? err.name : "";
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setCameraDenied(true);
          setError(tRef.current("scan.cameraDenied"));
        } else {
          setError(tRef.current("scan.networkError"));
        }
      }
    }

    void startScanner();

    return () => {
      mounted = false;
      if (process.env.NEXT_PUBLIC_E2E_TEST === "true") {
        delete (
          window as Window & { __gymSimulateQrScan?: (decodedText: string) => void }
        ).__gymSimulateQrScan;
      }
      void (async () => {
        await stopScanner(scanner);
        try {
          scanner.clear();
        } catch {
          // DOM may already be gone during fast remounts
        }
      })();
    };
  }, []);

  function handleClose() {
    setResult(null);
    busyRef.current = false;
  }

  return (
    <div className="space-y-4">
      <p
        id="camera-permission-notice"
        className="rounded-[var(--radius-ios-md)] bg-[var(--surface)] px-4 py-3 text-[13px] leading-relaxed text-[var(--secondary-label)]"
        role="note"
      >
        {t("scan.cameraPermission")}
      </p>

      <div
        className="relative overflow-hidden rounded-[var(--radius-ios-lg)] bg-black shadow-[var(--shadow-card)]"
        aria-labelledby="camera-permission-notice"
      >
        <div
          id={READER_ID}
          className="aspect-square w-full [&_video]:size-full [&_video]:object-cover"
        />

        {/* Scan frame overlay */}
        {!cameraDenied ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative size-60">
              <span className="absolute left-0 top-0 size-10 rounded-tl-2xl border-l-[3px] border-t-[3px] border-foreground/80" />
              <span className="absolute right-0 top-0 size-10 rounded-tr-2xl border-r-[3px] border-t-[3px] border-foreground/80" />
              <span className="absolute bottom-0 left-0 size-10 rounded-bl-2xl border-b-[3px] border-l-[3px] border-foreground/80" />
              <span className="absolute bottom-0 right-0 size-10 rounded-br-2xl border-b-[3px] border-r-[3px] border-foreground/80" />
            </div>
          </div>
        ) : null}

        {!ready && !error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 text-foreground">
            <Loader2 className="size-8 animate-spin" aria-hidden />
            <p className="text-[15px]">{t("common.loading")}</p>
          </div>
        ) : null}

        {cameraDenied ? (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/90 px-6 text-center text-foreground"
            role="alert"
          >
            <CameraOff className="size-10" aria-hidden />
            <p className="text-[15px]">{t("scan.cameraDenied")}</p>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-center gap-2 text-[15px] text-[var(--secondary-label)]">
        <ScanLine className="size-4 text-foreground" aria-hidden />
        {error ?? t("scan.placeQr")}
      </div>

      {result ? <CheckinFeedback result={result} onClose={handleClose} /> : null}
    </div>
  );
}
