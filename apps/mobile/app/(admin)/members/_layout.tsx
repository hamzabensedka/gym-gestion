import { Stack } from "expo-router";
import { colors } from "@/lib/theme";

export default function MembersLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="new" options={{ presentation: "modal" }} />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
