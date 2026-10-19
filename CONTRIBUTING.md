# Contributing

Thanks for helping people see how Java works. Most contributions are lessons, and a lesson is plain files under `lessons/`. You never need to touch the Player to add one.

Before you start, skim two short documents:

- [CONTEXT.md](CONTEXT.md), the project's vocabulary. Lessons, code and reviews all use these words (a **Frame**, not an "activation record"; a **Reference**, not a "pointer"; **Eligible**, not "dead").
- [docs/lesson-format.md](docs/lesson-format.md), the exact file formats. This guide covers how to write a good lesson; that one covers the syntax.

## Choosing a lesson kind

| Kind | Use it when | You write |
|---|---|---|
| **Execution** | The lesson is about what a running program does: its variables, objects, method calls or threads | `Program.java`, `lesson.yaml`, `narration.md` |
| **Timeline** | The lesson is about how Java changed over time | `timeline.yaml`, `lesson.yaml`, `narration.md` |
| **Animation** | The idea is best shown without walking through code: a flow of stages like class loading, or a reference card like the keywords | A bespoke visual in `site/src/renderers/animation/`, plus `lesson.yaml` and `narration.md` |

If you're unsure, it's probably an Execution Lesson.

## Writing an Execution Lesson

### 1. Create the lesson

```
lessons/<track>/<lesson-id>/
├── lesson.yaml
├── Program.java
└── narration.md
```

Pick an `order` that places it within its Track, and list Prerequisites the Learner should have seen first. Choose a `view` too ([lesson format](docs/lesson-format.md#views)): the default Variables view suits most lessons, `memory` is for lessons about the Stack and Heap, and `scene` is for a bespoke picture such as the Concurrency Track's.

### 2. Write the Lesson Program

The program *is* the lesson, so keep it small enough to read in one glance.

- **Java 25.** The entry point is always `Program.main`.
- **Short.** Aim for 15 to 40 Steps. The recorder stops at 2,000 Steps or 300 Heap objects, but a Learner gives up long before that.
- **Deterministic.** No input, randomness, clocks, files or network. Every build must record the same Trace.
- **Threads need a plan.** A program that starts threads runs them one at a time. Name every thread (`new Thread(task, "A")`), and write a Schedule when the order matters ([lesson format](docs/lesson-format.md#schedules)). Use `synchronized` blocks rather than `synchronized` methods, and mark the line where a race happens with `// @substeps`. The Concurrency Track lessons show all of this.
- **Let nothing throw out of `main`.** An uncaught exception ends the recording early.
- **One class per file when you have Variants.** A Variant's directory replaces whole files, so a helper class that lives inside `Program.java` would vanish from the Variant. See `lessons/memory/pass-by-value/` for the pattern.
- **Prefer plain code over clever code.** A `switch` on an enum, for example, makes `javac` generate a hidden helper class that shows up as noise.
- **Give every new object a home on the line that creates it.** The recorder sees objects through variables and fields, not the JVM's operand stack, so `Animal[] pets = { new Dog(), new Cat() };` briefly leaves the `Dog` unreachable and fails the build. Create the array first and fill it one element per line.

### 3. Mark the moments you'll talk about

Add `// @mark name` to the end of each line where narration or a Predict Prompt should appear. The Player hides these comments. Use the same Marker names in every Variant wherever the moment is the same, so that switching Variant lands on the matching Step. When a line runs more than once, `name@main#3` means its third hit, and returning to a line after a call it makes counts as a hit too: in a loop whose line calls a method, the second lap is hit 3.

### 4. Record and look at the real Steps

```bash
npm run record
```

```bash
npm run steps -- lessons/<track>/<lesson-id>/traces/default.json
```

`npm run steps` prints one line per Step: the line about to run, the Marker, the Stack, the Heap and what changed. **Always read it before writing narration.** The real JVM regularly surprises: constructors take several Steps, a call returns to the same line before moving on, and a record's `toString` appears as its own Frame.

### 5. Write the narration

See the [style guide](#narration-style) below, then run `npm run dev` and play the lesson from start to finish, including every Variant and both Detail Levels.

## Writing a Timeline Lesson

Each Version Stop in `timeline.yaml` is one Step. Keep the facts in the stop (version, date, headline, features, optional before/after code) and the story in `narration.md`.

**Every fact needs a primary source.** Check release dates and features against the OpenJDK project pages (`https://openjdk.org/projects/jdk/<version>/`) or the JEPs themselves, not blog posts. If a feature was a preview or an incubator in that release, say so.

## Writing an Animation Lesson

Animations all look different, so each one is a small React visual. Copy the structure of `site/src/renderers/animation/how-java-runs/` (or `keywords/` for one with no program): a `steps.ts` that defines the Steps (their ids are the Markers), a view, and an `index.tsx` that adapts it to the Player. Register it in `steps.ts` and `renderers.ts`. If the lesson has a `Program.java`, `npm run record` writes its real bytecode to `traces/bytecode.txt`. Show that rather than typing bytecode by hand, and check any JVM facts on a real JDK 25 (for example `java -XX:+PrintFlagsFinal -version`).

## Narration style

Narration is the only text the Learner reads, so every sentence has to earn its place.

- **Write for someone who knows the syntax.** Explain what happens, not what the code says.
- **Remember when a block appears.** A block at a Marker shows when the Learner reaches that Step, which is *before* that line runs, and stays until the next anchor. Describe what just happened and what's about to.
- **One idea per block, in one to three sentences.** If you need more, you probably need another Marker.
- **Use the glossary terms** from CONTEXT.md, and put code in `backticks`. The exception is words about the project itself ("Learner", "Lesson Program", "Trace"): narration talks to the reader as "you" and about "the program".
- **Use plain words.** Avoid "simply", "just", "obviously" and "of course". If it were obvious, there'd be no lesson.
- **Be exact.** Say "eligible for garbage collection", not "deleted". Say "a copy of the Reference", not "the object is passed".

### Predict Prompts

- Ask about **what happens next**, never trivia about what's already on screen.
- Make the wrong answers **real misconceptions** people hold, such as "the object is deleted immediately" or "the method gets the variable itself".
- Write the explanation as **why**, not just which answer was right.
- About one prompt every five to ten Steps is plenty. They interrupt the flow on purpose.

## Changing the code

| Area | Run |
|---|---|
| Recorder (`recorder/`) | `./recorder/gradlew -p recorder test` |
| Site (`site/`) | `npm test -w site`, plus `npx astro check` from `site/` |
| Everything | `npm run build && npm run check && npm test` |

The Trace format is the contract between the recorder and the site. If you change it, bump `schemaVersion`, update `trace-schema/schema/trace.schema.json`, `docs/trace-format.md`, the semantic checks in `trace-schema/src/check.ts`, and the fixtures (`trace-schema/scripts/generate-fixtures.py`). The recorder test that compares against the fixture will tell you if the two sides disagree.

## Accessibility

Every page must work by keyboard, meet WCAG AA contrast in both light and dark mode, and respect reduced motion. Before you open a pull request that changes the UI, run axe against the dev server from the browser console on the pages you touched:

```js
await new Promise((r) => { const s = document.createElement("script"); s.src = "/@fs" + "<absolute path to repo>/node_modules/axe-core/axe.min.js"; s.onload = r; document.head.appendChild(s); });
(await axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"] })).violations;
```

An empty array is the goal. Also tab through the page, and check it at 375px wide.

## Pull request checklist

- [ ] `npm run build`, `npm run check` and `npm test` pass
- [ ] I played the lesson end to end, in every Variant and Detail Level
- [ ] Facts are checked against primary sources (Timeline and Animation Lessons)
- [ ] Narration follows the style guide and uses the CONTEXT.md vocabulary
- [ ] UI changes pass the accessibility checks above

Lesson content is licensed [CC BY-SA 4.0](LICENSE-CONTENT) and code is [MIT](LICENSE). By contributing, you agree your work is released under those licenses.
