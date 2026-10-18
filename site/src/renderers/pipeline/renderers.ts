import type { Renderer } from "../../player/renderer";
import { howJavaRunsRenderer } from "./how-java-runs";
import type { PipelineData } from "./types";

/** Every bespoke Pipeline visual's renderer, by name. Add a visual here and in steps.ts. */
export const pipelineRenderers: Record<string, Renderer<PipelineData>> = {
  "how-java-runs": howJavaRunsRenderer as unknown as Renderer<PipelineData>,
};
