import type { LessonEntry, Track } from "./curriculum";

/** Every Lesson in reading order: Tracks in their order, Lessons in theirs. Previous/Next follow this. */
export function readingOrder(tracks: Track[]): LessonEntry[] {
  return tracks.flatMap((t) => t.lessons);
}

export function neighbours(order: LessonEntry[], id: string): { previous?: LessonEntry; next?: LessonEntry } {
  const i = order.findIndex((l) => l.id === id);
  return { previous: i > 0 ? order[i - 1] : undefined, next: i >= 0 ? order[i + 1] : undefined };
}
