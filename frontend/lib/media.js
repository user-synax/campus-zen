"use client";

export const MEDIA_LIMITS = {
  MAX_FILES: 4,
  IMAGE_MAX_BYTES: 5 * 1024 * 1024,
  GIF_MAX_BYTES: 10 * 1024 * 1024,
  VIDEO_MAX_BYTES: 25 * 1024 * 1024,
  VIDEO_MAX_DURATION_S: 60,
};

export const ACCEPT_POST_MEDIA =
  "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime";

export function kindOfFile(file) {
  if (!file) return "image";
  if (file.type === "image/gif") return "gif";
  if (String(file.type || "").startsWith("video/")) return "video";
  return "image";
}

export function validatePostFile(file, existingKinds = []) {
  const kind = kindOfFile(file);
  if (kind === "video") {
    if (file.size > MEDIA_LIMITS.VIDEO_MAX_BYTES)
      return "Video must be under 25MB";
    if (existingKinds.includes("video")) return "Only one video per post";
    if (existingKinds.length > 0)
      return "Video can't be combined with other media";
  } else if (kind === "gif") {
    if (file.size > MEDIA_LIMITS.GIF_MAX_BYTES) return "GIF must be under 10MB";
    if (existingKinds.includes("video"))
      return "Video can't be combined with other media";
  } else {
    if (!String(file.type || "").startsWith("image/"))
      return "Only images, GIFs and videos are allowed";
    if (file.size > MEDIA_LIMITS.IMAGE_MAX_BYTES)
      return "Image must be under 5MB";
    if (existingKinds.includes("video"))
      return "Video can't be combined with other media";
  }
  return null;
}

function loadVideoElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    v.playsInline = true;
    const done = (val) => {
      URL.revokeObjectURL(url);
      resolve(val);
    };
    v.onloadedmetadata = () =>
      done({
        duration: Number.isFinite(v.duration) ? v.duration : 0,
        width: v.videoWidth || 0,
        height: v.videoHeight || 0,
      });
    v.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Couldn't read that video"));
    };
    v.src = url;
  });
}

export async function getVideoMetadata(file) {
  try {
    return await loadVideoElement(file);
  } catch {
    return { duration: 0, width: 0, height: 0 };
  }
}

// Capture the first presentable frame as a small JPEG so the feed can show
// an image-weight poster and never fetch video bytes until the user hits play.
export async function generateVideoPoster(file, maxW = 640) {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    video.src = url;
    await new Promise((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("Couldn't read that video"));
      setTimeout(() => reject(new Error("Couldn't read that video")), 15000);
    });
    const seekTo = Math.min(0.5, (video.duration || 1) / 3);
    await new Promise((resolve) => {
      const onSeek = () => resolve();
      video.onseeked = onSeek;
      try {
        video.currentTime = seekTo;
      } catch {
        resolve();
      }
      setTimeout(() => resolve(), 4000);
    });
    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 360;
    const scale = Math.min(1, maxW / vw);
    const w = Math.max(2, Math.round(vw * scale));
    const h = Math.max(2, Math.round(vh * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, w, h);
    const blob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.72),
    );
    return {
      blob,
      width: vw,
      height: vh,
      duration: Number.isFinite(video.duration) ? video.duration : 0,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function formatDuration(s) {
  const n = Math.max(0, Math.round(Number(s) || 0));
  const m = Math.floor(n / 60);
  const r = n % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

// Normalize every shape a post can carry media in:
// - new media[] entries { url, kind, posterUrl, ... }
// - legacy imageUrl string
export function normalizePostMedia(post) {
  if (post?.media?.length) {
    return post.media
      .filter((m) => m?.url)
      .map((m) => ({
        url: m.url,
        kind: m.kind === "video" ? "video" : m.kind === "gif" ? "gif" : "image",
        posterUrl: m.posterUrl || null,
        width: m.width || null,
        height: m.height || null,
        duration: m.duration || null,
      }));
  }
  if (post?.imageUrl) {
    const isGif = /\.gif(\?|$)/i.test(post.imageUrl);
    return [
      {
        url: post.imageUrl,
        kind: isGif ? "gif" : "image",
        posterUrl: null,
        width: null,
        height: null,
        duration: null,
      },
    ];
  }
  return [];
}
