import Player from "../../player/Player";
import type { LessonScript } from "../../player/script";
import { markCompleted } from "../../progress";
import { pipelineRenderers } from "../../renderers/pipeline/renderers";
import type { PipelineData } from "../../renderers/pipeline/types";

/** Client island for a Pipeline Lesson; picks the Lesson's bespoke visual by name. */
export default function PipelineLesson({
  lessonId,
  data,
  script,
  next,
}: {
  lessonId: string;
  data: PipelineData;
  script: LessonScript;
  next?: { title: string; href: string };
}) {
  return (
    <Player
      variants={{ default: data }}
      script={script}
      renderer={pipelineRenderers[data.visual]!}
      defaultLevel="simple"
      offersJvmDetail={false}
      next={next}
      onReachEnd={() => markCompleted(lessonId)}
    />
  );
}
