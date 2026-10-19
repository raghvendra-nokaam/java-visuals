# Java Visuals

Learn Java by watching it run. Every lesson animates what actually happens: variables filling up, objects being built, Java choosing which method to run, threads sharing (and fighting over) the same data, bytecode moving through the JVM, and how Java itself changed from 1996 to today.

It starts from the basics (variables, operators, loops, keywords, classes and objects) and goes all the way to the JVM, memory and concurrency, for anyone from students to developers preparing for senior roles.

## What's in it

| Track | Lessons |
|---|---|
| **History** | The Sun years (1996 to 2006) · Java 5: new syntax, same JVM · Oracle, lambdas and modules · A release every six months (JDK 10 to 27) |
| **Basics** | Variables and primitive types · Operators and expressions · Decisions and loops · static, final and this · Java's keywords at a glance |
| **Objects and classes** | Classes and objects · Encapsulation · Inheritance · Polymorphism · Abstraction |
| **The JVM** | How Java runs your code: javac, class loading, verification, the interpreter's operand stack, and the JIT |
| **Memory** | Method calls and Frames · Objects and References · Pass-by-value · When objects become eligible |
| **Concurrency** | One Heap, many Stacks · The lost update · ReentrantLock · Waiting for a message · Deadlock · Virtual threads, each told as a real-life scene (ticket agents, a records room, a kitchen pass, bank clerks) |

Every lesson plays in the same Player: play, pause, step, scrub, change speed, use the keyboard (← → Space Home End), and answer **Predict Prompts** that pause the animation and ask what happens next. Most code lessons show the current method's variables as labelled boxes; Memory lessons draw the full Stack and Heap and can switch between a **Simple** view and a **JVM detail** view that reveals JDK internals, and some lessons have **Variants** you can switch between at the same moment, such as reassigning a parameter vs. changing the object it points to.

## How it works

Nothing on the site is a hand-drawn approximation of Java's behaviour:

1. **Execution Lessons** are real Java 25 programs. At build time the **recorder** runs each one on a real JVM under the Java Debug Interface and saves every Step (Stacks, Heap, statics, console) as a **Trace** ([ADR 0001](docs/adr/0001-pre-recorded-traces.md)). Programs with several threads run under an author-written **Schedule** that fixes the interleaving, so a race or a deadlock happens the same way on every build ([ADR 0002](docs/adr/0002-author-defined-schedules-for-concurrency.md)).
2. **Scenes** (the Concurrency Track, polymorphism) are pictures drawn from those same Traces: a ticket agent's thought bubble is the value the thread really read.
3. **Animation Lessons** are bespoke visuals with no code walkthrough, like the keyword reference card or the trip from source file to JIT. Those with an example program show its real `javap` output.
4. **Timeline Lessons** are structured release data. Recent releases are checked against openjdk.org.
5. The **site** replays all of it statically: no server, no Java in the browser.

```
lessons/  ──recorder (JDI, javap)──▶  Traces + bytecode  ──Astro build──▶  static site
```

The vocabulary used throughout the code and docs (Lesson, Trace, Step, Marker, Variant, Detail Level…) is defined in [CONTEXT.md](CONTEXT.md).

## Running it locally

You need **Node 22.22+** (`.nvmrc` pins 24) and **any JDK 17+** to start Gradle. The build downloads JDK 25 for the recorder automatically.

```bash
npm install
```

```bash
npm run record
```

```bash
npm run dev
```

`npm run record` runs every Lesson Program and writes its Traces, and the site won't build without them. `npm run dev` serves the site at http://localhost:4321.

| Command | What it does |
|---|---|
| `npm run record` | Record every Execution Lesson and generate Animation Lesson bytecode |
| `npm run dev` | Start the site with hot reload |
| `npm run build` | Record, then build the static site into `site/dist` |
| `npm run validate` | Check every Trace against the schema and semantic rules |
| `npm test` | Site unit tests (Vitest) and recorder tests (JUnit) |
| `npm run check` | Type checks plus Trace validation |

## Repository layout

| Path | What |
|---|---|
| `lessons/` | All lesson content, one directory per Track and Lesson ([format](docs/lesson-format.md)) |
| `recorder/` | Java 25 CLI: runs Lesson Programs under JDI and writes Traces |
| `trace-schema/` | JSON Schema for Traces (the contract between recorder and site), generated TypeScript types, fixtures |
| `site/` | Astro + React site: the Player and one renderer per lesson kind |
| `docs/` | [Build plan](docs/build-plan.md), [Trace format](docs/trace-format.md), [lesson format](docs/lesson-format.md), [ADRs](docs/adr/) |

## Deploying

`.github/workflows/site.yml` records, builds, validates and tests on every push and pull request. Pushes to `main` also deploy to GitHub Pages once Pages is enabled for the repository with **GitHub Actions** as its source. Until then the deploy is skipped and the build still passes.

## Contributing

Lessons are plain files, and adding one never requires touching the Player. See [CONTRIBUTING.md](CONTRIBUTING.md) for how to write a lesson, the narration style, and the checks to run before opening a pull request.

## License

Code: [MIT](LICENSE). Lesson content (`lessons/`): [CC BY-SA 4.0](LICENSE-CONTENT).
