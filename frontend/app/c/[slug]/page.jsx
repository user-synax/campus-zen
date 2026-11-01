"use client";

import {
  Ban,
  FileText,
  Loader2,
  School,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserMinus,
  Users,
} from "lucide-react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/app/EmptyState";
import { CzImage } from "@/components/app/CzImage";
import { PostCard } from "@/components/app/PostCard";
import { UserCard } from "@/components/app/UserCard";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { collegeShortLabel } from "@/lib/college";
import { useCurrentUser } from "@/lib/hooks/useRequireSession";

// The three delegated-admin switches, in manage-panel render order.
const CAP_ORDER = ["kick", "ban", "moderatePosts"];
const CAP_LABEL = {
  kick: "Remove members",
  ban: "Ban members",
  moderatePosts: "Moderate posts",
};

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

  const { user: me, loading: checking } = useCurrentUser();
  const isGuest = !me;
  // { role: "guest" | "user" | "admin" | "owner", caps } — null until resolved.
  const [caps, setCaps] = useState(null);
  // Live "online now" for this college — REST initial, then SSE events.
  const [active, setActive] = useState(null);
  const capsRole = caps?.role || null;
  const isOwnerHere = capsRole === "owner";
  const canKick = capsRole === "owner" || Boolean(caps?.caps?.kick);
  const canBan = capsRole === "owner" || Boolean(caps?.caps?.ban);
  const canModeratePosts = capsRole === "owner" || Boolean(caps?.caps?.moderatePosts);

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

  // Effective role + switches for the viewer on this college. Delegated
  // admins see exactly the tools their switches allow; everyone else sees a
  // plain page.
  useEffect(() => {
    setCaps(null);
    if (!me) return; // guests get no tools
    let cancelled = false;
    (async () => {
      try {
        const res = await api.getCollegeMyCaps(slug);
        if (!cancelled) setCaps(res.data || { role: "user", caps: null });
      } catch {
        // non-members default to a plain viewer
        if (!cancelled) setCaps({ role: "user", caps: null });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, me?.username]);

  // Initial presence snapshot (SSE may not be connected when this mounts).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.getCollegeActiveNow(slug);
        if (!cancelled) setActive(res.data || { count: 0, users: [] });
      } catch {
        // strip stays hidden — presence is best-effort
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Live updates: useSSE fans out cz:presence window events.
  useEffect(() => {
    const onPresence = (e) => {
      const detail = e.detail;
      if (detail?.slug === slug) setActive(detail);
    };
    window.addEventListener("cz:presence", onPresence);
    return () => window.removeEventListener("cz:presence", onPresence);
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
    if (tab !== "manage") fetchTab(tab, 1, false);
  }, [tab, slug, fetchTab]);

  // ── Moderator actions ────────────────────────────────────────────────────
  // Confirm-first via toast action, matching the PostCard delete flow.
  const afterRemoval = (u) => {
    setMembers((prev) => prev.filter((m) => m._id !== u._id));
    setCollege(
      (prev) => prev && { ...prev, memberCount: Math.max(0, (prev.memberCount || 1) - 1) },
    );
  };

  const confirmKick = (u) => {
    toast(`Remove ${u.fullName} from ${college.name}?`, {
      description: "They can set this college again from their profile settings.",
      action: {
        label: "Remove",
        onClick: async () => {
          try {
            await api.kickCollegeMember(slug, u._id);
            toast.success(`${u.fullName || "Member"} removed`);
            afterRemoval(u);
          } catch (e) {
            toast.error(e?.data?.message || "Couldn't remove them. Try again.");
          }
        },
      },
      cancel: { label: "Keep", onClick: () => {} },
    });
  };

  const confirmBan = (u) => {
    toast(`Ban ${u.fullName} from ${college.name}?`, {
      description:
        "They'll be removed and can't claim this college again until the ban is lifted.",
      action: {
        label: "Ban",
        onClick: async () => {
          try {
            await api.banCollegeMember(slug, u._id);
            toast.success(`${u.fullName || "Member"} banned`);
            afterRemoval(u);
          } catch (e) {
            toast.error(e?.data?.message || "Couldn't ban them. Try again.");
          }
        },
      },
      cancel: { label: "Keep", onClick: () => {} },
    });
  };

  const confirmModeratePost = (post) => {
    toast(`Remove this post from ${college.name}?`, {
      description: "The post is deleted for everyone. This can't be undone.",
      action: {
        label: "Remove",
        onClick: async () => {
          try {
            await api.deleteCollegePost(slug, post._id);
            setPosts((prev) => prev.filter((x) => x._id !== post._id));
            setCollege(
              (prev) => prev && { ...prev, postCount: Math.max(0, (prev.postCount || 1) - 1) },
            );
            toast.success("Post removed");
          } catch (e) {
            toast.error(e?.data?.message || "Couldn't remove this post. Try again.");
          }
        },
      },
      cancel: { label: "Keep", onClick: () => {} },
    });
  };

  if (loading || checking)
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
  const activeLabel = collegeShortLabel(college.name) || college.slug;

  // Members a moderator can act on: never themselves, never the owner.
  const actionableMember = (u) =>
    Boolean(me) && u.username !== me?.username && !u.isOwner && (canKick || canBan);

  const tabs = [
    { id: "members", label: "Students" },
    { id: "posts", label: "Posts" },
  ];
  if (isOwnerHere) tabs.push({ id: "manage", label: "Manage" });

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
            {capsRole === "owner" ? (
              <span className="inline-flex items-center gap-1 text-[13px] font-bold text-[var(--cz-accent)]">
                <ShieldCheck className="h-4 w-4" aria-hidden />
                Owner
              </span>
            ) : capsRole === "admin" ? (
              <span className="inline-flex items-center gap-1 text-[13px] font-bold text-[var(--cz-accent)]">
                <ShieldCheck className="h-4 w-4" aria-hidden />
                College admin
              </span>
            ) : null}
          </p>
        </div>
      </div>

      {/* Active now strip — live via SSE. Count is everyone connected;
          avatars are public profiles (max 5) plus a +N bubble. */}
      {active?.count > 0 ? (
        <div className="flex items-center gap-3 border-y border-[var(--cz-border)] px-4 py-3">
          <span className="text-[18px]" aria-hidden>
            🔥
          </span>
          <p className="min-w-0 flex-1 truncate text-[15px] text-[var(--cz-text-secondary)]">
            <b className="font-extrabold text-[var(--cz-text-primary)]">
              {active.count}
            </b>{" "}
            students from{" "}
            <b className="font-extrabold text-[var(--cz-text-primary)]">
              {activeLabel}
            </b>{" "}
            online now
          </p>
          <div className="flex shrink-0 items-center -space-x-2.5">
            {(active.users || []).map((u) => {
              const uInitial =
                (u.fullName || u.username || "?").trim().slice(0, 1).toUpperCase();
              return (
                <Link
                  key={u._id}
                  href={`/u/${u.username}`}
                  className="relative z-0 transition-transform hover:z-10 hover:scale-110"
                  aria-label={u.fullName || u.username}
                >
                  {u.avatarUrl ? (
                    <CzImage
                      src={u.avatarUrl}
                      alt={u.fullName || u.username}
                      className="h-7 w-7 rounded-full object-cover ring-2 ring-[var(--cz-bg)]"
                    />
                  ) : (
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--cz-surface-strong)] text-[11px] font-bold text-[var(--cz-text-primary)] ring-2 ring-[var(--cz-bg)]">
                      {uInitial}
                    </span>
                  )}
                </Link>
              );
            })}
            {active.count > (active.users || []).length ? (
              <span
                className="grid h-7 place-items-center rounded-full bg-[var(--cz-surface-strong)] px-1.5 text-[11px] font-extrabold text-[var(--cz-text-primary)] ring-2 ring-[var(--cz-bg)]"
                aria-label={`${active.count - (active.users || []).length} more online`}
              >
                +{active.count - (active.users || []).length}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="flex border-b border-[var(--cz-border)]">
        {tabs.map((t) => (
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

      {tab === "manage" && isOwnerHere ? (
        <ManagePanel slug={slug} collegeName={college.name} />
      ) : listLoading ? (
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
                <div key={u._id} className="flex flex-col gap-2">
                  <UserCard
                    user={u}
                    isOwn={me?.username === u.username}
                    isGuest={isGuest}
                  />
                  {actionableMember(u) ? (
                    <div className="flex gap-2 px-1">
                      {canKick ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="flex-1"
                          onClick={() => confirmKick(u)}
                        >
                          <UserMinus className="h-4 w-4" aria-hidden /> Remove
                        </Button>
                      ) : null}
                      {canBan ? (
                        <Button
                          variant="danger"
                          size="sm"
                          className="flex-1"
                          onClick={() => confirmBan(u)}
                        >
                          <Ban className="h-4 w-4" aria-hidden /> Ban
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
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
            <PostCard
              key={p._id}
              post={p}
              currentUser={me}
              moderatorDelete={
                canModeratePosts && !isGuest
                  ? {
                      label: `Remove from ${college.name}`,
                      onModerate: confirmModeratePost,
                    }
                  : null
              }
            />
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

/** Small flat avatar with the member's initial — for manage-panel rows. */
function MiniAvatar({ user }) {
  const name = user?.fullName || user?.username || "?";
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--cz-surface-strong)] text-[14px] font-bold text-[var(--cz-text-primary)]">
      {name.trim().slice(0, 1).toUpperCase()}
    </span>
  );
}

/**
 * Owner-only console for one college: the admin team (username → assign,
 * per-admin switches, demote) and the ban list (unban). Matches the page's
 * manual-fetch style.
 */
function ManagePanel({ slug, collegeName }) {
  const [data, setData] = useState(null); // { admins, banned }
  const [failed, setFailed] = useState(false);
  const [username, setUsername] = useState("");
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const res = await api.getCollegeAdmins(slug);
      setData({ admins: res.data?.admins || [], banned: res.data?.banned || [] });
    } catch (e) {
      toast.error(e?.data?.message || "Couldn't load the admin team");
      setFailed(true);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  const addAdmin = async (e) => {
    e.preventDefault();
    const uname = username.trim().replace(/^@/, "").toLowerCase();
    if (!uname || adding) return;
    setAdding(true);
    try {
      const res = await api.addCollegeAdmin(slug, uname);
      const doc = res.data;
      setData((prev) => ({
        admins: [
          doc,
          ...(prev?.admins || []).filter((a) => String(a.user?._id) !== String(doc.user?._id)),
        ],
        banned: prev?.banned || [],
      }));
      setUsername("");
      toast.success("College admin added — switches stay off until you turn them on");
    } catch (e2) {
      toast.error(e2?.data?.message || "Couldn't add them. Try again.");
    } finally {
      setAdding(false);
    }
  };

  // Optimistic flip; revert + surface the backend reason on failure.
  const toggleCap = async (admin, cap) => {
    if (busyId) return;
    setBusyId(admin._id);
    setData((prev) => ({
      ...prev,
      admins: prev.admins.map((a) =>
        a._id === admin._id ? { ...a, caps: { ...a.caps, [cap]: !a.caps?.[cap] } } : a,
      ),
    }));
    try {
      const res = await api.updateCollegeAdminCaps(slug, admin.user._id, {
        [cap]: !admin.caps?.[cap],
      });
      const fresh = res.data;
      setData((prev) => ({
        ...prev,
        admins: prev.admins.map((a) => (a._id === fresh._id ? fresh : a)),
      }));
    } catch (e) {
      setData((prev) => ({
        ...prev,
        admins: prev.admins.map((a) => (a._id === admin._id ? admin : a)),
      }));
      toast.error(e?.data?.message || "Couldn't update. Try again.");
    } finally {
      setBusyId(null);
    }
  };

  const removeAdmin = (admin) => {
    toast(`Remove ${admin.user?.fullName || "this admin"} from the team?`, {
      description: `They lose every switch on ${collegeName} right away.`,
      action: {
        label: "Remove",
        onClick: async () => {
          try {
            await api.removeCollegeAdmin(slug, admin.user._id);
            setData((prev) => ({
              ...prev,
              admins: prev.admins.filter((a) => a._id !== admin._id),
            }));
            toast.success("College admin removed");
          } catch (e) {
            toast.error(e?.data?.message || "Couldn't remove. Try again.");
          }
        },
      },
      cancel: { label: "Keep", onClick: () => {} },
    });
  };

  const unban = (u) => {
    toast(`Lift the ban on ${u.fullName || "this member"}?`, {
      description: `They can claim ${collegeName} again from their profile settings.`,
      action: {
        label: "Unban",
        onClick: async () => {
          try {
            await api.unbanCollegeMember(slug, u._id);
            setData((prev) => ({ ...prev, banned: prev.banned.filter((b) => b._id !== u._id) }));
            toast.success("Ban lifted");
          } catch (e) {
            toast.error(e?.data?.message || "Couldn't lift the ban. Try again.");
          }
        },
      },
      cancel: { label: "Keep", onClick: () => {} },
    });
  };

  if (!data)
    return failed ? (
      <div className="p-4">
        <EmptyState
          icon={ShieldCheck}
          title="Couldn't load the admin team"
          actionLabel="Try again"
          onAction={load}
        />
      </div>
    ) : (
      <div className="grid place-items-center py-12">
        <Loader2
          className="h-5 w-5 animate-spin text-[var(--cz-text-secondary)]"
          aria-label="Loading"
        />
      </div>
    );

  return (
    <div className="p-4">
      <h2 className="py-2 text-[15px] font-extrabold text-[var(--cz-text-primary)]">
        Admin team
      </h2>
      <form onSubmit={addAdmin} className="flex gap-2 pb-4">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="@username of a CampusZen user"
          maxLength={21}
          className="h-[36px] flex-1 rounded-full border border-[var(--cz-border-strong)] bg-[var(--cz-surface)] px-4 text-[15px] text-[var(--cz-text-primary)] outline-none transition-colors placeholder:text-[var(--cz-text-secondary)] focus-visible:border-[var(--cz-accent)]"
        />
        <Button type="submit" disabled={adding || !username.trim()}>
          Add
        </Button>
      </form>

      {data.admins.length === 0 ? (
        <p className="px-1 pb-6 text-[14px] text-[var(--cz-text-secondary)]">
          No college admins yet. Add a CampusZen user above, then turn on the
          switches you want them to have.
        </p>
      ) : (
        <div>
          {data.admins.map((a) => (
            <div
              key={a._id}
              className="border-b border-[var(--cz-border)] py-3 last:border-b-0"
            >
              <div className="flex items-start gap-3">
                <MiniAvatar user={a.user} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold text-[var(--cz-text-primary)]">
                    {a.user?.fullName}
                  </p>
                  <p className="truncate text-[13px] text-[var(--cz-text-secondary)]">
                    @{a.user?.username}
                    {a.grantedBy?.username ? ` · added by @${a.grantedBy.username}` : ""}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => removeAdmin(a)}>
                  <Trash2 className="h-4 w-4" aria-hidden /> Remove
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 pl-12">
                {CAP_ORDER.map((cap) => {
                  const on = Boolean(a.caps?.[cap]);
                  return (
                    <button
                      key={cap}
                      type="button"
                      aria-pressed={on}
                      disabled={Boolean(busyId)}
                      onClick={() => toggleCap(a, cap)}
                      className={`inline-flex cursor-pointer items-center rounded-full px-3 py-1 text-[13px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 ${
                        on
                          ? "bg-[var(--cz-accent-soft)] text-[var(--cz-accent)]"
                          : "text-[var(--cz-text-secondary)] hover:bg-[var(--cz-surface-strong)] hover:text-[var(--cz-text-primary)]"
                      }`}
                    >
                      {CAP_LABEL[cap]}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="pb-2 pt-4 text-[15px] font-extrabold text-[var(--cz-text-primary)]">
        Banned members
      </h2>
      {data.banned.length === 0 ? (
        <p className="px-1 text-[14px] text-[var(--cz-text-secondary)]">
          Nobody is banned from this college.
        </p>
      ) : (
        <div>
          {data.banned.map((u) => (
            <div
              key={u._id}
              className="flex items-center gap-3 border-b border-[var(--cz-border)] py-3 last:border-b-0"
            >
              <MiniAvatar user={u} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-bold text-[var(--cz-text-primary)]">
                  {u.fullName}
                </p>
                <p className="truncate text-[13px] text-[var(--cz-text-secondary)]">
                  @{u.username}
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => unban(u)}>
                <ShieldOff className="h-4 w-4" aria-hidden /> Unban
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
