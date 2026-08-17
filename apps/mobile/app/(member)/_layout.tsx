import { Stack } from "expo-router";
import { colors } from "@/lib/theme";

export default function MemberLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="card" />
      <Stack.Screen name="classes" />
    </Stack>
  );
}
