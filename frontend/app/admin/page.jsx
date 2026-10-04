"use client";

import {
  AlertCircle,
  BadgeCheck,
  Eye,
  EyeOff,
  Flag,
  Loader2,
  LogOut,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { ErrorMsg, InputShell, InputWrap } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

const TABS = [
  { id: "open", label: "Open" },
  { id: "dismissed", label: "Dismissed" },
  { id: "actioned", label: "Actioned" },
  { id: "all", label: "All" },
];

function timeAgo(iso) {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function AdminPage() {
  const [phase, setPhase] = useState("checking"); // checking | login | dash
  const [email, setEmail] = useState("");
  const [passkey, setPasskey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);

  const [stats, setStats] = useState(null);
  const [tab, setTab] = useState("open");
  const [section, setSection] = useState("reports"); // reports | appeals | verifications
  const [reports, setReports] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState(null);
  const [acting, setActing] = useState({}); // id -> action label
  const [suspendReason, setSuspendReason] = useState({}); // reportId -> text
  const [appeals, setAppeals] = useState([]);
  const [appealsTotal, setAppealsTotal] = useState(0);
  const [appealsPage, setAppealsPage] = useState(1);
  const [appealsTab, setAppealsTab] = useState("open");
  const [reviewNote, setReviewNote] = useState({});
  const [verifs, setVerifs] = useState([]);
  const [verifsTotal, setVerifsTotal] = useState(0);
  const [verifsPage, setVerifsPage] = useState(1);
  const [verifsTab, setVerifsTab] = useState("open");

  const fetchReports = useCallback(async (status, pg) => {
    setLoading(true);
    setListError(null);
    try {
      const res = await api.adminReports({ status, page: pg, limit: 20 });
      const d = res.data || {};
      if (pg === 1) setReports(d.reports || []);
      else setReports((prev) => [...prev, ...(d.reports || [])]);
      setTotal(d.total || 0);
      setPage(d.page || pg);
    } catch (err) {
      setListError(
        err.data?.message || err.message || "Failed to load reports",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.adminStats();
      setStats(res.data || null);
    } catch {}
  }, []);

  const fetchAppeals = useCallback(async (status, pg) => {
    setLoading(true);
    try {
      const res = await api.adminAppeals({ status, page: pg, limit: 20 });
      const d = res.data || {};
      if (pg === 1) setAppeals(d.appeals || []);
      else setAppeals((prev) => [...prev, ...(d.appeals || [])]);
      setAppealsTotal(d.total || 0);
      setAppealsPage(d.page || pg);
    } catch (err) {
      setListError(err.data?.message || err.message || "Failed to load appeals");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchVerifs = useCallback(async (status, pg) => {
    setLoading(true);
    try {
      const res = await api.adminVerifications({ status, page: pg, limit: 20 });
      const d = res.data || {};
      if (pg === 1) setVerifs(d.requests || []);
      else setVerifs((prev) => [...prev, ...(d.requests || [])]);
      setVerifsTotal(d.total || 0);
      setVerifsPage(d.page || pg);
    } catch (err) {
      setListError(err.data?.message || err.message || "Failed to load verifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await api.adminMe();
        setPhase("dash");
        fetchStats();
        fetchReports("open", 1);
        fetchAppeals("open", 1);
        fetchVerifs("open", 1);
      } catch {
        setPhase("login");
      }
    })();
  }, [fetchReports, fetchStats, fetchAppeals, fetchVerifs]);

  const switchTab = (id) => {
    setTab(id);
    setPage(1);
    setReports([]);
    fetchReports(id, 1);
  };

  const onLogin = async (e) => {
    e.preventDefault();
    setLoginError(null);
    if (!email.trim() || !passkey) {
      setLoginError("Enter admin email and passkey.");
      return;
    }
    setLoginLoading(true);
    try {
      await api.adminLogin({ email: email.trim().toLowerCase(), passkey });
      setPhase("dash");
      setPasskey("");
      fetchStats();
      fetchReports(tab, 1);
      fetchAppeals("open", 1);
      fetchVerifs("open", 1);
    } catch (err) {
      setLoginError(err.data?.message || err.message || "Login failed");
    } finally {
      setLoginLoading(false);
    }
  };

  const onLogout = async () => {
    try {
      await api.adminLogout();
    } catch {}
    setPhase("login");
    setEmail("");
    setPasskey("");
    setReports([]);
    setStats(null);
  };

  const markActing = (id, label) => setActing((p) => ({ ...p, [id]: label }));
  const clearActing = (id) =>
    setActing((p) => {
      const n = { ...p };
      delete n[id];
      return n;
    });

  const doResolve = async (report, status) => {
    markActing(report._id, status);
    try {
      await api.adminResolveReport(report._id, status);
      setReports((prev) =>
        prev.map((r) => (r._id === report._id ? { ...r, status } : r)),
      );
      fetchStats();
      if (tab === "open")
        setReports((prev) => prev.filter((r) => r._id !== report._id));
    } catch (err) {
      alert(err.data?.message || err.message || "Failed");
    } finally {
      clearActing(report._id);
    }
  };

  const doDeletePost = async (report) => {
    const postId =
      report.targetType === "post" ? String(report.targetId) : null;
    if (!postId) return;
    if (!confirm("Delete this post permanently?")) return;
    markActing(report._id, "deleting");
    try {
      await api.adminDeletePost(postId);
      setReports((prev) =>
        prev.map((r) =>
          r._id === report._id
            ? { ...r, status: "actioned", targetMissing: true }
            : r,
        ),
      );
      fetchStats();
    } catch (err) {
      alert(err.data?.message || err.message || "Delete failed");
    } finally {
      clearActing(report._id);
    }
  };

  const doSuspend = async (report) => {
    const userId =
      report.targetType === "user"
        ? String(report.targetId)
        : report.target?._id;
    if (!userId) return;
    const reason = (suspendReason[report._id] || "").trim();
    if (
      !confirm(
        `Suspend @${report.target?.username || "user"}? They will be logged out immediately.`,
      )
    )
      return;
    markActing(report._id, "suspending");
    try {
      await api.adminSuspendUser(userId, reason || undefined);
      setReports((prev) =>
        prev.map((r) =>
          r._id === report._id
            ? {
                ...r,
                status: "actioned",
                target: r.target
                  ? { ...r.target, isSuspended: true }
                  : r.target,
              }
            : r,
        ),
      );
      fetchStats();
    } catch (err) {
      alert(err.data?.message || err.message || "Suspend failed");
    } finally {
      clearActing(report._id);
    }
  };

  const doUnsuspend = async (report) => {
    const userId =
      report.targetType === "user"
        ? String(report.targetId)
        : report.target?._id;
    if (!userId) return;
    markActing(report._id, "unsuspending");
    try {
      await api.adminUnsuspendUser(userId);
      setReports((prev) =>
        prev.map((r) =>
          r._id === report._id
            ? {
                ...r,
                target: r.target
                  ? { ...r.target, isSuspended: false }
                  : r.target,
              }
            : r,
        ),
      );
      fetchStats();
    } catch (err) {
      alert(err.data?.message || err.message || "Failed");
    } finally {
      clearActing(report._id);
    }
  };

  const doReviewAppeal = async (appeal, status) => {
    markActing(appeal._id, status);
    try {
      const note = (reviewNote[appeal._id] || "").trim();
      await api.adminReviewAppeal(appeal._id, note ? { status, reviewNote: note } : { status });
      setAppeals((prev) => prev.map((a) => (a._id === appeal._id ? { ...a, status } : a)));
      fetchStats();
      if (appealsTab === "open") setAppeals((prev) => prev.filter((a) => a._id !== appeal._id));
    } catch (err) {
      alert(err.data?.message || err.message || "Failed");
    } finally {
      clearActing(appeal._id);
    }
  };

  const doReviewVerification = async (req, status) => {
    markActing(req._id, status);
    try {
      const note = (reviewNote[req._id] || "").trim();
      await api.adminReviewVerification(req._id, note ? { status, reviewNote: note } : { status });
      const userId = req.user?._id;
      setVerifs((prev) =>
        prev.map((v) =>
          v._id === req._id
            ? {
                ...v,
                status,
                reviewNote: note || v.reviewNote,
                user: v.user ? { ...v.user, isVerified: status === "approved" ? true : v.user.isVerified } : v.user,
                live: v.live ? { ...v.live, isVerified: status === "approved" ? true : v.live.isVerified } : v.live,
              }
            : v,
        ),
      );
      // Keep the populated user flag in sync for Grant/Revoke display
      if (userId && status === "approved") {
        setVerifs((prev) =>
          prev.map((v) =>
            v.user && String(v.user._id) === String(userId) ? { ...v, user: { ...v.user, isVerified: true } } : v,
          ),
        );
      }
      fetchStats();
      if (verifsTab === "open") setVerifs((prev) => prev.filter((v) => v._id !== req._id));
    } catch (err) {
      alert(err.data?.message || err.message || "Failed");
    } finally {
      clearActing(req._id);
    }
  };

  const doSetVerified = async (req, isVerified) => {
    const userId = req.user?._id;
    if (!userId) return;
    if (!confirm(isVerified ? `Grant blue tick to @${req.user?.username || "user"}?` : `Revoke blue tick from @${req.user?.username || "user"}?`)) return;
    markActing(req._id, isVerified ? "granting" : "revoking");
    try {
      await api.adminSetVerified(userId, isVerified);
      setVerifs((prev) =>
        prev.map((v) =>
          v._id === req._id
            ? {
                ...v,
                user: v.user ? { ...v.user, isVerified } : v.user,
                live: v.live ? { ...v.live, isVerified } : v.live,
              }
            : v,
        ),
      );
      fetchStats();
    } catch (err) {
      alert(err.data?.message || err.message || "Failed");
    } finally {
      clearActing(req._id);
    }
  };

  if (phase === "checking") {
    return (
      <div className="grid min-h-dvh place-items-center bg-[var(--cz-bg)]">
        <Loader2
          className="h-6 w-6 animate-spin text-[var(--cz-text-secondary)]"
          aria-label="Loading"
        />
      </div>
    );
  }

  if (phase === "login") {
    return (
      <AuthShell
        title="Admin access"
        subtitle="Restricted. Sign in with the backend ADMIN_EMAIL + ADMIN_PASSKEY."
      >
        <form onSubmit={onLogin} noValidate className="flex flex-col gap-5">
          {loginError ? (
            <div className="flex items-start gap-2 rounded-[4px] bg-[color-mix(in_srgb,var(--cz-error)_10%,transparent)] px-3 py-2.5 text-[15px] leading-[20px] text-[var(--cz-error)]">
              <AlertCircle
                className="mt-0.5 h-[18px] w-[18px] shrink-0"
                aria-hidden
              />
              <span>{loginError}</span>
            </div>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admin-email">Admin email</Label>
            <InputWrap>
              <InputShell>
                <input
                  id="admin-email"
                  type="email"
                  autoComplete="username"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-full flex-1 bg-transparent text-[15px] text-[var(--cz-text-primary)] outline-none placeholder:text-[var(--cz-text-secondary)]"
                />
              </InputShell>
            </InputWrap>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admin-passkey">Admin passkey</Label>
            <InputWrap>
              <InputShell>
                <input
                  id="admin-passkey"
                  type={showKey ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={passkey}
                  onChange={(e) => setPasskey(e.target.value)}
                  className="h-full flex-1 bg-transparent text-[15px] text-[var(--cz-text-primary)] outline-none placeholder:text-[var(--cz-text-secondary)]"
                />
                <button
                  type="button"
                  aria-label={showKey ? "Hide passkey" : "Show passkey"}
                  onClick={() => setShowKey((v) => !v)}
                  className="grid h-[32px] w-[32px] place-items-center rounded-full text-[var(--cz-text-secondary)] hover:bg-[var(--cz-border)] hover:text-[var(--cz-text-primary)]"
                >
                  {showKey ? (
                    <EyeOff className="h-[18px] w-[18px]" />
                  ) : (
                    <Eye className="h-[18px] w-[18px]" />
                  )}
                </button>
              </InputShell>
            </InputWrap>
            <ErrorMsg>
              Never share this passkey. It lives only in backend .env.
            </ErrorMsg>
          </div>
          <Button
            type="submit"
            disabled={loginLoading}
            size="lg"
            className="w-full"
          >
            {loginLoading ? (
              <Loader2 className="h-[18px] w-[18px] animate-spin" />
            ) : (
              <ShieldCheck className="h-[18px] w-[18px]" aria-hidden />
            )}
            {loginLoading ? "Verifying…" : "Unlock admin"}
          </Button>
        </form>
      </AuthShell>
    );
  }

  return (
    <div className="min-h-dvh bg-[var(--cz-bg)] text-[var(--cz-text-primary)]">
      <header className="sticky top-0 z-10 border-b border-[var(--cz-border)] bg-[var(--cz-bg)]">
        <div className="mx-auto flex max-w-[920px] items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <ShieldCheck
              className="h-5 w-5 text-[var(--cz-accent)]"
              aria-hidden
            />
            <h1 className="text-[17px] font-extrabold">Moderation</h1>
            <span className="rounded-full border border-[var(--cz-border-strong)] px-2 py-0.5 text-[12px] text-[var(--cz-text-secondary)]">
              admin only · unlisted
            </span>
          </div>
          <Button variant="secondary" size="sm" onClick={onLogout}>
            <LogOut className="h-4 w-4" aria-hidden /> Log out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-[920px] px-4 py-5">
        {stats ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "Open reports", value: stats.reports?.open ?? 0 },
              { label: "Total reports", value: stats.reports?.total ?? 0 },
              { label: "Open appeals", value: stats.appeals?.open ?? 0 },
              { label: "Suspended", value: stats.users?.suspended ?? 0 },
              { label: "Open verifications", value: stats.verifications?.open ?? 0 },
              { label: "Verified users", value: stats.users?.verified ?? 0 },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-[var(--cz-border)] p-3"
              >
                <p className="text-[24px] font-extrabold leading-none">
                  {s.value}
                </p>
                <p className="mt-1 text-[13px] text-[var(--cz-text-secondary)]">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-5 flex gap-2" role="tablist" aria-label="Section">
          {[
            { id: "reports", label: "Reports" },
            { id: "appeals", label: `Appeals${stats?.appeals?.open ? ` (${stats.appeals.open})` : ""}` },
            { id: "verifications", label: `Verification${stats?.verifications?.open ? ` (${stats.verifications.open})` : ""}` },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={section === t.id}
              onClick={() => setSection(t.id)}
              className={`h-[32px] rounded-full px-4 text-[14px] font-bold transition-colors ${section === t.id ? "bg-[var(--cz-text-primary)] text-[var(--cz-bg)]" : "border border-[var(--cz-border-strong)] hover:bg-[var(--cz-surface-strong)]"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {section === "reports" ? (
          <>
            <div
              className="mt-3 flex gap-2"
              role="tablist"
              aria-label="Report status"
            >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => switchTab(t.id)}
              className={`h-[32px] rounded-full px-4 text-[14px] font-bold transition-colors ${tab === t.id ? "bg-[var(--cz-accent)] text-[var(--cz-text-inverse)]" : "border border-[var(--cz-border-strong)] hover:bg-[var(--cz-surface-strong)]"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {listError ? (
          <div className="mt-4 flex items-start gap-2 rounded-[4px] bg-[color-mix(in_srgb,var(--cz-error)_10%,transparent)] px-3 py-2.5 text-[14px] text-[var(--cz-error)]">
            <AlertCircle
              className="mt-0.5 h-[18px] w-[18px] shrink-0"
              aria-hidden
            />
            <span>{listError}</span>
          </div>
        ) : null}

        <div className="mt-4 flex flex-col gap-3">
          {reports.map((r) => {
            const busy = Boolean(acting[r._id]);
            return (
              <article
                key={r._id}
                className="rounded-2xl border border-[var(--cz-border)] p-4"
              >
                <div className="flex flex-wrap items-center gap-2 text-[13px] text-[var(--cz-text-secondary)]">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--cz-surface-strong)] px-2 py-0.5 font-bold text-[var(--cz-text-primary)]">
                    <Flag className="h-3.5 w-3.5" aria-hidden /> {r.targetType}
                  </span>
                  <span className="rounded-full border border-[var(--cz-border-strong)] px-2 py-0.5">
                    {r.reason}
                  </span>
                  <span className="rounded-full border border-[var(--cz-border-strong)] px-2 py-0.5">
                    {r.status}
                  </span>
                  <span className="ml-auto">{timeAgo(r.createdAt)}</span>
                </div>

                <p className="mt-2 text-[15px]">
                  <span className="font-bold">
                    @{r.reporter?.username || "?"}
                  </span>
                  <span className="text-[var(--cz-text-secondary)]">
                    {" "}
                    reported{" "}
                  </span>
                  {r.targetType === "post" ? (
                    <span className="font-bold">
                      a post
                      {r.target?.author ? (
                        <> by @{r.target.author.username}</>
                      ) : null}
                    </span>
                  ) : (
                    <span className="font-bold">
                      @{r.target?.username || String(r.targetId).slice(-6)}
                    </span>
                  )}
                  {r.details ? (
                    <span className="text-[var(--cz-text-secondary)]">
                      {" "}
                      — “{r.details}”
                    </span>
                  ) : null}
                </p>

                <div className="mt-2 rounded-xl bg-[var(--cz-surface-strong)] p-3 text-[14px]">
                  {r.targetMissing || !r.target ? (
                    <p className="text-[var(--cz-text-secondary)]">
                      Target already deleted.
                    </p>
                  ) : r.targetType === "post" ? (
                    <>
                      <p className="whitespace-pre-wrap">
                        {r.target.text || "(image/poll post)"}
                      </p>
                      {r.target.imageUrl || r.target.media?.length ? (
                        <p className="mt-1 text-[var(--cz-text-secondary)]">
                          has{" "}
                          {r.target.media?.length > 1
                            ? `${r.target.media.length} attachments`
                            : r.target.media?.[0]?.kind === "video"
                              ? "video attachment"
                              : r.target.media?.[0]?.kind === "gif"
                                ? "GIF attachment"
                                : "image attachment"}
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <p>
                      <span className="font-bold">@{r.target.username}</span>
                      <span className="text-[var(--cz-text-secondary)]">
                        {" "}
                        · {r.target.fullName || ""}
                        {r.target.isSuspended ? " · SUSPENDED" : ""}
                      </span>
                      {r.target.bio ? (
                        <span className="mt-1 block">{r.target.bio}</span>
                      ) : null}
                    </p>
                  )}
                </div>

                {r.targetType === "user" && r.target && !r.targetMissing ? (
                  <input
                    value={suspendReason[r._id] || ""}
                    onChange={(e) =>
                      setSuspendReason((p) => ({
                        ...p,
                        [r._id]: e.target.value,
                      }))
                    }
                    placeholder="Suspend reason (optional, shown internally)"
                    maxLength={500}
                    className="mt-2 h-[36px] w-full rounded-xl border border-[var(--cz-border-strong)] bg-transparent px-3 text-[14px] outline-none placeholder:text-[var(--cz-text-secondary)] focus:border-[var(--cz-accent)]"
                  />
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={busy}
                    onClick={() => doResolve(r, "dismissed")}
                  >
                    Dismiss
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={busy}
                    onClick={() => doResolve(r, "actioned")}
                  >
                    Mark actioned
                  </Button>
                  {r.targetType === "post" && !r.targetMissing ? (
                    <Button
                      variant="dangerSolid"
                      size="sm"
                      disabled={busy}
                      onClick={() => doDeletePost(r)}
                    >
                      {acting[r._id] === "deleting" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" aria-hidden />
                      )}
                      Delete post
                    </Button>
                  ) : null}
                  {r.targetType === "user" && r.target && !r.targetMissing ? (
                    r.target.isSuspended ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={busy}
                        onClick={() => doUnsuspend(r)}
                      >
                        <UserCheck className="h-4 w-4" aria-hidden /> Unsuspend
                      </Button>
                    ) : (
                      <Button
                        variant="dangerSolid"
                        size="sm"
                        disabled={busy}
                        onClick={() => doSuspend(r)}
                      >
                        <UserX className="h-4 w-4" aria-hidden /> Suspend user
                      </Button>
                    )
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>

        {loading ? (
          <p className="py-6 text-center text-[14px] text-[var(--cz-text-secondary)]">
            Loading…
          </p>
        ) : null}
        {!loading && reports.length === 0 && !listError ? (
          <p className="py-10 text-center text-[15px] text-[var(--cz-text-secondary)]">
            No {tab} reports.
          </p>
        ) : null}
        {!loading && reports.length > 0 && section === "reports" ? (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-[13px] text-[var(--cz-text-secondary)]">
              {total} total
            </p>
            <Button
              variant="secondary"
              size="sm"
              disabled={loading || reports.length >= total}
              onClick={() => fetchReports(tab, page + 1)}
            >
              Show more
            </Button>
          </div>
        ) : null}
          </>
        ) : section === "appeals" ? (
          <>
            <div className="mt-3 flex gap-2" role="tablist" aria-label="Appeal status">
              {[
                { id: "open", label: "Open" },
                { id: "upheld", label: "Upheld" },
                { id: "rejected", label: "Rejected" },
                { id: "all", label: "All" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={appealsTab === t.id}
                  onClick={() => { setAppealsTab(t.id); setAppeals([]); fetchAppeals(t.id, 1); }}
                  className={`h-[32px] rounded-full px-4 text-[14px] font-bold transition-colors ${appealsTab === t.id ? "bg-[var(--cz-accent)] text-[var(--cz-text-inverse)]" : "border border-[var(--cz-border-strong)] hover:bg-[var(--cz-surface-strong)]"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="mt-4 flex flex-col gap-3">
              {appeals.map((a) => {
                const busy = Boolean(acting[a._id]);
                return (
                  <article key={a._id} className="rounded-2xl border border-[var(--cz-border)] p-4">
                    <div className="flex flex-wrap items-center gap-2 text-[13px] text-[var(--cz-text-secondary)]">
                      <span className="rounded-full bg-[var(--cz-surface-strong)] px-2 py-0.5 font-bold text-[var(--cz-text-primary)]">{a.type}</span>
                      <span className="rounded-full border border-[var(--cz-border-strong)] px-2 py-0.5">{a.status}</span>
                      <span className="ml-auto">{timeAgo(a.createdAt)}</span>
                    </div>
                    <p className="mt-2 text-[15px]">
                      <span className="font-bold">@{a.appellant?.username || "?"}</span>
                      <span className="text-[var(--cz-text-secondary)]"> appealed{a.report ? ` report (${a.report.reason} · ${a.report.status})` : ` ${a.type}`}</span>
                    </p>
                    <p className="mt-2 rounded-xl bg-[var(--cz-surface-strong)] p-3 text-[14px] whitespace-pre-wrap">{a.message}</p>
                    <input
                      value={reviewNote[a._id] || ""}
                      onChange={(e) => setReviewNote((p) => ({ ...p, [a._id]: e.target.value }))}
                      placeholder="Review note to user (optional)"
                      maxLength={1000}
                      className="mt-2 h-[36px] w-full rounded-xl border border-[var(--cz-border-strong)] bg-transparent px-3 text-[14px] outline-none placeholder:text-[var(--cz-text-secondary)] focus:border-[var(--cz-accent)]"
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button variant="secondary" size="sm" disabled={busy} onClick={() => doReviewAppeal(a, "upheld")}>Uphold (reopen)</Button>
                      <Button variant="secondary" size="sm" disabled={busy} onClick={() => doReviewAppeal(a, "rejected")}>Reject</Button>
                    </div>
                  </article>
                );
              })}
            </div>
            {!loading && appeals.length === 0 ? (
              <p className="py-10 text-center text-[15px] text-[var(--cz-text-secondary)]">No {appealsTab} appeals.</p>
            ) : null}
            {!loading && appeals.length > 0 ? (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-[13px] text-[var(--cz-text-secondary)]">{appealsTotal} total</p>
                <Button variant="secondary" size="sm" disabled={loading || appeals.length >= appealsTotal} onClick={() => fetchAppeals(appealsTab, appealsPage + 1)}>Show more</Button>
              </div>
            ) : null}
          </>
        ) : (
          <>
            <div className="mt-3 flex gap-2" role="tablist" aria-label="Verification status">
              {[
                { id: "open", label: "Open" },
                { id: "approved", label: "Approved" },
                { id: "rejected", label: "Rejected" },
                { id: "all", label: "All" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={verifsTab === t.id}
                  onClick={() => { setVerifsTab(t.id); setVerifs([]); fetchVerifs(t.id, 1); }}
                  className={`h-[32px] rounded-full px-4 text-[14px] font-bold transition-colors ${verifsTab === t.id ? "bg-[var(--cz-accent)] text-[var(--cz-text-inverse)]" : "border border-[var(--cz-border-strong)] hover:bg-[var(--cz-surface-strong)]"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="mt-4 flex flex-col gap-3">
              {verifs.map((v) => {
                const busy = Boolean(acting[v._id]);
                const u = v.user || {};
                const live = v.live || {};
                const posts = live.postCount ?? u.postCount ?? v.postCount ?? 0;
                const followers = live.followersCount ?? u.followersCount ?? v.followersCount ?? 0;
                const verified = live.isVerified ?? u.isVerified ?? false;
                const initial = (u.fullName?.[0] || u.username?.[0] || "?").toUpperCase();
                return (
                  <article key={v._id} className="rounded-2xl border border-[var(--cz-border)] p-4">
                    <div className="flex flex-wrap items-center gap-2 text-[13px] text-[var(--cz-text-secondary)]">
                      <span className="rounded-full bg-[var(--cz-surface-strong)] px-2 py-0.5 font-bold text-[var(--cz-text-primary)]">verification</span>
                      <span className="rounded-full border border-[var(--cz-border-strong)] px-2 py-0.5">{v.status}</span>
                      {verified ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--cz-accent-soft)] px-2 py-0.5 font-bold text-[var(--cz-accent)]">
                          <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> verified
                        </span>
                      ) : null}
                      <span className="ml-auto">{timeAgo(v.createdAt)}</span>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--cz-border-strong)] text-[15px] font-bold">
                        {u.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={u.avatarUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          initial
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-bold">
                          {u.fullName || u.username || "Deleted user"}
                        </span>
                        <span className="block truncate text-[14px] text-[var(--cz-text-secondary)]">
                          {u.username ? (
                            <Link href={`/u/${u.username}`} className="font-bold text-[var(--cz-accent)] hover:underline">
                              @{u.username}
                            </Link>
                          ) : (
                            "no profile"
                          )}
                          {" · "}
                          {posts}/50 posts {" · "}
                          {followers}/100 followers
                        </span>
                      </span>
                    </div>
                    {v.message ? (
                      <p className="mt-2 rounded-xl bg-[var(--cz-surface-strong)] p-3 text-[14px] whitespace-pre-wrap">{v.message}</p>
                    ) : null}
                    <input
                      value={reviewNote[v._id] || ""}
                      onChange={(e) => setReviewNote((p) => ({ ...p, [v._id]: e.target.value }))}
                      placeholder="Review note to user (optional)"
                      maxLength={1000}
                      className="mt-2 h-[36px] w-full rounded-xl border border-[var(--cz-border-strong)] bg-transparent px-3 text-[14px] outline-none placeholder:text-[var(--cz-text-secondary)] focus:border-[var(--cz-accent)]"
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button variant="secondary" size="sm" disabled={busy} onClick={() => doReviewVerification(v, "approved")}>Approve</Button>
                      <Button variant="secondary" size="sm" disabled={busy} onClick={() => doReviewVerification(v, "rejected")}>Reject</Button>
                      {verified ? (
                        <Button variant="dangerSolid" size="sm" disabled={busy} onClick={() => doSetVerified(v, false)}>Revoke</Button>
                      ) : (
                        <Button variant="secondary" size="sm" disabled={busy} onClick={() => doSetVerified(v, true)}>Grant</Button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
            {!loading && verifs.length === 0 ? (
              <p className="py-10 text-center text-[15px] text-[var(--cz-text-secondary)]">No {verifsTab} verifications.</p>
            ) : null}
            {!loading && verifs.length > 0 ? (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-[13px] text-[var(--cz-text-secondary)]">{verifsTotal} total</p>
                <Button variant="secondary" size="sm" disabled={loading || verifs.length >= verifsTotal} onClick={() => fetchVerifs(verifsTab, verifsPage + 1)}>Show more</Button>
              </div>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
