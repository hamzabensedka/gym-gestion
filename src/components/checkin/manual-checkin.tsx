"use client";

import { useEffect, useState } from "react";
import { MemberStatus } from "@prisma/client";
import { Search, Loader2, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CheckinFeedback } from "./checkin-feedback";
import { useI18n } from "@/components/i18n/locale-provider";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CheckinResult } from "@/lib/checkin";

type MemberResult = {
  id: string;
  fullName: string;
  phone: string;
  status: MemberStatus;
  subscriptionEnd: string | Date;
};

export function ManualCheckinPanel() {
  const { t, locale } = useI18n();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemberResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<CheckinResult | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const trimmedQuery = query.trim();
  const canSearch = trimmedQuery.length >= 2;

  useEffect(() => {
    if (!canSearch) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/members/search?q=${encodeURIComponent(trimmedQuery)}`,
        );
        const data = (await response.json()) as MemberResult[];
        if (!cancelled) setResults(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [canSearch, trimmedQuery]);

  async function checkIn(memberId: string) {
    setPendingId(memberId);
    try {
      const response = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });
      const data = (await response.json()) as CheckinResult;
      setFeedback(data);
    } catch {
      setFeedback({ success: false, outcome: "INVALID" });
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("manual.searchMember")}
          autoFocus
          className="py-4 ps-10 text-lg"
        />
      </div>

      {loading ? (
        <p className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {t("common.loading")}
        </p>
      ) : !canSearch ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {t("manual.startTyping")}
        </p>
      ) : results.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {t("manual.noResults")}
        </p>
      ) : (
        <div className="space-y-2.5">
          {results.map((member) => {
            const expired = member.status === MemberStatus.EXPIRED;
            const frozen = member.status === MemberStatus.FROZEN;
            const blocked = expired || frozen;
            return (
              <Card
                key={member.id}
                className={cn(
                  "flex-row items-center gap-3 p-3",
                  blocked ? "border-border opacity-60" : "",
                )}
              >
                <Avatar className="size-11 rounded-xl">
                  <AvatarFallback
                    className={cn(
                      "rounded-xl text-base",
                        blocked
                          ? "bg-muted text-muted-foreground"
                          : "bg-brand/15 text-brand",
                    )}
                  >
                    {member.fullName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{member.fullName}</p>
                  <p className="tnum text-sm text-muted-foreground">{member.phone}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(member.subscriptionEnd, locale)}
                  </p>
                </div>
                {frozen ? (
                  <Badge tone="warning">{t("common.frozen")}</Badge>
                ) : expired ? (
                  <Badge tone="danger">{t("common.expired")}</Badge>
                ) : (
                  <Button
                    disabled={pendingId === member.id}
                    onClick={() => checkIn(member.id)}
                  >
                    {pendingId === member.id ? (
                      <Loader2 className="size-5 animate-spin" />
                    ) : (
                      <UserCheck className="size-5" />
                    )}
                    {t("manual.checkin")}
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {feedback ? (
        <CheckinFeedback result={feedback} onClose={() => setFeedback(null)} />
      ) : null}
    </div>
  );
}
