import { describe as group, expect, it } from "vitest";
import type { Trace } from "@java-visuals/trace-schema";
import fixture from "@java-visuals/trace-schema/fixtures/method-calls.json";
import { describe, frameTitle, slot, stripMarkers, visibleHeap } from "./model";

const trace = fixture as unknown as Trace;
const step = (i: number) => trace.steps[i]!;

group("execution model", () => {
  it("Simple hides JDK Internals; JVM shows them", () => {
    expect(visibleHeap(step(0), "simple")).toEqual([]);
    expect(visibleHeap(step(0), "jvm").map((o) => o.type)).toEqual(["java.lang.String[]"]);
  });

  it("references to hidden objects render as a hidden slot, visible ones as arrows", () => {
    const args = step(0).threads[0]!.frames[0]!.locals[0]!;
    expect(slot(args.value, step(0), "simple").kind).toBe("hidden");
    expect(slot(args.value, step(0), "jvm")).toEqual({ kind: "arrow", to: "o1" });
    const p = step(9).threads[0]!.frames[0]!.locals.find((l) => l.name === "p")!;
    expect(slot(p.value, step(9), "simple")).toEqual({ kind: "arrow", to: "o2" });
  });

  it("strips Marker comments from displayed source", () => {
    expect(stripMarkers("        int result = a + b; // @mark add-compute")).toBe("        int result = a + b;");
    expect(stripMarkers("    } // @mark end")).toBe("    }");
    expect(stripMarkers("int x = 2; // a normal comment")).toBe("int x = 2; // a normal comment");
  });

  it("titles constructor Frames as new", () => {
    expect(frameTitle(step(7).threads[0]!.frames[1]!)).toBe("new Point");
  });

  it("describes a Step in plain text", () => {
    expect(describe(step(3), "simple")).toBe(
      "Line 12. main Stack, bottom to top: main (args = a JDK object, x = 2, y = 3), then add (a = 2, b = 3). Heap: empty.",
    );
    expect(describe(step(12), "simple")).toMatch(/Heap: Point \(x = 5, y = 0\), eligible\.$/);
    expect(describe(step(11), "simple")).toMatch(/Printed: Point\[x=5, y=0\]\.$/);
  });
});
