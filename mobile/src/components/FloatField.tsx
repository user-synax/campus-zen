import { useState, type ReactNode } from "react";
import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { useTheme } from "../theme";

interface Props extends Omit<TextInputProps, "style" | "placeholder"> {
  label: string;
  error?: string;
  prefix?: string;
  suffix?: ReactNode;
}

/**
 * Floating-label auth field mirroring web `.cz-float-box`: 56px outlined
 * box, 12px radius, hairline border. The label rests inside at rest and
 * docks to the top border (with a bg cutout) when focused or filled —
 * accent-blue on focus, error-red on error.
 */
export function FloatField({ label, error, prefix, suffix, onFocus, onBlur, value, ...rest }: Props) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);
  const filled = (value ?? "").length > 0;
  const docked = focused || filled;
  const borderColor = error ? t.error : focused ? t.accent : t.borderStrong;
  const labelColor = error ? t.error : focused ? t.accent : t.secondary;

  return (
    <View>
      <View style={[styles.box, { borderColor, backgroundColor: t.bg }]}>
        {prefix ? (
          <Text style={[styles.prefix, { color: error ? t.error : focused ? t.accent : t.secondary }]}>
            {prefix}
          </Text>
        ) : null}
        <TextInput
          {...rest}
          value={value}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          placeholderTextColor="transparent"
          selectionColor={t.accent}
          style={[styles.input, { color: t.text }]}
        />
        {suffix ? <View style={styles.suffix}>{suffix}</View> : null}
        <View
          pointerEvents="none"
          style={[
            styles.labelWrap,
            docked ? styles.labelDocked : styles.labelRest,
            { backgroundColor: t.bg },
          ]}
        >
          <Text
            numberOfLines={1}
            style={[
              docked ? styles.labelSmall : styles.labelLarge,
              { color: labelColor },
            ]}
          >
            {label}
          </Text>
        </View>
      </View>
      {error ? (
        <Text style={[styles.error, { color: t.error }]} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    height: 56,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  prefix: { fontSize: 15, lineHeight: 20 },
  input: { flex: 1, height: "100%", fontSize: 16, lineHeight: 22, padding: 0 },
  suffix: { flexShrink: 0, alignItems: "center", justifyContent: "center" },
  labelWrap: { position: "absolute", paddingHorizontal: 4 },
  labelRest: { left: 12, top: 17 },
  labelDocked: { left: 12, top: -9 },
  labelLarge: { fontSize: 15, lineHeight: 20 },
  labelSmall: { fontSize: 12, lineHeight: 16, fontWeight: "500", letterSpacing: 0.12 },
  error: { marginTop: 6, fontSize: 13, lineHeight: 17 },
});
