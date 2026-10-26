"use client";

import {
  BellRing,
  Check,
  ChevronDown,
  ChevronUp,
  Megaphone,
  Search,
  Send,
  Smartphone,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { BrandMark } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  AdminAvatar,
  AdminDialog,
  Chip,
  EmptyRows,
  ErrorBanner,
  Field,
  formatDateTime,
  formatNumber,
  inputClass,
  LoadingRows,
  Panel,
  PanelHeader,
  SectionIntro,
  Spinner,
  textareaClass,
  timeAgo,
} from "./ui";

function errorMessage(err, fallback) {
  return err?.data?.message || err?.message || fallback;
}

export function BroadcastSection({ stats, refreshStats }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("all");
  const [selected, setSelected] = useState([]);
  const [query, setQuery] = useState("");
  const [recipients, setRecipients] = useState([]);
  const [searching, setSearching] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);

  const [history, setHistory] = useState([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyMore, setHistoryMore] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const historyRequest = useRef(0);

  const loadHistory = useCallback(async (pg = 1, append = false) => {
    const token = ++historyRequest.current;
    if (append) setHistoryMore(true);
    else setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await api.adminBroadcasts({ page: pg, limit: 20 });
      if (token !== historyRequest.current) return;
      const data = res.data || {};
      setHistory((prev) =>
        append ? [...prev, ...(data.broadcasts || [])] : data.broadcasts || [],
      );
      setHistoryTotal(data.total || 0);
      setHistoryPage(data.page || pg);
      setHistoryHasMore(Boolean(data.hasMore));
    } catch (err) {
      if (token === historyRequest.current) {
        setHistoryError(errorMessage(err, "Could not load broadcasts."));
      }
    } finally {
      if (token === historyRequest.current) {
        setHistoryLoading(false);
        setHistoryMore(false);
      }
    }
  }, []);

  useEffect(() => {
    loadHistory(1, false);
  }, [loadHistory]);

  const loadRecipients = useCallback(async (term) => {
    setSearching(true);
    try {
      const res = await api.adminUsers({
        q: term,
        status: "all",
        sort: "active",
        page: 1,
        limit: 10,
      });
      setRecipients(
        (res.data?.users || []).filter(
          (u) => !u.isBanned && !u.isDeactivated && u.isEmailVerified,
        ),
      );
    } catch {
      setRecipients([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (audience !== "selected") return;
    const timer = setTimeout(() => loadRecipients(query.trim()), 280);
    return () => clearTimeout(timer);
  }, [audience, query, loadRecipients]);

  const addRecipient = (user) => {
    setSelected((prev) =>
      prev.some((item) => item._id === user._id) ? prev : [...prev, user],
    );
  };

  const removeRecipient = (id) => {
    setSelected((prev) => prev.filter((item) => item._id !== id));
  };

  const canSend =
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    (audience === "all" || selected.length > 0);

  const resetComposer = () => {
    setTitle("");
    setBody("");
    setAudience("all");
    setSelected([]);
    setQuery("");
    setRecipients([]);
    setSendError(null);
  };

  const send = async () => {
    setSending(true);
    setSendError(null);
    try {
      const res = await api.adminSendBroadcast({
        title: title.trim(),
        body: body.trim(),
        audience,
        userIds: audience === "selected" ? selected.map((u) => u._id) : [],
      });
      const data = res.data || {};
      toast.success(
        `Broadcast delivered to ${formatNumber(data.recipientCount)} students`,
      );
      if (data.broadcast) {
        setHistory((prev) => [data.broadcast, ...prev]);
        setHistoryTotal((t) => t + 1);
      }
      setConfirmOpen(false);
      resetComposer();
      refreshStats?.();
    } catch (err) {
      setSendError(errorMessage(err, "Could not send the broadcast."));
    } finally {
      setSending(false);
    }
  };

  const previewTitle = title.trim() || "Announcement title";
  const previewBody =
    body.trim() ||
    "Your message will appear here. Keep it short, clear, and useful to students.";
  const audienceLabel =
    audience === "all"
      ? "Everyone active"
      : `${selected.length} selected ${
          selected.length === 1 ? "student" : "students"
        }`;

  return (
    <div>
      <SectionIntro
        eyebrow="Announcements"
        title="Broadcast"
        subtitle="Send a message that arrives as an in-app notification and a web push labelled Admin. Deliver to every active student or hand-pick recipients."
        actions={
          <div className="flex items-center gap-2">
            <Chip tone="accent">
              <BellRing className="h-3 w-3" aria-hidden />
              {formatNumber(stats?.push?.subscribers)} push devices
            </Chip>
          </div>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.85fr)]">
        <Panel>
          <PanelHeader
            icon={Megaphone}
            title="Compose announcement"
            subtitle="The Admin label and CampusZen mark are added automatically."
          />
          <div className="flex flex-col gap-4 px-4 py-4">
            <Field
              label="Title"
              htmlFor="broadcast-title"
              counter={`${title.length}/120`}
              hint="Shown as the notification headline."
            >
              <input
                id="broadcast-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                placeholder="e.g. CampusZen is down for maintenance tonight"
                className={inputClass}
              />
            </Field>

            <Field
              label="Message"
              htmlFor="broadcast-body"
              counter={`${body.length}/1000`}
              hint="Keep it to one or two sentences. Add timing and what students should do next."
            >
              <textarea
                id="broadcast-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={1000}
                rows={5}
                placeholder="Write the announcement…"
                className={textareaClass}
              />
            </Field>

            <div>
              <p className="text-[13px] font-bold">Audience</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {[
                  {
                    id: "all",
                    label: "Everyone active",
                    hint: "Email-verified, not banned or deactivated",
                    icon: Users,
                  },
                  {
                    id: "selected",
                    label: "Selected students",
                    hint: "Hand-pick up to 500 recipients",
                    icon: Search,
                  },
                ].map((option) => {
                  const active = audience === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setAudience(option.id)}
                      className={cn(
                        "rounded-xl border px-3 py-2.5 text-left transition-colors",
                        active
                          ? "border-[var(--cz-accent)] bg-[var(--cz-accent-soft)]"
                          : "border-[var(--cz-border-strong)] hover:bg-[var(--cz-surface-strong)]",
                      )}
                    >
                      <span className="flex items-center gap-1.5 text-[13px] font-bold">
                        <option.icon
                          className="h-[14px] w-[14px]"
                          aria-hidden
                        />
                        {option.label}
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-[15px] text-[var(--cz-text-secondary)]">
                        {option.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {audience === "selected" ? (
              <div>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[13px] font-bold">Recipients</p>
                  <span className="text-[12px] text-[var(--cz-text-secondary)]">
                    {selected.length}/500 selected
                  </span>
                </div>

                {selected.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selected.map((user) => (
                      <span
                        key={user._id}
                        className="inline-flex h-[30px] max-w-full items-center gap-1.5 rounded-full border border-[var(--cz-border-strong)] bg-[var(--cz-surface)] pr-1 pl-1"
                      >
                        <AdminAvatar user={user} size={22} />
                        <span className="max-w-[150px] truncate text-[12px] font-bold">
                          @{user.username}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeRecipient(user._id)}
                          aria-label={`Remove @${user.username}`}
                          className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full text-[var(--cz-text-secondary)] hover:bg-[var(--cz-surface-strong)] hover:text-[var(--cz-text-primary)]"
                        >
                          <X className="h-[12px] w-[12px]" aria-hidden />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="relative mt-2">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-3 h-[15px] w-[15px] -translate-y-1/2 text-[var(--cz-text-secondary)]"
                    aria-hidden
                  />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search students to add"
                    aria-label="Search recipients"
                    className={cn(inputClass, "h-[38px] pl-9")}
                  />
                </div>

                <div className="mt-2 max-h-[260px] overflow-y-auto rounded-xl border border-[var(--cz-border)]">
                  {searching ? (
                    <LoadingRows label="Searching…" />
                  ) : recipients.length ? (
                    <ul className="divide-y divide-[var(--cz-border)]">
                      {recipients.map((user) => {
                        const added = selected.some(
                          (item) => item._id === user._id,
                        );
                        return (
                          <li key={user._id}>
                            <button
                              type="button"
                              onClick={() =>
                                added
                                  ? removeRecipient(user._id)
                                  : addRecipient(user)
                              }
                              className={cn(
                                "flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-[var(--cz-surface-strong)]",
                                added && "bg-[var(--cz-accent-softer)]",
                              )}
                            >
                              <AdminAvatar user={user} size={30} />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13px] font-bold">
                                  {user.fullName || user.username}
                                </span>
                                <span className="block truncate text-[11px] text-[var(--cz-text-secondary)]">
                                  @{user.username}
                                  {user.college ? ` · ${user.college}` : ""}
                                </span>
                              </span>
                              <span
                                className={cn(
                                  "grid h-[24px] w-[24px] shrink-0 place-items-center rounded-full border",
                                  added
                                    ? "border-[var(--cz-accent)] bg-[var(--cz-accent)] text-[var(--cz-text-inverse)]"
                                    : "border-[var(--cz-border-strong)] text-transparent",
                                )}
                              >
                                <Check
                                  className="h-[13px] w-[13px]"
                                  aria-hidden
                                />
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="px-3 py-6 text-center text-[12px] text-[var(--cz-text-secondary)]">
                      No active students match that search.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-[var(--cz-surface-strong)] px-3 py-2.5 text-[12px] leading-[17px] text-[var(--cz-text-secondary)]">
                Reaches every active account with a verified email. Banned and
                deactivated accounts are skipped automatically.
              </div>
            )}

            {sendError && !confirmOpen ? (
              <ErrorBanner>{sendError}</ErrorBanner>
            ) : null}

            <div className="flex flex-col gap-2 border-t border-[var(--cz-border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] leading-[15px] text-[var(--cz-text-secondary)]">
                Delivered in-app instantly. Web push is sent to every subscribed
                device.
              </p>
              <Button
                onClick={() => setConfirmOpen(true)}
                disabled={!canSend}
                className="shrink-0"
              >
                <Send className="h-[15px] w-[15px]" aria-hidden />
                Review &amp; send
              </Button>
            </div>
          </div>
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel>
            <PanelHeader
              icon={Smartphone}
              title="Live preview"
              subtitle="Exactly what students will see."
            />
            <div className="flex flex-col gap-4 px-4 py-4">
              <div>
                <p className="mb-1.5 text-[11px] font-bold tracking-[0.06em] text-[var(--cz-text-secondary)] uppercase">
                  In-app
                </p>
                <div className="rounded-2xl border border-[var(--cz-border)] bg-[var(--cz-surface)] p-3">
                  <div className="flex items-start gap-2.5">
                    <BrandMark size={38} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[13px] font-extrabold">
                          CampusZen
                        </span>
                        <Chip
                          tone="accent"
                          className="h-[19px] px-1.5 text-[10px]"
                        >
                          Admin
                        </Chip>
                        <span className="ml-auto text-[11px] text-[var(--cz-text-secondary)]">
                          now
                        </span>
                      </div>
                      <p className="mt-1.5 text-[14px] leading-[19px] font-extrabold">
                        {previewTitle}
                      </p>
                      <p className="mt-1 text-[13px] leading-[18px] whitespace-pre-wrap text-[var(--cz-text-secondary)]">
                        {previewBody}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-[11px] font-bold tracking-[0.06em] text-[var(--cz-text-secondary)] uppercase">
                  Web push
                </p>
                <div className="rounded-2xl bg-[var(--cz-surface-strong)] p-3">
                  <div className="rounded-xl border border-[var(--cz-border)] bg-[var(--cz-bg)] px-3 py-2.5 shadow-[var(--shadow-sm)]">
                    <div className="flex items-center gap-1.5">
                      <BrandMark size={18} />
                      <span className="text-[11px] font-bold text-[var(--cz-text-secondary)]">
                        CampusZen
                      </span>
                      <span className="ml-auto text-[10px] text-[var(--cz-text-secondary)]">
                        now
                      </span>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-[12px] leading-[16px] font-extrabold">
                      Admin · {previewTitle}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-[15px] text-[var(--cz-text-secondary)]">
                      {previewBody}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-dashed border-[var(--cz-border-strong)] px-3 py-2.5">
                <p className="text-[11px] font-bold text-[var(--cz-text-secondary)]">
                  Audience
                </p>
                <p className="mt-0.5 text-[13px] font-bold">{audienceLabel}</p>
              </div>
            </div>
          </Panel>

          <Panel className="px-4 py-3.5">
            <p className="text-[12px] font-bold tracking-[0.06em] text-[var(--cz-text-secondary)] uppercase">
              Delivery checklist
            </p>
            <ul className="mt-2 flex flex-col gap-1.5 text-[12px] leading-[17px] text-[var(--cz-text-secondary)]">
              <li className="flex items-start gap-1.5">
                <Check
                  className="mt-0.5 h-[13px] w-[13px] shrink-0 text-[var(--cz-success)]"
                  aria-hidden
                />
                Notification row is labelled Admin with the CampusZen logo.
              </li>
              <li className="flex items-start gap-1.5">
                <Check
                  className="mt-0.5 h-[13px] w-[13px] shrink-0 text-[var(--cz-success)]"
                  aria-hidden
                />
                Web push uses the title format{" "}
                <span className="font-bold text-[var(--cz-text-primary)]">
                  Admin · title
                </span>
                .
              </li>
              <li className="flex items-start gap-1.5">
                <Check
                  className="mt-0.5 h-[13px] w-[13px] shrink-0 text-[var(--cz-success)]"
                  aria-hidden
                />
                Banned, deactivated, and unverified accounts are skipped.
              </li>
              <li className="flex items-start gap-1.5">
                <Check
                  className="mt-0.5 h-[13px] w-[13px] shrink-0 text-[var(--cz-success)]"
                  aria-hidden
                />
                Every send is recorded in the history below.
              </li>
            </ul>
          </Panel>
        </div>
      </div>

      <Panel className="mt-4 overflow-hidden">
        <PanelHeader
          icon={BellRing}
          title="Broadcast history"
          subtitle="Every announcement, who received it, and how many devices were reached."
          action={<Chip>{formatNumber(historyTotal)} sent</Chip>}
        />
        {historyError ? (
          <div className="px-4 py-3">
            <ErrorBanner onRetry={() => loadHistory(1, false)}>
              {historyError}
            </ErrorBanner>
          </div>
        ) : null}
        {historyLoading ? (
          <LoadingRows label="Loading broadcast history…" />
        ) : history.length ? (
          <ul className="divide-y divide-[var(--cz-border)]">
            {history.map((item) => {
              const expanded = expandedId === item._id;
              return (
                <li key={item._id} className="px-4 py-3.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="min-w-0 flex-1 truncate text-[14px] font-extrabold">
                      {item.title}
                    </p>
                    <Chip>
                      {item.audience === "selected" ? "Selected" : "Everyone"}
                    </Chip>
                    <span className="text-[11px] text-[var(--cz-text-secondary)]">
                      {timeAgo(item.createdAt)}
                    </span>
                  </div>
                  <p
                    className={cn(
                      "mt-1 text-[13px] leading-[18px] whitespace-pre-wrap text-[var(--cz-text-secondary)]",
                      !expanded && "line-clamp-2",
                    )}
                  >
                    {item.body}
                  </p>
                  {item.body?.length > 160 ? (
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : item._id)}
                      className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-[var(--cz-text-primary)] hover:underline"
                    >
                      {expanded ? (
                        <>
                          Show less{" "}
                          <ChevronUp className="h-3 w-3" aria-hidden />
                        </>
                      ) : (
                        <>
                          Read full message{" "}
                          <ChevronDown className="h-3 w-3" aria-hidden />
                        </>
                      )}
                    </button>
                  ) : null}
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--cz-text-secondary)]">
                    <span>
                      {formatNumber(item.recipientCount)} in-app recipients
                    </span>
                    <span>
                      {formatNumber(item.pushSubscriberCount)} push devices
                    </span>
                    <span>{formatDateTime(item.createdAt)}</span>
                    {item.createdBy ? (
                      <span className="truncate">by {item.createdBy}</span>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyRows
            icon={Megaphone}
            title="No broadcasts yet"
            description="Your first announcement will appear here with its delivery counts."
          />
        )}
        <div className="flex items-center justify-between gap-3 border-t border-[var(--cz-border)] px-4 py-3">
          <p className="text-[12px] text-[var(--cz-text-secondary)]">
            {formatNumber(historyTotal)} total
          </p>
          {historyHasMore ? (
            <Button
              variant="secondary"
              size="sm"
              disabled={historyMore}
              onClick={() => loadHistory(historyPage + 1, true)}
            >
              {historyMore ? <Spinner /> : null}
              {historyMore ? "Loading…" : "Load more"}
            </Button>
          ) : null}
        </div>
      </Panel>

      <AdminDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Send this broadcast?"
        description="It cannot be recalled once delivered."
        icon={Megaphone}
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setConfirmOpen(false)}
              disabled={sending}
            >
              Keep editing
            </Button>
            <Button size="sm" onClick={send} disabled={sending}>
              {sending ? <Spinner /> : <Send className="h-[14px] w-[14px]" />}
              {sending ? "Sending…" : "Send now"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {sendError ? <ErrorBanner>{sendError}</ErrorBanner> : null}
          <div className="rounded-xl border border-[var(--cz-border)] px-3.5 py-3">
            <div className="flex items-center gap-2">
              <BrandMark size={30} />
              <div className="min-w-0">
                <p className="text-[13px] font-extrabold">{title.trim()}</p>
                <p className="text-[11px] text-[var(--cz-text-secondary)]">
                  CampusZen · Admin
                </p>
              </div>
            </div>
            <p className="mt-2 text-[13px] leading-[18px] whitespace-pre-wrap text-[var(--cz-text-secondary)]">
              {body.trim()}
            </p>
          </div>
          <div className="rounded-xl bg-[var(--cz-surface-strong)] px-3.5 py-3 text-[12px] leading-[17px] text-[var(--cz-text-secondary)]">
            <p className="font-bold text-[var(--cz-text-primary)]">
              {audienceLabel}
            </p>
            <p className="mt-1">
              {audience === "all"
                ? "Every active, email-verified student will receive an in-app notification. Web push is attempted for each subscribed device."
                : `${selected.length} hand-picked ${
                    selected.length === 1 ? "student" : "students"
                  } will receive an in-app notification and web push where enabled.`}
            </p>
          </div>
        </div>
      </AdminDialog>
    </div>
  );
}
