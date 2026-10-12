"use client";

import {
  BarChart2,
  Bookmark,
  FileText,
  Heart,
  MessageCircle,
  Repeat2,
  Share2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * Feed mock — the landing hero demo (per landing IA: feed mock).
 * transitions-dev:
 *  19 card-tilt on the outer card · 16 tabs sliding for
 *  Following/Discovery · 11 avatar-group-hover for the online row ·
 *  23 like-button + 02 number-pop-in for the interactive like.
 * Pure CSS motion + tiny orchestration, cz tokens only (light/dark aware).
 */
const AVATARS = [
  { i: "P", label: "Priya" },
  { i: "A", label: "Arjun" },
  { i: "S", label: "Sana" },
  { i: "K", label: "Kabir" },
  { i: "+", label: "2.4k more" },
];

const PARTICLE_VECTORS = [
  ["12px", "-14px"],
  ["18px", "2px"],
  ["10px", "14px"],
  ["-12px", "12px"],
  ["-18px", "-2px"],
  ["-8px", "-16px"],
  ["0px", "-20px"],
  ["6px", "18px"],
];

export function HeroVisual() {
  const tiltRef = useRef(null);
  const cardRef = useRef(null);
  const tabsRef = useRef(null);
  const pillRef = useRef(null);
  const avatarGroupRef = useRef(null);
  const likeBtnRef = useRef(null);
  const [tab, setTab] = useState(0);
  const [liked, setLiked] = useState(true);
  const [likeCount, setLikeCount] = useState(128);
  const burstTimer = useRef(null);

  // 19 · card tilt — track pointer on the flat outer .t-tilt
  useEffect(() => {
    const tilt = tiltRef.current;
    const card = cardRef.current;
    if (!tilt || !card) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const MAX = 7;
    const reset = () => {
      tilt.classList.remove("is-hover");
      card.classList.remove("is-tilting");
      card.style.setProperty("--tilt-rx", "0deg");
      card.style.setProperty("--tilt-ry", "0deg");
    };
    const track = (e) => {
      if (reduce.matches) return;
      const r = tilt.getBoundingClientRect();
      const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      const py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      tilt.classList.add("is-hover");
      card.classList.add("is-tilting");
      card.style.setProperty(
        "--tilt-ry",
        ((px - 0.5) * MAX).toFixed(2) + "deg",
      );
      card.style.setProperty(
        "--tilt-rx",
        ((0.5 - py) * MAX).toFixed(2) + "deg",
      );
      card.style.setProperty("--tilt-gx", (px * 100).toFixed(1) + "%");
      card.style.setProperty("--tilt-gy", (py * 100).toFixed(1) + "%");
    };
    tilt.addEventListener("pointermove", track);
    tilt.addEventListener("pointerleave", reset);
    tilt.addEventListener("pointercancel", reset);
    return () => {
      tilt.removeEventListener("pointermove", track);
      tilt.removeEventListener("pointerleave", reset);
      tilt.removeEventListener("pointercancel", reset);
    };
  }, []);

  // 16 · tabs sliding pill
  useEffect(() => {
    const bar = tabsRef.current;
    const pill = pillRef.current;
    if (!bar || !pill) return;
    const tabs = [...bar.querySelectorAll(".t-tab")];
    const active = tabs[tab] || tabs[0];
    const moveTo = (el, animate) => {
      if (!el) return;
      if (!animate) {
        const prev = pill.style.transition;
        pill.style.transition = "none";
        pill.style.transform = `translateX(${el.offsetLeft}px)`;
        pill.style.width = `${el.offsetWidth}px`;
        void pill.offsetWidth;
        pill.style.transition = prev;
      } else {
        pill.style.transform = `translateX(${el.offsetLeft}px)`;
        pill.style.width = `${el.offsetWidth}px`;
      }
    };
    requestAnimationFrame(() => moveTo(active, false));
    moveTo(active, true);
    const onResize = () => moveTo(tabs[tab] || tabs[0], false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [tab]);

  // 11 · avatar group hover — direction-aware easing set inline first
  const setShifts = (activeIdx, phase) => {
    const root = avatarGroupRef.current;
    if (!root) return;
    const cs = getComputedStyle(document.documentElement);
    const num = (n, fb) => {
      const v = parseFloat(cs.getPropertyValue(n));
      return Number.isFinite(v) ? v : fb;
    };
    const ease = (n, fb) => cs.getPropertyValue(n).trim() || fb;
    const lift = num("--avatar-lift", -4);
    const falloff = num("--avatar-falloff", 0.45);
    const scale = num("--avatar-scale", 1.05);
    const tf =
      phase === "out"
        ? ease("--avatar-ease-out", "cubic-bezier(0.34, 3.85, 0.64, 1)")
        : ease("--avatar-ease-in", "cubic-bezier(0.22, 1, 0.36, 1)");
    root.querySelectorAll(".t-avatar").forEach((el, i) => {
      el.style.transitionTimingFunction = tf;
      if (activeIdx == null) {
        el.style.setProperty("--shift", "0px");
        el.style.setProperty("--scale-active", "1");
        return;
      }
      const d = Math.abs(i - activeIdx);
      el.style.setProperty("--shift", (lift * falloff ** d).toFixed(3) + "px");
      el.style.setProperty(
        "--scale-active",
        i === activeIdx ? String(scale) : "1",
      );
    });
  };

  const fireLikeBurst = () => {
    const btn = likeBtnRef.current;
    if (!btn) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const dots = btn.querySelectorAll(".t-like-particles i");
    dots.forEach((dot, i) => {
      const [px, py] = PARTICLE_VECTORS[i % PARTICLE_VECTORS.length];
      dot.style.setProperty("--px", px);
      dot.style.setProperty("--py", py);
      dot.style.setProperty("--psize", i % 3 === 0 ? "1.4" : "1");
      dot.style.setProperty("--pdelay", `${i * 18}ms`);
      dot.style.setProperty("--p-end-scale", "0.6");
    });
    btn.classList.remove("is-bursting");
    void btn.offsetWidth;
    btn.classList.add("is-bursting");
    if (burstTimer.current) clearTimeout(burstTimer.current);
    burstTimer.current = setTimeout(
      () => btn.classList.remove("is-bursting"),
      700,
    );
  };

  const toggleLike = () => {
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => (next ? c + 1 : c - 1));
    if (next) fireLikeBurst();
  };

  useEffect(
    () => () => {
      if (burstTimer.current) clearTimeout(burstTimer.current);
    },
    [],
  );

  return (
    <div ref={tiltRef} className="t-tilt w-full" style={{ perspective: 1000 }}>
      <div
        ref={cardRef}
        className="t-tilt-card border border-[var(--cz-border)] bg-[var(--cz-surface)] shadow-[var(--shadow-sm)]"
      >
        <div className="t-tilt-glare" aria-hidden />
        {/* header */}
        <div className="flex items-center justify-between border-b border-[var(--cz-border)] px-4 py-3">
          <span className="inline-flex items-center gap-2 text-[13px] font-bold text-[var(--cz-text-primary)]">
            <span
              className="h-2 w-2 animate-pulse rounded-full bg-[var(--cz-success)]"
              aria-hidden
            />
            Live preview
          </span>
          <div
            ref={tabsRef}
            className="t-tabs"
            role="tablist"
            aria-label="Feed preview tabs"
          >
            <span ref={pillRef} className="t-tabs-pill" aria-hidden />
            {["Following", "Discovery"].map((t, i) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === i ? "true" : "false"}
                onClick={() => setTab(i)}
                className="t-tab text-[13px] font-bold"
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* post 1 */}
        <div className="border-b border-[var(--cz-border)] px-4 py-3">
          <div className="flex gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--cz-accent)] text-[13px] font-bold text-[var(--cz-text-inverse)]">
              P
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 text-[15px] leading-[20px]">
                <span className="truncate font-bold text-[var(--cz-text-primary)]">
                  Priya
                </span>
                <span
                  className="grid h-4 w-4 place-items-center rounded-full bg-[var(--cz-accent)] text-[9px] font-bold text-white"
                  aria-label="Verified"
                >
                  ✓
                </span>
                <span className="truncate text-[var(--cz-text-secondary)]">
                  · 2m
                </span>
              </p>
              <p className="mt-0.5 text-[15px] leading-[20px] text-[var(--cz-text-primary)]">
                Hackathon team formation tonight? Need one design + one backend.{" "}
                <span className="font-medium text-[var(--cz-accent)]">
                  #BuildNight
                </span>{" "}
                <span className="font-medium text-[var(--cz-accent)]">
                  @arjun_ece
                </span>
              </p>
              <div className="mt-2 overflow-hidden rounded-[12px] border border-[var(--cz-border)]">
                <div className="flex items-center gap-1.5 border-b border-[var(--cz-border)] px-3 py-1.5 text-[12px] font-bold text-[var(--cz-text-secondary)]">
                  <BarChart2 className="h-3.5 w-3.5" aria-hidden /> Poll · ends
                  in 1d
                </div>
                <div className="space-y-1.5 p-3">
                  {[
                    ["I can design", "68%"],
                    ["I can backend", "32%"],
                  ].map(([label, pct]) => (
                    <div
                      key={label}
                      className="relative h-[32px] overflow-hidden rounded-[8px] bg-[var(--cz-surface-strong)]"
                    >
                      <div
                        className="absolute inset-y-0 left-0 bg-[var(--cz-accent-soft)]"
                        style={{ width: pct }}
                        aria-hidden
                      />
                      <div className="relative flex h-full items-center justify-between px-2.5 text-[13px] font-bold">
                        <span className="text-[var(--cz-text-primary)]">
                          {label}
                        </span>
                        <span className="text-[var(--cz-text-secondary)]">
                          {pct}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-1 flex max-w-[340px] items-center justify-between text-[var(--cz-text-secondary)]">
                <span className="flex items-center gap-1 px-2 py-1 text-[13px]">
                  <MessageCircle
                    className="h-[18px] w-[18px]"
                    strokeWidth={1.8}
                    aria-hidden
                  />{" "}
                  24
                </span>
                <span className="flex items-center gap-1 px-2 py-1 text-[13px]">
                  <Repeat2
                    className="h-[18px] w-[18px]"
                    strokeWidth={1.8}
                    aria-hidden
                  />{" "}
                  12
                </span>
                <button
                  ref={likeBtnRef}
                  type="button"
                  onClick={toggleLike}
                  data-liked={liked ? "true" : "false"}
                  aria-pressed={liked}
                  aria-label={
                    liked ? "Unlike preview post" : "Like preview post"
                  }
                  className="t-like relative flex items-center gap-1 rounded-full px-2 py-1 text-[13px] font-medium transition-colors hover:bg-[color-mix(in_srgb,var(--cz-like)_12%,transparent)] hover:text-[var(--cz-like)] data-[liked=true]:text-[var(--cz-like)]"
                >
                  <span className="t-like-icon grid place-items-center">
                    <Heart
                      className="t-like-heart h-[18px] w-[18px]"
                      strokeWidth={1.8}
                      aria-hidden
                    />
                  </span>
                  <span
                    className="t-digit-group is-animating tabular-nums"
                    key={likeCount}
                  >
                    {String(likeCount)
                      .split("")
                      .map((ch, i, arr) => (
                        <span
                          key={`${likeCount}-${i}`}
                          className="t-digit"
                          data-stagger={i === arr.length - 1 ? "1" : undefined}
                        >
                          {ch}
                        </span>
                      ))}
                  </span>
                  <span className="t-like-particles" aria-hidden>
                    {Array.from({ length: 8 }).map((_, i) => (
                      <i key={i} />
                    ))}
                  </span>
                </button>
                <span className="grid place-items-center rounded-full p-2">
                  <Bookmark
                    className="h-[18px] w-[18px]"
                    strokeWidth={1.8}
                    aria-hidden
                  />
                </span>
                <span className="grid place-items-center rounded-full p-2">
                  <Share2
                    className="h-[18px] w-[18px]"
                    strokeWidth={1.8}
                    aria-hidden
                  />
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* post 2 — article */}
        <div className="px-4 py-3">
          <div className="block rounded-[12px] border border-[var(--cz-border)] bg-[var(--cz-surface)] p-3 transition-colors hover:bg-[var(--cz-surface-strong)]">
            <span className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-[var(--cz-accent)]">
              <FileText className="h-3.5 w-3.5" aria-hidden /> Article ·
              @sana_des/placement-notes
            </span>
            <span className="mt-1 block text-[16px] font-extrabold leading-[22px] text-[var(--cz-text-primary)]">
              Placement notes: 30 days of DSA
            </span>
            <span className="mt-0.5 line-clamp-2 block text-[14px] leading-[20px] text-[var(--cz-text-secondary)]">
              What actually worked — sheets, mocks, and revision loops. 12 min
              read with code blocks.
            </span>
            <span className="t-learn mt-1 inline-flex items-center gap-1 text-[13px] font-bold text-[var(--cz-accent)]">
              Read article
              <span className="t-learn-chevron" aria-hidden>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path className="t-learn-arm t-learn-arm-top" d="M6 4L10 8" />
                  <path
                    className="t-learn-arm t-learn-arm-bot"
                    d="M10 8L6 12"
                  />
                </svg>
              </span>
            </span>
          </div>
        </div>

        {/* footer — online row */}
        <div className="flex items-center justify-between border-t border-[var(--cz-border)] bg-[var(--cz-surface-strong)]/40 px-4 py-3">
          <div
            ref={avatarGroupRef}
            className="t-avatar-group flex items-center"
            onMouseLeave={() => setShifts(null, "out")}
          >
            {AVATARS.map((a, i) => (
              <span
                key={a.label}
                onMouseEnter={() => setShifts(i, "in")}
                title={a.label}
                className={`t-avatar -ml-2 grid h-8 w-8 place-items-center rounded-full border-2 border-[var(--cz-surface)] text-[12px] font-bold first:ml-0 ${
                  i === AVATARS.length - 1
                    ? "bg-[var(--cz-surface-strong)] text-[var(--cz-text-secondary)]"
                    : "bg-[var(--cz-accent)] text-[var(--cz-text-inverse)]"
                }`}
              >
                {a.i}
              </span>
            ))}
          </div>
          <span className="text-[13px] font-medium text-[var(--cz-text-secondary)]">
            2.4k students online
          </span>
        </div>
      </div>
    </div>
  );
}
