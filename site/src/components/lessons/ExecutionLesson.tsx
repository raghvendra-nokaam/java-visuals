import type { Trace } from "@java-visuals/trace-schema";
import Player from "../../player/Player";
import type { DetailLevel, LessonScript } from "../../player/script";
import { executionRenderer, variablesRenderer } from "../../renderers/execution";
import { sceneRenderers } from "../../renderers/scenes";

/**
 * Client island for an Execution Lesson. Takes only serializable props and picks the renderer on the client:
 * the Variables panel (default), the full Stack/Heap diagram, or a bespoke scene.
 */
export default function ExecutionLesson({
  view,
  scene,
  ...props
}: {
  variants: Record<string, Trace>;
  variantLabels: Record<string, string>;
  script: LessonScript;
  defaultLevel: DetailLevel;
  view: "variables" | "memory" | "scene";
  scene?: string;
}) {
  const renderer = view === "memory" ? executionRenderer : view === "scene" ? sceneRenderers[scene!]! : variablesRenderer;
  return <Player {...props} renderer={renderer} offersJvmDetail={view === "memory"} smallScreenNote={view !== "variables"} />;
}
