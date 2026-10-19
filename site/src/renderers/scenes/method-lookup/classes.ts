import type { Trace } from "@java-visuals/trace-schema";

export interface ClassInfo {
  name: string;
  parent: string | null;
  abstract: boolean;
  methods: { name: string; abstract: boolean }[];
}

const CLASS = /^(?:public\s+|final\s+)*(abstract\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?/;
const METHOD = /^ {4}(?:public\s+|protected\s+|private\s+|final\s+|static\s+)*(abstract\s+)?[\w<>[\]]+\s+(\w+)\([^)]*\)\s*[{;]/;

/**
 * The Lesson Program's own classes, read from its source: each class's parent and the methods it declares.
 * Lesson Programs are small and conventionally formatted (one top-level class per `class` line, members
 * indented four spaces), which is all this needs. The class holding `main` is left out.
 */
export function parseClasses(trace: Trace): ClassInfo[] {
  const classes: ClassInfo[] = [];
  for (const file of trace.source) {
    let current: ClassInfo | undefined;
    for (const line of file.lines) {
      const c = CLASS.exec(line);
      if (c) {
        current = { name: c[2]!, parent: c[3] ?? null, abstract: Boolean(c[1]), methods: [] };
        classes.push(current);
        continue;
      }
      const m = METHOD.exec(line);
      if (m && current) current.methods.push({ name: m[2]!, abstract: Boolean(m[1]) });
    }
  }
  return classes.filter((c) => !c.methods.some((m) => m.name === "main"));
}

/**
 * Where Java looks for `method` on an object of class `start`: that class, then each parent in turn, until a
 * class declares a non-abstract version. Returns the classes searched, the last being the one that has it.
 */
export function lookupPath(classes: ClassInfo[], start: string, method: string): string[] {
  const path: string[] = [];
  for (let c = classes.find((k) => k.name === start); c; c = classes.find((k) => k.name === c!.parent)) {
    path.push(c.name);
    if (c.methods.some((m) => m.name === method && !m.abstract)) break;
  }
  return path;
}
