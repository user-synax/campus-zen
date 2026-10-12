import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { api, type PostPoll } from "../lib/api";
import type { FeedPost } from "../lib/posts";
import { useTheme } from "../theme";

function closesIn(expiresAt?: string): string {
  if (!expiresAt) return "";
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "Closed";
  const m = Math.floor(ms / 60000);
  if (m < 60) return `Closes in ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Closes in ${h}h`;
  return `Closes in ${Math.floor(h / 24)}d`;
}

/**
 * Mirrors web PollBlock: outlined pill options pre-vote, percentage bars
 * after voting/close. Votes are changeable; updates are optimistic.
 */
export function PollBlock({
  post,
  onVoted,
}: {
  post: FeedPost;
  onVoted: (poll: PostPoll, myVote: number | null) => void;
}) {
  const t = useTheme();
  const [busy, setBusy] = useState<number | null>(null);
  if (!post.poll) return null;

  const poll = post.poll;
  // eslint-disable-next-line react-hooks/purity -- wall-clock read for expiry display; re-evaluated each render like web
  const expired = poll.expiresAt ? new Date(poll.expiresAt).getTime() <= Date.now() : false;
  const closed = poll.closed || expired;
  const voted = post.myVote !== null && post.myVote !== undefined;

  const vote = async (idx: number) => {
    if (closed || busy !== null) return;
    setBusy(idx);
    const prevPoll = poll;
    const prevVote = post.myVote;
    // Optimistic: move the vote locally.
    const optimistic: PostPoll = {
      ...poll,
      totalVotes: poll.totalVotes + (prevVote === idx ? 0 : 1),
      options: poll.options.map((o, i) => ({
        ...o,
        votes: o.votes + (i === idx ? 1 : 0) - (i === prevVote ? 1 : 0),
      })),
    };
    onVoted(optimistic, idx);
    try {
      const res = await api.votePoll(post._id, idx);
      onVoted(res.data.poll, res.data.myVote);
    } catch {
      onVoted(prevPoll, prevVote ?? null);
    } finally {
      setBusy(null);
    }
  };

  const footer = `${poll.totalVotes} vote${poll.totalVotes === 1 ? "" : "s"} · ${
    closed ? "Closed" : closesIn(poll.expiresAt)
  }`;

  if (!voted && !closed) {
    return (
      <View style={[styles.box, { borderColor: t.border }]}>
        {poll.options.map((o, i) => (
          <Pressable
            key={i}
            onPress={() => vote(i)}
            disabled={busy !== null}
            accessibilityRole="button"
            accessibilityLabel={`Vote for ${o.text}`}
            style={[styles.option, { borderColor: t.borderStrong }]}
          >
            {busy === i ? (
              <ActivityIndicator size="small" color={t.accent} />
            ) : (
              <Text style={[styles.optionText, { color: t.text }]}>{o.text}</Text>
            )}
          </Pressable>
        ))}
        <Text style={[styles.footer, { color: t.secondary }]}>{footer}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.box, { borderColor: t.border }]}>
      {poll.options.map((o, i) => {
        const pct = poll.totalVotes > 0 ? Math.round((o.votes / poll.totalVotes) * 100) : 0;
        const mine = post.myVote === i;
        return (
          <Pressable
            key={i}
            onPress={() => vote(i)}
            disabled={closed || busy !== null}
            accessibilityRole="button"
            accessibilityLabel={`Vote for ${o.text}, ${pct} percent`}
            style={[styles.bar, { backgroundColor: t.surfaceStrong }]}
          >
            <View
              style={[
                styles.fill,
                { width: `${pct}%`, backgroundColor: mine ? `${t.accent}1F` : t.surfaceStrong },
              ]}
            />
            <View style={styles.barRow}>
              {mine ? <Feather name="check" size={16} color={t.accent} /> : null}
              <Text style={[styles.barText, { color: t.text }]} numberOfLines={1}>
                {o.text}
              </Text>
              <Text style={[styles.pct, { color: t.secondary }]}>
                {busy === i ? "…" : `${pct}%`}
              </Text>
            </View>
          </Pressable>
        );
      })}
      <Text style={[styles.footer, { color: t.secondary }]}>{footer}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { marginTop: 12, borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  option: {
    minHeight: 40,
    borderRadius: 9999,
    borderWidth: 1,
    marginHorizontal: 12,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: "center",
  },
  optionText: { fontSize: 15, lineHeight: 20 },
  bar: {
    minHeight: 40,
    borderRadius: 8,
    marginHorizontal: 12,
    marginTop: 8,
    overflow: "hidden",
    justifyContent: "center",
  },
  fill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 8 },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  barText: { flex: 1, fontSize: 15, lineHeight: 20 },
  pct: { fontSize: 13, lineHeight: 17, fontVariant: ["tabular-nums"] },
  footer: {
    borderTopWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    lineHeight: 16,
    fontVariant: ["tabular-nums"],
  },
});
