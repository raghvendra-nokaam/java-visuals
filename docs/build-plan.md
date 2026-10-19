# Build Plan — v1

Vocabulary follows [CONTEXT.md](../CONTEXT.md). Key decisions: [ADR-0001](adr/0001-pre-recorded-traces.md), [ADR-0002](adr/0002-author-defined-schedules-for-concurrency.md).

**Status (2026-10-18):** Phases 0–8 are done, so v1 is complete. The next work is under "v2 and later" below. One deviation from the plan: the Execution renderer draws Frames and Objects as HTML with an SVG layer for References, rather than all-SVG, which made text layout, linked highlighting and accessibility simpler.

**v1 scope:** History Track (Timeline), "How Java runs your code" (Pipeline, now called Animation), 3–4 Memory Execution Lessons. Concurrency is v2 — but the Trace format is designed for multiple Stacks from day one.

**Guiding rule:** build the riskiest pieces first. The recorder and the Trace format are the foundation; if they're wrong, everything on top is wrong. History content is low-risk and comes after the Player works.

---

## Repo layout

```
/
├── CONTEXT.md
├── docs/            build plan, ADRs, Trace format spec
├── trace-schema/    JSON Schema for Traces + generated TypeScript types  (the contract)
├── recorder/        Java 25 CLI — JDI-based; Lesson Program → Trace JSON
├── site/            Astro + React + TypeScript; Player and renderers
└── lessons/
    └── <track>/<lesson>/
        ├── lesson.yaml        kind, Track, Prerequisites, default Detail Level, Variants
        ├── Program.java       Lesson Program with // @mark comments   (Execution only)
        ├── narration.md       Narration + Predict Prompts keyed by Marker / Step id
        └── traces/            generated, git-ignored, built in CI
```

---

## Phase 0 — Toolchain & scaffold (½ day)

- Install **JDK 25** (only JDK 17 is installed locally): `brew install openjdk@25` or SDKMAN.
- `git init`, `.gitignore`, MIT `LICENSE` for code, CC BY-SA 4.0 `LICENSE-CONTENT` for `lessons/`.
- Scaffold `site/` (Astro + React + TS), `recorder/` (Gradle, Java 25).

## Phase 1 — Trace format (1–2 days) · *riskiest decision, do first*

Define the Step shape before writing either side. Draft:

- `Trace { lessonId, variantId, scheduleId?, source: {file, lines[]}, steps: Step[], markers: {name → stepIndex} }`
- `Step { line, subStep?, activeThread, threads: [{ id, name, frames: Frame[] }], heap: Object[], events[] }`
- `Frame { method, line, locals: {name, value | ref} }`
- `Object { id, type, fields, state: live | eligible | collected, internal: bool, monitor? }`
- Store full state per Step (simple, makes scrubbing trivial); revisit with deltas only if file sizes hurt.
- Hand-write one Trace for a 10-line program (`main` calls `add(2,3)`, creates one object). This is the fixture both sides develop against.

**Exit:** JSON Schema + TS types generated; hand-written fixture validates.

## Phase 2 — Recorder spike: single-threaded (4–6 days) · *biggest technical risk*

JDI launches the Lesson Program in a debuggee JVM and steps it.

- Line-level stepping (`StepRequest` STEP_LINE) restricted to Lesson Program classes — never step into the JDK.
- Per Step: capture each Frame's locals; walk References from locals/statics to build the Heap.
- Identity: `ObjectReference.uniqueID()`; call `disableCollection()` on seen Objects so IDs stay stable.
- **Eligible:** an Object seen before but no longer reachable from any root → `eligible` (stays on screen).
- **JDK Internals:** Strings/boxed values become plain values; other objects not created by Lesson Program code get `internal: true`.
- **Markers:** parse `// @mark name` comments → map to the first matching Step (+ `@thread#hit` qualifiers); **build fails** on an unresolved Marker.
- Prove Sub-steps are possible: STEP_MIN (bytecode-level) on a chosen line, grouped back to the line. Not needed in v1, but confirm it works now so concurrency isn't blocked later.

**Exit:** `recorder record lessons/memory/method-calls` produces a Trace matching the Phase 1 fixture's shape; golden-file tests on Step Descriptions.

## Phase 3 — Player + Execution renderer (6–8 days)

- **Player core** (renderer-agnostic): Step index state, play/pause, step ±1, scrub, speed, keyboard (← → space), `prefers-reduced-motion` → cut instead of animate.
- **Common Step interface** every renderer implements: `render(step, prevStep, detailLevel)` + `describe(step)` → Step Description.
- **Execution renderer** (SVG + Motion): code panel with current line, Stack column(s), Heap, Reference arrows, Eligible greying.
- Linked highlighting: hover line ↔ Objects it created; hover Object ↔ creating line.
- Narration panel + Predict Prompts (pause, accept a guess, reveal).
- Variant switcher → jump to the same Marker in the new Trace, else Step 0.
- Detail Level toggle (Simple ⇄ JVM) when the Lesson provides both.

**Exit:** the method-calls Lesson is fully playable from a real recorded Trace.

## Phase 4 — Lesson pipeline & deploy (2–3 days)

- Astro content collections read `lesson.yaml` + `narration.md`; Track pages with suggested order and Prerequisites.
- Progress (completed Lessons) in `localStorage`, wrapped in try/catch.
- GitHub Actions: set up JDK 25 → run recorder for all Lessons → build site → deploy to GitHub Pages / Cloudflare Pages.

**Exit:** pushing to `main` publishes the site with fresh Traces.

## Phase 5 — Memory Track content (4–5 days)

1. Method calls & Frames
2. Objects & References
3. Pass-by-value (primitives vs References) — two Variants
4. Objects becoming Eligible

## Phase 6 — Timeline renderer + History Track (5–7 days)

- Timeline renderer on the same Player: Version Stops as Steps; Landmark vs brief stops.
- Content: every version 1.0 → 25 (+ current), the 6-month cadence / LTS stop.
- One embedded before/after Execution Lesson (e.g. Java 5 generics) — proves embedding.

## Phase 7 — Pipeline Lesson: "How Java runs your code" (3–4 days)

- Bespoke renderer: `.java` → `javac` → `.class` → ClassLoader (load/verify/link/init) → interpreter → JIT → machine code. Stages as Steps.

## Phase 8 — Polish & launch (2–3 days)

- Phone layout (stacked panels + "best on a larger screen"), accessibility pass, README, contributor notes for future authors.

**Rough total:** ~6–8 weeks part-time-ish solo effort.

---

## v2 and later

- **Concurrency Track** (first slice done 2026-10-18): deterministic multi-thread recording, Sub-steps, Schedules, and Monitors with owner and waiters; lessons on threads sharing the Heap, the lost update (lucky, unlucky and `synchronized`), and deadlock (opposite vs. same lock order). `ReentrantLock` (shown like a `synchronized` lock, read from its AQS state) and `wait`/`notify` lessons followed the same day. Virtual threads followed too, showing when a virtual thread is on a carrier and when it has let go of it. Which carrier it uses isn't shown, because that differs from run to run.
- **Views, scenes and new Tracks** (2026-10-19): Execution Lessons default to a light Variables view, with the Stack/Heap diagram opt-in (`view: memory`). The Concurrency Track was retold as real-life scenes driven by the Trace (ticket office, guest book, records room, kitchen pass, bank ledgers). Pipeline Lessons became Animation Lessons, which can be any bespoke visual. New Basics and Objects-and-classes Tracks, with a method-lookup scene for polymorphism and abstraction. A collapsible side nav with previous/next replaced progress tracking.
- JVM Detail Level content (bytecode, object headers, generations) and the GC Track (scripted collections → `collected`).
- Side-by-side Variant comparison.
- File locks as an "OS resource" lesson.
- Contributor-authored Lessons.

## Open risks to watch

| Risk | Where it bites | Mitigation |
|---|---|---|
| JDI heap walking is slow on large graphs | Phase 2 | Lesson Programs are tiny by design; cap Steps per Trace |
| Trace files get large (full state per Step) | Phase 3–4 | Measure on real Lessons; switch to deltas + keyframes if > ~500 KB |
| Distinguishing "created by Lesson Program" from JDK Internals | Phase 2 | Track allocation sites via Steps (Object first seen right after a `new` on a Lesson line) |
| Marker resolution for repeated lines | Phase 2 | `@thread#hit` qualifiers; fail the build on ambiguity |
