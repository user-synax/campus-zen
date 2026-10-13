import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { ApiError, api, type FeedPost, type PostComment } from "../../lib/api";
import {
  badgeColors,
  getBadgeKind,
  timeAgo,
} from "../../lib/posts";
import { PostCard } from "../../components/PostCard";
import { ReplyComposer } from "../../components/ReplyComposer";
import { PillButton } from "../../components/PillButton";
import { useSession } from "../../ctx/AuthContext";
import { useTheme } from "../../theme";

const PAGE_SIZE = 20;

function ReplyRow({ comment }: { comment: PostComment }) {
  const t = useTheme();
  const a = comment.author;
  const badge = getBadgeKind(a);
  const initial = (a.fullName || a.username || "?").slice(0, 1).toUpperCase();
  return (
    <View style={[styles.reply, { borderBottomColor: t.border }]}>
      <View style={[styles.avatar, { backgroundColor: t.borderStrong }]}>
        {a.avatarUrl ? (
          <Image
            source={{ uri: a.avatarUrl }}
            style={styles.avatarImg}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <Text style={[styles.initial, { color: t.text }]}>{initial}</Text>
        )}
      </View>
      <View style={styles.replyBody}>
        <View style={styles.replyHeader}>
          <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
            {a.fullName || a.username}
          </Text>
          {badge ? (
            <MaterialCommunityIcons name="check-decagram" size={16} color={badgeColors[badge]} />
          ) : null}
          <Text style={[styles.meta, { color: t.secondary }]} numberOfLines={1}>
            @{a.username} · {timeAgo(comment.createdAt)}
          </Text>
        </View>
        <Text style={[styles.replyText, { color: t.text }]}>{comment.text}</Text>
      </View>
    </View>
  );
}

export default function PostDetail() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const composerRef = useRef<TextInput>(null);

  const [post, setPost] = useState<FeedPost | null>(null);
  const [postVersion, setPostVersion] = useState(0);
  const [loadingPost, setLoadingPost] = useState(true);
  const [postError, setPostError] = useState<string | null>(null);

  const [comments, setComments] = useState<PostComment[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [repliesError, setRepliesError] = useState<string | null>(null);

  const failMsg = (e: unknown, fallback: string) =>
    e instanceof ApiError && !e.offline ? (e.data.message ?? fallback) : fallback;

  const loadReplies = useCallback(
    async (targetPage: number, mode: "initial" | "more" | "refresh") => {
      if (!id) return;
      if (mode === "more") setLoadingMore(true);
      try {
        const res = await api.getReplies(id, { page: targetPage, limit: PAGE_SIZE });
        const fresh = res.data.comments ?? [];
        setComments((prev) => {
          if (mode !== "more") return fresh;
          const seen = new Set(prev.map((c) => c._id));
          return [...prev, ...fresh.filter((c) => c && !seen.has(c._id))];
        });
        setPage(targetPage);
        setHasMore(res.data.hasMore);
        setRepliesError(null);
      } catch (e) {
        if (mode !== "more") setRepliesError(failMsg(e, "Couldn't load replies"));
      } finally {
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [id],
  );

  const loadPost = useCallback(
    async (mode: "initial" | "refresh") => {
      if (!id) return;
      if (mode === "refresh") setRefreshing(true);
      try {
        const res = await api.getPost(id);
        setPost(res.data.post);
        setPostError(null);
      } catch (e) {
        setPostError(failMsg(e, "Post not found. It may have been deleted."));
      } finally {
        setLoadingPost(false);
        if (mode === "refresh") setRefreshing(false);
      }
    },
    [id],
  );

  // Initial load — promise callbacks only, no sync setState in the body.
  useEffect(() => {
    let alive = true;
    api
      .getPost(id as string)
      .then((res) => {
        if (alive) {
          setPost(res.data.post);
          setLoadingPost(false);
        }
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setPostError(
          e instanceof ApiError && !e.offline
            ? (e.data.message ?? "Post not found. It may have been deleted.")
            : "Check your connection and try again.",
        );
        setLoadingPost(false);
      });
    api
      .getReplies(id as string, { page: 1, limit: PAGE_SIZE })
      .then((res) => {
        if (!alive) return;
        setComments(res.data.comments ?? []);
        setPage(1);
        setHasMore(res.data.hasMore);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setRepliesError(
          e instanceof ApiError && !e.offline
            ? (e.data.message ?? "Couldn't load replies")
            : "Check your connection and try again.",
        );
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only; id is route-param stable
  }, []);

  const refresh = () => {
    loadPost("refresh");
    loadReplies(1, "refresh");
  };

  const onPosted = (comment: PostComment) => {
    setComments((prev) => (prev.some((c) => c._id === comment._id) ? prev : [comment, ...prev]));
    // Re-read the post so counts + flags are server truth, then remount the
    // card with it (key bump) rather than patching its internal state.
    api
      .getPost(id as string)
      .then((res) => {
        setPost(res.data.post);
        setPostVersion((v) => v + 1);
      })
      .catch(() => {});
  };

  const replyCount = post?.replyCount ?? comments.length;
  const title = post ? `${timeAgo(post.createdAt)}${post.edited ? " · edited" : ""}` : "Post";

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={["top"]}>
      <View style={[styles.topbar, { borderBottomColor: t.border }]}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
          style={styles.back}
        >
          <Feather name="arrow-left" size={20} color={t.text} />
        </Pressable>
        <View style={styles.titles}>
          <Text style={[styles.title, { color: t.text }]} numberOfLines={1}>
            Post
          </Text>
          <Text style={[styles.subtitle, { color: t.secondary }]} numberOfLines={1}>
            {title}
          </Text>
        </View>
      </View>

      {loadingPost ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={t.accent} />
        </View>
      ) : postError || !post ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyTitle, { color: t.text }]}>Post not found</Text>
          <Text style={[styles.emptyDesc, { color: t.secondary }]}>{postError}</Text>
          <View style={styles.emptyBtn}>
            <PillButton title="Back to feed" onPress={() => router.replace("/home")} />
          </View>
        </View>
      ) : (
        <FlatList
          data={comments}
          keyExtractor={(c) => c._id}
          renderItem={({ item }) => <ReplyRow comment={item} />}
          ListHeaderComponent={
            <View>
              <PostCard
                key={`${post._id}:${postVersion}`}
                initial={post}
                detail
                onReply={() => composerRef.current?.focus()}
              />
              <ReplyComposer
                ref={composerRef}
                postId={post._id}
                me={user}
                onPosted={onPosted}
              />
              <View style={styles.repliesHead}>
                <Text style={[styles.repliesTitle, { color: t.text }]}>
                  {replyCount} {replyCount === 1 ? "reply" : "replies"}
                </Text>
              </View>
              {repliesError && comments.length === 0 ? (
                <View style={styles.empty}>
                  <Text style={[styles.emptyDesc, { color: t.secondary }]}>{repliesError}</Text>
                  <View style={styles.emptyBtn}>
                    <PillButton title="Try again" onPress={() => loadReplies(1, "initial")} />
                  </View>
                </View>
              ) : null}
              {!repliesError && comments.length === 0 && !loadingMore ? (
                <View style={styles.empty}>
                  <Text style={[styles.emptyTitle, { color: t.text }]}>No replies yet</Text>
                  <Text style={[styles.emptyDesc, { color: t.secondary }]}>
                    Be the first to reply — up to 500 characters.
                  </Text>
                </View>
              ) : null}
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.more}>
                <ActivityIndicator size="small" color={t.accent} />
              </View>
            ) : hasMore && comments.length > 0 ? (
              <View style={styles.more}>
                <Pressable
                  onPress={() => loadReplies(page + 1, "more")}
                  accessibilityRole="button"
                  accessibilityLabel="Show more replies"
                  style={[styles.moreBtn, { borderColor: t.borderStrong }]}
                >
                  <Text style={[styles.moreLabel, { color: t.text }]}>Show more replies</Text>
                </Pressable>
              </View>
            ) : comments.length > 0 ? (
              <Text style={[styles.end, { color: t.secondary }]}>
                {comments.length} {comments.length === 1 ? "reply" : "replies"}
              </Text>
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={t.accent}
              colors={[t.accent]}
            />
          }
          onEndReached={() => {
            if (hasMore && !loadingMore && !refreshing) loadReplies(page + 1, "more");
          }}
          onEndReachedThreshold={0.6}
          windowSize={11}
          removeClippedSubviews
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 53,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  back: {
    width: 36,
    height: 36,
    marginLeft: -8,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
  },
  titles: { flex: 1 },
  title: { fontSize: 20, lineHeight: 24, fontWeight: "800" },
  subtitle: { fontSize: 13, lineHeight: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 80 },
  empty: { alignItems: "center", paddingHorizontal: 24, paddingVertical: 48 },
  emptyTitle: { fontSize: 20, lineHeight: 24, fontWeight: "800", textAlign: "center" },
  emptyDesc: { marginTop: 8, fontSize: 15, lineHeight: 20, textAlign: "center" },
  emptyBtn: { marginTop: 24, width: "100%", maxWidth: 240 },
  repliesHead: { paddingHorizontal: 16, paddingVertical: 12 },
  repliesTitle: { fontSize: 20, lineHeight: 24, fontWeight: "800" },
  reply: { flexDirection: "row", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
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
  replyBody: { flex: 1, minWidth: 0 },
  replyHeader: { flexDirection: "row", alignItems: "center", gap: 4 },
  name: { fontSize: 15, lineHeight: 20, fontWeight: "700", flexShrink: 1 },
  meta: { fontSize: 15, lineHeight: 20, flexShrink: 1 },
  replyText: { marginTop: 2, fontSize: 15, lineHeight: 20 },
  more: { alignItems: "center", padding: 16 },
  moreBtn: {
    width: "100%",
    height: 40,
    borderRadius: 9999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  moreLabel: { fontSize: 15, lineHeight: 20, fontWeight: "700" },
  end: { paddingVertical: 24, textAlign: "center", fontSize: 13, lineHeight: 17 },
});
