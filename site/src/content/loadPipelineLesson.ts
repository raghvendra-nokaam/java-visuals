import type { LessonScript } from "../player/script";
import { unresolvedAnchors } from "../player/script";
import { pipelineSteps } from "../renderers/pipeline/steps";
import { markersFor, type PipelineData } from "../renderers/pipeline/types";
import type { LessonEntry } from "./curriculum";
import { loadScript } from "./executionLesson";

const programs = import.meta.glob<string>("../../../lessons/*/*/Program.java", { eager: true, query: "?raw", import: "default" });
const bytecode = import.meta.glob<string>("../../../lessons/*/*/traces/bytecode.txt", { eager: true, query: "?raw", import: "default" });

/** Everything the Player needs for one Pipeline Lesson; fails the build on missing or inconsistent content. */
export function loadPipelineLesson(lesson: LessonEntry): { data: PipelineData; script: LessonScript } {
  const visual = lesson.data.visual!;
  const steps = pipelineSteps[visual];
  if (!steps) {
    throw new Error(`${lesson.id}: no Pipeline visual named "${visual}" (known: ${Object.keys(pipelineSteps).join(", ")})`);
  }

  const data: PipelineData = { visual, steps, markers: markersFor(steps) };
  const program = programs[`../../../lessons/${lesson.id}/Program.java`];
  if (program !== undefined) {
    data.program = { path: "Program.java", lines: program.replace(/\n$/, "").split("\n") };
    const listing = bytecode[`../../../lessons/${lesson.id}/traces/bytecode.txt`];
    if (listing === undefined) throw new Error(`${lesson.id}: no bytecode listing. Run \`npm run record\` first.`);
    data.bytecode = listing;
  }

  const script = loadScript(lesson);
  if (script.narration.some((n) => n.variant || n.detail) || script.prompts.some((p) => p.variant)) {
    throw new Error(`${lesson.id}: Pipeline Lessons have one Variant and one Detail Level; drop "in …" / "jvm" from narration.md`);
  }
  const missing = unresolvedAnchors(script, data);
  if (missing.length) throw new Error(`${lesson.id}: narration.md refers to Steps the "${visual}" visual doesn't have: ${missing.join(", ")}`);
  return { data, script };
}
