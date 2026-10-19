import { useMemo, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { HeapObject, Trace, Value, Variable } from "@java-visuals/trace-schema";
import type { DetailLevel } from "../../player/script";
import { CodePanel } from "./ExecutionView";
import { frameTitle, shortType } from "./model";
import "./variables.css";

interface Props {
  trace: Trace;
  index: number;
  level: DetailLevel;
  explanation: ReactNode;
}

/**
 * The default view for Execution Lessons that aren't about memory: the code, the methods currently running,
 * and the current method's variables as labelled boxes. Objects appear as cards inside the variable holding
 * them, with no Stack, Heap or arrows; Lessons that need those use `view: memory`.
 */
export default function VariablesView({ trace, index, explanation }: Props) {
  const step = trace.steps[index]!;
  const prev = index > 0 ? trace.steps[index - 1] : undefined;
  const thread = step.threads.find((t) => t.id === step.activeThread) ?? step.threads[0]!;
  const frame = thread.frames.at(-1);
  const prevFrame = prev?.threads.flatMap((t) => t.frames).find((f) => f.id === frame?.id);
  const locals = frame?.locals.filter((l) => l.name !== "args") ?? [];
  const heap = useMemo(() => new Map(step.heap.map((o) => [o.id, o])), [step]);
  const prevHeap = useMemo(() => new Map((prev?.heap ?? []).map((o) => [o.id, o])), [prev]);
  const statics = step.statics.filter((s) => s.fields.length > 0);
  // Object id → the variable that already shows it, so an object reached twice is drawn once.
  const ctx: Ctx = { heap, prevHeap, shown: new Map() };

  return (
    <div className="exec vars-view">
      <CodePanel trace={trace} step={step} highlightLine={null} onHoverLine={() => {}} />
      <div className="exec-side">
        <section className="vars-panel" aria-label="Variables">
          <p className="vars-calls" aria-label="Methods running">
            {thread.frames.map((f, i) => (
              <span key={f.id} className="vars-call" data-current={i === thread.frames.length - 1 || undefined}>
                {i > 0 && <span className="vars-call-sep" aria-hidden="true">›</span>}
                {frameTitle(f)}
              </span>
            ))}
          </p>
          {locals.length === 0 ? (
            <p className="vars-empty">No variables yet in {frame ? frameTitle(frame) : "this method"}.</p>
          ) : (
            <div className="vars-grid">
              <AnimatePresence initial={false}>
                {locals.map((v) => (
                  <VariableBox
                    key={`${frame!.id}:${v.name}`}
                    variable={v}
                    previous={prevFrame?.locals.find((l) => l.name === v.name)}
                    ctx={ctx}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
          {statics.length > 0 && (
            <div className="vars-statics">
              <h2 className="region-title">Static fields</h2>
              {statics.map((s) => (
                <div key={s.className} className="vars-static-class">
                  <span className="vars-static-name">{s.className}</span>
                  <div className="vars-grid">
                    {s.fields.map((f) => (
                      <VariableBox
                        key={`${s.className}.${f.name}`}
                        variable={f}
                        previous={prev?.statics.find((p) => p.className === s.className)?.fields.find((p) => p.name === f.name)}
                        ctx={ctx}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        {explanation}
      </div>
    </div>
  );
}

interface Ctx {
  heap: Map<string, HeapObject>;
  prevHeap: Map<string, HeapObject>;
  shown: Map<string, string>;
}

function VariableBox({ variable, previous, ctx }: { variable: Variable; previous: Variable | undefined; ctx: Ctx }) {
  const target = variable.value.kind === "ref" ? ctx.heap.get(variable.value.id) : undefined;
  const isObject = target !== undefined && !target.inline;
  const changed = previous !== undefined && JSON.stringify(previous.value) !== JSON.stringify(variable.value);
  return (
    <motion.div
      layout
      className="var-box"
      data-object={isObject || undefined}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
    >
      <span className="var-type">{shortType(variable.type)}</span>
      <span className="var-name">{variable.name}</span>
      {isObject ? (
        <ObjectCard obj={target!} ownerName={variable.name} ctx={ctx} depth={0} />
      ) : (
        <span key={changed ? JSON.stringify(variable.value) : "same"} className="var-value" data-changed={changed || undefined}>
          {valueText(variable.value, ctx)}
        </span>
      )}
    </motion.div>
  );
}

function ObjectCard({ obj, ownerName, ctx, depth }: { obj: HeapObject; ownerName: string; ctx: Ctx; depth: number }) {
  const seenAs = ctx.shown.get(obj.id);
  if (seenAs !== undefined) {
    return (
      <span className="var-same">
        the same {shortType(obj.type)} as <code>{seenAs}</code>
      </span>
    );
  }
  ctx.shown.set(obj.id, ownerName);
  const before = ctx.prevHeap.get(obj.id);
  return (
    <div className="var-object">
      <span className="var-object-type">{shortType(obj.type)}</span>
      {obj.fields && obj.fields.length > 0 && (
        <dl className="var-fields">
          {obj.fields.map((f) => {
            const was = before?.fields?.find((p) => p.name === f.name);
            const changed = was !== undefined && JSON.stringify(was.value) !== JSON.stringify(f.value);
            const nested = f.value.kind === "ref" ? ctx.heap.get(f.value.id) : undefined;
            return (
              <div key={f.name} className="var-field">
                <dt>{f.name}</dt>
                <dd>
                  {nested && !nested.inline && depth < 1 ? (
                    <ObjectCard obj={nested} ownerName={`${ownerName}.${f.name}`} ctx={ctx} depth={depth + 1} />
                  ) : (
                    <span key={changed ? JSON.stringify(f.value) : "same"} className="var-value" data-changed={changed || undefined}>
                      {valueText(f.value, ctx)}
                    </span>
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      )}
      {obj.elements && (
        <ol className="var-cells" aria-label={`${obj.elements.length} elements`}>
          {obj.elements.map((v, i) => (
            <li key={i}>
              <span className="var-cell-index">{i}</span>
              <span className="var-value">{valueText(v, ctx)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** How a value reads in the Variables panel: literals as Java writes them, objects by type. */
function valueText(value: Value, ctx: Ctx): string {
  if (value.kind === "primitive") return value.display;
  if (value.kind === "null") return "null";
  const target = ctx.heap.get(value.id);
  if (!target) return "?";
  if (target.inline || target.display) return target.display ?? "";
  return `a ${shortType(target.type)}`;
}

