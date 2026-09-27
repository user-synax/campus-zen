export function cleanCollegeName(name) {
  return String(name || "").trim().replace(/\s+/g, " ").slice(0, 120) || null;
}

export function slugifyCollege(name) {
  const cleaned = String(name || "").trim().toLowerCase();
  if (!cleaned) return null;
  const ascii = cleaned
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
  const slug = ascii
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 80);
  return slug || null;
}
