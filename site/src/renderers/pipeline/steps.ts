import { steps as howJavaRuns } from "./how-java-runs/steps";
import type { PipelineStep } from "./types";

/**
 * Every bespoke Pipeline visual's Steps, by the name lesson.yaml's `visual` uses. Kept free of React so the
 * build can resolve Markers and check narration without loading components.
 */
export const pipelineSteps: Record<string, PipelineStep[]> = {
  "how-java-runs": howJavaRuns,
};
