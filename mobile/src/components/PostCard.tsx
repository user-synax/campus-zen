import { memo, useEffect, useRef, useState } from "react";
import { Pressable, Share, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "../lib/api";
import {
  badgeColors,
  formatCount,
  getBadgeKind,
  normalizeMedia,
  timeAgo,
  type FeedPost,
} from "../lib/posts";
import { PostMedia } from "./PostMedia";
import { PollBlock } from "./PollBlock";
import { useTheme } from "../theme";

const LIKE = "#f91880";
const REPOST = "#00ba7c";

function Avatar({ post }: { post: FeedPost }) {
  const t = useTheme();
  const a = post.author ?? ({} as FeedPost["author"]);
  const initial = (a.fullName || a.username || "U").slice(0, 1).toUpperCase();
  return (
    <View style={[styles.avatar, { backgroundColor: t.borderStrong }]}>
      {a.avatarUrl ? (
        <Image
          source={{ uri: a.avatarUrl }}
          style={styles.avatarImg}
          contentFit="cover"
          cachePolicy="memory-disk"
          accessibilityLabel={`${a.username} avatar`}
        />
      ) : (
        <Text style={[styles.avatarInitial, { color: t.text }]}>{initial}</Text>
      )}
    </View>
  );
}

function Action({
  icon,
  count,
  color,
  filled,
  label,
  onPress,
}: {
  icon: "message-circle" | "repeat" | "heart" | "bar-chart-2" | "bookmark" | "share-2";
  count?: number;
  color: string;
  filled?: boolean;
  label: string;
  onPress?: () => void;
}) {
  const body = (
    <View style={styles.actionInner}>
      <Feather
        name={icon}
        size={19}
        color={color}
        fill={filled ? color : "transparent"}
        strokeWidth={1.8}
      />
      {count !== undefined && count > 0 ? (
        <Text style={[styles.count, { color }]}>{formatCount(count)}</Text>
      ) : null}
    </View>
  );
  if (!onPress) {
    return (
      <View accessibilityRole="text" accessibilityLabel={label}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={10}
      style={styles.action}
    >
      {body}
    </Pressable>
  );
}

/**
 * Mirrors web PostCard: 40px avatar + name/badge/time header, body text,
 * article card, media grid, poll, and the 5-group action bar with
 * optimistic like/repost/bookmark. Counts hide at zero.
 */
export const PostCard = memo(function PostCard({ initial }: { initial: FeedPost }) {
  const t = useTheme();
  const [post, setPost] = useState(initial);
  const viewed = useRef(false);

  // Deduped impression (backend counts one per viewer per UTC day).
  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    api
      .recordPostView(initial._id)
      .then((res) => {
        if (typeof res.data?.viewCount === "number")
          setPost((p) => ({ ...p, viewCount: res.data.viewCount }));
      })
      .catch(() => {});
  }, [initial._id]);

  const a = post.author ?? ({} as FeedPost["author"]);
  const badge = getBadgeKind(a);
  const media = normalizeMedia(post);

  const toggle = async (
    key: "isLiked" | "isReposted" | "isBookmarked",
    countKey: "likeCount" | "repostCount" | null,
    on: () => Promise<{ liked?: boolean; likeCount?: number; reposted?: boolean; repostCount?: number; bookmarked?: boolean }>,
  ) => {
    const prev = post;
    setPost((p) => ({
      ...p,
      [key]: !p[key],
      ...(countKey ? { [countKey]: (p[countKey] ?? 0) + (p[key] ? -1 : 1) } : {}),
    }));
    try {
      const res = await on();
      setPost((p) => ({
        ...p,
        ...(res.liked !== undefined ? { isLiked: res.liked } : {}),
        ...(res.likeCount !== undefined ? { likeCount: res.likeCount } : {}),
        ...(res.reposted !== undefined ? { isReposted: res.reposted } : {}),
        ...(res.repostCount !== undefined ? { repostCount: res.repostCount } : {}),
        ...(res.bookmarked !== undefined ? { isBookmarked: res.bookmarked } : {}),
      }));
    } catch {
      setPost(prev);
    }
  };

  const share = () => {
    Share.share({ message: `CampusZen post by @${a.username}` }).catch(() => {});
  };

  return (
    <View style={[styles.card, { borderBottomColor: t.border }]}>
      <View style={styles.row}>
        <Avatar post={post} />
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
              {a.fullName || a.username}
            </Text>
            {badge ? (
              <MaterialCommunityIcons
                name="check-decagram"
                size={16}
                color={badgeColors[badge]}
              />
            ) : null}
            <Text style={[styles.time, { color: t.secondary }]} numberOfLines={1}>
              · {timeAgo(post.createdAt)}
              {post.edited ? " · edited" : ""}
            </Text>
          </View>

          {post.kind === "article" ? (
            <View style={[styles.article, { borderColor: t.border }]}>
              <Text style={[styles.articleLabel, { color: t.accent }]}>
                Article · {a.username}/{post.slug}
              </Text>
              <Text style={[styles.articleTitle, { color: t.text }]} numberOfLines={2}>
                {post.title}
              </Text>
              {post.description || post.text ? (
                <Text style={[styles.articleDesc, { color: t.secondary }]} numberOfLines={3}>
                  {post.description || post.text}
                </Text>
              ) : null}
            </View>
          ) : post.text ? (
            <Text style={[styles.body, { color: t.text }]}>{post.text}</Text>
          ) : null}

          <PostMedia items={media} />
          <PollBlock
            post={post}
            onVoted={(poll, myVote) => setPost((p) => ({ ...p, poll, myVote }))}
          />

          <View style={styles.actions}>
            <Action
              icon="message-circle"
              count={post.replyCount}
              color={t.secondary}
              label={`${post.replyCount} replies`}
            />
            <Action
              icon="repeat"
              count={post.repostCount}
              color={post.isReposted ? REPOST : t.secondary}
              label={post.isReposted ? "Undo repost" : "Repost"}
              onPress={() =>
                toggle("isReposted", "repostCount", () =>
                  post.isReposted
                    ? api.unrepostPost(post._id).then((r) => r.data)
                    : api.repostPost(post._id).then((r) => r.data),
                )
              }
            />
            <Action
              icon="heart"
              count={post.likeCount}
              color={post.isLiked ? LIKE : t.secondary}
              filled={post.isLiked}
              label={post.isLiked ? "Unlike" : "Like"}
              onPress={() =>
                toggle("isLiked", "likeCount", () =>
                  post.isLiked
                    ? api.unlikePost(post._id).then((r) => r.data)
                    : api.likePost(post._id).then((r) => r.data),
                )
              }
            />
            {post.viewCount !== null && post.viewCount !== undefined ? (
              <Action
                icon="bar-chart-2"
                count={post.viewCount}
                color={t.secondary}
                label={`${post.viewCount} views`}
              />
            ) : null}
            <Action
              icon="bookmark"
              color={post.isBookmarked ? t.accent : t.secondary}
              filled={post.isBookmarked}
              label={post.isBookmarked ? "Remove bookmark" : "Bookmark"}
              onPress={() =>
                toggle("isBookmarked", null, () =>
                  post.isBookmarked
                    ? api.unbookmarkPost(post._id).then((r) => r.data)
                    : api.bookmarkPost(post._id).then((r) => r.data),
                )
              }
            />
            <Action icon="share-2" color={t.secondary} label="Share post" onPress={share} />
          </View>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  row: { flexDirection: "row", gap: 12 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: { width: 40, height: 40 },
  avatarInitial: { fontSize: 13, lineHeight: 18, fontWeight: "700" },
  content: { flex: 1, minWidth: 0 },
  header: { flexDirection: "row", alignItems: "center", gap: 4 },
  name: { fontSize: 15, lineHeight: 20, fontWeight: "700", flexShrink: 1 },
  time: { fontSize: 15, lineHeight: 20, flexShrink: 1 },
  body: { marginTop: 2, fontSize: 15, lineHeight: 20 },
  article: { marginTop: 4, borderRadius: 12, borderWidth: 1, padding: 12 },
  articleLabel: { fontSize: 12, lineHeight: 16, fontWeight: "700", textTransform: "uppercase" },
  articleTitle: { marginTop: 4, fontSize: 16, lineHeight: 22, fontWeight: "800" },
  articleDesc: { marginTop: 4, fontSize: 14, lineHeight: 20 },
  actions: {
    marginLeft: 0,
    marginTop: 4,
    maxWidth: 425,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  action: { padding: 6 },
  actionInner: { flexDirection: "row", alignItems: "center", gap: 4 },
  count: { fontSize: 13, lineHeight: 17, fontWeight: "500", fontVariant: ["tabular-nums"] },
});
