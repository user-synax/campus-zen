import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "../ctx/AuthContext";
import { PillButton } from "../components/PillButton";
import { useTheme } from "../theme";

// Placeholder landing screen after auth. The feed comes next — this proves
// the session round-trip (signup/login → Bearer → /me → persist → restore).
export default function Home() {
  const t = useTheme();
  const { user, logout } = useSession();
  const initial = (user?.fullName ?? user?.username ?? "?").slice(0, 1).toUpperCase();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={["top", "bottom"]}>
      <View style={styles.body}>
        <View style={[styles.avatar, { backgroundColor: t.surfaceStrong }]}>
          <Text style={[styles.initial, { color: t.text }]}>{initial}</Text>
        </View>
        <Text style={[styles.name, { color: t.text }]}>{user?.fullName}</Text>
        <Text style={[styles.handle, { color: t.secondary }]}>@{user?.username}</Text>
        <Text style={[styles.note, { color: t.secondary }]}>
          You&apos;re signed in. The feed lands here next.
        </Text>
        <View style={styles.btn}>
          <PillButton title="Sign out" onPress={logout} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
  },
  initial: { fontSize: 28, lineHeight: 34, fontWeight: "800" },
  name: { marginTop: 16, fontSize: 20, lineHeight: 24, fontWeight: "800" },
  handle: { marginTop: 4, fontSize: 15, lineHeight: 20 },
  note: { marginTop: 12, textAlign: "center", fontSize: 15, lineHeight: 20 },
  btn: { marginTop: 32, width: "100%", maxWidth: 320 },
});
