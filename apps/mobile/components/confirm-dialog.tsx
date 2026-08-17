import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ComponentProps, ReactNode } from "react";
import { Feather } from "@expo/vector-icons";
import { FeatherIcon } from "@/components/icons";
import { Button } from "@/components/ui";
import { colors, radius, spacing } from "@/lib/theme";

type FeatherName = ComponentProps<typeof Feather>["name"];

export type ConfirmDialogTone = "brand" | "critical" | "neutral" | "success";

const toneConfig: Record<
  ConfirmDialogTone,
  {
    accent: string;
    iconBg: string;
    iconColor: string;
    defaultIcon: FeatherName;
    confirmVariant: "primary" | "danger" | "secondary";
  }
> = {
  brand: {
    accent: colors.brand,
    iconBg: colors.brandMuted,
    iconColor: colors.brand,
    defaultIcon: "refresh-cw",
    confirmVariant: "primary",
  },
  success: {
    accent: colors.brand,
    iconBg: colors.brandMuted,
    iconColor: colors.brand,
    defaultIcon: "check-circle",
    confirmVariant: "primary",
  },
  critical: {
    accent: colors.critical,
    iconBg: colors.criticalMuted,
    iconColor: colors.critical,
    defaultIcon: "alert-triangle",
    confirmVariant: "danger",
  },
  neutral: {
    accent: colors.foreground50,
    iconBg: colors.muted,
    iconColor: colors.foreground,
    defaultIcon: "info",
    confirmVariant: "secondary",
  },
};

type ConfirmDialogProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  tone?: ConfirmDialogTone;
  icon?: FeatherName;
  children?: ReactNode;
  loading?: boolean;
  /** Single-button mode — hides cancel */
  alertOnly?: boolean;
};

export function ConfirmDialog({
  visible,
  onClose,
  title,
  description,
  confirmLabel,
  cancelLabel = "",
  onConfirm,
  tone = "brand",
  icon,
  children,
  loading = false,
  alertOnly = false,
}: ConfirmDialogProps) {
  const insets = useSafeAreaInsets();
  const config = toneConfig[tone];
  const iconName = icon ?? config.defaultIcon;

  function handleConfirm() {
    onConfirm();
    if (alertOnly) onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={styles.handle} />

          <View style={[styles.card, { borderLeftColor: config.accent }]}>
            <View
              style={[styles.glow, { backgroundColor: config.iconBg }]}
              pointerEvents="none"
            />

            <View style={styles.headerRow}>
              <View style={[styles.iconWrap, { backgroundColor: config.iconBg }]}>
                <FeatherIcon name={iconName} color={config.iconColor} size={20} />
              </View>
              <View style={styles.textCol}>
                <Text style={styles.title}>{title}</Text>
                {description ? <Text style={styles.description}>{description}</Text> : null}
              </View>
            </View>

            {children ? <View style={styles.children}>{children}</View> : null}

            <View style={styles.actions}>
              {!alertOnly && cancelLabel ? (
                <Button
                  label={cancelLabel}
                  variant="outline"
                  onPress={onClose}
                  disabled={loading}
                />
              ) : null}
              <Button
                label={confirmLabel}
                variant={config.confirmVariant}
                onPress={handleConfirm}
                loading={loading}
                disabled={loading}
              />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

type NoticeDialogProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  tone?: "success" | "critical" | "neutral";
  confirmLabel: string;
};

export function NoticeDialog({
  visible,
  onClose,
  title,
  description = "",
  tone = "success",
  confirmLabel,
}: NoticeDialogProps) {
  return (
    <ConfirmDialog
      visible={visible}
      onClose={onClose}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      alertOnly
      tone={tone}
      onConfirm={() => {}}
    />
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.72)",
  },
  sheet: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.foreground25,
    marginBottom: spacing.sm,
  },
  card: {
    overflow: "hidden",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    backgroundColor: colors.card,
    padding: spacing.md,
  },
  glow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 72,
    opacity: 0.45,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: {
    flex: 1,
    minWidth: 0,
    paddingTop: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.foreground,
    lineHeight: 22,
  },
  description: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: colors.mutedForeground,
  },
  actions: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  children: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
});
