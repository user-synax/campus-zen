import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Link, router } from "expo-router";
import { ApiError, api } from "../lib/api";
import {
  isValidEmail,
  sanitizeUsername,
  usernameFormatStatus,
  type FormatState,
} from "../lib/validation";
import { useSession } from "../ctx/AuthContext";
import { AuthShell } from "../components/AuthShell";
import { FloatField } from "../components/FloatField";
import { PillButton } from "../components/PillButton";
import { PasswordStrength } from "../components/PasswordStrength";
import { useTheme } from "../theme";

export default function Signup() {
  const t = useTheme();
  const { signup } = useSession();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [errors, setErrors] = useState<{
    fullName?: string;
    username?: string;
    email?: string;
    password?: string;
  }>({});

  const [checked, setChecked] = useState<{
    for: string;
    available: boolean;
    reason: string;
  } | null>(null);
  const [checkingUser, setCheckingUser] = useState(false);
  const checkId = useRef(0);
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear any pending availability check on unmount.
  useEffect(
    () => () => {
      if (checkTimer.current) clearTimeout(checkTimer.current);
    },
    [],
  );

  // Derived during render (no cascading renders): format errors win, then
  // the last backend result for the current value, else idle.
  const formatStatus = usernameFormatStatus(username);
  const userAvail: FormatState =
    formatStatus ??
    (checked && checked.for === username
      ? checked.available
        ? { state: "available", msg: "Available" }
        : { state: "taken", msg: checked.reason || "Username is taken" }
      : { state: "idle", msg: "" });

  const onUsernameChange = (v: string) => {
    const clean = sanitizeUsername(v);
    setUsername(clean);
    if (errors.username) setErrors((p) => ({ ...p, username: undefined }));
    setServerError("");
    if (checkTimer.current) clearTimeout(checkTimer.current);
    if (usernameFormatStatus(clean) === null && clean) {
      const id = ++checkId.current;
      setCheckingUser(true);
      checkTimer.current = setTimeout(async () => {
        try {
          const res = await api.checkUsername(clean);
          if (checkId.current === id)
            setChecked({ for: clean, ...res.data });
        } catch {
          if (checkId.current === id) setChecked(null);
        } finally {
          if (checkId.current === id) setCheckingUser(false);
        }
      }, 400);
    } else {
      setCheckingUser(false);
    }
  };

  const validate = () => {
    const e: typeof errors = {};
    if (!fullName.trim() || fullName.trim().length < 2)
      e.fullName = "Enter your full name (at least 2 characters).";
    if (!username.trim()) e.username = "Choose a username.";
    else if (userAvail.state === "error" || userAvail.state === "taken")
      e.username = userAvail.msg;
    else {
      const fmt = usernameFormatStatus(username);
      if (fmt && fmt.state === "error") e.username = fmt.msg;
    }
    if (!email.trim()) e.email = "Enter your email.";
    else if (!isValidEmail(email)) e.email = "Use a gmail.com or proton.me email.";
    if (!password) e.password = "Create a password.";
    else if (password.length < 8) e.password = "Minimum 8 characters.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async () => {
    setServerError("");
    if (!validate()) return;
    if (userAvail.state !== "available") {
      setErrors((p) => ({ ...p, username: "Username not available" }));
      return;
    }
    setLoading(true);
    try {
      await signup({
        fullName: fullName.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        password,
      });
      router.replace("/home");
    } catch (err) {
      if (err instanceof ApiError && !err.offline) {
        const data = err.data;
        if (data.code === "USERNAME_TAKEN") {
          setErrors((p) => ({ ...p, username: "Username is already taken" }));
        } else if (data.code === "EMAIL_TAKEN") {
          setErrors((p) => ({ ...p, email: "Email already registered" }));
        } else if (data.details && Array.isArray(data.details)) {
          const ne: typeof errors = {};
          for (const d of data.details) {
            if (d.path?.includes("username")) ne.username = d.message;
            else if (d.path?.includes("email")) ne.email = d.message;
            else if (d.path?.includes("password")) ne.password = d.message;
            else if (d.path?.includes("fullName")) ne.fullName = d.message;
          }
          if (Object.keys(ne).length) setErrors(ne);
          else setServerError(data.message ?? "Signup failed");
        } else {
          setServerError(data.message ?? "Signup failed");
        }
        if (err.status === 429) setServerError(data.message ?? "Too many attempts. Try later.");
      } else {
        setServerError("Couldn't reach the server. Check your connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const availError =
    !errors.username && userAvail.state !== "available" && userAvail.state !== "idle" && !checkingUser
      ? userAvail.msg
      : undefined;

  return (
    <AuthShell title="Sign up for CampusZen">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.gap}>
          {serverError ? (
            <View style={[styles.banner, { backgroundColor: `${t.error}1A` }]}>
              <Text style={[styles.bannerText, { color: t.error }]}>{serverError}</Text>
            </View>
          ) : null}

          <FloatField
            label="Full name"
            autoComplete="name"
            value={fullName}
            error={errors.fullName}
            onChangeText={(v) => {
              setFullName(v);
              if (errors.fullName) setErrors((p) => ({ ...p, fullName: undefined }));
              setServerError("");
            }}
          />

          <View>
            <Text style={[styles.hint, { color: t.secondary }]}>@username</Text>
            <FloatField
              label="Username"
              prefix="@"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              maxLength={20}
              value={username}
              error={errors.username ?? availError}
              onChangeText={onUsernameChange}
              suffix={
                username ? (
                  <View style={styles.avail}>
                    {checkingUser ? (
                      <ActivityIndicator size="small" color={t.secondary} />
                    ) : userAvail.state === "available" ? (
                      <Text style={[styles.availText, { color: t.success }]}>✓ Available</Text>
                    ) : userAvail.state === "taken" || userAvail.state === "error" ? (
                      <Text style={[styles.availText, { color: t.error }]}>
                        {userAvail.state === "taken" ? "Taken" : "Invalid"}
                      </Text>
                    ) : null}
                  </View>
                ) : null
              }
            />
          </View>

          <View>
            <FloatField
              label="Email"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              keyboardType="email-address"
              value={email}
              error={errors.email}
              onChangeText={(v) => {
                setEmail(v);
                if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
                setServerError("");
              }}
            />
            <Text style={[styles.hintBelow, { color: t.secondary }]}>Allowed: gmail.com, proton.me</Text>
          </View>

          <View>
            <FloatField
              label="Password"
              secureTextEntry={!showPw}
              autoComplete="new-password"
              value={password}
              error={errors.password}
              onChangeText={(v) => {
                setPassword(v);
                if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
                setServerError("");
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
            <PasswordStrength password={password} />
          </View>

          <PillButton
            title="Create account"
            loadingTitle="Creating account…"
            loading={loading}
            onPress={onSubmit}
          />

          <Text style={[styles.switch, { color: t.secondary }]}>
            Already have an account?{" "}
            <Link href="/login" style={[styles.link, { color: t.accent }]}>
              Sign in
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
  hint: { marginBottom: 6, textAlign: "right", fontSize: 13, lineHeight: 17 },
  hintBelow: { marginTop: 6, fontSize: 13, lineHeight: 17 },
  avail: { flexDirection: "row", alignItems: "center" },
  availText: { fontSize: 13, lineHeight: 17 },
  toggle: { fontSize: 15, lineHeight: 20, fontWeight: "700" },
  switch: { textAlign: "center", fontSize: 15, lineHeight: 20 },
  link: { fontWeight: "700" },
});
