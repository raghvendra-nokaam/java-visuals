import type { ComponentType, ReactNode } from "react";
import type { DetailLevel, StepSource } from "./script";

/** The common Step interface: every Lesson kind plugs into the one Player through this. */
export interface Renderer<T extends StepSource> {
  /** `explanation` is the Narration / Predict Prompt panel; the renderer places it where it reads best. */
  View: ComponentType<{ data: T; index: number; level: DetailLevel; explanation: ReactNode }>;
  /** Step Description for screen readers. */
  describe(data: T, index: number, level: DetailLevel): string;
}
