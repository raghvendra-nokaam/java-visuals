import Player from "../../player/Player";
import type { LessonScript } from "../../player/script";
import { markCompleted } from "../../progress";
import { timelineRenderer } from "../../renderers/timeline";
import type { Timeline } from "../../renderers/timeline/model";

/** Client island for a Timeline Lesson. */
export default function TimelineLesson({
  lessonId,
  timeline,
  script,
  next,
}: {
  lessonId: string;
  timeline: Timeline;
  script: LessonScript;
  next?: { title: string; href: string };
}) {
  return (
    <Player
      variants={{ default: timeline }}
      script={script}
      renderer={timelineRenderer}
      defaultLevel="simple"
      offersJvmDetail={false}
      next={next}
      onReachEnd={() => markCompleted(lessonId)}
    />
  );
}
