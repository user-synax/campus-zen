"use client";

import {
  FileText,
  Github,
  Heart,
  Loader2,
  MessageCircle,
  Repeat2,
  UserX,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BlockedProfile } from "@/components/app/BlockedProfile";
import { EmptyState } from "@/components/app/EmptyState";
import { FollowModal } from "@/components/app/FollowModal";
import { PostCard } from "@/components/app/PostCard";
import { PinnedSection, splitPinned } from "@/components/app/PinnedSection";
import { ProfileMediaGrid } from "@/components/app/ProfileMedia";
import { RichText } from "@/components/app/RichText";
import { ProfileHeader, ProfileTabs } from "@/components/app/ProfileHeader";
import { ReportDialog } from "@/components/app/ReportDialog";
import {
  ContributionGraph,
  ContributionGraphBlock,
  ContributionGraphCalendar,
  ContributionGraphFooter,
  ContributionGraphLegend,
  ContributionGraphTotalCount,
} from "@/components/ui/contribution-graph";
import { api } from "@/lib/api";
import {
  useMe,
  useUser,
  useUserPosts,
  useUserReplies,
  useUserLikes,
  useUserReposts,
} from "@/lib/hooks/queries";

function TabPosts({ username, currentUser, pinnedPost, onPinChange }) {
  const { data, isPending } = useUserPosts(username, 1);
  const posts = data?.data?.posts || [];

  if (isPending)
    return (
      <div className="grid place-items-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--cz-text-secondary)]" />
      </div>
    );
  const { pinnedId, list } = splitPinned(posts, pinnedPost);
  if (posts.length === 0 && !pinnedId)
    return (
      <EmptyState
        icon={FileText}
        title="No posts yet"
        description={`@${username} hasn't posted.`}
      />
    );
  return (
    <div className="space-y-3">
      <PinnedSection
        pinnedPost={pinnedPost}
        posts={posts}
        currentUser={currentUser}
        onPinChange={onPinChange}
      />
      {list.map((p) => (
        <PostCard
          key={p._id}
          post={p}
          currentUser={currentUser}
          isPinned={pinnedId ? String(p._id) === pinnedId : false}
          onPinChange={onPinChange}
        />
      ))}
    </div>
  );
}
function TabReplies({ username }) {
  const { data, isPending } = useUserReplies(username, 1);
  const replies = data?.data?.comments || [];

  if (isPending)
    return (
      <div className="grid place-items-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--cz-text-secondary)]" />
      </div>
    );
  if (replies.length === 0)
    return (
      <EmptyState
        icon={MessageCircle}
        title="No replies yet"
        description="Replies will appear here."
      />
    );
  return (
    <div className="space-y-3">
      {replies.map((c) => (
        <div
          key={c._id}
          className="rounded-[16px] border border-[var(--cz-border)] bg-[var(--cz-surface)] p-4"
        >
          <p className="text-[11px] tracking-[0.04em] uppercase text-[var(--cz-text-secondary)]">
            Replied to @{c.post?.author?.username || "post"}
          </p>
          <p className="mt-1 text-[12px] leading-[16px] text-[var(--cz-text-secondary)] line-clamp-2">
            {c.post?.text || "Post"}
          </p>
          <p className="mt-2 text-[14px] leading-[20px] whitespace-pre-wrap break-words">
            <RichText text={c.text} />
          </p>
        </div>
      ))}
    </div>
  );
}
function TabLikes({ username, currentUser }) {
  const { data, isPending } = useUserLikes(username, 1);
  const posts = data?.data?.posts || [];

  if (isPending)
    return (
      <div className="grid place-items-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--cz-text-secondary)]" />
      </div>
    );
  if (posts.length === 0)
    return (
      <EmptyState
        icon={Heart}
        title="No likes yet"
        description="Likes will be here."
      />
    );
  return (
    <div className="space-y-3">
      {posts.map((p) => (
        <PostCard key={p._id} post={p} currentUser={currentUser} />
      ))}
    </div>
  );
}
function TabReposts({ username, currentUser }) {
  const { data, isPending } = useUserReposts(username, 1);
  const posts = data?.data?.posts || [];

  if (isPending)
    return (
      <div className="grid place-items-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--cz-text-secondary)]" />
      </div>
    );
  if (posts.length === 0)
    return (
      <EmptyState
        icon={Repeat2}
        title="No reposts yet"
        description="Reposts will appear here."
      />
    );
  return (
    <div className="space-y-3">
      {posts.map((p) => (
        <PostCard key={p._id} post={p} currentUser={currentUser} />
      ))}
    </div>
  );
}

export default function PublicProfilePage() {
  const { username } = useParams();
  const [tab, setTab] = useState("posts");
  const [followLoading, setFollowLoading] = useState(false);
  const [followModal, setFollowModal] = useState({
    open: false,
    type: "followers",
  });
  const [blocked, setBlocked] = useState(null);
  const [reportUserOpen, setReportUserOpen] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);

  const queryClient = useQueryClient();

  const { data: meData } = useMe();
  const me = meData?.data?.user || null;
  const isGuest = !me;

  const { data: userData, isPending, error } = useUser(username);
  const user = userData?.data?.user || null;
  const isFollowing = user?.isFollowing ?? false;

  const isOwn = me && user && me.username === user.username;

  const handleFollow = async () => {
    if (!user || isOwn || isGuest) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await api.unfollowUser(user._id);
        queryClient.setQueryData(["user", username], (old) => {
          if (!old) return old;
          return {
            ...old,
            data: {
              ...old.data,
              user: {
                ...old.data.user,
                isFollowing: false,
                followersCount: Math.max(0, (old.data.user.followersCount ?? 1) - 1),
              },
            },
          };
        });
      } else {
        await api.followUser(user._id);
        queryClient.setQueryData(["user", username], (old) => {
          if (!old) return old;
          return {
            ...old,
            data: {
              ...old.data,
              user: {
                ...old.data.user,
                isFollowing: true,
                followersCount: (old.data.user.followersCount ?? 0) + 1,
              },
            },
          };
        });
      }
    } catch {}
    setFollowLoading(false);
  };

  if (isPending)
    return (
      <div className="grid place-items-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--cz-text-secondary)]" />
      </div>
    );
  if (blocked)
    return (
      <BlockedProfile
        username={blocked.username || username}
        userId={blocked.userId}
        isBlocker={blocked.isBlocker}
      />
    );
  if (error || !user)
    return (
      <div className="space-y-4 max-w-[640px] mx-auto">
        <EmptyState
          icon={UserX}
          title="Student not found"
          description={error?.data?.message || error?.message || `No student @${username}`}
          actionLabel="Explore students"
          actionHref="/u"
        />
      </div>
    );

  const handleBlockToggle = async () => {
    if (!user || isOwn || isGuest || blockLoading) return;
    setBlockLoading(true);
    try {
      await api.blockUser(user._id);
      setBlocked({
        username: user.username,
        userId: user._id,
        isBlocker: true,
      });
    } catch {}
    setBlockLoading(false);
  };

  return (
    <div className="space-y-4 max-w-[640px] mx-auto">
      {!isGuest ? null : (
        <div className="rounded-[12px] border border-[var(--cz-border)] bg-[var(--cz-surface)] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-[13px] font-medium">Join CampusZen to connect</p>
            <p className="text-[12px] leading-[16px] text-[var(--cz-text-secondary)]">
              Follow @{user.username}, discover classmates, and post.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full border border-[var(--cz-border)] px-4 h-[36px] text-[13px] font-medium hover:bg-[var(--cz-surface-strong)] transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-full bg-[var(--cz-text-primary)] text-[var(--cz-text-inverse)] px-4 h-[36px] text-[13px] font-medium hover:bg-[#ffd9c0] transition-colors"
            >
              Join
            </Link>
          </div>
        </div>
      )}

      <ProfileHeader
        user={user}
        isOwn={!!isOwn}
        isFollowing={isFollowing}
        followLoading={followLoading}
        onEdit={
          isOwn ? () => (window.location.href = "/app/profile") : undefined
        }
        onFollow={isGuest || isOwn ? undefined : handleFollow}
        onFollowersClick={() =>
          setFollowModal({ open: true, type: "followers" })
        }
        onFollowingClick={() =>
          setFollowModal({ open: true, type: "following" })
        }
        onReportUser={
          isGuest || isOwn ? undefined : () => setReportUserOpen(true)
        }
        onBlockToggle={isGuest || isOwn ? undefined : handleBlockToggle}
        blockLoading={blockLoading}
      />
      {isGuest ? (
        <p className="text-center text-[11px] tracking-[0.04em] uppercase text-[var(--cz-text-secondary)]/60">
          Public profile • /u/{user.username} • Follow hidden for guests
        </p>
      ) : null}
      <ProfileTabs active={tab} onChange={setTab} />
      {tab === "posts" ? (
        <TabPosts
          username={user.username}
          currentUser={me}
          pinnedPost={user.pinnedPost}
          onPinChange={(p) =>
            queryClient.setQueryData(["user", username], (old) => {
              if (!old) return old;
              return {
                ...old,
                data: { ...old.data, user: { ...old.data.user, pinnedPost: p } },
              };
            })
          }
        />
      ) : tab === "replies" ? (
        <TabReplies username={user.username} />
      ) : tab === "media" ? (
        <ProfileMediaGrid username={user.username} currentUser={me} />
      ) : tab === "likes" ? (
        <TabLikes username={user.username} currentUser={me} />
      ) : tab === "reposts" ? (
        <TabReposts username={user.username} currentUser={me} />
      ) : tab === "github" ? (
        user.socialLinks?.github ? (
          <div className="rounded-[16px] border border-[var(--cz-border)] bg-[var(--cz-surface)] p-4 overflow-hidden">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-[13px] font-semibold flex items-center gap-1.5">
                <Github className="h-4 w-4" /> {user.socialLinks.github}'s
                contributions
              </h3>
              <a
                href={`https://github.com/${user.socialLinks.github}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-medium text-[var(--cz-muted)] hover:text-[#9aa0ff] underline-offset-4 hover:underline"
              >
                View on GitHub →
              </a>
            </div>
            <ContributionGraph
              username={user.socialLinks.github}
              blockSize={11}
              blockMargin={3}
              blockRadius={2}
              className="w-full"
            >
              <ContributionGraphCalendar>
                {(props) => <ContributionGraphBlock {...props} />}
              </ContributionGraphCalendar>
              <ContributionGraphFooter className="mt-2 flex-col sm:flex-row sm:items-center gap-2">
                <ContributionGraphTotalCount className="text-[11px] text-[var(--cz-text-secondary)]" />
                <ContributionGraphLegend className="text-[11px]" />
              </ContributionGraphFooter>
            </ContributionGraph>
          </div>
        ) : (
          <EmptyState
            icon={Github}
            title="No GitHub linked"
            description={`@${user.username} hasn't linked GitHub yet.`}
          />
        )
      ) : null}
      <FollowModal
        open={followModal.open}
        onClose={() => setFollowModal((s) => ({ ...s, open: false }))}
        userId={user._id}
        type={followModal.type}
        viewerId={me?._id}
      />
      {reportUserOpen ? (
        <ReportDialog
          targetType="user"
          targetId={user._id}
          targetLabel={`@${user.username}`}
          onClose={() => setReportUserOpen(false)}
          onSubmitted={() => setReportUserOpen(false)}
        />
      ) : null}
      <p className="text-center text-[11px] text-[var(--cz-text-secondary)]/60">
        Public URL: <span className="font-mono">/u/{user.username}</span> • Also{" "}
        <Link href={`/app/profile/${user.username}`} className="underline">
          /app/profile/{user.username}
        </Link>
      </p>
    </div>
  );
}
