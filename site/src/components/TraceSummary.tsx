import type { Trace } from "@java-visuals/trace-schema";

/** Placeholder until the Player lands in Phase 3: proves Trace types flow from schema to site. */
export default function TraceSummary({ trace }: { trace: Trace }) {
  const last = trace.steps.at(-1);
  return (
    <section>
      <h2>{trace.lessonId}</h2>
      <p>
        {trace.steps.length} Steps · {Object.keys(trace.markers).length} Markers · final Heap holds{" "}
        {last?.heap.filter((o) => !o.internal).length ?? 0} Object(s)
      </p>
      <ol>
        {trace.steps.map((step, i) => (
          <li key={i}>
            line {step.location.line}: {step.threads[0]?.frames.map((f) => f.method).join(" → ")}
          </li>
        ))}
      </ol>
    </section>
  );
}
