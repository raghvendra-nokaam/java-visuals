import type { Trace } from "@java-visuals/trace-schema";
import type { Renderer } from "../../player/renderer";
import ExecutionView from "./ExecutionView";
import { describe } from "./model";

export const executionRenderer: Renderer<Trace> = {
  View: ({ data, index, level, explanation }) => (
    <ExecutionView trace={data} index={index} level={level} explanation={explanation} />
  ),
  describe: (trace, index, level) => describe(trace.steps[index]!, level),
};
