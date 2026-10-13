import { forwardRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { ApiError, api, type AuthUser, type PostComment } from "../lib/api";
import { useTheme } from "../theme";

const MAX = 500;

/**
 * Mirrors web ReplyComposer: own avatar + autogrowing box, "Post your
 * reply" placeholder, remaining counter past 375 chars, pill Reply button.
 * Text-only, no media.
 */
export const ReplyComposer = forwardRef<
  TextInput,
  { postId: string; me: AuthUser | null; onPosted: (comment: PostComment) => void }
>(function ReplyComposer({ postId, me, onPosted }, ref) {
  const t = useTheme();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = text.trim();
  const over = text.length > MAX;
  const disabled = !trimmed || over || busy;
  const initial = (me?.fullName || me?.username || "?").slice(0, 1).toUpperCase();

  const submit = async () => {
    if (disabled) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.createReply(postId, trimmed);
      setText("");
      onPosted(res.data.comment);
    } catch (e) {
      setError(
        e instanceof ApiError && !e.offline
          ? (e.data.message ?? "Couldn't post your reply")
          : "Check your connection and try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.wrap, { borderBottomColor: t.border }]}>
      <View style={[styles.avatar, { backgroundColor: t.surfaceStrong }]}>
        {me?.avatarUrl ? (
          <Image
            source={{ uri: me.avatarUrl }}
            style={styles.avatarImg}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <Text style={[styles.initial, { color: t.text }]}>{initial}</Text>
        )}
      </View>
      <View style={styles.right}>
        <TextInput
          ref={ref}
          value={text}
          onChangeText={(v) => {
            setText(v);
            if (error) setError(null);
          }}
          placeholder="Post your reply"
          placeholderTextColor={t.secondary}
          selectionColor={t.accent}
          multiline
          maxLength={MAX + 40}
          submitBehavior="blurAndSubmit"
          returnKeyType="send"
          onSubmitEditing={submit}
          style={[styles.input, { color: t.text }]}
          accessibilityLabel="Post your reply"
        />
        {error ? (
          <Text style={[styles.error, { color: t.error }]}>{error}</Text>
        ) : null}
        <View style={styles.footer}>
          {text.length > 375 ? (
            <Text
              style={[styles.counter, { color: over ? t.error : t.secondary }]}
            >
              {MAX - text.length}
            </Text>
          ) : (
            <View />
          )}
          <Pressable
            onPress={submit}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel="Reply"
            style={[styles.btn, { backgroundColor: t.accent }, disabled && styles.disabled]}
          >
            {busy ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.btnLabel}>Reply</Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: { width: 40, height: 40 },
  initial: { fontSize: 13, lineHeight: 18, fontWeight: "700" },
  right: { flex: 1 },
  input: { minHeight: 52, fontSize: 15, lineHeight: 20, padding: 0, textAlignVertical: "top" },
  error: { marginTop: 6, fontSize: 13, lineHeight: 17 },
  footer: { marginTop: 4, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  counter: { fontSize: 13, lineHeight: 17, fontVariant: ["tabular-nums"] },
  btn: {
    height: 32,
    minWidth: 76,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  disabled: { opacity: 0.5 },
  btnLabel: { color: "#fff", fontSize: 14, lineHeight: 18, fontWeight: "700" },
});
