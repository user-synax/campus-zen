/**
 * Pure helpers for the "Share to socials" surface. No DOM and no server-only
 * APIs live here: the same text/URL building runs in the browser dialog and in
 * server metadata / OG image routes.
 */

export const SHARE_BRAND = {
  name: "CampusZen",
  domain: "campuszen.tech",
  tagline: "Open source social media for students.",
  url: "https://campuszen.tech",
};

// Article mentions (${username/slug}) and snippet mentions (${s/username/slug})
// are in-app syntax; they mean nothing in a social caption, so shared text
// strips both.
const IN_APP_MENTION = /\$\{(?:s\/)?[a-z0-9_]+\/[a-z0-9-]+\}/gi;

export function cleanShareText(value) {
  return String(value || "")
    .replace(IN_APP_MENTION, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Truncate by code point so a cut never splits an emoji surrogate pair. */
export function truncateShareText(value, max = 200) {
  const text = cleanShareText(value);
  const chars = Array.from(text);
  if (chars.length <= max) return text;
  return `${chars
    .slice(0, Math.max(0, max - 1))
    .join("")
    .trimEnd()}…`;
}

export function shareAuthor(post) {
  if (!post) {
    return {
      name: SHARE_BRAND.name,
      handle: "campuszen",
      avatarUrl: null,
      isAnonymous: false,
    };
  }
  if (post.isAnonymous) {
    return {
      name: post.anonAlias || "Anonymous",
      handle: "anonymous",
      avatarUrl: null,
      isAnonymous: true,
    };
  }
  return {
    name: post.author?.fullName || post.author?.username || SHARE_BRAND.name,
    handle: post.author?.username || "campuszen",
    avatarUrl: post.author?.avatarUrl || null,
    isAnonymous: false,
  };
}

export function sharePostText(post, max = 1000) {
  if (!post) return "";
  if (post.kind === "article") {
    return truncateShareText(
      post.description || post.text || post.body || "",
      max,
    );
  }
  return truncateShareText(post.text || "", max);
}

export function shareHeadline(post) {
  if (!post) return "";
  if (post.kind === "article") {
    return truncateShareText(post.title || "Article on CampusZen", 90);
  }
  return sharePostText(post, 90) || "A post on CampusZen";
}

export function sharePath(post) {
  if (post?.kind === "article" && post.author?.username && post.slug) {
    return `/app/a/${encodeURIComponent(post.author.username)}/${encodeURIComponent(post.slug)}`;
  }
  return `/app/p/${post?._id || ""}`;
}

export function shareAbsoluteUrl(post, origin = SHARE_BRAND.url) {
  const base = String(origin || SHARE_BRAND.url).replace(/\/+$/, "");
  return `${base}${sharePath(post)}`;
}

export function tweetText(post, max = 200) {
  const author = shareAuthor(post);
  const snippet = sharePostText(post, max);
  const credit = author.isAnonymous
    ? "Anonymous on CampusZen"
    : `@${author.handle} on CampusZen`;
  if (!snippet) return "Check out this post on CampusZen";
  return `“${snippet}” — ${credit}`;
}

export function shareCaption(post, max = 280) {
  const author = shareAuthor(post);
  const snippet = sharePostText(post, max);
  const credit = author.isAnonymous
    ? "Anonymous on CampusZen"
    : `@${author.handle} on CampusZen`;
  return snippet ? `“${snippet}” — ${credit}` : "A post on CampusZen";
}

/**
 * First media item that can live inside a static image. Videos use their
 * poster; GIFs are skipped because generated cards are still PNGs. Sensitive
 * posts never expose media in a share asset.
 */
export function shareMedia(post) {
  if (!post || post.isSensitive) return null;
  const media = Array.isArray(post.media) ? post.media : [];
  for (const item of media) {
    if (!item?.url) continue;
    if (item.kind === "video") {
      if (item.posterUrl) return { url: item.posterUrl, kind: "image" };
      continue;
    }
    if (item.kind === "gif") continue;
    return { url: item.url, kind: "image" };
  }
  if (post.imageUrl && !/\.gif(\?|$)/i.test(post.imageUrl)) {
    return { url: post.imageUrl, kind: "image" };
  }
  return null;
}

/**
 * Metadata for /app/p/[id] and /app/a/[username]/[slug]. Relative URLs are
 * resolved against the root `metadataBase` (https://campuszen.tech).
 */
export function shareMetadata(post, path) {
  const author = shareAuthor(post);
  const isArticle = post?.kind === "article";
  const title = isArticle
    ? truncateShareText(post.title || "Article on CampusZen", 90)
    : truncateShareText(
        sharePostText(post, 80) || `A post by ${author.name}`,
        80,
      );
  const description = isArticle
    ? truncateShareText(
        post.description ||
          sharePostText(post, 180) ||
          `Read ${author.name}'s article on CampusZen.`,
        180,
      )
    : truncateShareText(
        sharePostText(post, 180) ||
          `Read the full post by ${author.name} on CampusZen.`,
        180,
      );
  const image = `/app/p/${post?._id}/share-image?format=card`;
  const alt = `${author.name} on CampusZen`;

  const metadata = {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: isArticle ? "article" : "website",
      url: path,
      title,
      description,
      siteName: SHARE_BRAND.name,
      locale: "en_IN",
      images: [{ url: image, width: 1200, height: 630, alt }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
      ...(author.isAnonymous ? {} : { creator: `@${author.handle}` }),
    },
  };

  if (isArticle) {
    metadata.openGraph.article = {
      publishedTime: post.createdAt,
      modifiedTime: post.updatedAt || post.createdAt,
      authors: [author.name],
    };
  }

  return metadata;
}
