"use client";

import { Loader2, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CzImage } from "@/components/app/CzImage";
import { formatDuration } from "@/lib/media";
import { cn } from "@/lib/utils";

// Fast-by-design video: the feed never fetches video bytes. We render the
// client-generated poster (image-weight) and only attach `src` when the tile
// is near the viewport AND the user hits play. preload="none" + poster keeps
// this as cheap as an image until interaction.
export function VideoPlayer({
  src,
  poster,
  duration,
  alt = "Post video",
  className,
  eager = false,
}) {
  const [nearView, setNearView] = useState(eager);
  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const wrapRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    if (eager) return;
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setNearView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNearView(true);
          io.disconnect();
        }
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [eager]);

  // Pause when scrolled far away so background tabs don't burn data/battery.
  useEffect(() => {
    if (!playing) return;
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.every((e) => !e.isIntersecting)) {
          videoRef.current?.pause?.();
        }
      },
      { rootMargin: "-200px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [playing]);

  // Pause other inline players when this one starts (one soundtrack at a time).
  useEffect(() => {
    if (!playing) return;
    const onOther = (e) => {
      if (e.detail !== src) videoRef.current?.pause?.();
    };
    window.addEventListener("cz:video-play", onOther);
    return () => window.removeEventListener("cz:video-play", onOther);
  }, [playing, src]);

  if (!playing) {
    return (
      <span
        ref={wrapRef}
        className={cn("relative block overflow-hidden", className)}
      >
        <CzImage
          src={poster || src}
          alt={alt}
          fit="contain"
          className="w-full"
          imgClassName="max-h-[510px]"
          eager={eager}
        />
        {!poster ? (
          <span aria-hidden className="t-shimmer absolute inset-0" />
        ) : null}
        <button
          type="button"
          onClick={() => {
            if (!nearView) setNearView(true);
            setPlaying(true);
            setWaiting(true);
            window.dispatchEvent(
              new CustomEvent("cz:video-play", { detail: src }),
            );
          }}
          aria-label={
            duration ? `Play video (${formatDuration(duration)})` : "Play video"
          }
          className="absolute inset-0 grid w-full place-items-center bg-black/25 transition-colors hover:bg-black/35"
        >
          <span className="grid h-14 w-14 place-items-center rounded-full bg-black/65 text-white backdrop-blur-sm transition-transform hover:scale-105">
            <Play className="ml-0.5 h-6 w-6 fill-current" aria-hidden />
          </span>
        </button>
        {duration ? (
          <span className="pointer-events-none absolute right-2 bottom-2 rounded-full bg-black/70 px-2 py-0.5 text-[12px] font-bold text-white tabular-nums">
            {formatDuration(duration)}
          </span>
        ) : null}
      </span>
    );
  }

  return (
    <span
      ref={wrapRef}
      className={cn("relative block overflow-hidden bg-black", className)}
    >
      {waiting ? (
        <span className="absolute inset-0 z-10 grid place-items-center bg-black/40">
          <Loader2 className="h-6 w-6 animate-spin text-white" aria-hidden />
        </span>
      ) : null}
      {/* user-uploaded video: no caption track exists */}
      {/* biome-ignore lint/a11y/useMediaCaption: user uploads have no captions */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={videoRef}
        src={nearView ? src : undefined}
        poster={poster || undefined}
        controls
        autoPlay
        playsInline
        preload="metadata"
        onCanPlay={() => setWaiting(false)}
        onPlaying={() => setWaiting(false)}
        onWaiting={() => setWaiting(true)}
        onPause={() => setWaiting(false)}
        className="mx-auto block max-h-[510px] w-full"
      />
    </span>
  );
}
