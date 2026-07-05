"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";

export type WhatsappQueueItem = {
  memberId: string;
  fullName: string;
  url: string;
};

type BulkWhatsappReminderProps = {
  queue: WhatsappQueueItem[];
  variant?: "compact" | "bar";
};

export function BulkWhatsappReminder({
  queue,
  variant = "compact",
}: BulkWhatsappReminderProps) {
  const t = useT();
  const [openedCount, setOpenedCount] = useState(0);

  if (queue.length === 0) {
    return null;
  }

  const total = queue.length;
  const isDone = openedCount >= total;
  const nextItem = queue[openedCount];

  function openNext() {
    const item = queue[openedCount];
    if (!item) return;
    window.open(item.url, "_blank", "noopener,noreferrer");
    setOpenedCount((count) => count + 1);
  }

  const label =
    openedCount === 0
      ? t("wa.bulkRemind", { total: String(total) })
      : isDone
        ? t("wa.bulkDone")
        : `${t("wa.bulkNext")} (${t("wa.bulkProgress", {
            current: String(openedCount + 1),
            total: String(total),
          })})`;

  return (
    <div
      className={cn(
        variant === "bar" && "mb-4 rounded-lg border border-border bg-muted/60 p-3",
        variant === "compact" && "flex flex-col items-end gap-1",
      )}
    >
      <Button
        type="button"
        variant={variant === "bar" ? "default" : "outline"}
        size="sm"
        disabled={isDone}
        onClick={openNext}
        className={cn(variant === "bar" && "w-full")}
      >
        <MessageCircle className="size-4" />
        {label}
      </Button>
      {openedCount > 0 && !isDone && nextItem ? (
        <p className="text-xs text-muted-foreground">
          {nextItem.fullName}
        </p>
      ) : null}
    </div>
  );
}
