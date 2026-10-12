import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme";

/** Mirrors web `Checkbox`: 20px box, 4px radius, X Blue fill + check. */
export function CheckBox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={styles.row}
    >
      <View
        style={[
          styles.box,
          checked
            ? { backgroundColor: t.accent, borderColor: t.accent }
            : { backgroundColor: "transparent", borderColor: t.borderStrong },
        ]}
      >
        {checked ? <Text style={styles.check}>✓</Text> : null}
      </View>
      <Text style={[styles.label, { color: t.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  box: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  check: { color: "#ffffff", fontSize: 13, lineHeight: 16, fontWeight: "700" },
  label: { fontSize: 15, lineHeight: 20 },
});
