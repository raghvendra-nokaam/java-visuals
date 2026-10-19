import type { Trace } from "@java-visuals/trace-schema";
import type { Renderer } from "../../../player/renderer";
import { describe } from "../../execution/model";
import MethodLookupScene from "./MethodLookupScene";

export const methodLookupScene: Renderer<Trace> = {
  View: ({ data, index, explanation }) => <MethodLookupScene trace={data} index={index} explanation={explanation} />,
  describe: (trace, index, level) => describe(trace.steps[index]!, level),
};
