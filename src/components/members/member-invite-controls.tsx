"use client";

import { useState, useTransition } from "react";
import { MemberInviteStatus } from "@prisma/client";
import { Mail, ShieldOff } from "lucide-react";
import {
  resendMemberInviteAction,
  disableMemberAccessAction,
} from "@/app/actions/member-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n/locale-provider";
import type { TranslationKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function ResendInviteButton({
  memberId,
  className,
  disabled,
  iconOnly = false,
}: {
  memberId: string;
  className?: string;
  disabled?: boolean;
  iconOnly?: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const label = t("members.resendInvite");

  function handleResend() {
    startTransition(async () => {
      setMessage(null);
      const result = await resendMemberInviteAction(memberId);
      if (result && "error" in result && result.error) {
        setMessage(result.error);
      } else {
        setMessage("members.inviteSent");
        router.refresh();
      }
    });
  }

  return (
    <div className={cn(iconOnly && "flex-1", className)}>
      <Button
        type="button"
        variant="secondary"
        className="h-11 w-full"
        disabled={pending || disabled}
        aria-label={label}
        title={label}
        onClick={handleResend}
      >
        <Mail className="size-4 shrink-0" />
        {iconOnly ? null : label}
      </Button>
      {message ? (
        <p className="mt-1 text-center text-xs text-muted-foreground">
          {t(message as TranslationKey)}
        </p>
      ) : null}
    </div>
  );
}

export function MemberInviteControls({
  memberId,
  email,
  inviteStatus,
  inviteExpiresAt,
  hideResendButton = false,
}: {
  memberId: string;
  email: string | null;
  inviteStatus: MemberInviteStatus | null;
  inviteExpiresAt: Date | null;
  hideResendButton?: boolean;
}) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [disableOpen, setDisableOpen] = useState(false);

  const inviteExpired =
    inviteStatus === MemberInviteStatus.PENDING &&
    inviteExpiresAt &&
    inviteExpiresAt < new Date();

  function inviteBadgeTone() {
    if (inviteStatus === MemberInviteStatus.ACTIVE) return "success" as const;
    if (inviteStatus === MemberInviteStatus.DISABLED) return "danger" as const;
    if (inviteExpired) return "warning" as const;
    if (inviteStatus === MemberInviteStatus.PENDING) return "warning" as const;
    return "neutral" as const;
  }

  function inviteLabel(): TranslationKey {
    if (inviteStatus === MemberInviteStatus.ACTIVE) return "members.inviteStatus.active";
    if (inviteStatus === MemberInviteStatus.DISABLED) return "members.inviteStatus.disabled";
    if (inviteExpired) return "members.inviteStatus.expired";
    if (inviteStatus === MemberInviteStatus.PENDING) return "members.inviteStatus.pending";
    return "members.inviteStatus.none";
  }

  function handleResend() {
    startTransition(async () => {
      setMessage(null);
      const result = await resendMemberInviteAction(memberId);
      if (result && "error" in result && result.error) {
        setMessage(result.error);
      } else {
        setMessage("members.inviteSent");
      }
    });
  }

  function handleDisable() {
    startTransition(async () => {
      await disableMemberAccessAction(memberId);
      setDisableOpen(false);
    });
  }

  if (!email) return null;

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{t("members.appAccess")}</p>
          <p className="text-xs text-muted-foreground">{email}</p>
        </div>
        <Badge tone={inviteBadgeTone()} dot>
          {t(inviteLabel())}
        </Badge>
      </div>

      <p className="text-xs text-muted-foreground">{t("members.appAccessHint")}</p>

      {inviteStatus !== MemberInviteStatus.ACTIVE && !hideResendButton ? (
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          disabled={pending}
          onClick={handleResend}
        >
          <Mail className="size-4" />
          {t("members.resendInvite")}
        </Button>
      ) : null}

      {inviteStatus === MemberInviteStatus.ACTIVE ? (
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          disabled={pending}
          onClick={() => setDisableOpen(true)}
        >
          <ShieldOff className="size-4" />
          {t("members.disableAccess")}
        </Button>
      ) : null}

      {message ? (
        <p className="text-center text-xs text-muted-foreground">
          {t(message as TranslationKey)}
        </p>
      ) : null}

      <ConfirmDialog
        open={disableOpen}
        onOpenChange={setDisableOpen}
        title={t("members.disableAccess")}
        description={t("members.disableConfirm")}
        confirmLabel={t("members.disableAccess")}
        cancelLabel={t("common.cancel")}
        tone="critical"
        onConfirm={handleDisable}
      />
    </div>
  );
}
