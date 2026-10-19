import type { Trace } from "@java-visuals/trace-schema";
import type { Renderer } from "../../../player/renderer";
import { describe } from "../../execution/model";
import TicketOfficeScene from "./TicketOfficeScene";

export const ticketOfficeScene: Renderer<Trace> = {
  View: ({ data, index, explanation }) => <TicketOfficeScene trace={data} index={index} explanation={explanation} />,
  describe: (trace, index, level) => describe(trace.steps[index]!, level),
};
