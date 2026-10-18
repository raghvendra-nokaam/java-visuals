# Concurrency Traces use author-defined Schedules, not natural thread scheduling

A race-condition Variant recorded under natural OS scheduling usually runs *correctly*, so the bug the lesson exists to show never appears. Instead, the recorder enforces an author-defined Schedule — the exact interleaving of threads, down to Sub-steps like the read/add/write inside `count++` — while still executing the Lesson Program on a real JVM. The Lesson labels the result as "one possible interleaving"; a Variant may carry several Schedules (e.g. a "lucky" and an "unlucky" one) to show why races are hard to reproduce.

## Considered Options

- **Natural scheduling** — rejected: non-deterministic; the race rarely shows.
- **Hand-editing the Trace to fake the race** — rejected: breaks the guarantee that every Trace is real JVM behaviour (ADR-0001).
