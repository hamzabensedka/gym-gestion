"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import {
  createClassAction,
  deleteClassAction,
  updateClassAction,
} from "@/app/actions/classes";
import { useT } from "@/components/i18n/locale-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, Input } from "@/components/ui/input";
import { translateClassError, type ClassRowView } from "./types";

export function ClassCatalog({
  classes,
  onFirstCreated,
}: {
  classes: ClassRowView[];
  onFirstCreated?: () => void;
}) {
  const t = useT();
  const router = useRouter();
  const createRef = useRef<HTMLFormElement>(null);
  const [creating, setCreating] = useState(classes.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState<ClassRowView | null>(null);

  function handleCreate(formData: FormData) {
    setError(null);
    const wasEmpty = classes.length === 0;
    startTransition(async () => {
      const result = await createClassAction(formData);
      if (result && "error" in result && result.error) {
        setError(translateClassError(t, result.error));
        return;
      }
      createRef.current?.reset();
      setCreating(false);
      if (wasEmpty) onFirstCreated?.();
      router.refresh();
    });
  }

  function handleToggle(klass: ClassRowView) {
    setError(null);
    const formData = new FormData();
    formData.set("classId", klass.id);
    formData.set("active", klass.active ? "false" : "true");
    startTransition(async () => {
      const result = await updateClassAction(formData);
      if (result && "error" in result && result.error) {
        setError(translateClassError(t, result.error));
        return;
      }
      router.refresh();
    });
  }

  function handleUpdate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updateClassAction(formData);
      if (result && "error" in result && result.error) {
        setError(translateClassError(t, result.error));
        return;
      }
      router.refresh();
    });
  }

  function handleDelete() {
    if (!deleting) return;
    startTransition(async () => {
      const result = await deleteClassAction(deleting.id);
      if (result && "error" in result && result.error) {
        setError(translateClassError(t, result.error));
        setDeleting(null);
        return;
      }
      setDeleting(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-lg border border-border bg-muted px-3 py-2 text-sm font-medium text-foreground">
          {error}
        </p>
      ) : null}

      {classes.length === 0 && !creating ? (
        <p className="text-pretty text-sm text-muted-foreground">{t("classes.empty")}</p>
      ) : null}

      <div className="space-y-2.5">
        {classes.map((klass) => (
          <Card key={klass.id} className="flex-row items-start gap-3 p-3 sm:items-center">
            <form action={handleUpdate} className="min-w-0 flex-1 space-y-3">
              <input type="hidden" name="classId" value={klass.id} />
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{klass.name}</p>
                <Badge tone={klass.active ? "success" : "neutral"}>
                  {klass.active ? t("classes.active") : t("classes.inactive")}
                </Badge>
              </div>
              <div className="grid grid-cols-[1fr_6.5rem] items-end gap-2">
                <Field label={t("classes.name")}>
                  <Input name="name" defaultValue={klass.name} required />
                </Field>
                <Field label={t("classes.capacity")}>
                  <Input
                    name="defaultCapacity"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="200"
                    step="1"
                    defaultValue={klass.defaultCapacity}
                    required
                    className="tabular-nums"
                  />
                </Field>
              </div>
              <Button type="submit" size="sm" disabled={pending}>
                {t("common.save")}
              </Button>
            </form>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <button
                type="button"
                disabled={pending}
                onClick={() => handleToggle(klass)}
                className="min-h-10 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                {klass.active ? t("classes.deactivate") : t("classes.activate")}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => setDeleting(klass)}
                title={t("common.confirmDelete")}
                className="flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </Card>
        ))}
      </div>

      {creating ? (
        <Card className="space-y-4 p-4">
          <p className="text-sm font-semibold">{t("classes.createClass")}</p>
          <p className="text-pretty text-sm text-muted-foreground">{t("classes.empty")}</p>
          <form ref={createRef} action={handleCreate} className="space-y-4">
            <Field label={t("classes.name")}>
              <Input name="name" required maxLength={80} placeholder="Pilates" />
            </Field>
            <Field label={t("classes.capacity")}>
              <Input
                name="defaultCapacity"
                type="number"
                inputMode="numeric"
                min="1"
                max="200"
                step="1"
                defaultValue={12}
                required
                className="tabular-nums"
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={pending}>
                <Plus className="size-5" />
                {t("classes.createClass")}
              </Button>
              {classes.length > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => setCreating(false)}
                >
                  {t("common.cancel")}
                </Button>
              ) : null}
            </div>
          </form>
        </Card>
      ) : (
        <Button type="button" className="w-full min-h-12" onClick={() => setCreating(true)}>
          <Plus className="size-5" />
          {t("classes.createClass")}
        </Button>
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title={t("common.confirmDelete")}
        description={deleting?.name ?? ""}
        confirmLabel={t("common.confirmDelete")}
        cancelLabel={t("common.cancel")}
        tone="critical"
        onConfirm={handleDelete}
      />
    </div>
  );
}
