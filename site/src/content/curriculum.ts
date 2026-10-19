import { getCollection, type CollectionEntry } from "astro:content";
import { sceneRenderers } from "../renderers/scenes";

export type TrackEntry = CollectionEntry<"tracks">;
export type LessonEntry = CollectionEntry<"lessons">;

export interface Track {
  id: string;
  data: TrackEntry["data"];
  lessons: LessonEntry[];
}

/**
 * Every Track with its Lessons in suggested order, after cross-checking what a per-file schema can't:
 * each Lesson's Track exists, Prerequisites point at real Lessons without cycles, and orders are unique.
 */
export async function loadCurriculum(): Promise<{ tracks: Track[]; lessons: Map<string, LessonEntry> }> {
  const trackEntries = await getCollection("tracks");
  const lessonEntries = await getCollection("lessons");
  const lessons = new Map(lessonEntries.map((l) => [l.id, l]));
  const errors: string[] = [];

  const tracks: Track[] = trackEntries
    .map((t) => ({ id: t.id, data: t.data, lessons: [] as LessonEntry[] }))
    .sort((a, b) => a.data.order - b.data.order);
  const trackOrders = new Set<number>();
  for (const t of tracks) {
    if (trackOrders.has(t.data.order)) errors.push(`Track ${t.id}: order ${t.data.order} is used by another Track`);
    trackOrders.add(t.data.order);
  }

  for (const lesson of lessonEntries) {
    const track = tracks.find((t) => t.id === trackOf(lesson.id));
    if (!track) errors.push(`${lesson.id}: no lessons/${trackOf(lesson.id)}/track.yaml`);
    else track.lessons.push(lesson);
    for (const prereq of lesson.data.prerequisites) {
      if (!lessons.has(prereq)) errors.push(`${lesson.id}: Prerequisite "${prereq}" is not a Lesson`);
    }
  }

  for (const track of tracks) {
    track.lessons.sort((a, b) => a.data.order - b.data.order);
    track.lessons.forEach((l, i) => {
      if (i > 0 && track.lessons[i - 1]!.data.order === l.data.order) {
        errors.push(`${l.id}: order ${l.data.order} is used by another Lesson in ${track.id}`);
      }
    });
  }

  for (const lesson of lessonEntries) {
    if (lesson.data.view === "scene" && !(lesson.data.scene! in sceneRenderers)) {
      errors.push(`${lesson.id}: no scene named "${lesson.data.scene}" (known: ${Object.keys(sceneRenderers).join(", ") || "none"})`);
    }
  }

  const cycle = findCycle(lessonEntries);
  if (cycle) errors.push(`Prerequisites form a cycle: ${cycle.join(" → ")}`);

  if (errors.length) throw new Error(`Curriculum errors:\n  ${errors.join("\n  ")}`);
  return { tracks, lessons };
}

export function trackOf(lessonId: string): string {
  return lessonId.split("/")[0]!;
}

function findCycle(lessons: LessonEntry[]): string[] | undefined {
  const byId = new Map(lessons.map((l) => [l.id, l.data.prerequisites]));
  const state = new Map<string, "visiting" | "done">();
  const path: string[] = [];
  const visit = (id: string): string[] | undefined => {
    if (state.get(id) === "done") return;
    if (state.get(id) === "visiting") return [...path.slice(path.indexOf(id)), id];
    state.set(id, "visiting");
    path.push(id);
    for (const next of byId.get(id) ?? []) {
      const found = visit(next);
      if (found) return found;
    }
    path.pop();
    state.set(id, "done");
  };
  for (const l of lessons) {
    const found = visit(l.id);
    if (found) return found;
  }
}
