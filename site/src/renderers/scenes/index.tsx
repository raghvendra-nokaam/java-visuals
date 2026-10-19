import type { Trace } from "@java-visuals/trace-schema";
import type { Renderer } from "../../player/renderer";
import { bankLedgersScene } from "./bank-ledgers";
import { guestBookScene } from "./guest-book";
import { kitchenPassScene } from "./kitchen-pass";
import { methodLookupScene } from "./method-lookup";
import { recordsRoomScene } from "./records-room";
import { ticketOfficeScene } from "./ticket-office";

/**
 * Bespoke real-life scenes for Execution Lessons (`view: scene`), by the name lesson.yaml's `scene` uses.
 * Each is driven by the Lesson's recorded Trace, so what the scene shows is what the program really did.
 */
export const sceneRenderers: Record<string, Renderer<Trace>> = {
  "ticket-office": ticketOfficeScene,
  "guest-book": guestBookScene,
  "records-room": recordsRoomScene,
  "kitchen-pass": kitchenPassScene,
  "bank-ledgers": bankLedgersScene,
  "method-lookup": methodLookupScene,
};
