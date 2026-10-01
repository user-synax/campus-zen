"use client";

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { useRef, useState } from "react";

/**
 * A live-looking slice of the product: a student at the centre, four
 * classmates around them, edges lighting up on hover. Achromatic except
 * the X Blue that marks the active edge — one accent, used for the thing
 * you are currently touching.
 */
const NODES = [
  { i: "P", h: "@priya_cs", s: "CSE · 2nd yr", x: 20, y: 24 },
  { i: "A", h: "@arjun_ece", s: "ECE · 3rd yr", x: 76, y: 24 },
  { i: "S", h: "@sana_des", s: "Design · 2nd yr", x: 72, y: 72 },
  { i: "K", h: "@kabir_bca", s: "BCA · 3rd yr", x: 26, y: 72 },
];

function tipPlacement(n) {
  const vertical = n.y > 60 ? "bottom-full mb-2" : "top-full mt-2";
  const horizontal =
    n.x < 26 ? "left-0" : n.x > 74 ? "right-0" : "left-1/2 -translate-x-1/2";
  return `${vertical} ${horizontal}`;
}

export function HeroVisual() {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const [active, setActive] = useState(null);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const px = useMotionValue(-400);
  const py = useMotionValue(-400);
  const sx = useSpring(mx, { stiffness: 70, damping: 22, mass: 0.6 });
  const sy = useSpring(my, { stiffness: 70, damping: 22, mass: 0.6 });

  const rotateX = useTransform(sy, [-0.5, 0.5], [4.5, -4.5]);
  const rotateY = useTransform(sx, [-0.5, 0.5], [-4.5, 4.5]);
  const layerX = useTransform(sx, (v) => v * 10);
  const layerY = useTransform(sy, (v) => v * 10);
  const gridX = useTransform(sx, (v) => v * -8);
  const gridY = useTransform(sy, (v) => v * -8);
  const glow = useMotionTemplate`radial-gradient(220px circle at ${px}px ${py}px, rgba(29,155,240,0.09), transparent 70%)`;

  function onMove(e) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = e.clientX - r.left;
    const cy = e.clientY - r.top;
    mx.set(cx / r.width - 0.5);
    my.set(cy / r.height - 0.5);
    px.set(cx);
    py.set(cy);

    let best = null;
    let bestDist = 100;
    for (let k = 0; k < NODES.length; k++) {
      const n = NODES[k];
      const dist = Math.hypot(
        (n.x / 100) * r.width - cx,
        (n.y / 100) * r.height - cy,
      );
      if (dist < bestDist) {
        bestDist = dist;
        best = k;
      }
    }
    setActive((prev) => (prev === best ? prev : best));
  }

  function onLeave() {
    mx.set(0);
    my.set(0);
    px.set(-400);
    py.set(-400);
    setActive(null);
  }

  return (
    <div style={{ perspective: 1000 }} className="w-full">
      <motion.div
        ref={ref}
        onMouseMove={reduce ? undefined : onMove}
        onMouseLeave={reduce ? undefined : onLeave}
        role="img"
        aria-label="Interactive preview of your campus network. Move your cursor to explore students."
        style={reduce ? undefined : { rotateX, rotateY }}
        className="relative h-[340px] w-full overflow-hidden rounded-[16px] border border-[var(--cz-border)] bg-[var(--cz-surface)] sm:h-[400px] lg:h-[440px] [@media(hover:hover)]:cursor-crosshair"
      >
        {/* back grid — Mist Gray hairlines, never a colour */}
        <motion.div
          aria-hidden
          style={reduce ? undefined : { x: gridX, y: gridY }}
          className="absolute inset-[-20px] opacity-60"
        >
          <div
            className="h-full w-full"
            style={{
              backgroundImage:
                "linear-gradient(var(--cz-border) 1px, transparent 1px), linear-gradient(90deg, var(--cz-border) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
              maskImage:
                "radial-gradient(70% 70% at 50% 45%, black, transparent)",
              WebkitMaskImage:
                "radial-gradient(70% 70% at 50% 45%, black, transparent)",
            }}
          />
        </motion.div>

        {/* cursor glow — X Blue, because it tracks your pointer */}
        {!reduce && (
          <motion.div
            aria-hidden
            style={{ background: glow }}
            className="pointer-events-none absolute inset-0"
          />
        )}

        {/* network */}
        <motion.div
          style={reduce ? undefined : { x: layerX, y: layerY }}
          className="absolute inset-0"
        >
          <svg
            aria-hidden
            focusable="false"
            className="absolute inset-0 h-full w-full"
            preserveAspectRatio="none"
            viewBox="0 0 100 100"
          >
            <title>Network edges</title>
            {NODES.map((n, k) => (
              <line
                key={n.h}
                x1="50"
                y1="50"
                x2={n.x}
                y2={n.y}
                stroke={
                  active === k ? "var(--cz-accent)" : "var(--cz-border-strong)"
                }
                strokeWidth={active === k ? 0.5 : 0.3}
                style={{ transition: "stroke 250ms ease" }}
              />
            ))}
          </svg>

          {/* centre — the one filled control in the composition */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--cz-accent)] text-[13px] font-bold text-[var(--cz-text-inverse)]">
              Y
            </span>
            <span className="mt-1.5 block text-[13px] font-bold text-[var(--cz-text-primary)]">
              You
            </span>
          </div>

          {NODES.map((n, k) => {
            const isActive = active === k;
            return (
              <button
                key={n.h}
                type="button"
                onMouseEnter={() => setActive(k)}
                onFocus={() => setActive(k)}
                onBlur={() => setActive(null)}
                onClick={() => setActive(isActive ? null : k)}
                aria-label={`${n.h}, ${n.s}`}
                aria-expanded={isActive}
                className="group absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer border-0 bg-transparent p-2 outline-none"
                style={{ left: `${n.x}%`, top: `${n.y}%` }}
              >
                <span
                  className={`grid h-8 w-8 place-items-center rounded-full border text-[12px] font-bold transition-transform duration-200 ease-out ${
                    isActive
                      ? "scale-125 border-[var(--cz-accent)] bg-[var(--cz-accent)] text-[var(--cz-text-inverse)]"
                      : "border-[var(--cz-border-strong)] bg-[var(--cz-bg)] text-[var(--cz-text-primary)] group-hover:scale-110"
                  }`}
                >
                  {n.i}
                </span>
                <span
                  aria-hidden={!isActive}
                  className={`pointer-events-none absolute z-10 max-w-[160px] rounded-[4px] border border-[var(--cz-border)] bg-[var(--cz-elevated)] px-2 py-1 text-left shadow-[var(--shadow-sm)] transition-all duration-200 ease-out ${tipPlacement(n)} ${
                    isActive
                      ? "translate-y-0 opacity-100"
                      : "translate-y-1 opacity-0"
                  }`}
                >
                  <span className="block truncate text-[13px] font-bold text-[var(--cz-text-primary)]">
                    {n.h}
                  </span>
                  <span className="block whitespace-nowrap text-[13px] text-[var(--cz-text-secondary)]">
                    {n.s}
                  </span>
                </span>
              </button>
            );
          })}
        </motion.div>

        {/* header + footer */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-3.5 text-[13px] sm:px-5 sm:pt-4">
          <span className="inline-flex items-center gap-2 font-bold text-[var(--cz-text-primary)]">
            <span
              className="h-2 w-2 animate-pulse rounded-full bg-[var(--cz-accent)]"
              aria-hidden
            />
            Your network
          </span>
          <span className="text-[var(--cz-text-tertiary)]">4 nearby</span>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between px-4 pb-3.5 text-[13px] text-[var(--cz-text-tertiary)] sm:px-5 sm:pb-4">
          <span>Discover → Follow → Post → Interact</span>
          <span className="hidden sm:inline">Hover to explore</span>
        </div>
      </motion.div>
    </div>
  );
}
