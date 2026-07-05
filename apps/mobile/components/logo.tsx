import { View, StyleSheet } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { colors } from "@/lib/theme";

export function Logo({ size = 40 }: { size?: number }) {
  const icon = size * 0.55;
  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size * 0.22 }]}>
      <Svg width={icon} height={icon} viewBox="0 0 24 24" fill={colors.primaryForeground}>
        <Rect x="4" y="14" width="4" height="6" rx="1" opacity={0.85} />
        <Rect x="10" y="10" width="4" height="10" rx="1" />
        <Rect x="16" y="16" width="4" height="4" rx="1" opacity={0.85} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
});
