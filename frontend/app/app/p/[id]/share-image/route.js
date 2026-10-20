import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { ShareImage } from "@/components/share/ShareImage";
import {
  cleanShareText,
  shareAuthor,
  shareMedia,
  sharePostText,
  truncateShareText,
} from "@/lib/share";
import { getPostForShare } from "@/lib/share-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CARD = { width: 1200, height: 630 };
const STORY = { width: 1080, height: 1920 };

/**
 * Assets are read from an explicit `public/` path so Turbopack can trace just
 * these two files instead of the whole project.
 */
const FONT_REGULAR = path.join(
  process.cwd(),
  "public",
  "fonts",
  "Inter-400.woff",
);
const FONT_BOLD = path.join(process.cwd(), "public", "fonts", "Inter-700.woff");
const LOGO = path.join(process.cwd(), "public", "campusZen.png");

function readOrNull(filePath) {
  return readFile(filePath).catch(() => null);
}

let fontsPromise;
async function loadFonts() {
  if (!fontsPromise) {
    fontsPromise = Promise.all([
      readOrNull(FONT_REGULAR),
      readOrNull(FONT_BOLD),
    ]).then(([regular, bold]) => {
      if (!regular || !bold) return null;
      return [
        {
          name: "Inter",
          data: regular.buffer.slice(
            regular.byteOffset,
            regular.byteOffset + regular.byteLength,
          ),
          weight: 400,
          style: "normal",
        },
        {
          name: "Inter",
          data: bold.buffer.slice(
            bold.byteOffset,
            bold.byteOffset + bold.byteLength,
          ),
          weight: 700,
          style: "normal",
        },
      ];
    });
  }
  return fontsPromise;
}

let logoPromise;
async function loadLogo() {
  if (!logoPromise) {
    logoPromise = readOrNull(LOGO).then((buffer) =>
      buffer ? `data:image/png;base64,${buffer.toString("base64")}` : null,
    );
  }
  return logoPromise;
}

async function fetchImageData(url) {
  if (!url || typeof url !== "string" || !/^https?:\/\//i.test(url))
    return null;
  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const type = (res.headers.get("content-type") || "")
      .split(";")[0]
      .trim()
      .toLowerCase();
    if (!/^image\/(png|jpe?g|webp|avif)$/.test(type)) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (!buffer.length || buffer.length > 3_500_000) return null;
    return `data:${type};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

function buildImageData(post, { logoData, avatarData, mediaData, variant }) {
  const story = variant === "story";
  const author = shareAuthor(post);
  const isArticle = post.kind === "article";
  const hasMedia = Boolean(mediaData);
  const quote = sharePostText(
    post,
    story ? (hasMedia ? 150 : 250) : hasMedia ? 125 : 175,
  );

  return {
    kind: isArticle ? "article" : "post",
    kicker: post.isAnonymous
      ? "Anonymous post"
      : isArticle
        ? "Article"
        : "Post",
    name: author.name,
    authorLine: author.isAnonymous
      ? "Anonymous · campuszen.tech"
      : `@${author.handle} · campuszen.tech`,
    initial: (author.name || "C").trim().charAt(0).toUpperCase(),
    quote: cleanShareText(quote),
    title: truncateShareText(post.title || "Article on CampusZen", 90),
    excerpt: truncateShareText(post.description || quote, story ? 200 : 130),
    cta: isArticle ? "Read article" : "Read post",
    avatarData,
    mediaData,
    logoData,
  };
}

function fallbackData({ logoData }) {
  return {
    kind: "post",
    kicker: "CampusZen",
    name: "CampusZen",
    authorLine: "campuszen.tech",
    initial: "C",
    quote: "This post isn’t available anymore.",
    title: "Post unavailable",
    excerpt: "Discover more from students across India on CampusZen.",
    cta: "Explore CampusZen",
    avatarData: null,
    mediaData: null,
    logoData,
  };
}

export async function GET(request, { params }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const variant = searchParams.get("format") === "story" ? "story" : "card";
  const download = searchParams.get("download") === "1";
  const size = variant === "story" ? STORY : CARD;

  const [fonts, logoData, post] = await Promise.all([
    loadFonts(),
    loadLogo(),
    getPostForShare(id),
  ]);

  let data;
  if (!post) {
    data = fallbackData({ logoData });
  } else {
    const media = shareMedia(post);
    const [avatarData, mediaData] = await Promise.all([
      post.isAnonymous || !post.author?.avatarUrl
        ? null
        : fetchImageData(post.author.avatarUrl),
      media ? fetchImageData(media.url) : null,
    ]);
    data = buildImageData(post, {
      logoData,
      avatarData,
      mediaData,
      variant,
    });
  }

  const headers = {
    "Cache-Control": download
      ? "private, max-age=0, must-revalidate"
      : "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
  };
  if (download) {
    const safeId = String(id || "post")
      .replace(/[^a-z0-9-]/gi, "")
      .slice(0, 32);
    headers["Content-Disposition"] =
      `attachment; filename="campuszen-${variant}-${safeId}.png"`;
  }

  return new ImageResponse(<ShareImage data={data} variant={variant} />, {
    ...size,
    fonts: fonts || undefined,
    headers,
  });
}
