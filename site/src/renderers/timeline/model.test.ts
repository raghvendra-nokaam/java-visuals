import { describe as group, expect, it } from "vitest";
import { parseTimeline } from "../../content/timelineLesson";
import { describe, formatDate, MIN_RAIL_GAP, railPositions } from "./model";

const lessons = new Map([
  ["history/java-5-varargs", { title: "Varargs", kind: "execution", href: "/lessons/history/java-5-varargs/" }],
  ["history/the-sun-years", { title: "Sun", kind: "timeline", href: "/x/" }],
]);

const yaml = `
stops:
  - id: java-1-0
    version: JDK 1.0
    released: "1996-01-23"
    landmark: true
    headline: Write once, run anywhere
    features: [Bytecode, Applets]
  - id: java-5
    version: J2SE 5.0
    released: "2004-09-30"
    lts: false
    headline: Generics
    lesson: history/java-5-varargs
`;

group("timeline", () => {
  it("parses stops, defaults, Markers and Lesson links", () => {
    const t = parseTimeline(yaml, "timeline.yaml", lessons);
    expect(t.markers).toEqual({ "java-1-0": 0, "java-5": 1 });
    expect(t.steps[0]).toMatchObject({ kind: "release", landmark: true, lts: false, features: ["Bytecode", "Applets"] });
    expect(t.steps[1]!.lesson).toEqual({ id: "history/java-5-varargs", title: "Varargs", href: "/lessons/history/java-5-varargs/" });
  });

  it.each([
    ["unknown field", yaml.replace("lts: false", "lts: false\n    colour: red"), /colour/],
    ["unquoted or bad date", yaml.replace('"2004-09-30"', '"Sept 2004"'), /YYYY-MM-DD/],
    ["dates out of order", yaml.replace('"2004-09-30"', '"1990-01-01"'), /comes before/],
    ["duplicate id", yaml.replace("id: java-5", "id: java-1-0"), /appears twice/],
    ["unknown Lesson", yaml.replace("history/java-5-varargs", "history/nope"), /unknown Lesson/],
    ["link to a non-Execution Lesson", yaml.replace("history/java-5-varargs", "history/the-sun-years"), /isn't an Execution Lesson/],
  ])("rejects %s", (_, source, error) => {
    expect(() => parseTimeline(source, "timeline.yaml", lessons)).toThrow(error);
  });

  it("places stops on the rail by date", () => {
    const t = parseTimeline(yaml, "timeline.yaml", lessons);
    expect(railPositions(t.steps)).toEqual([0, 1]);
    const three = [...t.steps, { ...t.steps[1]!, id: "x", released: "2000-05-12" }].sort((a, b) => a.released.localeCompare(b.released));
    const [, middle] = railPositions(three);
    expect(middle).toBeCloseTo(0.5, 1);
  });

  it("keeps stops that are close in time far enough apart to see", () => {
    const t = parseTimeline(yaml, "timeline.yaml", lessons);
    const crowded = [t.steps[0]!, { ...t.steps[1]!, id: "a", released: "2004-08-01" }, t.steps[1]!];
    const positions = railPositions(crowded);
    expect(positions[2]).toBe(1);
    expect(positions[2]! - positions[1]!).toBeGreaterThanOrEqual(MIN_RAIL_GAP - 1e-9);
  });

  it("formats dates and describes a stop", () => {
    expect(formatDate("1996-01-23")).toBe("January 23, 1996");
    const t = parseTimeline(yaml, "timeline.yaml", lessons);
    expect(describe(t.steps[0]!)).toBe("JDK 1.0, released January 23, 1996 (landmark). Write once, run anywhere. Bytecode. Applets.");
  });
});
