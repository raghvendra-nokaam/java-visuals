# Execution Lessons replay pre-recorded Traces; no Java runs at view time

Every Execution Lesson's Lesson Program and each of its Variants is run on a real JVM at build time with a debugger attached, and the resulting step-by-step Trace is saved as a static file the site replays. Because Variants are a finite, author-defined set, every possible run can be captured ahead of time — giving full rewind/scrub, zero server cost (static hosting suits an open-source project), and no sandboxing of untrusted code.

## Considered Options

- **Hand-authored steps** — rejected: slow and drifts from what the code really does.
- **Live server-side execution** — rejected: hosting cost, sandbox security, abuse handling.
- **In-browser JVM (CheerpJ / custom interpreter)** — rejected: heavy downloads, poor access to memory internals.

## Consequences

- A free-form "paste any code" playground is out of scope unless this decision is revisited.
- Adding or editing a Variant requires re-running the recorder at build time.
