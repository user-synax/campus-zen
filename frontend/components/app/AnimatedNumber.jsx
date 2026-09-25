"use client";

import { useEffect, useRef, useState } from "react";

export function AnimatedNumber({ value, className }) {
  const str = String(value ?? 0);
  const groupRef = useRef(null);
  const [display, setDisplay] = useState(str);

  useEffect(() => {
    const next = String(value ?? 0);
    if (next === display) return;
    // trigger pop-in
    const g = groupRef.current;
    if (!g) {
      setDisplay(next);
      return;
    }
    g.classList.remove("is-animating");
    // force reflow
    void g.offsetHeight;
    setDisplay(next);
    requestAnimationFrame(() => {
      g.classList.add("is-animating");
    });
  }, [value, display]);

  useEffect(() => {
    // initial animate
    const g = groupRef.current;
    if (!g) return;
    g.classList.add("is-animating");
    const t = setTimeout(() => g.classList.remove("is-animating"), 700);
    return () => clearTimeout(t);
  }, []);

  const chars = display.split("");

  return (
    <span ref={groupRef} className={`t-digit-group ${className || ""}`}>
      {chars.map((ch, i) => {
        const stagger = i === chars.length - 2 ? "1" : i === chars.length - 1 ? "2" : undefined;
        return (
          <span key={`${display}-${i}`} className="t-digit" data-stagger={stagger}>
            {ch}
          </span>
        );
      })}
    </span>
  );
}
