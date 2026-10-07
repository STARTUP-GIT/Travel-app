/**
 * URL slugs for the state/district routes.
 *
 * Route segments are slugs, never database ids, so a district keeps a readable
 * URL; the real id is always re-resolved from the backend before it is used in
 * any request.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function slugEquals(slug: string, name: string): boolean {
  return slug === slugify(name);
}