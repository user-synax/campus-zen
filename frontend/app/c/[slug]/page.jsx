"use client";

import { FileText, Loader2, School, Users } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { EmptyState } from "@/components/app/EmptyState";
import { PostCard } from "@/components/app/PostCard";
import { UserCard } from "@/components/app/UserCard";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useRequireSession } from "@/lib/hooks/useRequireSession";

export default function CollegePage() {
  const { slug } = useParams();
  const [college, setCollege] = useState(null);
  const [tab, setTab] = useState("members");
  const [members, setMembers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const { user: me, checking } = useRequireSession();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.getCollege(slug);
        if (!cancelled) setCollege(res.data?.college || null);
      } catch (e) {
        if (!cancelled) setError(e?.data?.message || e?.message || "College not found");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const fetchTab = useCallback(
    async (t, p = 1, append = false) => {
      if (!slug) return;
      if (!append) setListLoading(true);
      try {
        if (t === "members") {
          const res = await api.getCollegeMembers(slug, { page: p, limit: 20 });
          const d = res.data || {};
          setMembers((prev) => (append ? [...prev, ...(d.users || [])] : d.users || []));
          setHasMore(Boolean(d.hasMore));
          setPage(d.page || p);
        } else {
          const res = await api.getCollegePosts(slug, { page: p, limit: 20 });
          const d = res.data || {};
          setPosts((prev) => (append ? [...prev, ...(d.posts || [])] : d.posts || []));
          setHasMore(Boolean(d.hasMore));
          setPage(d.page || p);
        }
      } catch {
        // silent — empty state covers it
      } finally {
        if (!append) setListLoading(false);
      }
    },
    [slug]
  );

  useEffect(() => {
    setMembers([]);
    setPosts([]);
    setPage(1);
    fetchTab(tab, 1, false);
  }, [tab, slug, fetchTab]);

  if (loading || checking || !me)
    return (
      <div className="grid place-items-center py-20">
        <Loader2
          className="h-6 w-6 animate-spin text-[var(--cz-text-secondary)]"
          aria-label="Loading college"
        />
      </div>
    );

  if (error || !college)
    return (
      <div>
        <EmptyState
          icon={School}
          title="College not found"
          description={error || `No college matches /c/${slug}`}
          actionLabel="Explore students"
          actionHref="/c"
        />
      </div>
    );

  const initial = (college.name || college.slug || "C").trim().slice(0, 1).toUpperCase();

  return (
    <div>
      {/* college identity strip — the label, with no page header above it */}
      <div className="flex items-center gap-4 px-4 py-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[var(--cz-surface-strong)] text-[20px] font-bold text-[var(--cz-text-primary)]">
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[20px] leading-6 font-extrabold text-[var(--cz-text-primary)]">
            {college.name}
          </h1>
          <p className="mt-1 flex items-center gap-4 text-[15px] leading-[20px] text-[var(--cz-text-secondary)]">
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4" aria-hidden />
              <b className="font-bold text-[var(--cz-text-primary)]">
                {college.memberCount ?? 0}
              </b>{" "}
              students
            </span>
            <span className="inline-flex items-center gap-1.5">
              <FileText className="h-4 w-4" aria-hidden />
              <b className="font-bold text-[var(--cz-text-primary)]">
                {college.postCount ?? 0}
              </b>{" "}
              posts
            </span>
          </p>
        </div>
      </div>

      <div className="flex border-b border-[var(--cz-border)]">
        {[
          { id: "members", label: "Students" },
          { id: "posts", label: "Posts" },
        ].map((t) => (
          <button
            key={t.id}
            role="tab"
            onClick={() => setTab(t.id)}
            aria-selected={tab === t.id}
            className={`relative h-[52px] flex-1 cursor-pointer text-[15px] font-medium transition-colors ${
              tab === t.id
                ? "font-bold text-[var(--cz-text-primary)]"
                : "text-[var(--cz-text-secondary)] hover:bg-[var(--cz-surface-strong)] hover:text-[var(--cz-text-primary)]"
            }`}
          >
            {t.label}
            {tab === t.id ? (
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-[2px] bg-[var(--cz-accent)]"
              />
            ) : null}
          </button>
        ))}
      </div>

      {listLoading ? (
        <div className="grid place-items-center py-12">
          <Loader2
            className="h-5 w-5 animate-spin text-[var(--cz-text-secondary)]"
            aria-label="Loading"
          />
        </div>
      ) : tab === "members" ? (
        members.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No students yet"
            description={`No profiles claim ${college.name} yet.`}
          />
        ) : (
          <div>
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              {members.map((u) => (
                <UserCard
                  key={u._id}
                  user={u}
                  isOwn={me?.username === u.username}
                  isGuest={false}
                />
              ))}
            </div>
            {hasMore ? (
              <div className="p-4 pt-0">
                <Button
                  onClick={() => fetchTab("members", page + 1, true)}
                  variant="secondary"
                  className="w-full"
                >
                  Show more students
                </Button>
              </div>
            ) : null}
          </div>
        )
      ) : posts.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No posts yet"
          description={`Posts by ${college.name} students will appear here.`}
        />
      ) : (
        <div>
          {posts.map((p) => (
            <PostCard key={p._id} post={p} currentUser={me} />
          ))}
          {hasMore ? (
            <div className="p-4">
              <Button
                onClick={() => fetchTab("posts", page + 1, true)}
                variant="secondary"
                className="w-full"
              >
                Show more posts
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
