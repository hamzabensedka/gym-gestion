"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useT } from "@/components/i18n/locale-provider";

export function LogoutConfirmButton({
  onLogout,
  children,
  className,
  onOpenChange,
  ...props
}: {
  onLogout: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
  onOpenChange?: (open: boolean) => void;
} & Omit<React.ComponentProps<"button">, "onClick" | "type">) {
  const t = useT();
  const [open, setOpen] = useState(false);

  function setDialogOpen(next: boolean) {
    setOpen(next);
    onOpenChange?.(next);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        className={className}
        {...props}
      >
        {children}
      </button>

      <ConfirmDialog
        open={open}
        onOpenChange={setDialogOpen}
        tone="critical"
        icon={LogOut}
        title={t("nav.logout")}
        description={t("nav.logoutConfirm")}
        confirmLabel={t("nav.logout")}
        cancelLabel={t("common.cancel")}
        pendingLabel={t("login.signingIn")}
        onConfirm={onLogout}
      />
    </>
  );
}
