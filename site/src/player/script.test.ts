import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Trace } from "@java-visuals/trace-schema";
import fixture from "@java-visuals/trace-schema/fixtures/method-calls.json";
import { parseNarration } from "../content/narration";
import { narrationAt, promptsByStep, unresolvedAnchors, variantSwitchTarget, type LessonScript } from "./script";

const trace = fixture as unknown as Trace;
const lesson: LessonScript = {
  title: "Method calls and Frames",
  ...parseNarration(readFileSync(new URL("../../../lessons/memory/method-calls/narration.md", import.meta.url), "utf8")),
};

describe("lesson script", () => {
  it("every anchor in the method-calls narration resolves", () => {
    expect(unresolvedAnchors(lesson, trace)).toEqual([]);
  });

  it("narration is sticky and level-specific entries win", () => {
    expect(narrationAt(lesson, trace, 1, "simple")?.text).toMatch(/^Every Java program/);
    expect(narrationAt(lesson, trace, 1, "jvm")?.text).toMatch(/JDK Internal/);
    expect(narrationAt(lesson, trace, trace.markers["add-compute"]!, "simple")?.text).toMatch(/new Frame/);
  });

  it("prompts are keyed by the Step they pause at", () => {
    expect([...promptsByStep(lesson, trace).keys()].sort((a, b) => a - b)).toEqual([2, 6, 11]);
  });

  it("switching Variant lands on the same Marker, else Step 0", () => {
    const other: Trace = { ...trace, markers: { "add-compute": 5 } };
    expect(variantSwitchTarget(trace, 4, other)).toBe(5); // passed add-compute (3), the latest Marker
    expect(variantSwitchTarget(trace, 7, other)).toBe(0); // latest is point-constructor, missing in other
    expect(variantSwitchTarget(trace, 1, other)).toBe(0); // no Marker passed yet
  });
});
