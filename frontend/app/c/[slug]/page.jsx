"use client";

import { ArrowLeft, GraduationCap, Loader2, LayoutGrid, School, Users, FileText } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { EmptyState } from "@/components/app/EmptyState";
import { UserCard } from "@/components/app/UserCard";
import { PostCard } from "@/components/app/PostCard";
import { api } from "@/lib/api";

export default function CollegePage() {
  const { slug } = useParams();
  const router = useRouter();
  const [college, setCollege] = useState(null);
  const [tab, setTab] = useState("members");
  const [members, setMembers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [me, setMe] = useState(null);
  const [isGuest, setIsGuest] = useState(true);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    api
      .me()
      .then((r) => {
        setMe(r.data?.user || null);
        setIsGuest(false);
      })
      .catch(() => {
        setMe(null);
        setIsGuest(true);
      });
  }, []);

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

  if (loading)
    return (
      <div className="grid place-items-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--cz-text-secondary)]" />
      </div>
    );

  if (error || !college)
    return (
      <div className="space-y-4 max-w-[640px] mx-auto">
        <EmptyState
          icon={School}
          title="College not found"
          description={error || `No college /c/${slug}`}
          actionLabel="Explore students"
          actionHref="/u"
        />
      </div>
    );

  const initial = (college.name || college.slug || "C").trim().slice(0, 1).toUpperCase();

  return (
    <div className="space-y-4 max-w-[640px] mx-auto">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) router.back();
            else router.push("/c");
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--cz-border)] px-3 h-[34px] text-[13px] font-medium text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)] hover:bg-[var(--cz-surface)] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
        <div className="flex items-center gap-2">
          <Link
            href="/c"
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--cz-border)] px-3 h-[34px] text-[13px] font-medium text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)] hover:bg-[var(--cz-surface)] transition-colors"
          >
            <LayoutGrid className="h-3.5 w-3.5" /> All colleges
          </Link>
          {isGuest ? null : (
            <Link
              href="/app"
              className="inline-flex items-center justify-center rounded-full bg-[var(--cz-text-primary)] text-[var(--cz-text-inverse)] px-4 h-[34px] text-[13px] font-medium hover:bg-[#ffd9c0] transition-colors"
            >
              Back to app
            </Link>
          )}
        </div>
      </div>
      {isGuest ? (
        <div className="rounded-[12px] border border-[var(--cz-border)] bg-[var(--cz-surface)] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-[13px] font-medium">Join CampusZen to connect</p>
            <p className="text-[12px] leading-[16px] text-[var(--cz-text-secondary)]">
              Discover {college.memberCount ?? 0} students from {college.name}.
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
      ) : null}

      <div className="relative overflow-hidden rounded-[16px] border border-[var(--cz-border)] bg-[var(--cz-surface)] p-5">
        <div className="flex items-start gap-4">
          <span className="grid place-items-center h-[56px] w-[56px] rounded-[14px] bg-[var(--cz-surface-strong)] border border-[var(--cz-border)] text-[20px] font-semibold text-[var(--cz-text-primary)] shrink-0">
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-[18px] font-semibold tracking-[-0.02em] leading-tight text-[var(--cz-text-primary)] truncate">
              {college.name}
            </h1>
            <p className="mt-0.5 text-[12px] font-mono text-[var(--cz-text-secondary)] truncate">
              /c/{college.slug}
            </p>
            <div className="mt-2 flex items-center gap-4 text-[13px]">
              <span className="inline-flex items-center gap-1.5 text-[var(--cz-text-secondary)]">
                <Users className="h-3.5 w-3.5" />
                <b className="font-semibold text-[var(--cz-text-primary)]">{college.memberCount ?? 0}</b> students
              </span>
              <span className="inline-flex items-center gap-1.5 text-[var(--cz-text-secondary)]">
                <FileText className="h-3.5 w-3.5" />
                <b className="font-semibold text-[var(--cz-text-primary)]">{college.postCount ?? 0}</b> posts
              </span>
            </div>
          </div>
        </div>
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--cz-bg)] border border-[var(--cz-border)] px-2.5 py-1 text-[11px] leading-none text-[var(--cz-text-secondary)]">
          <GraduationCap className="h-3 w-3" /> Auto-created from student profiles • read-only in Phase 0
        </p>
      </div>

      <div className="flex items-center gap-1 border-b border-[var(--cz-border)]">
        {[
          { id: "members", label: `Students` },
          { id: "posts", label: `Posts` },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            aria-selected={tab === t.id}
            className={`relative whitespace-nowrap px-4 h-[40px] text-[13px] font-medium transition-colors ${
              tab === t.id
                ? "text-[var(--cz-text-primary)]"
                : "text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)]"
            }`}
          >
            {t.label}
            {tab === t.id ? (
              <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-[var(--cz-text-primary)]" />
            ) : null}
          </button>
        ))}
      </div>

      {listLoading ? (
        <div className="grid place-items-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--cz-text-secondary)]" />
        </div>
      ) : tab === "members" ? (
        members.length === 0 ? (
          <EmptyState icon={Users} title="No students yet" description={`No profiles claim ${college.name} yet.`} />
        ) : (
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              {members.map((u) => (
                <UserCard key={u._id} user={u} isOwn={me?.username === u.username} isGuest={isGuest} />
              ))}
            </div>
            {hasMore ? (
              <button
                onClick={() => fetchTab("members", page + 1, true)}
                className="w-full rounded-[12px] border border-[var(--cz-border)] h-[40px] text-[13px] font-medium hover:bg-[var(--cz-surface)] transition-colors"
              >
                Load more
              </button>
            ) : null}
          </div>
        )
      ) : posts.length === 0 ? (
        <EmptyState icon={FileText} title="No posts yet" description={`Posts by ${college.name} students will appear here.`} />
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <PostCard key={p._id} post={p} currentUser={me} />
          ))}
          {hasMore ? (
            <button
              onClick={() => fetchTab("posts", page + 1, true)}
              className="w-full rounded-[12px] border border-[var(--cz-border)] h-[40px] text-[13px] font-medium hover:bg-[var(--cz-surface)] transition-colors"
            >
              Load more
            </button>
          ) : null}
        </div>
      )}

      <p className="text-center text-[11px] text-[var(--cz-text-secondary)]/60">
        Public URL: <span className="font-mono">/c/{college.slug}</span>
      </p>
    </div>
  );
}
