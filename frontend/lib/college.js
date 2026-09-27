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
