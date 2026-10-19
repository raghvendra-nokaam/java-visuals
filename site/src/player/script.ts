/**
 * What the Player needs from any Lesson's Steps, whatever renders them: a count and the Markers.
 * A Trace satisfies it; Timeline and Animation Lessons will too.
 */
export interface StepSource {
  steps: readonly unknown[];
  markers: Record<string, number>;
}

export type DetailLevel = "simple" | "jvm";

/** Narration and Predict Prompts for one Lesson, anchored to Markers (never raw Step indices). */
export interface LessonScript {
  title: string;
  narration: Narration[];
  prompts: PredictPrompt[];
}

export interface Narration {
  /** A Marker name, or "start" for Step 0. */
  at: string;
  /** Only shown at this Detail Level; entries without it apply to both. */
  detail?: DetailLevel;
  /** Only shown in this Variant; entries without it apply to all. */
  variant?: string;
  text: string;
}

export interface PredictPrompt {
  at: string;
  variant?: string;
  question: string;
  choices: string[];
  answer: number;
  explanation: string;
}

/** Step index for a script anchor, or undefined when the Trace has no such Marker. */
export function resolveAnchor(trace: StepSource, at: string): number | undefined {
  return at === "start" ? 0 : trace.markers[at];
}

/**
 * The Narration in effect at a Step: the latest anchor at or before it. At the same anchor the most specific
 * entry wins (Variant-specific, then Detail-Level-specific, then generic).
 */
export function narrationAt(
  script: LessonScript,
  trace: StepSource,
  index: number,
  level: DetailLevel,
  variant = "default",
): Narration | undefined {
  let best: { step: number; score: number; entry: Narration } | undefined;
  for (const entry of script.narration) {
    if ((entry.detail && entry.detail !== level) || (entry.variant && entry.variant !== variant)) continue;
    const step = resolveAnchor(trace, entry.at);
    if (step === undefined || step > index) continue;
    const score = (entry.variant ? 2 : 0) + (entry.detail ? 1 : 0);
    if (!best || step > best.step || (step === best.step && score > best.score)) best = { step, score, entry };
  }
  return best?.entry;
}

/** Step index → the Predict Prompt that pauses playback there in this Variant. */
export function promptsByStep(script: LessonScript, trace: StepSource, variant = "default"): Map<number, PredictPrompt> {
  const byStep = new Map<number, PredictPrompt>();
  for (const prompt of script.prompts) {
    if (prompt.variant && prompt.variant !== variant) continue;
    const step = resolveAnchor(trace, prompt.at);
    if (step === undefined) continue;
    // A Variant-specific prompt replaces a generic one at the same Step.
    if (!byStep.has(step) || prompt.variant) byStep.set(step, prompt);
  }
  return byStep;
}

/** Anchors that apply to this Variant but that its Trace can't resolve. A content bug; fails the build. */
export function unresolvedAnchors(script: LessonScript, trace: StepSource, variant = "default"): string[] {
  return [...script.narration, ...script.prompts]
    .filter((e) => !e.variant || e.variant === variant)
    .map((e) => e.at)
    .filter((at) => resolveAnchor(trace, at) === undefined);
}

/**
 * Where to land after switching Variant: the most recent Marker passed in the old Trace, looked up in the new
 * one, so the Learner sees the same moment under the new Variant. Falls back to Step 0.
 */
export function variantSwitchTarget(from: StepSource, index: number, to: StepSource): number {
  let latest: { name: string; step: number } | undefined;
  for (const [name, step] of Object.entries(from.markers)) {
    if (step <= index && (!latest || step > latest.step)) latest = { name, step };
  }
  return (latest && to.markers[latest.name]) ?? 0;
}
