"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { CameraOff, Keyboard, Loader2, LogOut, ScanLine } from "lucide-react";
import { CheckinFeedback } from "@/components/checkin/checkin-feedback";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { useT } from "@/components/i18n/locale-provider";
import type { CheckinResult } from "@/lib/checkin";
import { verifyKioskExitAction } from "@/app/actions/kiosk";
import { KIOSK_IDLE_MS, KIOSK_RESULT_MS } from "@gym/shared/checkin";

const READER_ID = "kiosk-qr-reader";

type CameraConfig = string | MediaTrackConstraints;
type Mode = "camera" | "code";

async function stopScanner(scanner: Html5Qrcode) {
  if (scanner.getState() === Html5QrcodeScannerState.NOT_STARTED) return;
  try {
    await scanner.stop();
  } catch {
    // stop() throws when the camera never started
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

export function KioskPanel({ gymName }: { gymName: string }) {
  const t = useT();
  const tRef = useRef(t);
  tRef.current = t;
  const router = useRouter();
  const busyRef = useRef(false);
  const onScanRef = useRef<(decodedText: string) => Promise<void>>(async () => {});

  const [mode, setMode] = useState<Mode>("camera");
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [exitPassword, setExitPassword] = useState("");
  const [exitError, setExitError] = useState<string | null>(null);
  const [exitPending, setExitPending] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraDenied, setCameraDenied] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const postCheckin = useCallback(async (body: { qrData?: string; code?: string }) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setPending(true);
    try {
      const response = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as CheckinResult;
      setResult(data);
    } catch {
      setResult({ success: false, outcome: "INVALID" });
    } finally {
      setPending(false);
    }
  }, []);

  useEffect(() => {
    onScanRef.current = (decodedText: string) => postCheckin({ qrData: decodedText });
  }, [postCheckin]);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_E2E_TEST === "true") {
      (
        window as Window & { __gymSimulateKioskQrScan?: (decodedText: string) => void }
      ).__gymSimulateKioskQrScan = (decodedText: string) => {
        void onScanRef.current(decodedText);
      };
    }
    return () => {
      if (process.env.NEXT_PUBLIC_E2E_TEST === "true") {
        delete (
          window as Window & { __gymSimulateKioskQrScan?: (decodedText: string) => void }
        ).__gymSimulateKioskQrScan;
      }
    };
  }, []);

  useEffect(() => {
    if (mode !== "camera" || result) return;
    let mounted = true;
    let scanner: Html5Qrcode | null = null;

    async function onScan(decodedText: string) {
      if (busyRef.current) return;
      await onScanRef.current(decodedText);
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
            { fps: 12, qrbox: { width: 280, height: 280 } },
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
  }, [mode, result, retryCount]);

  useEffect(() => {
    if (mode !== "code" || result) return;
    const timer = setTimeout(() => {
      setCode("");
      setMode("camera");
    }, KIOSK_IDLE_MS);
    return () => clearTimeout(timer);
  }, [mode, result, code]);

  function handleFeedbackClose() {
    setResult(null);
    setCode("");
    busyRef.current = false;
  }

  async function submitCode(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = code.trim();
    if (!trimmed || pending) return;
    await postCheckin({ code: trimmed });
  }

  function openExit() {
    setExitPassword("");
    setExitError(null);
    setExitOpen(true);
  }

  function closeExit() {
    if (exitPending) return;
    setExitOpen(false);
    setExitPassword("");
    setExitError(null);
  }

  async function confirmExit() {
    if (exitPending) return;
    setExitError(null);
    setExitPending(true);
    try {
      const result = await verifyKioskExitAction(exitPassword);
      if (!("ok" in result) || !result.ok) {
        setExitError(t("kiosk.exitPasswordWrong"));
        return;
      }
      setExitOpen(false);
      setExitPassword("");
      router.push("/scan");
    } finally {
      setExitPending(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col bg-background px-6 py-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="text-pretty text-sm font-medium text-muted-foreground">{gymName}</p>
          <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground">
            {t("kiosk.title")}
          </h1>
          <p className="mt-1 text-pretty text-base text-muted-foreground">{t("kiosk.subtitle")}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 active:scale-[0.96]"
          onClick={openExit}
        >
          <LogOut className="size-4" strokeWidth={1.75} />
          {t("kiosk.exit")}
        </Button>
      </header>

      <div className="mx-auto mt-10 flex w-full max-w-xl flex-1 flex-col">
        {mode === "camera" ? (
          <div className="relative overflow-hidden rounded-3xl bg-black shadow-[var(--shadow-card)]">
            <div
              id={READER_ID}
              className="aspect-square min-h-72 w-full [&_video]:block [&_video]:h-full [&_video]:w-full [&_video]:object-cover"
            />
            {!cameraDenied ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative size-64">
                  <span className="absolute left-0 top-0 size-12 rounded-tl-2xl border-l-[3px] border-t-[3px] border-white/80" />
                  <span className="absolute right-0 top-0 size-12 rounded-tr-2xl border-r-[3px] border-t-[3px] border-white/80" />
                  <span className="absolute bottom-0 left-0 size-12 rounded-bl-2xl border-b-[3px] border-l-[3px] border-white/80" />
                  <span className="absolute bottom-0 right-0 size-12 rounded-br-2xl border-b-[3px] border-r-[3px] border-white/80" />
                </div>
              </div>
            ) : null}
            {!ready && !error ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 text-white">
                <Loader2 className="size-8 animate-spin" aria-hidden />
                <p className="text-[15px]">{t("common.loading")}</p>
              </div>
            ) : null}
            {cameraDenied ? (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/90 px-6 text-center text-white"
                role="alert"
              >
                <CameraOff className="size-10" aria-hidden />
                <p className="text-pretty text-[15px]">{t("scan.cameraDenied")}</p>
              </div>
            ) : null}
          </div>
        ) : (
          <form onSubmit={submitCode} className="flex flex-col gap-4">
            <label className="text-sm font-medium text-muted-foreground" htmlFor="kiosk-code">
              {t("kiosk.codePlaceholder")}
            </label>
            <Input
              id="kiosk-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder={t("kiosk.codePlaceholder")}
              autoComplete="off"
              autoFocus
              className="h-16 rounded-2xl text-center text-2xl tabular-nums"
            />
            <Button
              type="submit"
              disabled={!code.trim() || pending}
              className="h-14 rounded-2xl text-lg active:scale-[0.96]"
            >
              {pending ? t("common.loading") : t("kiosk.submitCode")}
            </Button>
          </form>
        )}

        <div className="mt-6 flex flex-col items-center gap-3">
          <p className="flex items-center gap-2 text-[15px] text-muted-foreground">
            {mode === "camera" ? (
              <ScanLine className="size-4" aria-hidden />
            ) : (
              <Keyboard className="size-4" aria-hidden />
            )}
            {mode === "camera" ? (error ?? t("kiosk.hint")) : t("kiosk.codePlaceholder")}
          </p>
          {mode === "camera" && error ? (
            <Button type="button" variant="secondary" onClick={() => setRetryCount((count) => count + 1)}>
              {t("scan.retryCamera")}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            className="min-h-11 text-base"
            onClick={() => {
              setCode("");
              setMode((current) => (current === "camera" ? "code" : "camera"));
            }}
          >
            {mode === "camera" ? t("kiosk.enterCode") : t("kiosk.useCamera")}
          </Button>
        </div>
      </div>

      {result ? (
        <CheckinFeedback
          result={result}
          onClose={handleFeedbackClose}
          autoCloseMs={KIOSK_RESULT_MS}
        />
      ) : null}

      {exitOpen ? (
        <div className="fixed inset-0 z-60 flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <form
            className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]"
            onSubmit={(event) => {
              event.preventDefault();
              void confirmExit();
            }}
          >
            <div>
              <p className="text-base font-semibold text-foreground">{t("kiosk.exitConfirm")}</p>
              <p className="mt-1.5 text-pretty text-sm text-muted-foreground">
                {t("kiosk.exitConfirmBody")}
              </p>
            </div>
            <Field label={t("kiosk.exitPassword")}>
              <Input
                type="password"
                value={exitPassword}
                onChange={(event) => setExitPassword(event.target.value)}
                autoComplete="current-password"
                autoFocus
              />
            </Field>
            {exitError ? (
              <p className="rounded-lg border border-border bg-muted px-3 py-2 text-sm font-medium text-foreground">
                {exitError}
              </p>
            ) : null}
            <div className="flex flex-col gap-2 sm:flex-row-reverse">
              <Button type="submit" disabled={exitPending || !exitPassword.trim()} className="flex-1">
                {exitPending ? t("common.loading") : t("kiosk.exit")}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={exitPending}
                className="flex-1"
                onClick={closeExit}
              >
                {t("common.cancel")}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
