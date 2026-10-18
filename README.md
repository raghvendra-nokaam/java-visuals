# Java Visuals

Learn Java by watching it run — from Java's history, through how the JVM executes your code, to memory and concurrency, all animated step by step.

> Early development. See [docs/build-plan.md](docs/build-plan.md) for the roadmap and [CONTEXT.md](CONTEXT.md) for project vocabulary.

## Layout

| Path | What |
|---|---|
| `trace-schema/` | JSON Schema for Traces — the contract between recorder and site — plus generated TypeScript types |
| `recorder/` | Java 25 CLI that runs Lesson Programs under a debugger and writes Traces |
| `site/` | Astro + React site containing the Player |
| `lessons/` | Lesson content |

## Development

Requires Node 22.22+ (`.nvmrc` pins 24) and a JDK 17+ to run Gradle (the build provisions JDK 25 automatically via Gradle toolchains).

```bash
npm install
npm run record          # record lesson Traces (needed before dev/build)
npm run validate        # validate Traces against the schema
npm test                # site unit tests + recorder tests
npm run dev             # start the site
./recorder/gradlew -p recorder build
```

## License

Code: [MIT](LICENSE). Lesson content (`lessons/`): [CC BY-SA 4.0](LICENSE-CONTENT).
