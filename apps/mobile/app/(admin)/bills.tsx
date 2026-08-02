import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UtilityType } from "@prisma/client";
import { addMonths, format, parse, subMonths } from "date-fns";
import { ar, fr } from "date-fns/locale";
import { formatCurrency, formatDate } from "@gym/shared/format";
import type { TranslationKey } from "@gym/shared/i18n";
import { useI18n } from "@/lib/i18n-context";
import { ApiClientError, apiFetch } from "@/lib/api";
import {
  Badge,
  Button,
  Card,
  CardTitle,
  Input,
  PageHeader,
} from "@/components/ui";
import { ConfirmDialog, NoticeDialog } from "@/components/confirm-dialog";
import { FeatherIcon } from "@/components/icons";
import { colors, spacing } from "@/lib/theme";

type BillRow = {
  id: string;
  type: UtilityType;
  amount: number;
  periodMonth: string;
  dueDate: string | null;
  paidAt: string | null;
  note: string | null;
};

type BillsData = {
  month: string;
  bills: BillRow[];
  total: number;
  byType: Record<UtilityType, number>;
};

const UTILITY_TYPES = [UtilityType.WATER, UtilityType.ELECTRICITY, UtilityType.GAS] as const;

const TYPE_LABEL: Record<UtilityType, TranslationKey> = {
  [UtilityType.WATER]: "bills.type.WATER",
  [UtilityType.ELECTRICITY]: "bills.type.ELECTRICITY",
  [UtilityType.GAS]: "bills.type.GAS",
};

function currentMonthKey(): string {
  return format(new Date(), "yyyy-MM");
}

function shiftMonthKey(key: string, delta: number): string {
  const base = parse(`${key}-01`, "yyyy-MM-dd", new Date());
  const shifted = delta < 0 ? subMonths(base, -delta) : addMonths(base, delta);
  return format(shifted, "yyyy-MM");
}

function formatMonthLabel(key: string, locale: "fr" | "ar"): string {
  const date = parse(`${key}-01`, "yyyy-MM-dd", new Date());
  return format(date, "MMMM yyyy", { locale: locale === "ar" ? ar : fr });
}

function isAccessError(error: unknown): error is ApiClientError {
  return (
    error instanceof ApiClientError &&
    (error.code === "FEATURE_LOCKED" || error.code === "FORBIDDEN")
  );
}

export default function BillsScreen() {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const [monthKey, setMonthKey] = useState(currentMonthKey);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<UtilityType>(UtilityType.WATER);
  const [amount, setAmount] = useState("");
  const [periodMonth, setPeriodMonth] = useState(monthKey);
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");
  const [deletingBill, setDeletingBill] = useState<BillRow | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const billsQuery = useQuery({
    queryKey: ["bills", monthKey],
    queryFn: () => apiFetch<BillsData>(`/bills?month=${monthKey}`),
    retry: (count, error) => !isAccessError(error) && count < 2,
  });

  const create = useMutation({
    mutationFn: () =>
      apiFetch("/bills", {
        method: "POST",
        body: JSON.stringify({
          type,
          amount: Number(amount),
          periodMonth,
          dueDate: dueDate || undefined,
          note: note.trim() || undefined,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bills"] });
      setShowForm(false);
      setAmount("");
      setDueDate("");
      setNote("");
      setPeriodMonth(monthKey);
    },
    onError: (e: Error) => setErrorNotice(e.message),
  });

  const markPaid = useMutation({
    mutationFn: (id: string) => apiFetch(`/bills/${id}/pay`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bills"] }),
    onError: (e: Error) => setErrorNotice(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiFetch(`/bills/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bills"] });
      setDeletingBill(null);
    },
    onError: (e: Error) => {
      setDeletingBill(null);
      setErrorNotice(e.message);
    },
  });

  if (billsQuery.isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.brand} />
          <Text style={styles.muted}>{t("common.loading")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (billsQuery.isError && isAccessError(billsQuery.error)) {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <PageHeader title={t("bills.title")} subtitle={t("bills.subtitle")} />
          <Card>
            <View style={styles.lockedIcon}>
              <FeatherIcon name="lock" color={colors.mutedForeground} size={28} />
            </View>
            <Text style={styles.lockedText}>{billsQuery.error.message}</Text>
          </Card>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (billsQuery.isError) {
    const message =
      billsQuery.error instanceof Error ? billsQuery.error.message : t("common.error");
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <PageHeader title={t("bills.title")} subtitle={t("bills.subtitle")} />
          <Card>
            <Text style={styles.lockedText}>{message}</Text>
          </Card>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const data = billsQuery.data!;
  const bills = data.bills;
  const total = data.total;
  const byType = data.byType;

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <PageHeader title={t("bills.title")} subtitle={t("bills.subtitle")} />

        <Card>
          <Text style={styles.fieldLabel}>{t("bills.month")}</Text>
          <View style={styles.monthRow}>
            <Button
              label=""
              variant="secondary"
              iconOnly
              icon={<FeatherIcon name="chevron-left" color={colors.foreground} size={20} />}
              onPress={() => setMonthKey((m) => shiftMonthKey(m, -1))}
            />
            <Text style={styles.monthLabel}>{formatMonthLabel(monthKey, locale)}</Text>
            <Button
              label=""
              variant="secondary"
              iconOnly
              icon={<FeatherIcon name="chevron-right" color={colors.foreground} size={20} />}
              onPress={() => setMonthKey((m) => shiftMonthKey(m, 1))}
            />
          </View>

          <Text style={styles.fieldLabel}>{t("bills.total")}</Text>
          <Text style={styles.totalValue}>{formatCurrency(total)}</Text>

          <View style={styles.byTypeRow}>
            {UTILITY_TYPES.map((utilityType) => (
              <View key={utilityType} style={styles.byTypeCell}>
                <Text style={styles.byTypeLabel}>{t(TYPE_LABEL[utilityType])}</Text>
                <Text style={styles.byTypeValue}>{formatCurrency(byType[utilityType] ?? 0)}</Text>
              </View>
            ))}
          </View>
        </Card>

        <Button
          label={showForm ? t("common.cancel") : t("bills.add")}
          variant="secondary"
          onPress={() => {
            if (!showForm) setPeriodMonth(monthKey);
            setShowForm(!showForm);
          }}
        />

        {showForm ? (
          <Card>
            <CardTitle>{t("bills.add")}</CardTitle>
            <Text style={styles.fieldLabel}>{t("bills.type")}</Text>
            <View style={styles.typeRow}>
              {UTILITY_TYPES.map((utilityType) => (
                <Button
                  key={utilityType}
                  label={t(TYPE_LABEL[utilityType])}
                  variant={type === utilityType ? "primary" : "secondary"}
                  size="sm"
                  onPress={() => setType(utilityType)}
                  style={styles.typeBtn}
                />
              ))}
            </View>
            <Input
              label={`${t("bills.amount")} (TND)`}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
            <Input
              label={t("bills.period")}
              value={periodMonth}
              onChangeText={setPeriodMonth}
              placeholder="yyyy-MM"
              autoCapitalize="none"
            />
            <Input
              label={t("bills.dueDate")}
              value={dueDate}
              onChangeText={setDueDate}
              placeholder="yyyy-MM-dd"
              autoCapitalize="none"
            />
            <Input label={t("bills.note")} value={note} onChangeText={setNote} />
            <Button
              label={t("bills.create")}
              onPress={() => create.mutate()}
              loading={create.isPending}
            />
          </Card>
        ) : null}

        {bills.length === 0 ? (
          <Card compact>
            <Text style={styles.empty}>{t("bills.noBills")}</Text>
          </Card>
        ) : (
          bills.map((bill) => {
            const paid = bill.paidAt != null;
            return (
              <Card key={bill.id} compact style={styles.billCard}>
                <View style={styles.billHeader}>
                  <View style={[styles.billIcon, paid && styles.billIconPaid]}>
                    <FeatherIcon
                      name="zap"
                      color={paid ? colors.brand : colors.mutedForeground}
                      size={20}
                    />
                  </View>
                  <View style={styles.billMeta}>
                    <View style={styles.billTitleRow}>
                      <Text style={styles.billType}>{t(TYPE_LABEL[bill.type])}</Text>
                      <Badge label={paid ? t("bills.paid") : t("bills.unpaid")} tone={paid ? "success" : "neutral"} />
                    </View>
                    <Text style={styles.billAmount}>{formatCurrency(bill.amount)}</Text>
                    {bill.dueDate ? (
                      <Text style={styles.billDetail}>
                        {t("bills.dueDate")}: {formatDate(bill.dueDate, locale)}
                      </Text>
                    ) : null}
                    {bill.note ? <Text style={styles.billDetail}>{bill.note}</Text> : null}
                  </View>
                </View>
                <View style={styles.billActions}>
                  {!paid ? (
                    <Button
                      label={t("bills.markPaid")}
                      variant="secondary"
                      size="sm"
                      icon={<FeatherIcon name="check" color={colors.foreground} size={16} />}
                      onPress={() => markPaid.mutate(bill.id)}
                      loading={markPaid.isPending}
                      style={styles.actionBtn}
                    />
                  ) : null}
                  <Button
                    label={t("bills.delete")}
                    variant="danger"
                    size="sm"
                    icon={<FeatherIcon name="trash-2" color={colors.foreground} size={16} />}
                    onPress={() => setDeletingBill(bill)}
                    style={styles.actionBtn}
                  />
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      <ConfirmDialog
        visible={deletingBill !== null}
        onClose={() => setDeletingBill(null)}
        tone="critical"
        icon="trash-2"
        title={t("common.confirmDelete")}
        description={deletingBill ? t("bills.confirmDeleteBody") : ""}
        confirmLabel={t("bills.delete")}
        cancelLabel={t("common.cancel")}
        loading={remove.isPending}
        onConfirm={() => {
          if (deletingBill) remove.mutate(deletingBill.id);
        }}
      />

      <NoticeDialog
        visible={errorNotice !== null}
        onClose={() => setErrorNotice(null)}
        title={t("common.error")}
        description={errorNotice ?? undefined}
        tone="critical"
        confirmLabel={t("common.ok")}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  muted: { color: colors.textMuted, fontSize: 14 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors.mutedForeground,
    marginBottom: spacing.sm,
  },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  monthLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: colors.foreground,
    textTransform: "capitalize",
  },
  totalValue: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.foreground,
    fontVariant: ["tabular-nums"],
    marginBottom: spacing.md,
  },
  byTypeRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  byTypeCell: {
    flex: 1,
    minWidth: "30%",
    backgroundColor: colors.muted,
    borderRadius: 12,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  byTypeLabel: { fontSize: 11, color: colors.mutedForeground },
  byTypeValue: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.foreground,
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
  typeBtn: { flexGrow: 1, minWidth: "30%" },
  empty: { textAlign: "center", color: colors.mutedForeground, fontSize: 14 },
  billCard: { gap: spacing.sm },
  billHeader: { flexDirection: "row", gap: spacing.sm },
  billIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  billIconPaid: { backgroundColor: colors.brandMuted },
  billMeta: { flex: 1, minWidth: 0, gap: 4 },
  billTitleRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.sm },
  billType: { fontSize: 16, fontWeight: "600", color: colors.foreground },
  billAmount: { fontSize: 14, fontWeight: "600", color: colors.foreground, fontVariant: ["tabular-nums"] },
  billDetail: { fontSize: 12, color: colors.mutedForeground },
  billActions: { flexDirection: "row", gap: spacing.sm },
  actionBtn: { flex: 1 },
  lockedIcon: { alignItems: "center", marginBottom: spacing.sm },
  lockedText: { textAlign: "center", color: colors.mutedForeground, fontSize: 14, lineHeight: 20 },
});
