# Concurrency Traces use author-defined Schedules, not natural thread scheduling

A race-condition Variant recorded under natural OS scheduling usually runs *correctly*, so the bug the lesson exists to show never appears. Instead, the recorder enforces an author-defined Schedule — the exact interleaving of threads, down to Sub-steps like the read/add/write inside `count++` — while still executing the Lesson Program on a real JVM. The Lesson labels the result as "one possible interleaving"; a Variant may carry several Schedules (e.g. a "lucky" and an "unlucky" one) to show why races are hard to reproduce.

## Considered Options

- **Natural scheduling** — rejected: non-deterministic; the race rarely shows.
- **Hand-editing the Trace to fake the race** — rejected: breaks the guarantee that every Trace is real JVM behaviour (ADR-0001).

## Consequences

- The recorder controls threads by suspending them, not by changing the program: every JDI event suspends only its own thread, and every Lesson thread except the scheduled one stays suspended ("parked"). Parking is just not resuming, so each parked thread holds exactly one suspension. An earlier attempt that suspended the whole VM on every event and juggled per-thread counts let JDWP's own resume logic release parked threads.
- A newly started thread is run to its first Lesson line before the next capture. It's found in the thread list, not only through its start event, because that event can arrive after the parent has moved on.
- Detecting that the scheduled thread is blocked or waiting relies on it producing no event for a short time (400 ms) and then inspecting its status. This makes recording concurrency lessons slower, but it doesn't make them nondeterministic: the status, not the timing, decides what happens next.
- Two states the debugger can't see directly are found by inspection. A thread queued for a `ReentrantLock` is parked inside AQS, so it's recognised from its frames and shown as blocked on that lock. A notified waiter is indistinguishable from an un-notified one until it runs, so it's briefly let run while the lock it needs is held by a suspended thread; it can't reach Lesson code, so this doesn't break determinism.
