import type { Trace } from "@java-visuals/trace-schema";
import type { Renderer } from "../../../player/renderer";
import { describe } from "../../execution/model";
import RecordsRoomScene from "./RecordsRoomScene";

export const recordsRoomScene: Renderer<Trace> = {
  View: ({ data, index, explanation }) => <RecordsRoomScene trace={data} index={index} explanation={explanation} />,
  describe: (trace, index, level) => describe(trace.steps[index]!, level),
};
