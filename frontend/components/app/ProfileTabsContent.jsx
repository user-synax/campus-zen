"use client";

import {
  FileText,
  Github,
  Heart,
  Loader2,
  MessageCircle,
  Repeat2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/app/EmptyState";
import { PostCard } from "@/components/app/PostCard";
import {
  PinnedSection,
  pinnedIdOf,
  splitPinned,
} from "@/components/app/PinnedSection";
import { ProfileMediaGrid } from "@/components/app/ProfileMedia";
import { RichText } from "@/components/app/RichText";
import {
  ContributionGraph,
  ContributionGraphBlock,
  ContributionGraphCalendar,
  ContributionGraphFooter,
  ContributionGraphLegend,
  ContributionGraphTotalCount,
} from "@/components/ui/contribution-graph";
import { api } from "@/lib/api";

function TabLoader() {
  return (
    <div className="grid place-items-center py-12">
      <Loader2
        className="h-5 w-5 animate-spin text-[var(--cz-text-secondary)]"
        aria-label="Loading"
      />
    </div>
  );
}

/** Tabs are shared by all three profile surfaces (own, in-app, public). */
function useTabList(fetcher, username, pick) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetcher(username, { page: 1, limit: 20 })
      .then((r) => {
        if (!cancelled) setItems(pick(r) || []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetcher, username, pick]);

  return { items, setItems, loading };
}

const pickPosts = (r) => r.data?.posts;
const pickComments = (r) => r.data?.comments;

export function TabPosts({ username, currentUser, pinnedPost, onPinChange }) {
  const { items: posts, setItems: setPosts, loading } = useTabList(
    api.getUserPosts,
    username,
    pickPosts,
  );

  if (loading) return <TabLoader />;
  if (posts.length === 0 && !pinnedIdOf(pinnedPost))
    return (
      <EmptyState
        icon={FileText}
        title="No posts yet"
        description={
          currentUser
            ? "Your posts will show here. Write the first one."
            : "This student hasn't posted yet."
        }
        {...(currentUser
          ? { actionLabel: "Write a post", actionHref: "/app/create" }
          : {})}
      />
    );

  const { pinnedId, list } = splitPinned(posts, pinnedPost);
  const onDelete = (id) =>
    setPosts((prev) => prev.filter((x) => x._id !== id));
  const onUpdate = (u) =>
    setPosts((prev) => prev.map((x) => (x._id === u._id ? u : x)));

  return (
    <div>
      <PinnedSection
        pinnedPost={pinnedPost}
        posts={posts}
        currentUser={currentUser}
        onPinChange={onPinChange}
        onDelete={onDelete}
        onUpdate={onUpdate}
      />
      {list.map((p) => (
        <PostCard
          key={p._id}
          post={p}
          currentUser={currentUser}
          isPinned={pinnedId ? String(p._id) === pinnedId : false}
          onPinChange={onPinChange}
          onDelete={onDelete}
          onUpdate={onUpdate}
        />
      ))}
    </div>
  );
}

export function TabReplies({ username, isOwn }) {
  const { items: replies, loading } = useTabList(
    api.getUserReplies,
    username,
    pickComments,
  );

  if (loading) return <TabLoader />;
  if (replies.length === 0)
    return (
      <EmptyState
        icon={MessageCircle}
        title="No replies yet"
        description={
          isOwn
            ? "Replies you write on other posts will appear here."
            : "This student hasn't replied to anything yet."
        }
      />
    );

  return (
    <div>
      {replies.map((c) => (
        <div key={c._id} className="cz-row px-4 py-3">
          <Link
            to={`/app/p/${c.post?._id || c.post}`}
            className="text-[15px] leading-[20px] text-[var(--cz-text-secondary)]"
          >
            <span className="block">
              Replied to{" "}
              <span className="font-bold text-[var(--cz-text-primary)]">
                @{c.post?.author?.username || "post"}
              </span>
            </span>
            {c.post?.text ? (
              <span className="mt-0.5 block line-clamp-2">
                {c.post.text}
              </span>
            ) : null}
          </Link>
          <p className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-[20px] text-[var(--cz-text-primary)]">
            <RichText text={c.text} />
          </p>
          <p className="mt-1 text-[13px] text-[var(--cz-text-secondary)]">
            {new Date(c.createdAt).toLocaleString("en-IN")}
          </p>
        </div>
      ))}
    </div>
  );
}

export function TabLikes({ username, currentUser, isOwn }) {
  const { items: posts, loading } = useTabList(
    api.getUserLikes,
    username,
    pickPosts,
  );

  if (loading) return <TabLoader />;
  if (posts.length === 0)
    return (
      <EmptyState
        icon={Heart}
        title="No likes yet"
        description={
          isOwn
            ? "Posts you like are collected here."
            : "This student hasn't liked anything yet."
        }
      />
    );

  return (
    <div>
      {posts.map((p) => (
        <PostCard key={p._id} post={p} currentUser={currentUser} />
      ))}
    </div>
  );
}

export function TabReposts({ username, currentUser, isOwn }) {
  const { items: posts, loading } = useTabList(
    api.getUserReposts,
    username,
    pickPosts,
  );

  if (loading) return <TabLoader />;
  if (posts.length === 0)
    return (
      <EmptyState
        icon={Repeat2}
        title="No reposts yet"
        description={
          isOwn
            ? "Posts you repost appear here."
            : "This student hasn't reposted anything yet."
        }
      />
    );

  return (
    <div>
      {posts.map((p) => (
        <PostCard key={p._id} post={p} currentUser={currentUser} />
      ))}
    </div>
  );
}

export function TabMedia({ username, currentUser }) {
  return <ProfileMediaGrid username={username} currentUser={currentUser} />;
}

export function TabGitHub({ github, onLink }) {
  if (!github) {
    return (
      <EmptyState
        icon={Github}
        title="No GitHub linked"
        description="Link a GitHub username in your profile to show contribution activity here."
        {...(onLink ? { actionLabel: "Add GitHub", onAction: onLink } : {})}
      />
    );
  }

  return (
    <div className="p-4">
      <div className="overflow-hidden rounded-[16px] border border-[var(--cz-border)] p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-1.5 text-[15px] font-bold text-[var(--cz-text-primary)]">
            <Github className="h-4 w-4" aria-hidden /> {github}&rsquo;s
            contributions
          </h3>
          <Link
            href={`https://github.com/${github}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-[32px] shrink-0 items-center justify-center gap-2 rounded-full border border-[var(--cz-border-strong)] px-4 text-[14px] font-bold text-[var(--cz-text-primary)] transition-colors hover:bg-[var(--cz-surface-strong)]"
          >
            GitHub
          </Link>
        </div>
        <ContributionGraph
          username={github}
          blockSize={11}
          blockMargin={3}
          blockRadius={2}
          className="w-full [&_svg]:w-full"
        >
          <ContributionGraphCalendar>
            {(props) => <ContributionGraphBlock {...props} />}
          </ContributionGraphCalendar>
          <ContributionGraphFooter className="mt-2 flex-col gap-2 sm:flex-row sm:items-center">
            <ContributionGraphTotalCount className="text-[13px] text-[var(--cz-text-secondary)]" />
            <ContributionGraphLegend className="text-[13px]" />
          </ContributionGraphFooter>
        </ContributionGraph>
      </div>
    </div>
  );
}
