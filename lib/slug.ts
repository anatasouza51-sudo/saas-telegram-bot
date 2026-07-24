/**
 * URL-safe slug from a human name: strips accents, lowercases and collapses
 * every non-alphanumeric run into a single dash.
 */
export function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}
