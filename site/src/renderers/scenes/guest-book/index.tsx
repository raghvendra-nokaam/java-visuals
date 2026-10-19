import type { Trace } from "@java-visuals/trace-schema";
import type { Renderer } from "../../../player/renderer";
import { describe } from "../../execution/model";
import GuestBookScene from "./GuestBookScene";

export const guestBookScene: Renderer<Trace> = {
  View: ({ data, index, explanation }) => <GuestBookScene trace={data} index={index} explanation={explanation} />,
  describe: (trace, index, level) => describe(trace.steps[index]!, level),
};
