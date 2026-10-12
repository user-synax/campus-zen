import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Link, router } from "expo-router";
import { ApiError } from "../lib/api";
import { sanitizeUsername } from "../lib/validation";
import { useSession } from "../ctx/AuthContext";
import { AuthShell } from "../components/AuthShell";
import { FloatField } from "../components/FloatField";
import { PillButton } from "../components/PillButton";
import { CheckBox } from "../components/CheckBox";
import { useTheme } from "../theme";

export default function Login() {
  const t = useTheme();
  const { login } = useSession();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
  const [serverMsg, setServerMsg] = useState<string | null>(null);

  const validate = () => {
    const e: typeof errors = {};
    if (!username.trim()) e.username = "Enter your username.";
    else if (username.trim().length < 3) e.username = "Username must be at least 3 characters.";
    if (!password) e.password = "Enter your password.";
    else if (password.length < 8) e.password = "Password must be at least 8 characters.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async () => {
    setServerMsg(null);
    if (!validate()) return;
    setLoading(true);
    try {
      await login({ username: username.trim().toLowerCase(), password, remember });
      router.replace("/home");
    } catch (err) {
      if (err instanceof ApiError && !err.offline) {
        const data = err.data;
        if (err.status === 401) {
          setErrors({ password: "Invalid username or password" });
        } else if (data.code === "VALIDATION_ERROR" && data.details) {
          const ne: typeof errors = {};
          for (const d of data.details) {
            if (d.path?.includes("username")) ne.username = d.message;
            else if (d.path?.includes("password")) ne.password = d.message;
          }
          if (Object.keys(ne).length) setErrors(ne);
          else setServerMsg(data.message ?? "Login failed");
        } else {
          setServerMsg(data.message ?? "Login failed");
        }
        if (err.status === 429) setServerMsg(data.message ?? "Too many attempts. Try later.");
      } else {
        setServerMsg("Couldn't reach the server. Check your connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Sign in to CampusZen">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.gap}>
          {serverMsg ? (
            <View style={[styles.banner, { backgroundColor: `${t.error}1A` }]}>
              <Text style={[styles.bannerText, { color: t.error }]}>{serverMsg}</Text>
            </View>
          ) : null}

          <FloatField
            label="Username"
            prefix="@"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            value={username}
            error={errors.username}
            onChangeText={(v) => {
              setUsername(sanitizeUsername(v));
              if (errors.username) setErrors((p) => ({ ...p, username: undefined }));
              setServerMsg(null);
            }}
          />

          <FloatField
            label="Password"
            prefix="•"
            secureTextEntry={!showPw}
            autoComplete="current-password"
            value={password}
            error={errors.password}
            onChangeText={(v) => {
              setPassword(v);
              if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
              setServerMsg(null);
            }}
            suffix={
              <Pressable
                onPress={() => setShowPw((v) => !v)}
                accessibilityRole="button"
                accessibilityLabel={showPw ? "Hide password" : "Show password"}
                hitSlop={12}
              >
                <Text style={[styles.toggle, { color: t.accent }]}>
                  {showPw ? "Hide" : "Show"}
                </Text>
              </Pressable>
            }
          />

          <CheckBox checked={remember} onChange={setRemember} label="Remember me" />

          <PillButton title="Sign in" loadingTitle="Signing in…" loading={loading} onPress={onSubmit} />

          <Text style={[styles.switch, { color: t.secondary }]}>
            Don&apos;t have an account?{" "}
            <Link href="/signup" style={[styles.link, { color: t.accent }]}>
              Sign up
            </Link>
          </Text>
        </View>
      </KeyboardAvoidingView>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 20 },
  banner: { borderRadius: 4, paddingHorizontal: 12, paddingVertical: 10 },
  bannerText: { fontSize: 15, lineHeight: 20 },
  toggle: { fontSize: 15, lineHeight: 20, fontWeight: "700" },
  switch: { textAlign: "center", fontSize: 15, lineHeight: 20 },
  link: { fontWeight: "700" },
});
