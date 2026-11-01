export function slugifyCollege(name) {
  const cleaned = String(name || "")
    .trim()
    .toLowerCase();
  if (!cleaned) return null;
  const slug = cleaned
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 80);
  return slug || null;
}

export function collegeSlugFor(user) {
  if (user?.collegeSlug) return user.collegeSlug;
  if (user?.college) return slugifyCollege(user.college);
  return null;
}

export function collegeHrefFor(user) {
  const slug = collegeSlugFor(user);
  return slug ? `/c/${encodeURIComponent(slug)}` : null;
}

/**
 * "Dayananda Sagar College of Engineering" -> "DSCE" — the short form the
 * active-now strip uses ("students from DSCE online now"). Falls back to the
 * first few characters of the full name when the initials are too few.
 */
export function collegeShortLabel(name) {
  const words = String(name || "")
    .trim()
    .split(/\s+/)
    .filter((w) => w && !["of", "and", "&", "the", "for", "in"].includes(w.toLowerCase()));
  const initials = words
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  if (initials.length >= 2) return initials.slice(0, 5);
  return String(name || "").trim().slice(0, 12) || null;
}
