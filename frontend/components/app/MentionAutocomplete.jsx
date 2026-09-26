"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

// find @query immediately before caret (partial allowed, 1-20 chars)
function queryBeforeCaret(val, caret) {
  const before = val.slice(0, caret);
  const m = before.match(/(^|\s)@([a-z0-9_]{1,20})$/i);
  if (!m) return null;
  return { query: m[2], start: caret - m[2].length - 1 };
}

export function useMentionAutocomplete({ value, setValue, inputRef }) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const matchRef = useRef(null);
  const abortRef = useRef(null);
  const timerRef = useRef(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  // auto-detect on every value change (typing) — caret read post-render
  useEffect(() => {
    const el = inputRef.current;
    // if input not focused, don't pop suggestions
    if (!el || document.activeElement !== el) return;
    const caret = el.selectionStart ?? value.length;
    const found = queryBeforeCaret(value, caret);
    if (!found) {
      setOpen(false);
      setUsers([]);
      matchRef.current = null;
      return;
    }
    matchRef.current = { ...found, caret };
    setActive(0);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      try {
        const res = await api.listUsers({ q: found.query, limit: 5 });
        if (controller.signal.aborted) return;
        setUsers(res.data?.users || []);
        setOpen(true);
      } catch {
        if (!controller.signal.aborted) {
          setUsers([]);
          setOpen(false);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, inputRef]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  // re-check when caret moves without typing (arrow keys, click)
  const recheck = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const caret = el.selectionStart ?? valueRef.current.length;
    const found = queryBeforeCaret(valueRef.current, caret);
    if (!found) {
      setOpen(false);
      setUsers([]);
      matchRef.current = null;
      return;
    }
    matchRef.current = { ...found, caret };
    setActive(0);
    setOpen(users.length > 0);
  }, [inputRef, users.length]);

  const insert = useCallback(
    (user) => {
      const el = inputRef.current;
      const cur = valueRef.current;
      const caret = el?.selectionStart ?? cur.length;
      const found = queryBeforeCaret(cur, caret) || matchRef.current;
      if (!found || !user) return false;
      const next = `${cur.slice(0, found.start + 1)}${user.username} ${cur.slice(caret)}`;
      setValue(next);
      setOpen(false);
      setUsers([]);
      matchRef.current = null;
      const newCaret = found.start + 1 + user.username.length + 1;
      requestAnimationFrame(() => {
        try {
          el?.focus();
          el?.setSelectionRange(newCaret, newCaret);
        } catch {}
      });
      return true;
    },
    [setValue, inputRef],
  );

  // returns true if key was consumed
  const handleKeyDown = useCallback(
    (e) => {
      if (!open || !users.length) return false;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => (a + 1) % users.length);
        return true;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => (a - 1 + users.length) % users.length);
        return true;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        const target = users[active];
        if (target) {
          e.preventDefault();
          insert(target);
          return true;
        }
        return false;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        setUsers([]);
        return true;
      }
      return false;
    },
    [open, users, active, insert],
  );

  const close = useCallback(() => {
    setOpen(false);
    setUsers([]);
  }, []);

  return {
    open: open && users.length > 0,
    users,
    active,
    setActive,
    loading,
    recheck,
    insert,
    handleKeyDown,
    close,
  };
}

function initialsFor(u) {
  return (u.fullName || u.username || "U").trim().slice(0, 1).toUpperCase();
}

export function MentionSuggest({ users, active, onSelect, onHover }) {
  if (!users.length) return null;
  return (
    <div
      role="listbox"
      aria-label="Mention suggestions"
      className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-[12px] border border-[var(--cz-border)] bg-[var(--cz-surface-strong)] shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
    >
      {users.map((u, i) => (
        <button
          key={u._id}
          type="button"
          role="option"
          aria-selected={i === active}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(u);
          }}
          onMouseEnter={() => onHover?.(i)}
          className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors ${
            i === active
              ? "bg-[rgba(255,206,173,0.08)]"
              : "hover:bg-[rgba(255,206,173,0.04)]"
          }`}
        >
          <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--cz-muted)] text-[11px] font-semibold text-white">
            {u.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={u.avatarUrl}
                alt={u.username}
                className="h-full w-full object-cover"
              />
            ) : (
              initialsFor(u)
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-[var(--cz-text-primary)]">
              {u.fullName || u.username}
            </span>
            <span className="block truncate text-[12px] text-[var(--cz-text-secondary)]">
              @{u.username}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
