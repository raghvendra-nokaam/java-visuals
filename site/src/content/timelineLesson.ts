import { parse } from "yaml";
import { z } from "astro/zod";
import type { Timeline, VersionStop } from "../renderers/timeline/model";

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "use lowercase-words-with-dashes");
const sample = z.strictObject({ label: z.string(), source: z.string() });
const stopSchema = z.strictObject({
  id: slug,
  version: z.string(),
  released: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use YYYY-MM-DD, quoted"),
  kind: z.enum(["release", "event"]).default("release"),
  landmark: z.boolean().default(false),
  lts: z.boolean().default(false),
  headline: z.string(),
  features: z.array(z.string()).default([]),
  code: z.strictObject({ before: sample, after: sample }).optional(),
  lesson: z.string().optional(),
});
const timelineSchema = z.strictObject({ stops: z.array(stopSchema).min(1) });

export interface LinkableLesson {
  title: string;
  kind: string;
  href: string;
}

/**
 * Parses a Timeline Lesson's timeline.yaml (format: docs/lesson-format.md). Fails on anything that would
 * make a broken page: unknown fields, duplicate ids, dates out of order, links to Lessons that don't exist.
 */
export function parseTimeline(source: string, file: string, lessons: Map<string, LinkableLesson>): Timeline {
  const parsed = timelineSchema.safeParse(parse(source));
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    throw new Error(`${file}:\n  ${issues.join("\n  ")}`);
  }

  const steps: VersionStop[] = [];
  const markers: Record<string, number> = {};
  for (const [i, raw] of parsed.data.stops.entries()) {
    const { lesson: lessonId, ...stop } = raw;
    if (stop.id in markers) throw new Error(`${file}: stop id "${stop.id}" appears twice`);
    const previous = steps.at(-1);
    if (previous && stop.released < previous.released) {
      throw new Error(`${file}: "${stop.id}" (${stop.released}) comes before "${previous.id}" (${previous.released})`);
    }
    let lesson: VersionStop["lesson"];
    if (lessonId) {
      const target = lessons.get(lessonId);
      if (!target) throw new Error(`${file}: "${stop.id}" links to unknown Lesson "${lessonId}"`);
      if (target.kind !== "execution") throw new Error(`${file}: "${stop.id}" links to "${lessonId}", which isn't an Execution Lesson`);
      lesson = { id: lessonId, title: target.title, href: target.href };
    }
    steps.push(lesson ? { ...stop, lesson } : stop);
    markers[stop.id] = i;
  }
  return { steps, markers };
}
