/**
 * Prints a Trace as one line per Step: index, line, Marker, Stack, visible Heap and events.
 * The quickest way to see what a Lesson Program really does before writing its narration.
 *
 *   npm run steps -- lessons/memory/method-calls/traces/default.json
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Trace, Value } from "../src/trace.generated.ts";

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("usage: npm run steps -- <trace.json> [...]");
  process.exit(2);
}

const show = (v: Value): string => (v.kind === "primitive" ? v.display : v.kind === "ref" ? v.id : "null");

for (const file of files) {
  const trace = JSON.parse(readFileSync(resolve(process.env.INIT_CWD ?? process.cwd(), file), "utf8")) as Trace;
  const markerAt = new Map(Object.entries(trace.markers).map(([name, i]) => [i, name]));
  console.log(`\n${trace.lessonId} [${trace.variantId}]: ${trace.steps.length} Steps`);
  trace.steps.forEach((step, i) => {
    const stack = step.threads
      .map((t) => t.frames.map((f) => `${f.method}(${f.locals.filter((l) => l.name !== "args").map((l) => `${l.name}=${show(l.value)}`).join(",")})`).join(" > "))
      .join(" | ");
    const heap = step.heap
      .filter((o) => !o.internal && !o.inline)
      .map((o) => `${o.id}:${o.type.split(".").at(-1)}${o.state === "live" ? "" : `(${o.state})`}`)
      .join(" ");
    const marker = markerAt.has(i) ? `@${markerAt.get(i)}` : "";
    const events = step.events.map((e) => e.type).join(",");
    console.log(`${String(i).padStart(3)}  L${String(step.location.line).padEnd(4)}${marker.padEnd(24)}${stack.padEnd(60)}  [${heap}]  ${events}`);
  });
}
