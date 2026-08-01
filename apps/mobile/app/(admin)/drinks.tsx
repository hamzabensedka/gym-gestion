import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PaymentMethod } from "@prisma/client";
import { addMonths, format, parse, subMonths } from "date-fns";
import { ar, fr } from "date-fns/locale";
import { formatCurrency, formatDate } from "@gym/shared/format";
import type { TranslationKey } from "@gym/shared/i18n";
import { paymentMethods } from "@gym/shared/validations";
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
import { NoticeDialog } from "@/components/confirm-dialog";
import { FeatherIcon } from "@/components/icons";
import { colors, spacing } from "@/lib/theme";

type DrinkProduct = {
  id: string;
  name: string;
  sellPrice: number;
  costPrice: number | null;
  stockQty: number;
  active: boolean;
};

type DrinkSale = {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  method: PaymentMethod;
  soldAt: string;
  note: string | null;
};

type SalesData = {
  month: string;
  sales: DrinkSale[];
  revenue: number;
};

type Section = "products" | "sell" | "history";

const METHOD_LABEL: Record<(typeof paymentMethods)[number], TranslationKey> = {
  CASH: "payments.method.CASH",
  D17: "payments.method.D17",
  BANK_TRANSFER: "payments.method.BANK_TRANSFER",
  CARD: "payments.method.CARD",
  OTHER: "payments.method.OTHER",
};

const SECTIONS: Section[] = ["products", "sell", "history"];

const SECTION_LABEL: Record<Section, TranslationKey> = {
  products: "drinks.section.products",
  sell: "drinks.section.sell",
  history: "drinks.section.history",
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

export default function DrinksScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const qc = useQueryClient();

  const [section, setSection] = useState<Section>("products");
  const [monthKey, setMonthKey] = useState(currentMonthKey);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [restockingId, setRestockingId] = useState<string | null>(null);
  const [restockQty, setRestockQty] = useState("");
  const [name, setName] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [stockQty, setStockQty] = useState("0");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [method, setMethod] = useState<(typeof paymentMethods)[number]>("CASH");
  const [soldAt, setSoldAt] = useState(format(new Date(), "yyyy-MM-dd"));
  const [note, setNote] = useState("");
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const productsQuery = useQuery({
    queryKey: ["drinks", "products"],
    queryFn: () => apiFetch<DrinkProduct[]>("/drinks/products"),
    retry: (count, error) => !isAccessError(error) && count < 2,
  });

  const salesQuery = useQuery({
    queryKey: ["drinks", "sales", monthKey],
    queryFn: () => apiFetch<SalesData>(`/drinks/sales?month=${monthKey}`),
    enabled: productsQuery.isSuccess,
    retry: (count, error) => !isAccessError(error) && count < 2,
  });

  const invalidateDrinks = () => {
    qc.invalidateQueries({ queryKey: ["drinks"] });
  };

  const createProduct = useMutation({
    mutationFn: () =>
      apiFetch("/drinks/products", {
        method: "POST",
        body: JSON.stringify({
          name,
          sellPrice: Number(sellPrice),
          costPrice: costPrice.trim() ? Number(costPrice) : undefined,
          stockQty: Number(stockQty),
        }),
      }),
    onSuccess: () => {
      invalidateDrinks();
      setShowAddProduct(false);
      setName("");
      setSellPrice("");
      setCostPrice("");
      setStockQty("0");
    },
    onError: (e: Error) => setErrorNotice(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      apiFetch(`/drinks/products/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !active }),
      }),
    onSuccess: invalidateDrinks,
    onError: (e: Error) => setErrorNotice(e.message),
  });

  const restock = useMutation({
    mutationFn: ({ id, quantity: qty }: { id: string; quantity: number }) =>
      apiFetch(`/drinks/products/${id}/restock`, {
        method: "POST",
        body: JSON.stringify({ quantity: qty }),
      }),
    onSuccess: () => {
      invalidateDrinks();
      setRestockingId(null);
      setRestockQty("");
    },
    onError: (e: Error) => setErrorNotice(e.message),
  });

  const sell = useMutation({
    mutationFn: () => {
      const list = productsQuery.data ?? [];
      const active = list.filter((p) => p.active && p.stockQty > 0);
      const id = active.find((p) => p.id === productId)?.id ?? active[0]?.id ?? "";
      return apiFetch("/drinks/sales", {
        method: "POST",
        body: JSON.stringify({
          productId: id,
          quantity: Number(quantity),
          method,
          soldAt: soldAt || undefined,
          note: note.trim() || undefined,
        }),
      });
    },
    onSuccess: () => {
      invalidateDrinks();
      setQuantity("1");
      setNote("");
      setSoldAt(format(new Date(), "yyyy-MM-dd"));
    },
    onError: (e: Error) => setErrorNotice(e.message),
  });

  if (productsQuery.isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.brand} />
          <Text style={styles.muted}>{t("common.loading")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (productsQuery.isError && isAccessError(productsQuery.error)) {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <PageHeader title={t("drinks.title")} subtitle={t("drinks.lockedSubtitle")} />
          <Card>
            <View style={styles.lockedIcon}>
              <FeatherIcon name="lock" color={colors.mutedForeground} size={28} />
            </View>
            <Text style={styles.lockedText}>{t("drinks.upgradeBody")}</Text>
            <Button
              label={t("drinks.upgradeCta")}
              onPress={() => router.push("/(admin)/settings")}
            />
          </Card>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (productsQuery.isError) {
    const message =
      productsQuery.error instanceof Error ? productsQuery.error.message : t("common.error");
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <PageHeader title={t("drinks.title")} subtitle={t("drinks.subtitle")} />
          <Card>
            <Text style={styles.lockedText}>{message}</Text>
          </Card>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const products = productsQuery.data ?? [];
  const sales = salesQuery.data?.sales ?? [];
  const revenue = salesQuery.data?.revenue ?? 0;
  const activeProducts = products.filter((p) => p.active && p.stockQty > 0);
  const sellProductId =
    activeProducts.find((p) => p.id === productId)?.id ?? activeProducts[0]?.id ?? "";

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <PageHeader title={t("drinks.title")} subtitle={t("drinks.subtitle")} />

        <Card>
          <Text style={styles.fieldLabel}>{t("drinks.month")}</Text>
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

          <View style={styles.tabRow}>
            {SECTIONS.map((tab) => (
              <Pressable
                key={tab}
                onPress={() => setSection(tab)}
                style={[styles.tab, section === tab && styles.tabActive]}
              >
                <Text style={[styles.tabText, section === tab && styles.tabTextActive]}>
                  {t(SECTION_LABEL[tab])}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>

        {section === "products" ? (
          <>
            {products.length === 0 ? (
              <Card compact>
                <Text style={styles.empty}>{t("drinks.noProducts")}</Text>
              </Card>
            ) : (
              products.map((product) => (
                <Card key={product.id} compact style={styles.productCard}>
                  <View style={styles.productHeader}>
                    <View
                      style={[
                        styles.productIcon,
                        product.active && styles.productIconActive,
                      ]}
                    >
                      <FeatherIcon
                        name="coffee"
                        color={product.active ? colors.brand : colors.mutedForeground}
                        size={20}
                      />
                    </View>
                    <View style={styles.productMeta}>
                      <View style={styles.productTitleRow}>
                        <Text style={styles.productName}>{product.name}</Text>
                        <Badge
                          label={product.active ? t("drinks.active") : t("drinks.inactive")}
                          tone={product.active ? "success" : "neutral"}
                        />
                      </View>
                      <Text style={styles.productPrice}>{formatCurrency(product.sellPrice)}</Text>
                      {product.costPrice != null ? (
                        <Text style={styles.productDetail}>
                          {t("drinks.costPrice")}: {formatCurrency(product.costPrice)}
                        </Text>
                      ) : null}
                      <Text style={styles.productDetail}>
                        {t("drinks.stock")}: {product.stockQty}
                      </Text>
                    </View>
                  </View>

                  {restockingId === product.id ? (
                    <View style={styles.restockRow}>
                      <Input
                        label={t("drinks.restockQty")}
                        value={restockQty}
                        onChangeText={setRestockQty}
                        keyboardType="number-pad"
                      />
                      <View style={styles.restockActions}>
                        <Button
                          label={t("drinks.restock")}
                          size="sm"
                          onPress={() =>
                            restock.mutate({ id: product.id, quantity: Number(restockQty) })
                          }
                          loading={restock.isPending}
                          style={styles.actionBtn}
                        />
                        <Button
                          label={t("common.cancel")}
                          variant="secondary"
                          size="sm"
                          onPress={() => {
                            setRestockingId(null);
                            setRestockQty("");
                          }}
                          style={styles.actionBtn}
                        />
                      </View>
                    </View>
                  ) : (
                    <View style={styles.productActions}>
                      <Button
                        label={t("drinks.restock")}
                        variant="secondary"
                        size="sm"
                        icon={<FeatherIcon name="plus-circle" color={colors.foreground} size={16} />}
                        onPress={() => setRestockingId(product.id)}
                        style={styles.actionBtn}
                      />
                      <Button
                        label={product.active ? t("drinks.deactivate") : t("drinks.activate")}
                        variant="secondary"
                        size="sm"
                        onPress={() => toggleActive.mutate({ id: product.id, active: product.active })}
                        loading={toggleActive.isPending}
                        style={styles.actionBtn}
                      />
                    </View>
                  )}
                </Card>
              ))
            )}

            <Button
              label={showAddProduct ? t("common.cancel") : t("drinks.addProduct")}
              variant="secondary"
              onPress={() => setShowAddProduct(!showAddProduct)}
            />

            {showAddProduct ? (
              <Card>
                <CardTitle>{t("drinks.addProduct")}</CardTitle>
                <Input label={t("drinks.name")} value={name} onChangeText={setName} />
                <Input
                  label={`${t("drinks.sellPrice")} (TND)`}
                  value={sellPrice}
                  onChangeText={setSellPrice}
                  keyboardType="decimal-pad"
                />
                <Input
                  label={`${t("drinks.costPrice")} (TND)`}
                  value={costPrice}
                  onChangeText={setCostPrice}
                  keyboardType="decimal-pad"
                />
                <Input
                  label={t("drinks.stockQty")}
                  value={stockQty}
                  onChangeText={setStockQty}
                  keyboardType="number-pad"
                />
                <Button
                  label={t("drinks.create")}
                  onPress={() => createProduct.mutate()}
                  loading={createProduct.isPending}
                />
              </Card>
            ) : null}
          </>
        ) : null}

        {section === "sell" ? (
          activeProducts.length === 0 ? (
            <Card compact>
              <Text style={styles.empty}>{t("drinks.noSellable")}</Text>
            </Card>
          ) : (
            <Card>
              <CardTitle>{t("drinks.sell")}</CardTitle>
              <Text style={styles.fieldLabel}>{t("drinks.product")}</Text>
              <View style={styles.optionRow}>
                {activeProducts.map((product) => (
                  <Button
                    key={product.id}
                    label={`${product.name} (${product.stockQty})`}
                    variant={sellProductId === product.id ? "primary" : "secondary"}
                    size="sm"
                    onPress={() => setProductId(product.id)}
                    style={styles.optionBtn}
                  />
                ))}
              </View>
              <Input
                label={t("drinks.quantity")}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="number-pad"
              />
              <Text style={styles.fieldLabel}>{t("payments.method")}</Text>
              <View style={styles.optionRow}>
                {paymentMethods.map((m) => (
                  <Button
                    key={m}
                    label={t(METHOD_LABEL[m])}
                    variant={method === m ? "primary" : "secondary"}
                    size="sm"
                    onPress={() => setMethod(m)}
                    style={styles.optionBtn}
                  />
                ))}
              </View>
              <Input
                label={t("drinks.soldAt")}
                value={soldAt}
                onChangeText={setSoldAt}
                placeholder="yyyy-MM-dd"
                autoCapitalize="none"
              />
              <Input label={t("drinks.note")} value={note} onChangeText={setNote} />
              <Button
                label={t("drinks.confirmSell")}
                onPress={() => sell.mutate()}
                loading={sell.isPending}
              />
            </Card>
          )
        ) : null}

        {section === "history" ? (
          <>
            <Card>
              <Text style={styles.fieldLabel}>{t("drinks.revenue")}</Text>
              <Text style={styles.revenueValue}>{formatCurrency(revenue)}</Text>
            </Card>

            {salesQuery.isLoading ? (
              <View style={styles.centeredInline}>
                <ActivityIndicator color={colors.brand} />
              </View>
            ) : sales.length === 0 ? (
              <Card compact>
                <Text style={styles.empty}>{t("drinks.noSales")}</Text>
              </Card>
            ) : (
              sales.map((sale) => (
                <Card key={sale.id} compact style={styles.saleCard}>
                  <View style={styles.saleHeader}>
                    <View style={styles.saleIcon}>
                      <FeatherIcon name="clock" color={colors.mutedForeground} size={20} />
                    </View>
                    <View style={styles.saleMeta}>
                      <Text style={styles.saleProduct}>{sale.productName}</Text>
                      <Text style={styles.saleAmount}>
                        {sale.quantity} × {formatCurrency(sale.unitPrice)} ={" "}
                        {formatCurrency(sale.total)}
                      </Text>
                      <Text style={styles.saleDetail}>
                        {t(METHOD_LABEL[sale.method])} · {formatDate(sale.soldAt, locale)}
                      </Text>
                      {sale.note ? <Text style={styles.saleDetail}>{sale.note}</Text> : null}
                    </View>
                  </View>
                </Card>
              ))
            )}
          </>
        ) : null}
      </ScrollView>

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
  centeredInline: { alignItems: "center", paddingVertical: spacing.lg },
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
  tabRow: {
    flexDirection: "row",
    gap: 4,
    backgroundColor: colors.muted,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: colors.card,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.mutedForeground,
    textAlign: "center",
  },
  tabTextActive: {
    color: colors.foreground,
  },
  empty: { textAlign: "center", color: colors.mutedForeground, fontSize: 14 },
  productCard: { gap: spacing.sm },
  productHeader: { flexDirection: "row", gap: spacing.sm },
  productIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  productIconActive: { backgroundColor: colors.brandMuted },
  productMeta: { flex: 1, minWidth: 0, gap: 4 },
  productTitleRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.sm },
  productName: { fontSize: 16, fontWeight: "600", color: colors.foreground },
  productPrice: { fontSize: 14, fontWeight: "600", color: colors.foreground, fontVariant: ["tabular-nums"] },
  productDetail: { fontSize: 12, color: colors.mutedForeground },
  productActions: { flexDirection: "row", gap: spacing.sm },
  restockRow: { gap: spacing.sm },
  restockActions: { flexDirection: "row", gap: spacing.sm },
  actionBtn: { flex: 1 },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
  optionBtn: { flexGrow: 1, minWidth: "45%" },
  revenueValue: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.foreground,
    fontVariant: ["tabular-nums"],
  },
  saleCard: { gap: spacing.sm },
  saleHeader: { flexDirection: "row", gap: spacing.sm },
  saleIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  saleMeta: { flex: 1, minWidth: 0, gap: 4 },
  saleProduct: { fontSize: 16, fontWeight: "600", color: colors.foreground },
  saleAmount: { fontSize: 14, fontWeight: "600", color: colors.foreground, fontVariant: ["tabular-nums"] },
  saleDetail: { fontSize: 12, color: colors.mutedForeground },
  lockedIcon: { alignItems: "center", marginBottom: spacing.sm },
  lockedText: { textAlign: "center", color: colors.mutedForeground, fontSize: 14, lineHeight: 20, marginBottom: spacing.md },
});
