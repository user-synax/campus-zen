"use client";

import { AlertCircle, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AdminMobileNav, AdminRail } from "@/components/admin/AdminRail";
import { AppealsSection } from "@/components/admin/AppealsSection";
import { BroadcastSection } from "@/components/admin/BroadcastSection";
import { OverviewSection } from "@/components/admin/OverviewSection";
import { ReportsSection } from "@/components/admin/ReportsSection";
import { UsersSection } from "@/components/admin/UsersSection";
import { VerificationSection } from "@/components/admin/VerificationSection";
import { AuthShell } from "@/components/auth/AuthShell";
import { BrandMark } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { ErrorMsg, InputShell, InputWrap } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

export default function AdminPage() {
  const [phase, setPhase] = useState("checking"); // checking | login | dash
  const [email, setEmail] = useState("");
  const [passkey, setPasskey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);

  const [admin, setAdmin] = useState(null);
  const [stats, setStats] = useState(null);
  const [section, setSection] = useState("overview");
  const [focusUser, setFocusUser] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.adminStats();
      setStats(res.data || null);
    } catch {
      // Keep the last known snapshot; sections still load their own data.
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const me = await api.adminMe();
        setAdmin(me.data || null);
        setPhase("dash");
        fetchStats();
      } catch {
        setPhase("login");
      }
    })();
  }, [fetchStats]);

  const onLogin = async (event) => {
    event.preventDefault();
    setLoginError(null);
    if (!email.trim() || !passkey) {
      setLoginError("Enter the admin email and passkey.");
      return;
    }
    setLoginLoading(true);
    try {
      await api.adminLogin({
        email: email.trim().toLowerCase(),
        passkey,
      });
      const me = await api.adminMe().catch(() => null);
      setAdmin(me?.data || { email: email.trim().toLowerCase() });
      setPasskey("");
      setPhase("dash");
      fetchStats();
    } catch (err) {
      setLoginError(
        err.data?.message || err.message || "Could not unlock the admin area.",
      );
    } finally {
      setLoginLoading(false);
    }
  };

  const onLogout = async () => {
    setLoggingOut(true);
    try {
      await api.adminLogout();
    } catch {
      // Clear locally even if the network call fails.
    }
    setLoggingOut(false);
    setPhase("login");
    setAdmin(null);
    setStats(null);
    setEmail("");
    setPasskey("");
    setSection("overview");
    setFocusUser(null);
  };

  const navigate = (next) => {
    setSection(next);
    if (next !== "users") setFocusUser(null);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const openUser = (userId) => {
    if (!userId) return;
    setFocusUser(String(userId));
    setSection("users");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (phase === "checking") {
    return (
      <div className="grid min-h-dvh place-items-center bg-[var(--cz-bg)]">
        <div className="flex flex-col items-center gap-4">
          <BrandMark size={40} priority />
          <Loader2
            className="h-5 w-5 animate-spin text-[var(--cz-text-secondary)]"
            aria-label="Checking admin session"
          />
        </div>
      </div>
    );
  }

  if (phase === "login") {
    return (
      <AuthShell
        title="Admin access"
        subtitle="Restricted, unlisted area. Sign in with the backend ADMIN_EMAIL and ADMIN_PASSKEY."
      >
        <div className="mb-5 flex items-center justify-center gap-2 rounded-full border border-[var(--cz-border)] px-3 py-1.5 text-[12px] font-bold text-[var(--cz-text-secondary)]">
          <ShieldCheck className="h-[14px] w-[14px]" aria-hidden />
          Moderation console
        </div>
        <form onSubmit={onLogin} noValidate className="flex flex-col gap-5">
          {loginError ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-[4px] bg-[color-mix(in_srgb,var(--cz-error)_10%,transparent)] px-3 py-2.5 text-[14px] leading-[19px] text-[var(--cz-error)]"
            >
              <AlertCircle
                className="mt-0.5 h-[17px] w-[17px] shrink-0"
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
                  onClick={() => setShowKey((value) => !value)}
                  className="grid h-[32px] w-[32px] place-items-center rounded-full text-[var(--cz-text-secondary)] hover:bg-[var(--cz-border)] hover:text-[var(--cz-text-primary)]"
                >
                  {showKey ? (
                    <EyeOff className="h-[18px] w-[18px]" aria-hidden />
                  ) : (
                    <Eye className="h-[18px] w-[18px]" aria-hidden />
                  )}
                </button>
              </InputShell>
            </InputWrap>
            <ErrorMsg>
              Never share this passkey. It lives only in the backend
              environment.
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
      <AdminRail
        section={section}
        onNavigate={navigate}
        stats={stats}
        adminEmail={admin?.email}
        onLogout={onLogout}
        loggingOut={loggingOut}
      />

      <div className="min-w-0 lg:pl-[252px]">
        <AdminMobileNav
          section={section}
          onNavigate={navigate}
          stats={stats}
          adminEmail={admin?.email}
          onLogout={onLogout}
          loggingOut={loggingOut}
        />

        <main className="mx-auto w-full max-w-[1240px] px-4 pt-5 pb-20 sm:px-6 lg:px-8 lg:pt-8">
          <div key={section}>
            {section === "overview" ? (
              <OverviewSection
                stats={stats}
                adminEmail={admin?.email}
                onNavigate={navigate}
                onOpenUser={openUser}
                refreshStats={fetchStats}
              />
            ) : section === "users" ? (
              <UsersSection
                refreshStats={fetchStats}
                focusUserId={focusUser}
                onFocusConsumed={() => setFocusUser(null)}
                onNavigate={navigate}
              />
            ) : section === "broadcast" ? (
              <BroadcastSection stats={stats} refreshStats={fetchStats} />
            ) : section === "reports" ? (
              <ReportsSection refreshStats={fetchStats} onOpenUser={openUser} />
            ) : section === "appeals" ? (
              <AppealsSection refreshStats={fetchStats} onOpenUser={openUser} />
            ) : (
              <VerificationSection
                refreshStats={fetchStats}
                onOpenUser={openUser}
              />
            )}
          </div>

          <footer className="mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--cz-border)] pt-4 text-[11px] text-[var(--cz-text-tertiary)]">
            <span>
              CampusZen Admin · unlisted area. Actions are recorded against{" "}
              {admin?.email || "this admin session"}.
            </span>
            <span>
              Restrict is read-only and auto-lifts. Bans are reversible.
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
