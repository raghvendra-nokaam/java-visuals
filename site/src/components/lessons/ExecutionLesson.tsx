import type { Trace } from "@java-visuals/trace-schema";
import Player from "../../player/Player";
import type { DetailLevel, LessonScript } from "../../player/script";
import { markCompleted } from "../../progress";
import { executionRenderer } from "../../renderers/execution";

/** Client island for an Execution Lesson. Takes only serializable props; wires the renderer in on the client. */
export default function ExecutionLesson({
  lessonId,
  ...props
}: {
  lessonId: string;
  variants: Record<string, Trace>;
  variantLabels: Record<string, string>;
  script: LessonScript;
  defaultLevel: DetailLevel;
  next?: { title: string; href: string };
}) {
  return <Player {...props} renderer={executionRenderer} offersJvmDetail onReachEnd={() => markCompleted(lessonId)} />;
}
