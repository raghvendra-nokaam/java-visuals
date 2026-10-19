import type { Renderer } from "../../../player/renderer";
import type { AnimationData } from "../types";
import KeywordsView from "./KeywordsView";
import { contextual, groups, literals, type KeywordsStep } from "./steps";

export const keywordsRenderer: Renderer<AnimationData<KeywordsStep>> = {
  View: ({ data, index, explanation, onSeek }) => <KeywordsView data={data} index={index} explanation={explanation} onSeek={onSeek} />,
  describe: (data, index) => {
    const step = data.steps[index]!;
    if (step.stage === "all") return `${step.title}: ${groups.reduce((n, g) => n + g.words.length, 0)} keywords in ${groups.length} groups.`;
    if (step.stage === "contextual") return `${step.title}: ${[...contextual, ...literals].join(", ")}.`;
    return `${step.title}: ${groups.find((g) => g.id === step.stage)!.words.join(", ")}.`;
  },
};
