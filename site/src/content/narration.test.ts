import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseNarration } from "./narration";

const lesson = readFileSync(new URL("../../../lessons/memory/method-calls/narration.md", import.meta.url), "utf8");

describe("narration.md", () => {
  it("parses the method-calls lesson", () => {
    const { narration, prompts } = parseNarration(lesson);
    expect(narration.map((n) => n.at)).toContain("add-compute");
    expect(narration.find((n) => n.detail === "jvm")?.at).toBe("start");
    expect(prompts).toHaveLength(3);
    expect(prompts[0]).toMatchObject({ at: "call-add", answer: 1 });
    expect(prompts[0]!.choices).toHaveLength(3);
    expect(prompts[0]!.explanation).toMatch(/^Every method call gets its own Frame/);
  });

  it("joins wrapped prose lines and keeps paragraphs", () => {
    const { narration } = parseNarration("## @start\n\nFirst line\ncontinues.\n\nSecond paragraph.\n");
    expect(narration[0]!.text).toBe("First line continues.\n\nSecond paragraph.");
  });

  it("scopes narration and prompts to a Variant", () => {
    const { narration, prompts } = parseNarration(
      "## @a jvm in mutate\n\nx\n\n## Predict @a in mutate\n\nQ?\n\n- [x] one\n- [ ] two\n\n> why\n",
    );
    expect(narration[0]).toMatchObject({ at: "a", detail: "jvm", variant: "mutate" });
    expect(prompts[0]).toMatchObject({ at: "a", variant: "mutate" });
  });

  it.each([
    ["stray text before headings", "hello\n## @start\n\nx\n", /before the first/],
    ["unknown heading", "## Intro\n\ntext\n", /unrecognised heading/],
    ["empty narration", "## @start\n\n", /is empty/],
    ["no correct answer", "## Predict @a\n\nQ?\n\n- [ ] one\n- [ ] two\n\n> why\n", /mark the correct choice/],
    ["two correct answers", "## Predict @a\n\nQ?\n\n- [x] one\n- [x] two\n\n> why\n", /more than one/],
    ["missing explanation", "## Predict @a\n\nQ?\n\n- [x] one\n- [ ] two\n", /explanation/],
    ["duplicate narration", "## @a\n\nx\n\n## @a\n\ny\n", /appears twice/],
    ["duplicate prompt", "## Predict @a\n\nQ?\n\n- [x] 1\n- [ ] 2\n\n> w\n\n## Predict @a\n\nQ?\n\n- [x] 1\n- [ ] 2\n\n> w\n", /appears twice/],
  ])("rejects %s", (_, source, error) => {
    expect(() => parseNarration(source)).toThrow(error);
  });
});
