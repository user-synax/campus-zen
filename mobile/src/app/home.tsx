import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ApiError, api, type FeedPost } from "../lib/api";
import { PostCard } from "../components/PostCard";
import { PillButton } from "../components/PillButton";
import { useSession } from "../ctx/AuthContext";
import { useTheme } from "../theme";

type Tab = "following" | "discovery";
const PAGE_SIZE = 20;

interface TabState {
  posts: FeedPost[];
  page: number;
  hasMore: boolean;
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  error: string | null;
}

const freshTab = (): TabState => ({
  posts: [],
  page: 0,
  hasMore: true,
  loading: true,
  refreshing: false,
  loadingMore: false,
  error: null,
});

function dedupe(prev: FeedPost[], next: FeedPost[]): FeedPost[] {
  const seen = new Set(prev.map((p) => p._id));
  const out = [...prev];
  for (const p of next) {
    if (!p || seen.has(p._id)) continue;
    seen.add(p._id);
    out.push(p);
  }
  return out;
}

function SkeletonRow() {
  const t = useTheme();
  return (
    <View style={[styles.skelRow, { borderBottomColor: t.border }]}>
      <View style={[styles.skelAvatar, { backgroundColor: t.surfaceStrong }]} />
      <View style={styles.skelBody}>
        <View style={[styles.skelBar, styles.skelShort, { backgroundColor: t.surfaceStrong }]} />
        <View style={[styles.skelBar, { backgroundColor: t.surfaceStrong }]} />
        <View style={[styles.skelBar, styles.skelMid, { backgroundColor: t.surfaceStrong }]} />
      </View>
    </View>
  );
}

export default function Home() {
  const t = useTheme();
  const { logout } = useSession();
  const [tab, setTab] = useState<Tab>("discovery");
  const [feeds, setFeeds] = useState<Record<Tab, TabState>>({
    following: freshTab(),
    discovery: freshTab(),
  });
  const patch = useCallback((key: Tab, p: Partial<TabState>) => {
    setFeeds((f) => ({ ...f, [key]: { ...f[key], ...p } }));
  }, []);

  const loadPage = useCallback(
    async (key: Tab, page: number, mode: "initial" | "more" | "refresh") => {
      if (mode === "initial") patch(key, { loading: true, error: null });
      else if (mode === "more") patch(key, { loadingMore: true });
      else patch(key, { refreshing: true, error: null });
      try {
        const fn = key === "following" ? api.getFeed : api.getPublicFeed;
        const res = await fn({ page, limit: PAGE_SIZE });
        const { posts, hasMore } = res.data;
        setFeeds((f) => {
          const cur = f[key];
          return {
            ...f,
            [key]: {
              ...cur,
              posts: mode === "more" ? dedupe(cur.posts, posts) : dedupe([], posts),
              page,
              hasMore,
              loading: false,
              refreshing: false,
              loadingMore: false,
              error: null,
            },
          };
        });
      } catch (e) {
        const msg =
          e instanceof ApiError && !e.offline
            ? (e.data.message ?? "Couldn't load posts")
            : "Check your connection and try again.";
        patch(key, { loading: false, refreshing: false, loadingMore: false, error: msg });
      }
    },
    [patch],
  );

  // Initial load. State updates happen in promise callbacks only, so the
  // effect body itself never calls setState (react-hooks/set-state-in-effect).
  useEffect(() => {
    let alive = true;
    api
      .getPublicFeed({ page: 1, limit: PAGE_SIZE })
      .then((res) => {
        if (!alive) return;
        setFeeds((f) => ({
          ...f,
          discovery: {
            ...f.discovery,
            posts: dedupe([], res.data.posts),
            page: 1,
            hasMore: res.data.hasMore,
            loading: false,
            error: null,
          },
        }));
      })
      .catch((e: unknown) => {
        if (!alive) return;
        const msg =
          e instanceof ApiError && !e.offline
            ? (e.data.message ?? "Couldn't load posts")
            : "Check your connection and try again.";
        setFeeds((f) => ({
          ...f,
          discovery: { ...f.discovery, loading: false, error: msg },
        }));
      });
    return () => {
      alive = false;
    };
  }, []);

  const state = feeds[tab];

  const switchTab = (next: Tab) => {
    setTab(next);
    const s = feeds[next];
    if (!s.loading && s.posts.length === 0 && !s.error) loadPage(next, 1, "initial");
  };

  const renderItem = useCallback(
    ({ item }: { item: FeedPost }) => <PostCard initial={item} />,
    [],
  );

  const header = (
    <View>
      <View style={styles.topbar}>
        <Text style={[styles.wordmark, { color: t.text }]}>CampusZen</Text>
        <Pressable
          onPress={logout}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          hitSlop={12}
          style={styles.signout}
        >
          <Text style={[styles.signoutText, { color: t.secondary }]}>Sign out</Text>
        </Pressable>
      </View>
      <View style={[styles.tabs, { borderBottomColor: t.border, backgroundColor: t.bg }]}>
        {(
          [
            { id: "following", label: "Following" },
            { id: "discovery", label: "For you" },
          ] as const
        ).map((item) => {
          const active = tab === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => switchTab(item.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={styles.tab}
            >
              <Text
                style={[
                  styles.tabLabel,
                  { color: active ? t.text : t.secondary },
                  active && styles.tabActive,
                ]}
              >
                {item.label}
              </Text>
              {active ? <View style={[styles.tabBar, { backgroundColor: t.accent }]} /> : null}
            </Pressable>
          );
        })}
      </View>
      {state.error && state.posts.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyTitle, { color: t.text }]}>Couldn&apos;t load posts</Text>
          <Text style={[styles.emptyDesc, { color: t.secondary }]}>{state.error}</Text>
          <View style={styles.emptyBtn}>
            <PillButton title="Try again" onPress={() => loadPage(tab, 1, "initial")} />
          </View>
        </View>
      ) : null}
      {!state.loading && !state.error && state.posts.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyTitle, { color: t.text }]}>
            {tab === "following" ? "You're not following anyone yet" : "Nothing here yet"}
          </Text>
          <Text style={[styles.emptyDesc, { color: t.secondary }]}>
            {tab === "following"
              ? "Follow students and their posts will show up here, newest first."
              : "This is where campus conversations show up. Pull down to check again."}
          </Text>
        </View>
      ) : null}
    </View>
  );

  if (state.loading && state.posts.length === 0 && !state.error) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={["top"]}>
        {header}
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={["top"]}>
      <FlatList
        data={state.posts}
        keyExtractor={(p) => p._id}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ListFooterComponent={
          state.loadingMore ? (
            <View style={styles.more}>
              <ActivityIndicator size="small" color={t.accent} />
            </View>
          ) : state.posts.length > 0 && !state.hasMore ? (
            <Text style={[styles.end, { color: t.secondary }]}>You&apos;re all caught up</Text>
          ) : state.error && state.posts.length > 0 ? (
            <View style={styles.more}>
              <Text style={[styles.moreError, { color: t.secondary }]}>
                Couldn&apos;t load more posts.
              </Text>
              <PillButton title="Try again" onPress={() => loadPage(tab, state.page + 1, "more")} />
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={state.refreshing}
            onRefresh={() => loadPage(tab, 1, "refresh")}
            tintColor={t.accent}
            colors={[t.accent]}
          />
        }
        onEndReached={() => {
          if (state.hasMore && !state.loadingMore && !state.refreshing && !state.loading)
            loadPage(tab, state.page + 1, "more");
        }}
        onEndReachedThreshold={0.6}
        windowSize={11}
        maxToRenderPerBatch={8}
        initialNumToRender={6}
        removeClippedSubviews
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  wordmark: { fontSize: 20, lineHeight: 24, fontWeight: "800", letterSpacing: -0.6 },
  tabs: { flexDirection: "row", borderBottomWidth: 1 },
  tab: { flex: 1, height: 53, alignItems: "center", justifyContent: "center" },
  tabLabel: { fontSize: 17, lineHeight: 22, fontWeight: "500", paddingHorizontal: 16 },
  tabActive: { fontWeight: "700" },
  tabBar: {
    position: "absolute",
    bottom: 0,
    left: 24,
    right: 24,
    height: 4,
    borderTopLeftRadius: 9999,
    borderTopRightRadius: 9999,
  },
  skelRow: { flexDirection: "row", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  skelAvatar: { width: 40, height: 40, borderRadius: 9999 },
  skelBody: { flex: 1, gap: 8 },
  skelBar: { height: 12, borderRadius: 4 },
  skelShort: { width: 160 },
  skelMid: { width: "75%" },
  empty: { alignItems: "center", paddingHorizontal: 24, paddingVertical: 56 },
  emptyTitle: { fontSize: 20, lineHeight: 24, fontWeight: "800", textAlign: "center" },
  emptyDesc: { marginTop: 8, fontSize: 15, lineHeight: 20, textAlign: "center" },
  emptyBtn: { marginTop: 24, width: "100%", maxWidth: 240 },
  more: { alignItems: "center", paddingVertical: 24, gap: 12 },
  moreError: { fontSize: 15, lineHeight: 20 },
  end: { paddingVertical: 32, textAlign: "center", fontSize: 13, lineHeight: 17 },
  signout: { position: "absolute", top: 8, right: 12, padding: 8 },
  signoutText: { fontSize: 13, lineHeight: 17, fontWeight: "600" },
});
