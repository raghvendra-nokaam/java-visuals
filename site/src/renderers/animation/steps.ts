import { steps as howJavaRuns } from "./how-java-runs/steps";
import { steps as keywords } from "./keywords/steps";
import type { AnimationStep } from "./types";

/**
 * Every bespoke Animation visual's Steps, by the name lesson.yaml's `visual` uses. Kept free of React so the
 * build can resolve Markers and check narration without loading components.
 */
export const animationSteps: Record<string, AnimationStep[]> = {
  "how-java-runs": howJavaRuns,
  keywords,
};
