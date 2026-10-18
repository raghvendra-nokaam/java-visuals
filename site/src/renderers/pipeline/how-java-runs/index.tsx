import type { Renderer } from "../../../player/renderer";
import type { PipelineData } from "../types";
import HowJavaRunsView from "./HowJavaRunsView";
import type { HowJavaRunsStep } from "./steps";

export const howJavaRunsRenderer: Renderer<PipelineData<HowJavaRunsStep>> = {
  View: ({ data, index, explanation, onSeek }) => (
    <HowJavaRunsView data={data} index={index} explanation={explanation} onSeek={onSeek} />
  ),
  describe: (data, index) => {
    const step = data.steps[index]!;
    const s = step.interpreter;
    if (!s) return `${step.title}.`;
    const operands = s.operands.length ? s.operands.join(", ") : "empty";
    return `${step.title}. Local n = ${s.locals.n}. Operand stack: ${operands}.${s.returned ? ` Returned ${s.returned}.` : ""}`;
  },
};
