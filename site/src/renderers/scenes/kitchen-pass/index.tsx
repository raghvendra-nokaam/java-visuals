import type { Trace } from "@java-visuals/trace-schema";
import type { Renderer } from "../../../player/renderer";
import { describe } from "../../execution/model";
import KitchenPassScene from "./KitchenPassScene";

export const kitchenPassScene: Renderer<Trace> = {
  View: ({ data, index, explanation }) => <KitchenPassScene trace={data} index={index} explanation={explanation} />,
  describe: (trace, index, level) => describe(trace.steps[index]!, level),
};
