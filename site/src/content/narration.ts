import type { DetailLevel, Narration, PredictPrompt } from "../player/script";

/**
 * Parses a Lesson's narration.md (format: docs/lesson-format.md).
 *
 *   ## @marker [simple|jvm]     Narration shown from that Marker's Step on
 *   ## Predict @marker          A Predict Prompt: question paragraph, `- [ ]` / `- [x]` choices, `>` explanation
 *
 * Strict on purpose: malformed content fails the build rather than shipping a broken Lesson.
 */
export function parseNarration(source: string, file = "narration.md"): { narration: Narration[]; prompts: PredictPrompt[] } {
  const narration: Narration[] = [];
  const prompts: PredictPrompt[] = [];
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const fail = (line: number, message: string): never => {
    throw new Error(`${file}:${line}: ${message}`);
  };

  const sections: { heading: string; line: number; body: string[] }[] = [];
  lines.forEach((text, i) => {
    if (text.startsWith("## ")) sections.push({ heading: text.slice(3).trim(), line: i + 1, body: [] });
    else if (sections.length) sections.at(-1)!.body.push(text);
    else if (text.trim()) fail(i + 1, "content before the first `## @marker` heading");
  });

  for (const { heading, line, body } of sections) {
    const blocks = paragraphs(body);
    const narrationHeading = heading.match(/^@([a-z0-9-]+(?:@[A-Za-z0-9_-]+)?(?:#\d+)?)(?:\s+(simple|jvm))?$/);
    const promptHeading = heading.match(/^Predict\s+@([a-z0-9-]+(?:@[A-Za-z0-9_-]+)?(?:#\d+)?)$/);

    if (narrationHeading) {
      if (blocks.length === 0) fail(line, `narration for @${narrationHeading[1]} is empty`);
      if (blocks.some((b) => /^(- |> )/.test(b))) fail(line, "narration can't contain lists or quotes; did you mean `## Predict`?");
      const entry: Narration = { at: narrationHeading[1]!, text: blocks.join("\n\n") };
      if (narrationHeading[2]) entry.detail = narrationHeading[2] as DetailLevel;
      narration.push(entry);
    } else if (promptHeading) {
      const [question, list, quote, ...rest] = blocks;
      if (!question || /^(- |> )/.test(question)) fail(line, "a Predict Prompt starts with its question");
      if (!list?.startsWith("- [")) fail(line, "a Predict Prompt needs a `- [ ]` / `- [x]` choice list after the question");
      if (!quote?.startsWith(">")) fail(line, "a Predict Prompt ends with a `>` explanation");
      if (rest.length) fail(line, "unexpected content after the explanation");

      const choices: string[] = [];
      let answer = -1;
      for (const item of list!.split("\n")) {
        const m = item.match(/^- \[( |x)\] (.+)$/);
        if (!m) fail(line, `malformed choice: "${item}"`);
        if (m![1] === "x") {
          if (answer !== -1) fail(line, "more than one choice is marked [x]");
          answer = choices.length;
        }
        choices.push(m![2]!.trim());
      }
      if (choices.length < 2) fail(line, "a Predict Prompt needs at least two choices");
      if (answer === -1) fail(line, "mark the correct choice with [x]");

      const explanation = quote!
        .split("\n")
        .map((l) => l.replace(/^>\s?/, ""))
        .join(" ")
        .trim();
      prompts.push({ at: promptHeading[1]!, question: question!, choices, answer, explanation });
    } else {
      fail(line, `unrecognised heading "## ${heading}"; use "## @marker" or "## Predict @marker"`);
    }
  }

  const seen = new Set<string>();
  for (const n of narration) {
    const key = `${n.at} ${n.detail ?? "any"}`;
    if (seen.has(key)) throw new Error(`${file}: narration for @${n.at}${n.detail ? ` (${n.detail})` : ""} appears twice`);
    seen.add(key);
  }
  return { narration, prompts };
}

/** Blank-line-separated blocks. List and quote lines stay line-separated; prose lines are joined with spaces. */
function paragraphs(body: string[]): string[] {
  const blocks: string[][] = [[]];
  for (const line of body) {
    if (line.trim() === "") {
      if (blocks.at(-1)!.length) blocks.push([]);
    } else blocks.at(-1)!.push(line.trim());
  }
  return blocks
    .filter((b) => b.length)
    .map((b) => (/^(- |> )/.test(b[0]!) ? b.join("\n") : b.join(" ")));
}
