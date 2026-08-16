import { Stack } from "expo-router";
import { colors } from "@/lib/theme";

export default function StaffMembersLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]/index" />
      <Stack.Screen name="[id]/qr" />
    </Stack>
  );
}
