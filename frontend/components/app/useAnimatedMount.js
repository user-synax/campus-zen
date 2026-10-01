"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Enter + exit mount state for menus and modals.
 *
 * CSS transitions only run when the element is already in the DOM, so an
 * instantly-mounted `.is-open` never animates. This keeps the element
 * mounted during close (~closeMs) and exposes `is-open` / `is-closing`
 * classes that match the existing `.t-modal` / `.t-menu` / `.t-backdrop`
 * convention in globals.css.
 *
 * Respects prefers-reduced-motion by skipping the exit delay.
 */
export function useAnimatedMount(open, { closeMs = 150 } = {}) {
  const [show, setShow] = useState(Boolean(open));
  const [closing, setClosing] = useState(false);
  const [entered, setEntered] = useState(Boolean(open));
  const timer = useRef(null);

  useEffect(() => {
    if (open) {
      setShow(true);
      setClosing(false);
      // Next frame so the opening class lands after first paint.
      const raf = requestAnimationFrame(() =>
        requestAnimationFrame(() => setEntered(true)),
      );
      return () => cancelAnimationFrame(raf);
    }
    if (show) {
      let reduced = false;
      try {
        reduced =
          typeof window !== "undefined" &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      } catch {}
      if (reduced) {
        setShow(false);
        setClosing(false);
        setEntered(false);
        return;
      }
      setClosing(true);
      timer.current = setTimeout(() => {
        setShow(false);
        setClosing(false);
        setEntered(false);
      }, closeMs);
      return () => clearTimeout(timer.current);
    }
  }, [open, show, closeMs]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return {
    show,
    closing,
    entered,
    mountClass: closing ? "is-closing" : entered ? "is-open" : "",
  };
}
