"use client";

import { useTransition } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  LogOut,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ConfirmDialogTone = "brand" | "critical" | "neutral" | "success";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  /** Single-button mode — hides cancel */
  alertOnly?: boolean;
  /** @deprecated Use `tone` instead */
  variant?: "default" | "danger";
  tone?: ConfirmDialogTone;
  icon?: LucideIcon;
  pendingLabel?: string;
};

const toneConfig: Record<
  ConfirmDialogTone,
  {
    border: string;
    glow: string;
    iconWrap: string;
    defaultIcon: LucideIcon;
    confirmVariant: "default" | "danger" | "outline";
  }
> = {
  brand: {
    border: "border-l-brand",
    glow: "from-brand/10",
    iconWrap: "bg-brand/15 text-brand",
    defaultIcon: RefreshCw,
    confirmVariant: "default",
  },
  success: {
    border: "border-l-brand",
    glow: "from-brand/10",
    iconWrap: "bg-brand/15 text-brand",
    defaultIcon: CheckCircle2,
    confirmVariant: "default",
  },
  critical: {
    border: "border-l-critical",
    glow: "from-critical/10",
    iconWrap: "bg-critical-muted text-critical",
    defaultIcon: AlertTriangle,
    confirmVariant: "danger",
  },
  neutral: {
    border: "border-l-foreground/25",
    glow: "from-foreground/5",
    iconWrap: "bg-muted text-foreground",
    defaultIcon: LogOut,
    confirmVariant: "outline",
  },
};

function resolveTone(
  tone: ConfirmDialogTone | undefined,
  variant: ConfirmDialogProps["variant"],
): ConfirmDialogTone {
  if (tone) return tone;
  if (variant === "danger") return "critical";
  return "brand";
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "",
  onConfirm,
  alertOnly = false,
  variant = "default",
  tone,
  icon,
  pendingLabel,
}: ConfirmDialogProps) {
  const [pending, startTransition] = useTransition();
  const resolvedTone = resolveTone(tone, variant);
  const config = toneConfig[resolvedTone];
  const Icon = icon ?? config.defaultIcon;

  function handleConfirm() {
    startTransition(async () => {
      await onConfirm();
      onOpenChange(false);
    });
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="confirm-dialog-overlay ios-blur fixed inset-0 z-60 bg-black/70" />
        <DialogPrimitive.Content className="confirm-dialog-content fixed inset-0 z-60 flex items-end justify-center p-4 outline-none sm:items-center">
          <div
            className={cn(
              "relative w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]",
              "border-l-4",
              config.border,
            )}
          >
            <div
              className={cn(
                "pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b to-transparent",
                config.glow,
              )}
              aria-hidden
            />

            <div className="relative p-5">
              <div className="mb-1 flex justify-center sm:hidden">
                <span className="h-1 w-9 rounded-full bg-muted" aria-hidden />
              </div>

              <div className="flex items-start gap-3.5 pt-1">
                <span
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-xl",
                    config.iconWrap,
                  )}
                >
                  <Icon className="size-5" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <DialogPrimitive.Title className="text-base font-semibold leading-snug text-foreground">
                    {title}
                  </DialogPrimitive.Title>
                  {description ? (
                    <DialogPrimitive.Description className="mt-1.5 text-pretty text-sm leading-relaxed text-muted-foreground">
                      {description}
                    </DialogPrimitive.Description>
                  ) : null}
                </div>
              </div>

              <div
                className={cn(
                  "mt-5 flex flex-col gap-2",
                  !alertOnly && "sm:flex-row-reverse",
                )}
              >
                <Button
                  type="button"
                  variant={config.confirmVariant}
                  className="h-11 flex-1"
                  disabled={pending}
                  static={pending}
                  onClick={handleConfirm}
                >
                  {pending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      {pendingLabel ?? confirmLabel}
                    </>
                  ) : (
                    confirmLabel
                  )}
                </Button>
                {!alertOnly && cancelLabel ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 flex-1"
                    disabled={pending}
                    onClick={() => onOpenChange(false)}
                  >
                    {cancelLabel}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

type NoticeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  tone?: "success" | "critical" | "neutral";
  confirmLabel: string;
};

export function NoticeDialog({
  open,
  onOpenChange,
  title,
  description = "",
  tone = "success",
  confirmLabel,
}: NoticeDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      alertOnly
      tone={tone}
      onConfirm={() => {}}
    />
  );
}
