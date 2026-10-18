/** Site-internal URL that respects the deploy base path (e.g. /java-visuals/ on GitHub Pages). */
export function href(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${base}/${path.replace(/^\//, "")}`;
}

export const lessonHref = (id: string) => href(`lessons/${id}/`);
export const trackHref = (id: string) => href(`tracks/${id}/`);
