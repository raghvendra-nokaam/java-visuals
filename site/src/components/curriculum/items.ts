import type { LessonEntry } from "../../content/curriculum";
import { lessonHref } from "../../links";
import type { LessonListItem } from "./LessonList";

export function toListItems(lessons: LessonEntry[], all: Map<string, LessonEntry>): LessonListItem[] {
  return lessons.map((l) => ({
    id: l.id,
    title: l.data.title,
    summary: l.data.summary,
    href: lessonHref(l.id),
    prerequisites: l.data.prerequisites.map((p) => ({ id: p, title: all.get(p)!.data.title, href: lessonHref(p) })),
  }));
}
