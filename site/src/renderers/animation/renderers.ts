import type { Renderer } from "../../player/renderer";
import { howJavaRunsRenderer } from "./how-java-runs";
import { keywordsRenderer } from "./keywords";
import type { AnimationData } from "./types";

/** Every bespoke Animation visual's renderer, by name. Add a visual here and in steps.ts. */
export const animationRenderers: Record<string, Renderer<AnimationData>> = {
  "how-java-runs": howJavaRunsRenderer as unknown as Renderer<AnimationData>,
  keywords: keywordsRenderer as unknown as Renderer<AnimationData>,
};
