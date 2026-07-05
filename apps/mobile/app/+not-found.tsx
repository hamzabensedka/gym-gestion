import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/lib/theme";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!", headerStyle: { backgroundColor: colors.background } }} />
      <View style={styles.container}>
        <Text style={styles.title}>This screen doesn't exist.</Text>
        <Link href="/(auth)/login" style={styles.link}>
          <Text style={styles.linkText}>Go to login</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: colors.background,
  },
  title: { fontSize: 20, fontWeight: "bold", color: colors.foreground },
  link: { marginTop: 15, paddingVertical: 15 },
  linkText: { fontSize: 14, color: colors.brand },
});
