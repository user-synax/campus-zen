"use client";

import { Minus, Plus, RotateCcw, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const MIN_SCALE = 1;
const MAX_SCALE = 4;

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Centered image-viewer modal with zoom + pan.
 *
 * Toolbar buttons, mouse-wheel zoom (toward cursor), double-click toggle,
 * drag to pan when zoomed, pinch-to-zoom on touch. Escape or backdrop click
 * closes. Rendered in a portal above everything else (including the
 * media-tab dialog).
 */
export function ImageLightbox({ src, alt = "Post image", onClose }) {
  const [scale, setScale] = useState(MIN_SCALE);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [interacting, setInteracting] = useState(false);
  const stageRef = useRef(null);
  const live = useRef({ scale: MIN_SCALE, offset: { x: 0, y: 0 } });
  const pointers = useRef(new Map());
  const gesture = useRef(null);

  live.current.scale = scale;
  live.current.offset = offset;

  const clampOffset = useCallback((ox, oy, s) => {
    const el = stageRef.current;
    if (!el) return { x: ox, y: oy };
    const r = el.getBoundingClientRect();
    const mx = ((s - 1) * r.width) / 2;
    const my = ((s - 1) * r.height) / 2;
    return { x: clamp(ox, -mx, mx), y: clamp(oy, -my, my) };
  }, []);

  const reset = useCallback(() => {
    gesture.current = null;
    setScale(MIN_SCALE);
    setOffset({ x: 0, y: 0 });
  }, []);

  // Zoom by `factor` keeping stage point (cx, cy) stable under the cursor.
  const zoomAt = useCallback(
    (factor, cx, cy) => {
      const el = stageRef.current;
      if (!el) return;
      const { scale: s, offset: o } = live.current;
      const ns = clamp(s * factor, MIN_SCALE, MAX_SCALE);
      if (ns === MIN_SCALE) {
        reset();
        return;
      }
      const r = el.getBoundingClientRect();
      const px = cx - r.width / 2;
      const py = cy - r.height / 2;
      const k = ns / s;
      const next = {
        x: px - (px - o.x) * k,
        y: py - (py - o.y) * k,
      };
      setScale(ns);
      setOffset(clampOffset(next.x, next.y, ns));
    },
    [clampOffset, reset],
  );

  const zoomCenter = useCallback(
    (factor) => {
      const el = stageRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      zoomAt(factor, r.width / 2, r.height / 2);
    },
    [zoomAt],
  );

  // Wheel zoom needs a non-passive listener so we can preventDefault.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(
        e.deltaY < 0 ? 1.18 : 1 / 1.18,
        e.clientX - r.left,
        e.clientY - r.top,
      );
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  // Keyboard: Escape closes, +/- zoom, 0 resets.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "+" || e.key === "=") zoomCenter(1.4);
      else if (e.key === "-") zoomCenter(1 / 1.4);
      else if (e.key === "0") reset();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, zoomCenter, reset]);

  // Lock background scroll while open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const stagePos = (clientX, clientY) => {
    const r = stageRef.current.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  };

  const onPointerDown = (e) => {
    stageRef.current?.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = {
        type: "pinch",
        dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        scale: live.current.scale,
        mid: stagePos((a.x + b.x) / 2, (a.y + b.y) / 2),
        offset: { ...live.current.offset },
      };
      setInteracting(true);
    } else if (pointers.current.size === 1 && live.current.scale > MIN_SCALE) {
      gesture.current = {
        type: "pan",
        start: { x: e.clientX, y: e.clientY },
        offset: { ...live.current.offset },
      };
      setInteracting(true);
    }
  };

  const onPointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (!g) return;
    if (g.type === "pinch" && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const ns = clamp(g.scale * (dist / g.dist), MIN_SCALE, MAX_SCALE);
      if (ns === MIN_SCALE) {
        reset();
        return;
      }
      const r = stageRef.current.getBoundingClientRect();
      const mid = stagePos((a.x + b.x) / 2, (a.y + b.y) / 2);
      const px = g.mid.x - r.width / 2;
      const py = g.mid.y - r.height / 2;
      const k = ns / g.scale;
      const next = {
        x: px - (px - g.offset.x) * k + (mid.x - g.mid.x),
        y: py - (py - g.offset.y) * k + (mid.y - g.mid.y),
      };
      setScale(ns);
      setOffset(clampOffset(next.x, next.y, ns));
    } else if (g.type === "pan") {
      const next = {
        x: g.offset.x + (e.clientX - g.start.x),
        y: g.offset.y + (e.clientY - g.start.y),
      };
      setOffset(clampOffset(next.x, next.y, live.current.scale));
    }
  };

  const endPointer = (e) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2 && gesture.current?.type === "pinch") {
      gesture.current = null;
    }
    if (pointers.current.size === 0) {
      gesture.current = null;
      setInteracting(false);
    } else if (pointers.current.size === 1 && live.current.scale > MIN_SCALE) {
      // Pinch released into a one-finger drag — keep panning seamlessly.
      const [p] = [...pointers.current.values()];
      gesture.current = {
        type: "pan",
        start: { x: p.x, y: p.y },
        offset: { ...live.current.offset },
      };
    }
  };

  const onDoubleClick = (e) => {
    if (live.current.scale > 1.2) {
      reset();
    } else {
      const p = stagePos(e.clientX, e.clientY);
      zoomAt(2.5 / live.current.scale, p.x, p.y);
    }
  };

  if (typeof document === "undefined" || !src) return null;

  const viewer = (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="Close viewer"
        onClick={onClose}
        className="absolute inset-0 cursor-default border-0 bg-black/70 p-0 backdrop-blur-md"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Image viewer"
        className="relative flex max-h-[90dvh] w-full max-w-[720px] flex-col overflow-hidden rounded-[16px] bg-black text-white shadow-[var(--shadow-sm)]"
      >
        <div className="flex h-[56px] shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 sm:px-4">
          <p className="min-w-0 truncate text-[15px] font-bold">{alt}</p>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={reset}
              disabled={scale === MIN_SCALE}
              aria-label="Reset zoom"
              className="grid h-[44px] w-[44px] place-items-center rounded-full transition-colors hover:bg-white/15 disabled:opacity-30"
            >
              <RotateCcw className="h-[18px] w-[18px]" aria-hidden />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close viewer"
              className="grid h-[44px] w-[44px] place-items-center rounded-full transition-colors hover:bg-white/15"
            >
              <X className="h-[20px] w-[20px]" aria-hidden />
            </button>
          </div>
        </div>

        <section
          ref={stageRef}
          aria-label="Zoomable image area"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          onDoubleClick={onDoubleClick}
          className={cn(
            "flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4 touch-none select-none",
            scale > MIN_SCALE ? "cursor-grab" : "cursor-zoom-in",
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            draggable={false}
            className="max-h-[58dvh] max-w-full object-contain sm:max-h-[66dvh]"
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              transition: interacting ? "none" : "transform 160ms ease-out",
            }}
          />
        </section>

        <div className="flex shrink-0 flex-col items-center gap-1 border-t border-white/10 px-4 pt-2 pb-3 sm:pb-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => zoomCenter(1 / 1.4)}
              disabled={scale === MIN_SCALE}
              aria-label="Zoom out"
              className="grid h-[44px] w-[44px] place-items-center rounded-full bg-white/10 transition-colors hover:bg-white/20 disabled:opacity-30"
            >
              <Minus className="h-[18px] w-[18px]" aria-hidden />
            </button>
            <span
              aria-live="polite"
              className="w-[64px] text-center text-[13px] font-bold tabular-nums"
            >
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => zoomCenter(1.4)}
              disabled={scale === MAX_SCALE}
              aria-label="Zoom in"
              className="grid h-[44px] w-[44px] place-items-center rounded-full bg-white/10 transition-colors hover:bg-white/20 disabled:opacity-30"
            >
              <Plus className="h-[18px] w-[18px]" aria-hidden />
            </button>
          </div>
          <p className="text-[12px] text-white/60 sm:hidden">
            Pinch to zoom · drag to pan
          </p>
          <p className="hidden text-[12px] text-white/60 sm:block">
            Scroll or pinch to zoom · drag to pan · double-click to toggle
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(viewer, document.body);
}
