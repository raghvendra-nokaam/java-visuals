import { describe, expect, it } from "vitest";
import { animationRenderers } from "./renderers";
import { animationSteps } from "./steps";
import { markersFor } from "./types";
import { howJavaRunsRenderer } from "./how-java-runs";
import { steps } from "./how-java-runs/steps";
import { contextual, groups, literals } from "./keywords/steps";

describe("animation visuals", () => {
  it("every visual has both Steps and a renderer, with unique Step ids", () => {
    expect(Object.keys(animationRenderers).sort()).toEqual(Object.keys(animationSteps).sort());
    for (const s of Object.values(animationSteps)) expect(() => markersFor(s)).not.toThrow();
  });

  it("interpreter Steps follow square(3) through the operand stack", () => {
    const interpreter = steps.filter((s) => s.interpreter).map((s) => s.interpreter!);
    expect(interpreter.map((s) => s.offset)).toEqual([0, 1, 2, 3]);
    expect(interpreter.map((s) => s.operands)).toEqual([["3"], ["3", "3"], ["9"], []]);
    expect(interpreter.at(-1)!.returned).toBe("9");
  });

  it("describes interpreter Steps with the operand stack", () => {
    const data = { visual: "how-java-runs", steps, markers: markersFor(steps) };
    const i = steps.findIndex((s) => s.id === "interpret-multiply");
    expect(howJavaRunsRenderer.describe(data, i, "simple")).toBe(
      "imul pops two values and pushes their product. Local n = 3. Operand stack: 9.",
    );
  });

  it("the keywords card lists each of Java 25's 51 reserved keywords exactly once", () => {
    const reserved = groups.flatMap((g) => g.words);
    expect(reserved).toHaveLength(51);
    expect(new Set([...reserved, ...contextual, ...literals]).size).toBe(reserved.length + contextual.length + literals.length);
  });
});
