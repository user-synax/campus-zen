"use client";

import {
  AlertCircle,
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
  const [reports, setReports] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState(null);
  const [acting, setActing] = useState({}); // id -> action label
  const [suspendReason, setSuspendReason] = useState({}); // reportId -> text

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

  useEffect(() => {
    (async () => {
      try {
        await api.adminMe();
        setPhase("dash");
        fetchStats();
        fetchReports("open", 1);
      } catch {
        setPhase("login");
      }
    })();
  }, [fetchReports, fetchStats]);

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
              { label: "Users", value: stats.users?.total ?? 0 },
              { label: "Suspended", value: stats.users?.suspended ?? 0 },
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

        <div
          className="mt-5 flex gap-2"
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
                      {r.target.imageUrl ? (
                        <p className="mt-1 text-[var(--cz-text-secondary)]">
                          has image attachment
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
        {!loading && reports.length > 0 ? (
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
      </main>
    </div>
  );
}
