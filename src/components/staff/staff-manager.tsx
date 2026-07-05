"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Role } from "@prisma/client";
import { UserPlus, Trash2, Shield, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Select, Field } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useT } from "@/components/i18n/locale-provider";
import { createStaffAction, deleteStaffAction } from "@/app/actions/staff";
import { cn } from "@/lib/utils";
import type { TranslationKey } from "@/lib/i18n";

type StaffUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export function StaffManager({
  users,
  currentUserId,
}: {
  users: StaffUser[];
  currentUserId: string;
}) {
  const t = useT();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [deletingUser, setDeletingUser] = useState<StaffUser | null>(null);

  function handleCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createStaffAction(formData);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
      router.refresh();
    });
  }

  function handleDelete() {
    if (!deletingUser) return;
    startTransition(async () => {
      await deleteStaffAction(deletingUser.id);
      router.refresh();
      setDeletingUser(null);
    });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2.5">
        {users.map((user) => {
          const isAdmin = user.role === Role.ADMIN;
          const isSelf = user.id === currentUserId;
          return (
            <Card key={user.id} className="flex-row items-center gap-3 p-4">
              <span
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-xl",
                  isAdmin ? "bg-accent text-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                {isAdmin ? (
                  <Shield className="size-5" strokeWidth={1.75} />
                ) : (
                  <User className="size-5" strokeWidth={1.75} />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold">{user.name}</p>
                  {isSelf ? <Badge tone="brand">{t("staff.you")}</Badge> : null}
                </div>
                <p className="truncate text-sm text-muted-foreground">{user.email}</p>
              </div>
              <Badge tone={isAdmin ? "success" : "neutral"}>
                {isAdmin ? t("staff.roleAdmin") : t("staff.roleStaff")}
              </Badge>
              {!isSelf ? (
                <button
                  type="button"
                  disabled={pending && deletingUser?.id === user.id}
                  onClick={() => setDeletingUser(user)}
                  title={t("staff.remove")}
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                >
                  <Trash2 className="size-4" />
                </button>
              ) : null}
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserPlus className="size-5 text-foreground" strokeWidth={1.75} />
            <CardTitle>{t("staff.add")}</CardTitle>
          </div>
        </CardHeader>
        <form ref={formRef} action={handleCreate} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("common.name")}>
              <Input name="name" required />
            </Field>
            <Field label={t("login.email")}>
              <Input name="email" type="email" required />
            </Field>
            <Field label={t("login.password")}>
              <Input name="password" type="password" required minLength={6} />
            </Field>
            <Field label={t("staff.role")}>
              <Select name="role" defaultValue={Role.STAFF}>
                <option value={Role.STAFF}>{t("staff.roleStaff")}</option>
                <option value={Role.ADMIN}>{t("staff.roleAdmin")}</option>
              </Select>
            </Field>
          </div>
          {error ? (
            <p className="rounded-lg border border-border bg-muted px-3 py-2 text-sm font-medium text-foreground">
              {t(error as TranslationKey)}
            </p>
          ) : null}
          <Button type="submit" disabled={pending} className="w-full sm:w-auto">
            <UserPlus className="size-5" />
            {t("staff.create")}
          </Button>
        </form>
      </Card>

      <ConfirmDialog
        open={deletingUser !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingUser(null);
        }}
        title={t("common.confirmDelete")}
        description={
          deletingUser
            ? t("staff.confirmDeleteBody", { name: deletingUser.name })
            : ""
        }
        confirmLabel={t("staff.remove")}
        cancelLabel={t("common.cancel")}
        tone="critical"
        onConfirm={handleDelete}
      />
    </div>
  );
}
