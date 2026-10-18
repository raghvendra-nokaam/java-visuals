import type { Renderer } from "../../player/renderer";
import TimelineView from "./TimelineView";
import { describe, type Timeline } from "./model";

export const timelineRenderer: Renderer<Timeline> = {
  View: ({ data, index, explanation, onSeek }) => (
    <TimelineView timeline={data} index={index} explanation={explanation} onSeek={onSeek} />
  ),
  describe: (timeline, index) => describe(timeline.steps[index]!),
};
