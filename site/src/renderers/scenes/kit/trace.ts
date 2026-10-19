import type { HeapObject, Step, Trace, Value } from "@java-visuals/trace-schema";

/** Helpers scenes use to read a recorded Trace in story terms. */

export type ThreadView = Step["threads"][number];

export function threadById(step: Step, id: string): ThreadView | undefined {
  return step.threads.find((t) => t.id === id);
}

/** Marker names (`// @mark name`) on the line the active thread is at. */
export function markersHere(trace: Trace, step: Step): string[] {
  const file = trace.source.find((f) => f.path === step.location.file);
  const text = file?.lines[step.location.line - 1] ?? "";
  return [...text.matchAll(/\/\/\s*@mark\s+([a-z0-9]+(?:-[a-z0-9]+)*)/g)].map((m) => m[1]!);
}

export function objectOfType(step: Step, type: string): HeapObject | undefined {
  return step.heap.find((o) => o.type === type || o.type.endsWith(`.${type}`));
}

export function fieldValue(obj: HeapObject | undefined, name: string): Value | undefined {
  return obj?.fields?.find((f) => f.name === name)?.value;
}

/** A field as plain text: numbers and booleans as written, Strings without quotes, null as "nothing". */
export function fieldText(step: Step, obj: HeapObject | undefined, name: string): string {
  const v = fieldValue(obj, name);
  if (!v) return "";
  if (v.kind === "primitive") return v.display;
  if (v.kind === "null") return "nothing";
  const target = step.heap.find((o) => o.id === v.id);
  return (target?.display ?? "").replace(/^"(.*)"$/, "$1");
}

/** The thread's state in plain words for a badge. */
export function stateWord(t: ThreadView | undefined): string {
  if (!t) return "not started";
  return { running: "working", runnable: "ready", blocked: "waiting for the lock", waiting: "waiting", terminated: "done" }[t.state] ?? t.state;
}

/**
 * What one thread did in a split line (Sub-steps) up to `index`: the last value it read and how far it got.
 * `stage` is where it is now: about to read, holding the value it read, about to write, or finished writing.
 */
export interface ReadModifyWrite {
  seen?: string;
  stage: "idle" | "about-to-read" | "holding" | "about-to-write" | "wrote";
  writes: number;
}

export function readModifyWrite(trace: Trace, index: number, threadId: string): ReadModifyWrite {
  let state: ReadModifyWrite = { stage: "idle", writes: 0 };
  for (let i = 0; i <= index; i++) {
    const s = trace.steps[i]!;
    if (s.activeThread !== threadId) continue;
    const label = s.subStep?.label ?? "";
    const read = label.match(/^read \S+ \((.*)\)$/);
    if (read) state = { ...state, seen: read[1], stage: "about-to-read" };
    else if (label === "add" || label === "subtract") state = { ...state, stage: "holding" };
    else if (label.startsWith("write ")) state = { ...state, stage: "about-to-write" };
    else if (state.stage === "about-to-write") state = { stage: "wrote", writes: state.writes + 1, seen: state.seen };
  }
  // A thread that finished right after writing never gets another Step of its own; count that write too.
  const t = threadById(trace.steps[index]!, threadId);
  if (state.stage === "about-to-write" && t?.state === "terminated") return { stage: "wrote", writes: state.writes + 1, seen: state.seen };
  return state;
}

/** An Object a thread's Frames refer to: a local (searched top Frame first) or, with "this", the receiver. */
export function localObject(step: Step, threadId: string, name: string): HeapObject | undefined {
  const t = threadById(step, threadId);
  for (const f of [...(t?.frames ?? [])].reverse()) {
    const v = f.locals.find((l) => l.name === name)?.value;
    if (v?.kind === "ref") return step.heap.find((o) => o.id === v.id);
  }
  return undefined;
}

/** A primitive local of a thread's top Frame, as text. */
export function localText(step: Step, threadId: string, name: string): string | undefined {
  const v = threadById(step, threadId)?.frames.at(-1)?.locals.find((l) => l.name === name)?.value;
  return v?.kind === "primitive" ? v.display : undefined;
}

/** The object a field points to. */
export function fieldObject(step: Step, obj: HeapObject | undefined, name: string): HeapObject | undefined {
  const v = fieldValue(obj, name);
  return v?.kind === "ref" ? step.heap.find((o) => o.id === v.id) : undefined;
}

/** The texts in an array Object (Strings without quotes; null as empty). */
export function arrayTexts(step: Step, arr: HeapObject | undefined): string[] {
  return (arr?.elements ?? []).map((v) => {
    if (v.kind === "primitive") return v.display;
    if (v.kind === "null") return "";
    return (step.heap.find((o) => o.id === v.id)?.display ?? "").replace(/^"(.*)"$/, "$1");
  });
}

/** Whether this Step carries a deadlock event. */
export function deadlockedThreads(step: Step): string[] {
  const e = step.events.find((ev) => ev.type === "deadlock");
  return e && "threads" in e ? e.threads : [];
}
