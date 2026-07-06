"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { ScanLine, Loader2, CameraOff } from "lucide-react";
import { CheckinFeedback } from "./checkin-feedback";
import { useT } from "@/components/i18n/locale-provider";
import type { CheckinResult } from "@/lib/checkin";

const READER_ID = "qr-reader";

type CameraConfig = string | MediaTrackConstraints;

async function stopScanner(scanner: Html5Qrcode) {
  if (scanner.getState() === Html5QrcodeScannerState.NOT_STARTED) return;
  try {
    await scanner.stop();
  } catch {
    // stop() throws synchronously when the camera never started
  }
}

function isBackCamera(label: string) {
  return /back|rear|environment|arrière|trasera|wide/i.test(label);
}

async function buildCameraAttempts(): Promise<CameraConfig[]> {
  const attempts: CameraConfig[] = [];

  try {
    const cameras = await Html5Qrcode.getCameras();
    const back = cameras.find((camera) => isBackCamera(camera.label));
    if (back) attempts.push(back.id);

    for (const camera of cameras) {
      if (!attempts.includes(camera.id)) attempts.push(camera.id);
    }
  } catch {
    // enumerateDevices can fail before permission is granted
  }

  attempts.push({ facingMode: "environment" }, { facingMode: "user" });
  return attempts;
}

function classifyCameraError(err: unknown) {
  const name = err instanceof Error ? err.name : "";
  const message = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();

  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "denied" as const;
  }
  if (
    name === "NotFoundError" ||
    name === "OverconstrainedError" ||
    name === "NotReadableError" ||
    message.includes("no camera") ||
    message.includes("device not found")
  ) {
    return "unavailable" as const;
  }
  return "unknown" as const;
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
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    let scanner: Html5Qrcode | null = null;

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
      setReady(false);
      setError(null);
      setCameraDenied(false);

      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const readerEl = document.getElementById(READER_ID);
      if (!mounted || !readerEl) return;

      readerEl.innerHTML = "";
      scanner = new Html5Qrcode(READER_ID, { verbose: false });
      const attempts = await buildCameraAttempts();
      let lastError: unknown = null;

      for (const cameraConfig of attempts) {
        if (!mounted || !scanner) return;
        try {
          await scanner.start(
            cameraConfig,
            { fps: 12, qrbox: { width: 240, height: 240 } },
            onScan,
            undefined,
          );
          if (!mounted) {
            await stopScanner(scanner);
            return;
          }
          setReady(true);
          return;
        } catch (err) {
          lastError = err;
          await stopScanner(scanner);
          try {
            scanner.clear();
          } catch {
            // clear() can fail if the library never mounted video
          }
        }
      }

      if (!mounted) return;
      const kind = classifyCameraError(lastError);
      if (kind === "denied") {
        setCameraDenied(true);
        setError(tRef.current("scan.cameraDenied"));
      } else if (kind === "unavailable") {
        setError(tRef.current("scan.cameraUnavailable"));
      } else {
        setError(tRef.current("scan.networkError"));
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
      const activeScanner = scanner;
      void (async () => {
        if (!activeScanner) return;
        await stopScanner(activeScanner);
        try {
          activeScanner.clear();
        } catch {
          // DOM may already be gone during fast remounts
        }
      })();
    };
  }, [retryCount]);

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
          className="aspect-square min-h-64 w-full [&_video]:block [&_video]:h-full [&_video]:w-full [&_video]:object-cover"
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

      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center justify-center gap-2 text-[15px] text-[var(--secondary-label)]">
          <ScanLine className="size-4 text-foreground" aria-hidden />
          {error ?? t("scan.placeQr")}
        </div>
        {error ? (
          <button
            type="button"
            onClick={() => setRetryCount((count) => count + 1)}
            className="rounded-ios-sm bg-[var(--surface)] px-4 py-2 text-[15px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--color-fill)]"
          >
            {t("scan.retryCamera")}
          </button>
        ) : null}
      </div>

      {result ? <CheckinFeedback result={result} onClose={handleClose} /> : null}
    </div>
  );
}
