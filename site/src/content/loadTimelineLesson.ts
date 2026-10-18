import type { LessonScript } from "../player/script";
import { unresolvedAnchors } from "../player/script";
import type { Timeline } from "../renderers/timeline/model";
import { lessonHref } from "../links";
import type { LessonEntry } from "./curriculum";
import { loadScript } from "./executionLesson";
import { parseTimeline } from "./timelineLesson";

const timelineFiles = import.meta.glob<string>("../../../lessons/*/*/timeline.yaml", {
  eager: true,
  query: "?raw",
  import: "default",
});

/** Everything the Player needs for one Timeline Lesson; fails the build on missing or inconsistent content. */
export function loadTimelineLesson(
  lesson: LessonEntry,
  lessons: Map<string, LessonEntry>,
): { timeline: Timeline; script: LessonScript } {
  const file = `lessons/${lesson.id}/timeline.yaml`;
  const source = timelineFiles[`../../../${file}`];
  if (source === undefined) throw new Error(`${lesson.id}: missing timeline.yaml`);
  const linkable = new Map(
    [...lessons.values()].map((l) => [l.id, { title: l.data.title, kind: l.data.kind, href: lessonHref(l.id) }]),
  );
  const timeline = parseTimeline(source, file, linkable);

  const script = loadScript(lesson);
  if (script.narration.some((n) => n.variant || n.detail) || script.prompts.some((p) => p.variant)) {
    throw new Error(`${lesson.id}: Timeline Lessons have one Variant and one Detail Level; drop "in …" / "jvm" from narration.md`);
  }
  const missing = unresolvedAnchors(script, timeline);
  if (missing.length) throw new Error(`${lesson.id}: narration.md refers to stops timeline.yaml doesn't have: ${missing.join(", ")}`);
  return { timeline, script };
}
