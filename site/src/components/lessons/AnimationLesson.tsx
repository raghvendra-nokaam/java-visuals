import Player from "../../player/Player";
import type { LessonScript } from "../../player/script";
import { animationRenderers } from "../../renderers/animation/renderers";
import type { AnimationData } from "../../renderers/animation/types";

/** Client island for a Animation Lesson; picks the Lesson's bespoke visual by name. */
export default function AnimationLesson({
  data,
  script,
}: {
  data: AnimationData;
  script: LessonScript;
}) {
  return (
    <Player
      variants={{ default: data }}
      script={script}
      renderer={animationRenderers[data.visual]!}
      defaultLevel="simple"
      offersJvmDetail={false}
    />
  );
}
