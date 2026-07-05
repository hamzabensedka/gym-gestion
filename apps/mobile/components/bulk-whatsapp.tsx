import { useMemo, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { buildWhatsappQueue, type WhatsappRecipient } from "@gym/shared/subscription";
import { Button } from "@/components/ui";
import { colors, spacing } from "@/lib/theme";

type BulkWhatsappBarProps = {
  members: WhatsappRecipient[];
  getMessage: (member: WhatsappRecipient) => string;
  labels: {
    remind: (total: string) => string;
    next: string;
    progress: (current: string, total: string) => string;
    done: string;
  };
};

export function BulkWhatsappBar({ members, getMessage, labels }: BulkWhatsappBarProps) {
  const [openedCount, setOpenedCount] = useState(0);
  const queue = useMemo(() => buildWhatsappQueue(members, getMessage), [members, getMessage]);

  if (queue.length === 0) return null;

  const total = queue.length;
  const isDone = openedCount >= total;
  const nextItem = queue[openedCount];

  function openNext() {
    const item = queue[openedCount];
    if (!item) return;
    void Linking.openURL(item.url);
    setOpenedCount((count) => count + 1);
  }

  const label =
    openedCount === 0
      ? labels.remind(String(total))
      : isDone
        ? labels.done
        : `${labels.next} (${labels.progress(String(openedCount + 1), String(total))})`;

  return (
    <View style={styles.wrap}>
      <Button label={label} onPress={openNext} disabled={isDone} />
      {openedCount > 0 && !isDone && nextItem ? (
        <Text style={styles.preview}>{nextItem.fullName}</Text>
      ) : null}
    </View>
  );
}

type WhatsappIconButtonProps = {
  url: string;
  title: string;
};

export function WhatsappIconButton({ url, title }: WhatsappIconButtonProps) {
  return (
    <Pressable
      accessibilityLabel={title}
      onPress={() => void Linking.openURL(url)}
      style={styles.waBtn}
    >
      <Text style={styles.waBtnText}>WA</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.sm },
  preview: { marginTop: 6, fontSize: 12, color: colors.textMuted },
  waBtn: {
    backgroundColor: "#25D366",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  waBtnText: { color: "#fff", fontSize: 11, fontWeight: "700" },
});
