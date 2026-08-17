import { useCallback, useEffect, useState } from "react";
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Redirect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Role } from "@gym/shared/auth";
import { KIOSK_IDLE_MS, KIOSK_RESULT_MS } from "@gym/shared/checkin";
import type { Plan, PlanFeature } from "@gym/shared/plans";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n-context";
import { apiFetch } from "@/lib/api";
import { Button, Input } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { colors, radius, spacing } from "@/lib/theme";

type CheckinResult = {
  success: boolean;
  outcome: string;
  memberName?: string;
  daysLeft?: number;
};

type GymSettings = {
  plan: Plan;
  features: PlanFeature[];
  name: string;
};

type Mode = "camera" | "code";

export function KioskScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<Mode>("camera");
  const [code, setCode] = useState("");
  const [feedback, setFeedback] = useState<CheckinResult | null>(null);
  const [scanning, setScanning] = useState(true);
  const [exitOpen, setExitOpen] = useState(false);
  const [exitPassword, setExitPassword] = useState("");
  const [exitError, setExitError] = useState<string | null>(null);
  const [exitPending, setExitPending] = useState(false);

  const settingsQuery = useQuery({
    queryKey: ["gym-settings-summary"],
    queryFn: () => apiFetch<GymSettings>("/settings"),
    enabled: state.status === "staff",
    staleTime: 5 * 60 * 1000,
  });

  const unlocked = (settingsQuery.data?.features ?? []).includes("kiosk");
  const isAdmin = state.status === "staff" && state.user.role === Role.ADMIN;
  const gymName =
    settingsQuery.data?.name ?? (state.status === "staff" ? state.user.gymName : "");

  const checkin = useMutation({
    mutationFn: (body: { qrData?: string; code?: string }) =>
      apiFetch<CheckinResult>("/checkin", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (result) => {
      setFeedback(result);
      setScanning(false);
      void Haptics.notificationAsync(
        result.success
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error,
      );
    },
  });

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => {
      setFeedback(null);
      setCode("");
      setScanning(true);
    }, KIOSK_RESULT_MS);
    return () => clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    if (mode !== "code" || feedback) return;
    const timer = setTimeout(() => {
      setCode("");
      setMode("camera");
      setScanning(true);
    }, KIOSK_IDLE_MS);
    return () => clearTimeout(timer);
  }, [mode, feedback, code]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      openExit();
      return true;
    });
    return () => sub.remove();
  }, []);

  const onBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (!scanning || checkin.isPending || feedback) return;
      setScanning(false);
      checkin.mutate({ qrData: data });
    },
    [scanning, checkin, feedback],
  );

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
      await apiFetch("/auth/staff/verify-password", {
        method: "POST",
        body: JSON.stringify({ password: exitPassword }),
      });
      leaveKiosk();
      setExitPassword("");
    } catch {
      setExitError(t("kiosk.exitPasswordWrong"));
    } finally {
      setExitPending(false);
    }
  }

  function leaveKiosk() {
    setExitOpen(false);
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(isAdmin ? "/(admin)/scan" : "/(staff)/scan");
  }

  if (state.status === "guest") {
    return <Redirect href="/(auth)/login" />;
  }
  if (state.status === "member") {
    return <Redirect href="/(member)" />;
  }

  if (settingsQuery.isLoading) {
    return <View style={styles.root} />;
  }

  if (!unlocked) {
    return (
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Text style={styles.title}>{t("kiosk.title")}</Text>
        <Text style={styles.subtitle}>{t("kiosk.lockedSubtitle")}</Text>
        <Text style={styles.body}>{t("kiosk.comingSoon")}</Text>
        {isAdmin ? (
          <Button
            label={t("kiosk.upgradeCta")}
            onPress={() => router.replace("/(admin)/settings")}
          />
        ) : null}
        <Button label={t("kiosk.exit")} variant="secondary" onPress={leaveKiosk} />
      </View>
    );
  }

  if (!permission) return <View style={styles.root} />;

  if (mode === "camera" && !permission.granted) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <Text style={styles.title}>{t("kiosk.title")}</Text>
        <Text style={styles.subtitle}>{t("scan.cameraPermission")}</Text>
        <Button label={t("scan.allowCamera")} onPress={requestPermission} />
        <Button label={t("kiosk.enterCode")} variant="secondary" onPress={() => setMode("code")} />
        <Pressable onPress={openExit} style={styles.exitLink}>
          <Text style={styles.exitLinkText}>{t("kiosk.exit")}</Text>
        </Pressable>
        <ConfirmDialog
          visible={exitOpen}
          onClose={closeExit}
          title={t("kiosk.exitConfirm")}
          description={t("kiosk.exitConfirmBody")}
          confirmLabel={t("kiosk.exit")}
          cancelLabel={t("common.cancel")}
          onConfirm={() => void confirmExit()}
          loading={exitPending}
          tone="neutral"
        >
          <Input
            label={t("kiosk.exitPassword")}
            value={exitPassword}
            onChangeText={setExitPassword}
            secureTextEntry
          />
          {exitError ? <Text style={styles.exitError}>{exitError}</Text> : null}
        </ConfirmDialog>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.kioskRoot, { paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.gymName}>{gymName}</Text>
            <Text style={styles.title}>{t("kiosk.title")}</Text>
            <Text style={styles.subtitle}>{t("kiosk.subtitle")}</Text>
          </View>
          <Pressable
            onPress={openExit}
            hitSlop={12}
            style={({ pressed }) => [styles.exitBtn, pressed && { transform: [{ scale: 0.96 }] }]}
          >
            <Text style={styles.exitBtnText}>{t("kiosk.exit")}</Text>
          </Pressable>
        </View>

        {mode === "camera" ? (
          <View style={styles.cameraWrap}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={scanning && !feedback ? onBarcodeScanned : undefined}
            />
            <View style={styles.overlay} pointerEvents="none">
              <View style={styles.frame} />
              <Text style={styles.hint}>{t("kiosk.hint")}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.codeWrap}>
            <Input
              value={code}
              onChangeText={setCode}
              placeholder={t("kiosk.codePlaceholder")}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.codeInput}
            />
            <Button
              label={checkin.isPending ? t("common.loading") : t("kiosk.submitCode")}
              onPress={() => {
                const trimmed = code.trim();
                if (!trimmed || checkin.isPending) return;
                checkin.mutate({ code: trimmed });
              }}
              disabled={!code.trim() || checkin.isPending}
            />
          </View>
        )}

        <Pressable
          onPress={() => {
            setCode("");
            setMode((current) => (current === "camera" ? "code" : "camera"));
            setScanning(true);
          }}
          style={({ pressed }) => [styles.toggle, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.toggleText}>
            {mode === "camera" ? t("kiosk.enterCode") : t("kiosk.useCamera")}
          </Text>
        </Pressable>
      </View>

      {feedback ? (
        <View
          style={[
            styles.feedback,
            { backgroundColor: feedback.success ? colors.success : colors.danger },
            { paddingBottom: Math.max(insets.bottom, spacing.lg) },
          ]}
        >
          <Text style={styles.feedbackTitle}>
            {feedback.success
              ? t("scan.granted")
              : feedback.outcome === "FROZEN"
                ? t("scan.frozenMsg")
                : t("scan.denied")}
          </Text>
          {feedback.memberName ? (
            <Text style={styles.feedbackName}>{feedback.memberName}</Text>
          ) : null}
          {feedback.outcome === "EXPIRED" ? (
            <Text style={styles.feedbackSub}>{t("scan.expiredMsg")}</Text>
          ) : null}
          {feedback.success && feedback.daysLeft != null ? (
            <Text style={[styles.feedbackSub, styles.tabular]}>
              {feedback.daysLeft} {t("common.days")} {t("detail.daysLeft")}
            </Text>
          ) : null}
        </View>
      ) : null}

      <ConfirmDialog
        visible={exitOpen}
        onClose={closeExit}
        title={t("kiosk.exitConfirm")}
        description={t("kiosk.exitConfirmBody")}
        confirmLabel={t("kiosk.exit")}
        cancelLabel={t("common.cancel")}
        onConfirm={() => void confirmExit()}
        loading={exitPending}
        tone="neutral"
      >
        <Input
          label={t("kiosk.exitPassword")}
          value={exitPassword}
          onChangeText={setExitPassword}
          secureTextEntry
        />
        {exitError ? <Text style={styles.exitError}>{exitError}</Text> : null}
      </ConfirmDialog>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.lg,
    justifyContent: "center",
    gap: spacing.md,
  },
  kioskRoot: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.lg },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  gymName: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  title: { color: colors.text, fontSize: 28, fontWeight: "700" },
  subtitle: { color: colors.textMuted, fontSize: 16, marginTop: 4 },
  body: { color: colors.textMuted, fontSize: 15, marginBottom: spacing.md },
  exitBtn: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  exitBtnText: { color: colors.text, fontWeight: "600" },
  exitLink: { minHeight: 44, justifyContent: "center", alignItems: "center" },
  exitLinkText: { color: colors.brand, fontWeight: "600" },
  exitError: { color: colors.danger, fontSize: 14, fontWeight: "600" },
  cameraWrap: {
    flex: 1,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#000",
    minHeight: 280,
  },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  frame: {
    width: 260,
    height: 260,
    borderWidth: 3,
    borderColor: colors.brand,
    borderRadius: 20,
    backgroundColor: "transparent",
  },
  hint: {
    marginTop: spacing.lg,
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    textShadowColor: "#000",
    textShadowRadius: 4,
  },
  codeWrap: { flex: 1, justifyContent: "center", gap: spacing.md },
  codeInput: {
    height: 64,
    borderRadius: 16,
    fontSize: 22,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  toggle: { minHeight: 44, alignItems: "center", justifyContent: "center", marginVertical: spacing.md },
  toggleText: { color: colors.brand, fontSize: 16, fontWeight: "600" },
  feedback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    gap: 8,
  },
  feedbackTitle: { color: "#fff", fontSize: 32, fontWeight: "700", textAlign: "center" },
  feedbackName: { color: "#fff", fontSize: 24, fontWeight: "600", textAlign: "center" },
  feedbackSub: { color: "rgba(255,255,255,0.9)", fontSize: 16, textAlign: "center" },
  tabular: { fontVariant: ["tabular-nums"] },
});
