# Trace Format (schema version 1)

A Trace is the contract between the recorder (which writes it) and the Player (which replays it). The shape lives in [`trace-schema/schema/trace.schema.json`](../trace-schema/schema/trace.schema.json); this doc gives the **semantics** the schema can't express. Semantic rules marked ✔ are enforced by `checkTrace` (`npm run validate`).

Reference example: [`trace-schema/fixtures/method-calls.json`](../trace-schema/fixtures/method-calls.json) for [`lessons/memory/method-calls/Program.java`](../lessons/memory/method-calls/Program.java). Its Step lines were confirmed by stepping the program with `jdb` on JDK 25.

## One Trace = one run

One Trace per (Lesson, Variant, Schedule). `scheduleId` is absent for single-threaded runs.

## A Step is "about to execute"

`step.location` is the line **about to run**. All state in the Step (Stacks, Heap, statics, console) is the state *before* that line runs, the way a debugger shows it when paused. Consequences:

- A local appears in its Frame only on the Step *after* the line that assigns it (`int x = 2` on line 3 → `x` first appears at the line-4 Step).
- After a call returns, the caller is revisited on the **same line** (line 5 → `add` → line 5 again) before moving on, because the rest of that line (the assignment to `sum`) hasn't run yet. That revisit is real JVM behavior; keep it, since it's where the Learner sees the returned value land.
- ✔ The active thread's top Frame is at `step.location.line`.

## Full state in every Step

Each Step carries the complete state, not a diff, so scrubbing to any Step is a direct lookup. `events` additionally list what changed since the previous Step, so renderers can animate (draw the arrow *after* the allocation) without diffing. Events are a hint for animation; state is the truth.

Calls, returns and output are observed directly by the debugger. Allocations, assignments and eligibility are derived by diffing consecutive Steps, so:

- Events use a **canonical order**: returns, allocations, calls, assignments, eligibility, output. This isn't necessarily chronological. For example, a constructor's field writes are reported on the Step after it returns.
- A write that stores the value a slot already held (`y = 0` over a default `0`) isn't visible and isn't reported.

If Trace files get too large, version 2 may switch to keyframes plus deltas. Lesson Programs are kept tiny, so we're not doing that yet.

## Identity

- **Frame ids** are unique per invocation: recursion creates a new id for each call. ✔ An id never changes meaning within a Trace.
- **Object ids** are stable for the Object's lifetime (recorder: JDI `uniqueID()` with `disableCollection()`). ✔ An Object's type never changes.
- **Thread ids** are stable; `name` is the Java thread name.

## What's on the Stack

- Only Frames of **Lesson Program classes** are included; JDK Frames are omitted. Static initializers that run before `main` aren't recorded. In the fixture, `println(p)` invokes the record's `toString()`, so the Stack shows `main → toString` even though `PrintStream.println` and `String.valueOf` are really in between.
- A record's or enum's generated methods (`<init>`, `toString`, accessors) *are* Lesson Program code and do appear, at the line of the record header.
- Frames are ordered outermost first, current Frame last. A non-top Frame's `line` is its call site.

## What's on the Heap

- The Heap holds every Object reachable from any Frame local or Lesson Program static, plus Objects that were reachable earlier and have become **Eligible**.
- ✔ Every `ref` value resolves to an Object in the **same** Step.
- **`internal: true`** marks a JDK Internal: not created by Lesson Program code (e.g. `args`, an `ArrayList`'s backing array). Hidden at the Simple Detail Level unless the Lesson opts in.
- **`inline: true`** (Strings, boxed primitives): at Simple level, draw References to it as its `display` text instead of an arrow. At JVM level, draw it as a normal Object.
- **In flight:** an Object held only on the JVM operand stack (a `new` whose result hasn't been stored yet, or a value just returned from a method) is still `live`. The rule: an Object that was reachable at any point while the active Frame has been executing its current line stays live until that line finishes.
- A JDK Internal that leaves the Lesson Program's reach is **removed** from the Heap rather than marked `eligible`. The JDK may still hold it (e.g. `ArrayList`'s shared empty array), so we can't claim it's garbage.
- String literals are interned by the JVM, which keeps them reachable from its string table. The recorder can't tell a literal from a runtime-built String, so Strings follow normal reachability. At the JVM Detail Level, a literal held only by an Eligible object is shown as Eligible too.
- **`state`**: `live` → `eligible` (no longer reachable; drawn greyed, still present) → `collected` (only in Lessons that script a GC). ✔ State never goes backwards.
- `allocatedAt` is the Lesson Program line whose `new` (or literal) created the Object, and it drives linked highlighting.
- `monitor` is present only while the lock is owned or contended.

## Markers

`markers` maps Marker names (from `// @mark name` comments in the Lesson Program) to Step indices. An unqualified name resolves to the **first** Step whose `location` is that line. A qualified name (`name@thread#hit`) means "the *hit*-th time *thread* is at that line". Narration and Predict Prompts reference Markers, never raw Step indices. ✔ Every index exists. The recorder must fail the build if a Marker matches no Step.

## Sub-steps

When a line is split (e.g. `count++` → read, add, write), each part is its own Step at the same `location` with `subStep: {index, count, label}`. Not used in v1 lessons, but the format supports it for the Concurrency Track.

## Console

`console` is everything written to stdout so far. ✔ It only grows. Each `output` event carries just the new text.

## Versioning

`schemaVersion` is `1`. Any breaking change bumps it, and the Player must reject versions it doesn't know.
