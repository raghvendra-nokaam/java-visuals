import type { Trace } from "@java-visuals/trace-schema";
import type { Renderer } from "../../../player/renderer";
import { describe } from "../../execution/model";
import BankLedgersScene from "./BankLedgersScene";

export const bankLedgersScene: Renderer<Trace> = {
  View: ({ data, index, explanation }) => <BankLedgersScene trace={data} index={index} explanation={explanation} />,
  describe: (trace, index, level) => describe(trace.steps[index]!, level),
};
