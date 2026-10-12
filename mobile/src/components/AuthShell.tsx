import type { PropsWithChildren, ReactNode } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../theme";

interface Props extends PropsWithChildren {
  title: string;
  subtitle?: string;
}

/**
 * Mirrors web AuthShell: single centred column on the bare canvas, floating
 * mark above the heading, legal footer pinned to the bottom.
 */
export function AuthShell({ children, title, subtitle }: Props) {
  const t = useTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.column}>
          <View style={styles.center}>
            <Image
              source={require("../../assets/images/campus-zen.png")}
              style={styles.logo}
              accessibilityLabel="CampusZen logo"
            />
            <Text
              style={[styles.title, { color: t.text }]}
              accessibilityRole="header"
            >
              {title}
            </Text>
            {subtitle ? (
              <Text style={[styles.subtitle, { color: t.secondary }]}>{subtitle}</Text>
            ) : null}
            <View style={styles.form}>{children as ReactNode}</View>
          </View>
          <View style={styles.footer}>
            <Text style={[styles.legal, { color: t.secondary }]}>
              Terms of Service{"    "}Privacy Policy
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 16, paddingVertical: 32 },
  column: { width: "100%", maxWidth: 440, alignSelf: "center", flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  logo: { width: 40, height: 40, borderRadius: 9 },
  title: {
    marginTop: 32,
    textAlign: "center",
    fontSize: 31,
    lineHeight: 36,
    fontWeight: "800",
    letterSpacing: -0.62,
  },
  subtitle: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 15,
    lineHeight: 20,
    maxWidth: 320,
  },
  form: { marginTop: 32, width: "100%" },
  footer: { marginTop: 40, alignItems: "center" },
  legal: { fontSize: 13, lineHeight: 17 },
});
