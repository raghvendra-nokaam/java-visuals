import type { HeapObject, Step, Value, Frame } from "@java-visuals/trace-schema";
import type { DetailLevel } from "../../player/script";

/** How one slot (local, field, element) is drawn. */
export type Slot =
  | { kind: "text"; text: string; muted?: boolean }
  | { kind: "arrow"; to: string }
  | { kind: "hidden"; title: string };

/** Objects drawn on the Heap at this Detail Level, in a stable order. */
export function visibleHeap(step: Step, level: DetailLevel): HeapObject[] {
  if (level === "jvm") return step.heap;
  return step.heap.filter((o) => !o.internal && !o.inline);
}

export function slot(value: Value, step: Step, level: DetailLevel): Slot {
  switch (value.kind) {
    case "primitive":
      return { kind: "text", text: value.display };
    case "null":
      return { kind: "text", text: "null", muted: true };
    case "ref": {
      const target = step.heap.find((o) => o.id === value.id);
      if (!target) return { kind: "text", text: "?", muted: true };
      if (level === "simple" && target.inline) return { kind: "text", text: target.display ?? "" };
      if (level === "simple" && target.internal) {
        return { kind: "hidden", title: "Created by the JVM or JDK. Switch to JVM detail to see it." };
      }
      return { kind: "arrow", to: target.id };
    }
  }
}

/** Short name for a type: drops the java.lang. / java.util. package prefix. */
export function shortType(type: string): string {
  return type.replace(/^java\.(lang|util)\./, "");
}

/** How a Frame is titled: constructors read as `new Point`, everything else as the method name. */
export function frameTitle(frame: Frame): string {
  return frame.method === "<init>" ? `new ${frame.className}` : frame.method;
}

/** Source line without its `// @mark` comment, which is authoring metadata, not lesson code. */
export function stripMarkers(line: string): string {
  return line.replace(/\s*\/\/\s*@mark\s+\S+.*$/, "");
}

/** Plain-text rendering of a Step for screen readers. */
export function describe(step: Step, level: DetailLevel): string {
  const text = (v: Value): string => {
    const s = slot(v, step, level);
    if (s.kind === "text") return s.text;
    if (s.kind === "hidden") return "a JDK object";
    const target = step.heap.find((o) => o.id === s.to)!;
    return `a ${shortType(target.type)}`;
  };

  const parts = [`Line ${step.location.line}.`];
  for (const thread of step.threads) {
    const frames = thread.frames.map((f) => {
      const locals = f.locals.filter((l) => l.name !== "this").map((l) => `${l.name} = ${text(l.value)}`);
      return locals.length ? `${frameTitle(f)} (${locals.join(", ")})` : frameTitle(f);
    });
    parts.push(`${thread.name} Stack, bottom to top: ${frames.join(", then ")}.`);
  }

  const heap = visibleHeap(step, level);
  if (heap.length === 0) parts.push("Heap: empty.");
  else {
    const objects = heap.map((o) => {
      const fields = o.fields?.map((f) => `${f.name} = ${text(f.value)}`) ?? [];
      const elements = o.elements ? [`${o.elements.length} elements`] : [];
      const body = [...fields, ...elements].join(", ");
      const state = o.state === "live" ? "" : `, ${o.state}`;
      return `${shortType(o.type)}${body ? ` (${body})` : ""}${state}`;
    });
    parts.push(`Heap: ${objects.join("; ")}.`);
  }

  const output = step.events.find((e) => e.type === "output");
  if (output && "text" in output) parts.push(`Printed: ${output.text.trim()}.`);
  return parts.join(" ");
}
