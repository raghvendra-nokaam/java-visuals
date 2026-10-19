import Player from "../../player/Player";
import type { LessonScript } from "../../player/script";
import { timelineRenderer } from "../../renderers/timeline";
import type { Timeline } from "../../renderers/timeline/model";

/** Client island for a Timeline Lesson. */
export default function TimelineLesson({
  timeline,
  script,
}: {
  timeline: Timeline;
  script: LessonScript;
}) {
  return (
    <Player
      variants={{ default: timeline }}
      script={script}
      renderer={timelineRenderer}
      defaultLevel="simple"
      offersJvmDetail={false}
    />
  );
}
