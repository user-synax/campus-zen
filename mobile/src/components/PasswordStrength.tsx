import { StyleSheet, Text, View } from "react-native";
import { strengthLabel } from "../lib/validation";
import { useTheme } from "../theme";

/**
 * Mirrors web `PasswordStrength`: one achromatic track; the fill only ever
 * uses primary text colour until long enough, then X Blue. No colour ramp.
 */
export function PasswordStrength({ password }: { password: string }) {
  const t = useTheme();
  if (!password) return null;
  const { level, label } = strengthLabel(password);
  const tooShort = password.length < 8;
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={[styles.track, { backgroundColor: t.surfaceStrong }]}>
          <View
            style={[
              styles.fill,
              {
                width: `${((level + 1) / 4) * 100}%`,
                backgroundColor: tooShort || level <= 1 ? t.text : t.accent,
              },
            ]}
          />
        </View>
        <Text style={[styles.label, { color: tooShort ? t.error : t.secondary }]}>
          {label}
        </Text>
      </View>
      {tooShort ? (
        <Text style={[styles.hint, { color: t.error }]}>Minimum 8 characters required.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  track: { flex: 1, height: 4, borderRadius: 9999, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 9999 },
  label: { minWidth: 84, textAlign: "right", fontSize: 13, lineHeight: 17 },
  hint: { marginTop: 6, fontSize: 13, lineHeight: 17 },
});
