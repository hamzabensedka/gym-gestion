import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { useMutation } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n-context";
import { apiFetch } from "@/lib/api";
import { Button, Subtitle, Title } from "@/components/ui";
import { colors, spacing } from "@/lib/theme";

type CheckinResult = {
  success: boolean;
  outcome: string;
  memberName?: string;
  daysLeft?: number;
};

export function ScanScreen() {
  const { t } = useI18n();
  const [permission, requestPermission] = useCameraPermissions();
  const [feedback, setFeedback] = useState<CheckinResult | null>(null);
  const [scanning, setScanning] = useState(true);

  const checkin = useMutation({
    mutationFn: (qrData: string) =>
      apiFetch<CheckinResult>("/checkin", {
        method: "POST",
        body: JSON.stringify({ qrData }),
      }),
    onSuccess: (result) => {
      setFeedback(result);
      setScanning(false);
      Haptics.notificationAsync(
        result.success ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error,
      );
      setTimeout(() => {
        setFeedback(null);
        setScanning(true);
      }, 2500);
    },
  });

  const onBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (!scanning || checkin.isPending) return;
      setScanning(false);
      checkin.mutate(data);
    },
    [scanning, checkin],
  );

  if (!permission) return <View style={styles.center} />;

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Title>{t("scan.title")}</Title>
        <Subtitle>{t("scan.cameraPermission")}</Subtitle>
        <Button label={t("scan.allowCamera")} onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={scanning ? onBarcodeScanned : undefined}
      />
      <View style={styles.overlay}>
        <View style={styles.frame} />
        <Text style={styles.hint}>{t("scan.placeQr")}</Text>
      </View>

      {feedback ? (
        <View
          style={[
            styles.feedback,
            { backgroundColor: feedback.success ? colors.success : colors.danger },
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
          {feedback.outcome === "FROZEN" ? (
            <Text style={styles.feedbackSub}>{t("scan.frozenMsg")}</Text>
          ) : null}
          {feedback.success && feedback.daysLeft != null ? (
            <Text style={styles.feedbackSub}>
              {feedback.daysLeft} {t("common.days")} {t("detail.daysLeft")}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  camera: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  center: { flex: 1, padding: spacing.lg, justifyContent: "center", backgroundColor: colors.bg },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  frame: {
    width: 240,
    height: 240,
    borderWidth: 3,
    borderColor: colors.brand,
    borderRadius: 16,
    backgroundColor: "transparent",
  },
  hint: {
    marginTop: spacing.lg,
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
    textShadowColor: "#000",
    textShadowRadius: 4,
  },
  feedback: {
    position: "absolute",
    bottom: 48,
    left: spacing.md,
    right: spacing.md,
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: "center",
  },
  feedbackTitle: { color: "#fff", fontSize: 22, fontWeight: "700" },
  feedbackName: { color: "#fff", fontSize: 18, marginTop: 4 },
  feedbackSub: { color: "rgba(255,255,255,0.9)", fontSize: 14, marginTop: 4 },
});
