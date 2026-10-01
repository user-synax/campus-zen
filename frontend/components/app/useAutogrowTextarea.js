"use client";

import { useEffect } from "react";

/**
 * Auto-grow a textarea up to maxHeight, then scroll inside.
 * - Starts at rows height, expands as you type/paste.
 * - Caps at maxHeight (default 200px ≈ 8 lines) so long pastes stay
 *   reviewable without taking over the screen.
 */
export function autogrow(el, maxHeight = 200) {
  if (!el) return;
  el.style.height = "auto";
  const next = Math.min(el.scrollHeight, maxHeight);
  el.style.height = `${next}px`;
  el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
}

export function useAutogrowTextarea(ref, value, maxHeight = 200) {
  useEffect(() => {
    autogrow(ref.current, maxHeight);
  }, [ref, value, maxHeight]);
}
