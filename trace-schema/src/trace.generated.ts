/* Generated from schema/trace.schema.json by json-schema-to-typescript. Do not edit; run npm run generate. */

/**
 * This interface was referenced by `Trace`'s JSON-Schema
 * via the `definition` "Slug".
 */
export type Slug = string;
/**
 * Opaque identifier, stable across every Step of one Trace.
 *
 * This interface was referenced by `Trace`'s JSON-Schema
 * via the `definition` "Id".
 */
export type Id = string;
/**
 * This interface was referenced by `Trace`'s JSON-Schema
 * via the `definition` "Value".
 */
export type Value = PrimitiveValue | NullValue | RefValue;
/**
 * This interface was referenced by `Trace`'s JSON-Schema
 * via the `definition` "HeapObject".
 */
export type HeapObject = {
  id: Id;
  /**
   * Runtime type, e.g. "Point", "int[]", "java.lang.String".
   */
  type: string;
  shape: "object" | "array";
  /**
   * Instance fields (shape = object).
   */
  fields?: Variable[];
  /**
   * Array elements (shape = array).
   */
  elements?: Value[];
  /**
   * Value-like rendering for inline Objects, e.g. "\"hello\"" or "42".
   */
  display?: string;
  state: "live" | "eligible" | "collected";
  /**
   * JDK Internal: not created by Lesson Program code. Hidden unless the Lesson shows it at the JVM Detail Level.
   */
  internal: boolean;
  /**
   * At the Simple Detail Level, draw References to this Object as its display value instead of an arrow (Strings, boxed primitives).
   */
  inline: boolean;
  allocatedAt?: Location;
  monitor?: Monitor;
};
/**
 * This interface was referenced by `Trace`'s JSON-Schema
 * via the `definition` "Event".
 */
export type Event =
  | {
      type: "call";
      thread: Id;
      frameId: Id;
    }
  | {
      type: "return";
      thread: Id;
      frameId: Id;
      value?: Value;
    }
  | {
      type: "allocate";
      objectId: Id;
    }
  | {
      type: "assign";
      target: AssignTarget;
      value: Value;
    }
  | {
      type: "eligible" | "collected";
      objectId: Id;
    }
  | {
      type: "lock-acquire" | "lock-release" | "lock-block" | "wait" | "notify";
      thread: Id;
      objectId: Id;
    }
  | {
      type: "thread-start" | "thread-end";
      thread: Id;
    }
  | {
      type: "output";
      text: string;
    };
/**
 * This interface was referenced by `Trace`'s JSON-Schema
 * via the `definition` "AssignTarget".
 */
export type AssignTarget =
  | {
      frameId: Id;
      name: string;
    }
  | {
      objectId: Id;
      field: string;
    }
  | {
      objectId: Id;
      index: number;
    }
  | {
      className: string;
      field: string;
    };
/**
 * This interface was referenced by `Trace`'s JSON-Schema
 * via the `definition` "MarkerName".
 */
export type MarkerName = string;

/**
 * The recorded, ordered sequence of Steps produced by running one Variant of a Lesson Program on a real JVM. See docs/trace-format.md for semantics.
 */
export interface Trace {
  schemaVersion: 1;
  /**
   * Lesson path relative to lessons/, e.g. "memory/method-calls".
   */
  lessonId: string;
  variantId: Slug;
  /**
   * The Schedule enforced while recording; absent for single-threaded Traces.
   */
  scheduleId?: string;
  /**
   * @minItems 1
   */
  source: [SourceFile, ...SourceFile[]];
  /**
   * Marker name (optionally qualified, e.g. "race-read@thread-2#1") → index into steps.
   */
  markers: {
    [k: string]: number;
  };
  /**
   * @minItems 1
   */
  steps: [Step, ...Step[]];
}
/**
 * This interface was referenced by `Trace`'s JSON-Schema
 * via the `definition` "SourceFile".
 */
export interface SourceFile {
  path: string;
  /**
   * Source text split by line; lines[0] is line 1.
   */
  lines: string[];
}
/**
 * One moment of execution: the line about to execute, plus the complete state before it executes.
 *
 * This interface was referenced by `Trace`'s JSON-Schema
 * via the `definition` "Step".
 */
export interface Step {
  location: Location;
  subStep?: SubStep;
  /**
   * Id of the thread whose location this Step is.
   */
  activeThread: string;
  /**
   * @minItems 1
   */
  threads: [Thread, ...Thread[]];
  /**
   * Static fields of Lesson Program classes — GC roots alongside Frame locals.
   */
  statics: StaticFields[];
  heap: HeapObject[];
  /**
   * Everything the program has written to stdout so far.
   */
  console: string;
  /**
   * What changed since the previous Step, in order. Lets renderers animate transitions without diffing.
   */
  events: Event[];
}
/**
 * A source position. On HeapObject.allocatedAt: where Lesson Program code created the Object (drives code ↔ memory linked highlighting).
 *
 * This interface was referenced by `Trace`'s JSON-Schema
 * via the `definition` "Location".
 */
export interface Location {
  file: string;
  line: number;
}
/**
 * Present when one source line is split into finer Steps (e.g. count++ as read → add → write).
 *
 * This interface was referenced by `Trace`'s JSON-Schema
 * via the `definition` "SubStep".
 */
export interface SubStep {
  index: number;
  count: number;
  label: string;
}
/**
 * This interface was referenced by `Trace`'s JSON-Schema
 * via the `definition` "Thread".
 */
export interface Thread {
  id: Id;
  name: string;
  state: "running" | "runnable" | "blocked" | "waiting" | "terminated";
  /**
   * The thread's Stack, outermost Frame first, current Frame last.
   */
  frames: Frame[];
}
/**
 * This interface was referenced by `Trace`'s JSON-Schema
 * via the `definition` "Frame".
 */
export interface Frame {
  /**
   * Opaque identifier, stable across every Step of one Trace.
   */
  id: string;
  className: string;
  /**
   * Method name as the JVM reports it; constructors are "<init>".
   */
  method: string;
  /**
   * The line this Frame is currently at (for non-top Frames: the call site).
   */
  line: number;
  /**
   * Locals in scope, in declaration order. A local not yet assigned is absent.
   */
  locals: Variable[];
}
/**
 * This interface was referenced by `Trace`'s JSON-Schema
 * via the `definition` "Variable".
 */
export interface Variable {
  name: string;
  /**
   * Declared Java type, e.g. "int", "Point", "java.lang.String".
   */
  type: string;
  value: Value;
}
/**
 * This interface was referenced by `Trace`'s JSON-Schema
 * via the `definition` "PrimitiveValue".
 */
export interface PrimitiveValue {
  kind: "primitive";
  type: "boolean" | "byte" | "char" | "short" | "int" | "long" | "float" | "double";
  /**
   * Java source-literal rendering, e.g. "5", "3.0", "'a'", "true".
   */
  display: string;
}
/**
 * This interface was referenced by `Trace`'s JSON-Schema
 * via the `definition` "NullValue".
 */
export interface NullValue {
  kind: "null";
}
/**
 * A Reference: points at a HeapObject in the same Step.
 *
 * This interface was referenced by `Trace`'s JSON-Schema
 * via the `definition` "RefValue".
 */
export interface RefValue {
  kind: "ref";
  id: Id;
}
/**
 * This interface was referenced by `Trace`'s JSON-Schema
 * via the `definition` "StaticFields".
 */
export interface StaticFields {
  className: string;
  fields: Variable[];
}
/**
 * The Object's lock. Present only while owned or contended.
 *
 * This interface was referenced by `Trace`'s JSON-Schema
 * via the `definition` "Monitor".
 */
export interface Monitor {
  owner: Id | null;
  entryCount: number;
  /**
   * Threads blocked trying to acquire it.
   */
  blocked: Id[];
  /**
   * Threads in wait() on it.
   */
  waiting: Id[];
}
