import type { Trace } from "@java-visuals/trace-schema";
import type { Renderer } from "../../player/renderer";
import ExecutionView from "./ExecutionView";
import VariablesView from "./VariablesView";
import { describe } from "./model";

export const executionRenderer: Renderer<Trace> = {
  View: ({ data, index, level, explanation }) => (
    <ExecutionView trace={data} index={index} level={level} explanation={explanation} />
  ),
  describe: (trace, index, level) => describe(trace.steps[index]!, level),
};

/** The default for Execution Lessons that aren't about memory: code plus the current method's variables. */
export const variablesRenderer: Renderer<Trace> = {
  View: ({ data, index, level, explanation }) => (
    <VariablesView trace={data} index={index} level={level} explanation={explanation} />
  ),
  describe: (trace, index, level) => describe(trace.steps[index]!, level),
};
