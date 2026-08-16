import { StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { colors, spacing } from "@/lib/theme";

export function MemberQrView({
  value,
  size = 240,
  expiredBanner,
}: {
  value: string;
  size?: number;
  expiredBanner?: string | null;
}) {
  return (
    <>
      {expiredBanner ? <Text style={styles.expired}>{expiredBanner}</Text> : null}
      <View style={styles.qrWrap}>
        <QRCode value={value} size={size} backgroundColor="#ffffff" color="#000000" />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  expired: { color: colors.error, marginBottom: spacing.md, fontWeight: "500", textAlign: "center" },
  qrWrap: {
    padding: spacing.lg,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
