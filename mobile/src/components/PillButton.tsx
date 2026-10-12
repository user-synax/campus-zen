import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { useTheme } from "../theme";

interface Props {
  title: string;
  loadingTitle?: string;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

/**
 * Primary CTA — web `Button` primary/lg: pill (9999px), X Blue fill, white
 * 15px bold label, 44px height. Press darkens to accent-press; disabled
 * halves opacity.
 */
export function PillButton({ title, loadingTitle, loading, disabled, onPress }: Props) {
  const t = useTheme();
  const inactive = loading || disabled;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: pressed && !inactive ? t.accentPress : t.accent },
        inactive && styles.inactive,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color="#ffffff" /> : null}
      <Text style={styles.label}>{loading ? (loadingTitle ?? title) : title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 44,
    borderRadius: 9999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 20,
  },
  inactive: { opacity: 0.5 },
  label: { color: "#ffffff", fontSize: 15, lineHeight: 20, fontWeight: "700" },
});
