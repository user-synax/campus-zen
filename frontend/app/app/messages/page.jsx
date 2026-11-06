"use client";

import {
  ArrowLeft,
  Loader2,
  MessageCircle,
  MoreVertical,
  Send,
  Trash2,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CzImage } from "@/components/app/CzImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useRequireSession } from "@/lib/hooks/useRequireSession";

function Avatar({ user, size = 40 }) {
  const initials = (user?.fullName || user?.username || "U")
    .slice(0, 1)
    .toUpperCase();
  return (
    <span
      className="grid shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--cz-border-strong)] font-bold text-[var(--cz-text-primary)]"
      style={{ width: size, height: size }}
    >
      {user?.avatarUrl ? (
        <CzImage
          src={user.avatarUrl}
          alt=""
          className="h-full w-full"
          imgClassName="h-full w-full"
        />
      ) : (
        initials
      )}
    </span>
  );
}

export default function MessagesPage() {
  const { user, checking } = useRequireSession();
  const searchParams = useSearchParams();
  const requestedUserId = searchParams.get("userId");
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [participant, setParticipant] = useState(null);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const typingTimer = useRef(null);
  const endRef = useRef(null);

  const selected = useMemo(
    () =>
      conversations.find(
        (conversation) => String(conversation._id) === String(selectedId),
      ),
    [conversations, selectedId],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await api.listConversations();
        if (cancelled) return;
        const rows = response.data?.conversations || [];
        setConversations(rows);
        if (requestedUserId) {
          const created = await api.createConversation(requestedUserId);
          if (cancelled) return;
          const conversationId = created.data?.conversation?._id;
          const newParticipant = created.data?.participant;
          setSelectedId(conversationId);
          setParticipant(newParticipant);
          if (conversationId && newParticipant) {
            setConversations((rows) =>
              rows.some((row) => String(row._id) === String(conversationId))
                ? rows
                : [
                    {
                      _id: conversationId,
                      participant: newParticipant,
                      lastMessage: null,
                      lastMessageAt: null,
                      unreadCount: 0,
                    },
                    ...rows,
                  ],
            );
          }
        } else if (rows[0]) {
          setSelectedId(rows[0]._id);
        }
      } catch {
        // The shell displays auth and network errors; keep the empty state here.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [requestedUserId]);

  useEffect(() => {
    if (!user) return undefined;
    const refreshPresence = async () => {
      try {
        const response = await api.listConversations();
        const rows = response.data?.conversations || [];
        setConversations((current) =>
          current.map(
            (conversation) =>
              rows.find((row) => row._id === conversation._id) || conversation,
          ),
        );
        const active = rows.find((row) => row._id === selectedId);
        if (active?.participant) setParticipant(active.participant);
      } catch {}
    };
    const timer = setInterval(refreshPresence, 30000);
    return () => clearInterval(timer);
  }, [selectedId, user]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const response = await api.getConversationMessages(selectedId);
      if (cancelled) return;
      setMessages(response.data?.messages || []);
      setParticipant(
        response.data?.conversation?.participant ||
          selected?.participant ||
          null,
      );
      await api.markConversationRead(selectedId);
      setConversations((rows) =>
        rows.map((row) =>
          row._id === selectedId ? { ...row, unreadCount: 0 } : row,
        ),
      );
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selectedId, selected?.participant]);

  useEffect(() => {
    const onMessage = (event) => {
      const message = event.detail;
      if (!message?.conversationId) return;
      if (String(message.conversationId) === String(selectedId)) {
        setMessages((rows) =>
          rows.some((row) => row._id === message._id)
            ? rows
            : [...rows, { ...message, isOwn: false }],
        );
        api.markConversationRead(selectedId).catch(() => {});
      }
      setConversations((rows) =>
        rows.map((row) =>
          String(row._id) === String(message.conversationId)
            ? {
                ...row,
                lastMessage: message,
                lastMessageAt: message.createdAt,
                unreadCount:
                  String(row._id) === String(selectedId)
                    ? 0
                    : (row.unreadCount || 0) + 1,
              }
            : row,
        ),
      );
    };
    const onTyping = (event) => {
      if (String(event.detail?.conversationId) === String(selectedId))
        setTyping(Boolean(event.detail?.isTyping));
    };
    window.addEventListener("cz:chat:message", onMessage);
    window.addEventListener("cz:chat:typing", onTyping);
    return () => {
      window.removeEventListener("cz:chat:message", onMessage);
      window.removeEventListener("cz:chat:typing", onTyping);
    };
  }, [selectedId]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll whenever messages or typing state changes
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const handleDraftChange = (event) => {
    const value = event.target.value;
    setDraft(value);
    if (!selectedId) return;
    api
      .setConversationTyping(selectedId, value.trim().length > 0)
      .catch(() => {});
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      api.setConversationTyping(selectedId, false).catch(() => {});
    }, 1200);
  };

  const send = async (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !selectedId || sending) return;
    setSending(true);
    try {
      const response = await api.sendMessage(selectedId, text);
      const message = response.data?.message;
      if (message) {
        setMessages((rows) => [...rows, message]);
        setConversations((rows) =>
          rows.map((row) =>
            row._id === selectedId
              ? {
                  ...row,
                  lastMessage: message,
                  lastMessageAt: message.createdAt,
                }
              : row,
          ),
        );
      }
      setDraft("");
      await api.setConversationTyping(selectedId, false).catch(() => {});
    } finally {
      setSending(false);
    }
  };

  if (checking || !user) return null;

  return (
    <div className="flex min-h-[calc(100dvh-1px)] flex-col md:flex-row">
      <aside
        className={`w-full border-b border-[var(--cz-border)] md:w-[320px] md:border-r md:border-b-0 ${selectedId ? "hidden md:block" : ""}`}
      >
        <div className="border-b border-[var(--cz-border)] px-4 py-4">
          <h1 className="text-xl font-extrabold">Messages</h1>
        </div>
        {loading ? (
          <div className="grid place-items-center p-8">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : conversations.length ? (
          conversations.map((conversation) => (
            <button
              type="button"
              key={conversation._id}
              onClick={() => setSelectedId(conversation._id)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[var(--cz-surface-strong)] ${selectedId === conversation._id ? "bg-[var(--cz-surface-strong)]" : ""}`}
            >
              <Avatar user={conversation.participant} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">
                  {conversation.participant?.fullName ||
                    `@${conversation.participant?.username}`}
                </span>
                <span className="block truncate text-sm text-[var(--cz-text-secondary)]">
                  {conversation.lastMessage?.text || "Start a conversation"}
                </span>
              </span>
              {conversation.unreadCount > 0 ? (
                <span className="rounded-full bg-[var(--cz-accent)] px-2 py-0.5 text-xs font-bold text-white">
                  {conversation.unreadCount}
                </span>
              ) : null}
            </button>
          ))
        ) : (
          <div className="p-8 text-center text-sm text-[var(--cz-text-secondary)]">
            <MessageCircle className="mx-auto mb-2 h-7 w-7" />
            No conversations yet.
          </div>
        )}
      </aside>

      <section
        className={`flex min-h-[calc(100dvh-1px)] min-w-0 flex-1 flex-col ${selectedId ? "" : "hidden md:flex"}`}
      >
        {selectedId && participant ? (
          <>
            <header className="flex items-center gap-3 border-b border-[var(--cz-border)] px-4 py-3">
              <button
                type="button"
                className="md:hidden"
                onClick={() => setSelectedId(null)}
                aria-label="Back to conversations"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <Avatar user={participant} size={38} />
              <div>
                <p className="font-bold">
                  {participant.fullName || `@${participant.username}`}
                </p>
                <p className="text-sm text-[var(--cz-text-secondary)]">
                  {participant.online ? "Online" : `@${participant.username}`}
                  {typing ? " · typing…" : ""}
                </p>
              </div>
            </header>
            <div className="flex-1 space-y-2 overflow-y-auto px-4 py-5">
              {messages.map((message) => (
                <div
                  key={message._id}
                  className={`group flex ${message.isOwn ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`relative max-w-[75%] rounded-2xl px-3 py-2 text-[15px] ${message.isOwn ? "bg-[var(--cz-accent)] text-white" : "bg-[var(--cz-surface-strong)]"}`}
                  >
                    {message.text}
                    {message.isOwn && !message.deletedAt ? (
                      <button
                        type="button"
                        className="absolute -right-7 top-1 opacity-0 group-hover:opacity-100"
                        aria-label="Delete message"
                        onClick={() =>
                          api
                            .deleteMessage(message._id)
                            .then(() =>
                              setMessages((rows) =>
                                rows.map((row) =>
                                  row._id === message._id
                                    ? {
                                        ...row,
                                        text: "Message deleted",
                                        deletedAt: new Date().toISOString(),
                                      }
                                    : row,
                                ),
                              ),
                            )
                            .catch(() => {})
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <form
              onSubmit={send}
              className="flex gap-2 border-t border-[var(--cz-border)] p-3"
            >
              <Input
                value={draft}
                onChange={handleDraftChange}
                maxLength={2000}
                placeholder={`Message @${participant.username}`}
                aria-label="Message"
              />
              <Button
                type="submit"
                disabled={sending || !draft.trim()}
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </>
        ) : (
          <div className="grid flex-1 place-items-center p-8 text-center text-[var(--cz-text-secondary)]">
            <div>
              <MoreVertical className="mx-auto mb-2 h-8 w-8" />
              <p>Select a conversation to start chatting.</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
