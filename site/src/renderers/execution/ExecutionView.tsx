import { useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Frame, HeapObject, Step, Trace, Variable } from "@java-visuals/trace-schema";
import type { DetailLevel } from "../../player/script";
import { classFiles, frameTitle, shortType, slot, stripMarkers, visibleHeap } from "./model";
import "./execution.css";

interface Props {
  trace: Trace;
  index: number;
  level: DetailLevel;
  explanation: ReactNode;
}

/** Renders one Execution Lesson Step: the code with its current line, every Stack, and the Heap. */
export default function ExecutionView({ trace, index, level, explanation }: Props) {
  const step = trace.steps[index]!;
  const prev = index > 0 ? trace.steps[index - 1] : undefined;
  const [hoverLine, setHoverLine] = useState<number | null>(null);
  const [hoverObject, setHoverObject] = useState<string | null>(null);
  const memoryRef = useRef<HTMLDivElement>(null);
  // Bumped whenever a Frame or Object finishes animating, so arrows re-measure even if the page was throttled.
  const [settled, setSettled] = useState(0);
  const onSettle = () => setSettled((n) => n + 1);

  const hovered = hoverObject ? step.heap.find((o) => o.id === hoverObject) : undefined;
  const highlightLine = hovered?.allocatedAt?.line ?? null;
  const linkedObjects = new Set(
    hoverLine === null ? [] : step.heap.filter((o) => o.allocatedAt?.line === hoverLine).map((o) => o.id),
  );
  const heap = visibleHeap(step, level);
  const multi = step.threads.length > 1;
  const deadlock = step.events.find((e): e is Extract<typeof e, { type: "deadlock" }> => e.type === "deadlock");

  return (
    <div className="exec">
      <CodePanel trace={trace} step={step} highlightLine={highlightLine} onHoverLine={setHoverLine} />
      <div className="exec-side">
        <div className="memory" ref={memoryRef} data-multi={multi || undefined}>
          {deadlock && (
            <p className="deadlock-banner" role="status">
              <strong>Deadlock.</strong> {listNames(deadlock.threads.map((id) => threadName(step, id)))} are each waiting for a
              lock another of them holds. None of them can ever continue.
            </p>
          )}
          <section className="stacks" aria-label={multi ? "Threads" : "Stacks"}>
            {step.threads.map((thread) => (
              <div className="stack" key={thread.id} data-active={(multi && thread.id === step.activeThread) || undefined}>
                <h2 className="region-title">
                  {multi ? (
                    <>
                      {thread.kind === "virtual" ? "Virtual thread" : "Thread"} <span className="thread-name">{thread.name}</span>
                      <span className="thread-state" data-state={thread.state}>
                        {threadStateLabel[thread.state]}
                      </span>
                      {thread.mounted !== undefined && (
                        <span className="thread-mount" data-mounted={thread.mounted || undefined}>
                          {thread.mounted ? "on a carrier" : "unmounted"}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      Stack <span className="region-note">{thread.name} thread</span>
                    </>
                  )}
                </h2>
                <div className="stack-frames">
                  {thread.frames.length === 0 && <p className="stack-empty">{thread.state === "terminated" ? "Finished" : "Empty"}</p>}
                  <AnimatePresence mode="popLayout" initial={false}>
                    {thread.frames.map((frame, i) => (
                      <FrameCard
                        key={frame.id}
                        frame={frame}
                        current={thread.id === step.activeThread && i === thread.frames.length - 1}
                        step={step}
                        prev={prev}
                        level={level}
                        onSettle={onSettle}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </section>
          <section className="heap" aria-label="Heap">
            <h2 className="region-title">Heap</h2>
            {heap.length === 0 ? (
              <p className="heap-empty">No objects yet</p>
            ) : (
              <div className="heap-objects">
                <AnimatePresence mode="popLayout" initial={false}>
                  {heap.map((obj) => (
                    <ObjectCard
                      key={obj.id}
                      obj={obj}
                      step={step}
                      prev={prev}
                      level={level}
                      linked={linkedObjects.has(obj.id)}
                      onHover={setHoverObject}
                      onSettle={onSettle}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </section>
          <Arrows containerRef={memoryRef} stepKey={`${index}:${level}:${settled}`} emphasized={hoverObject} />
        </div>
        {explanation}
      </div>
    </div>
  );
}

function CodePanel({
  trace,
  step,
  highlightLine,
  onHoverLine,
}: {
  trace: Trace;
  step: Step;
  highlightLine: number | null;
  onHoverLine: (line: number | null) => void;
}) {
  const file = trace.source.find((f) => f.path === step.location.file) ?? trace.source[0]!;
  const filesByClass = useMemo(() => classFiles(trace), [trace]);
  const active = step.threads.find((t) => t.id === step.activeThread);
  const callSites = new Set(
    (active?.frames.slice(0, -1) ?? [])
      .filter((f) => filesByClass.get(f.className) === file.path)
      .map((f) => f.line)
      .filter((l) => l !== step.location.line),
  );
  // With several threads, mark the line each one is at (in this file).
  const multi = step.threads.length > 1;
  const threadsAt = new Map<number, string[]>();
  if (multi) {
    for (const t of step.threads) {
      const top = t.frames.at(-1);
      if (!top || filesByClass.get(top.className) !== file.path) continue;
      threadsAt.set(top.line, [...(threadsAt.get(top.line) ?? []), t.id]);
    }
  }
  const linesRef = useRef<HTMLOListElement>(null);
  // When the code panel scrolls (stacked layouts), keep the current line visible without moving the page.
  useLayoutEffect(() => {
    const list = linesRef.current;
    const current = list?.querySelector<HTMLElement>('[data-state="current"]');
    if (!list || !current || list.scrollHeight <= list.clientHeight) return;
    const top = current.offsetTop - list.offsetTop;
    if (top < list.scrollTop || top + current.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = top - list.clientHeight / 3;
    }
  }, [step, file.path]);

  return (
    <section className="code" aria-label={`Source: ${file.path}`}>
      <h2 className="region-title">{file.path}</h2>
      <ol className="code-lines" ref={linesRef} tabIndex={0} aria-label={`${file.path}, current line ${step.location.line}`} onMouseLeave={() => onHoverLine(null)}>
        {file.lines.map((text, i) => {
          const line = i + 1;
          const state =
            line === step.location.line ? "current" : callSites.has(line) ? "call-site" : line === highlightLine ? "linked" : undefined;
          return (
            <li
              key={line}
              className="code-line"
              data-state={state}
              aria-current={state === "current" ? "step" : undefined}
              onMouseEnter={() => onHoverLine(line)}
            >
              <span className="code-gutter" aria-hidden="true">
                {line}
              </span>
              <code>{stripMarkers(text) || " "}</code>
              {(threadsAt.get(line) ?? []).map((id) => (
                <span key={id} className="line-thread" data-active={id === step.activeThread || undefined}>
                  {threadName(step, id)}
                </span>
              ))}
              {state === "current" && step.subStep && (
                <span className="sub-step" title={`Part ${step.subStep.index + 1} of ${step.subStep.count} of this line`}>
                  {step.subStep.label}
                  <span className="sub-step-dots" aria-hidden="true">
                    {Array.from({ length: step.subStep.count }, (_, k) => (
                      <span key={k} data-done={k <= step.subStep!.index || undefined} />
                    ))}
                  </span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
      {step.console && (
        <div className="console">
          <h2 className="region-title">Output</h2>
          <pre>{step.console}</pre>
        </div>
      )}
    </section>
  );
}

const enter = { opacity: 0, y: -18 };
const shown = { opacity: 1, y: 0 };

function FrameCard({
  frame,
  current,
  step,
  prev,
  level,
  onSettle,
}: {
  frame: Frame;
  current: boolean;
  step: Step;
  prev: Step | undefined;
  level: DetailLevel;
  onSettle: () => void;
}) {
  const before = prev?.threads.flatMap((t) => t.frames).find((f) => f.id === frame.id);
  const locals = frame.locals.filter((l) => level === "jvm" || l.name !== "this");
  return (
    <motion.div
      layout
      className="frame"
      data-current={current || undefined}
      initial={enter}
      animate={shown}
      exit={enter}
      onAnimationComplete={onSettle}
      onLayoutAnimationComplete={onSettle}
    >
      <div className="frame-title">
        <span className="frame-method">{frameTitle(frame)}</span>
        {frame.method !== "<init>" && <span className="frame-class">{frame.className}</span>}
      </div>
      {locals.length > 0 && (
        <dl className="vars">
          {locals.map((v) => (
            <VarRow key={v.name} variable={v} step={step} level={level} previous={before?.locals.find((l) => l.name === v.name)} />
          ))}
        </dl>
      )}
    </motion.div>
  );
}

function ObjectCard({
  obj,
  step,
  prev,
  level,
  linked,
  onHover,
  onSettle,
}: {
  obj: HeapObject;
  step: Step;
  prev: Step | undefined;
  level: DetailLevel;
  linked: boolean;
  onHover: (id: string | null) => void;
  onSettle: () => void;
}) {
  const before = prev?.heap.find((o) => o.id === obj.id);
  return (
    <motion.div
      layout
      className="object"
      data-obj={obj.id}
      data-state={obj.state}
      data-internal={obj.internal || undefined}
      data-linked={linked || undefined}
      data-locked={obj.monitor?.owner ? true : undefined}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      onAnimationComplete={onSettle}
      onLayoutAnimationComplete={onSettle}
      onMouseEnter={() => onHover(obj.id)}
      onMouseLeave={() => onHover(null)}
    >
      <div className="object-title">
        <span className="object-type">{shortType(obj.type)}</span>
        {obj.state !== "live" && <span className="object-state">{obj.state === "eligible" ? "eligible for GC" : "collected"}</span>}
        {obj.internal && <span className="object-state">JDK internal</span>}
      </div>
      {obj.display && <div className="object-display">{obj.display}</div>}
      {obj.monitor && <MonitorBadges monitor={obj.monitor} step={step} />}
      {obj.fields && obj.fields.length > 0 && (
        <dl className="vars">
          {obj.fields.map((f) => (
            <VarRow key={f.name} variable={f} step={step} level={level} previous={before?.fields?.find((p) => p.name === f.name)} />
          ))}
        </dl>
      )}
      {obj.elements && (
        <ol className="cells" aria-label={`${obj.elements.length} elements`}>
          {obj.elements.length === 0 && <li className="cells-empty">empty</li>}
          {obj.elements.map((v, i) => (
            <li key={i} className="cell">
              <span className="cell-index">{i}</span>
              <SlotView value={slot(v, step, level)} changed={before?.elements?.[i] !== undefined && JSON.stringify(before.elements[i]) !== JSON.stringify(v)} />
            </li>
          ))}
        </ol>
      )}
    </motion.div>
  );
}

const threadStateLabel: Record<string, string> = {
  running: "running",
  runnable: "ready",
  blocked: "blocked",
  waiting: "waiting",
  terminated: "finished",
};

function threadName(step: Step, id: string): string {
  return step.threads.find((t) => t.id === id)?.name ?? id;
}

function listNames(names: string[]): string {
  return names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

/** Who holds this Object's lock, and who is waiting for it. */
function MonitorBadges({ monitor, step }: { monitor: NonNullable<HeapObject["monitor"]>; step: Step }) {
  return (
    <div className="monitor">
      {monitor.owner && (
        <span className="monitor-owner">
          Locked by <strong>{threadName(step, monitor.owner)}</strong>
          {monitor.entryCount > 1 && ` (held ${monitor.entryCount === 2 ? "twice" : `${monitor.entryCount} times`})`}
        </span>
      )}
      {monitor.blocked.length > 0 && (
        <span className="monitor-blocked">Waiting to lock: {listNames(monitor.blocked.map((id) => threadName(step, id)))}</span>
      )}
      {monitor.waiting.length > 0 && (
        <span className="monitor-waiting">Waiting on it: {listNames(monitor.waiting.map((id) => threadName(step, id)))}</span>
      )}
    </div>
  );
}

function VarRow({
  variable,
  step,
  level,
  previous,
}: {
  variable: Variable;
  step: Step;
  level: DetailLevel;
  previous: Variable | undefined;
}) {
  const changed = previous !== undefined && JSON.stringify(previous.value) !== JSON.stringify(variable.value);
  const isNew = previous === undefined;
  return (
    <div className="var" data-new={isNew || undefined}>
      <dt title={variable.type}>{variable.name}</dt>
      <dd>
        <SlotView value={slot(variable.value, step, level)} changed={changed} />
      </dd>
    </div>
  );
}

function SlotView({ value, changed }: { value: ReturnType<typeof slot>; changed: boolean }) {
  const content =
    value.kind === "text" ? (
      <span className="slot-text" data-muted={value.muted || undefined}>
        {value.text}
      </span>
    ) : value.kind === "hidden" ? (
      <span className="slot-hidden" title={value.title}>
        <span aria-hidden="true">⋯</span>
        <span className="sr-only">{value.title}</span>
      </span>
    ) : (
      <span className="slot-ref" data-ref={value.to}>
        <span className="sr-only">Reference</span>
      </span>
    );
  // Re-keying on change replays the CSS flash, so the Learner sees exactly which slot this Step wrote.
  return (
    <span key={changed ? JSON.stringify(value) : "same"} className="slot" data-changed={changed || undefined}>
      {content}
    </span>
  );
}

interface ArrowPath {
  id: string;
  to: string;
  d: string;
}

/**
 * Draws References as curves from each slot's dot to its Object. Positions come from the DOM, re-measured
 * every frame while layout animations settle, so arrows follow Frames and Objects as they move.
 */
function Arrows({
  containerRef,
  stepKey,
  emphasized,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  stepKey: string;
  emphasized: string | null;
}) {
  const [paths, setPaths] = useState<ArrowPath[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const measure = (): string => {
      const box = container.getBoundingClientRect();
      const next: ArrowPath[] = [];
      container.querySelectorAll<HTMLElement>("[data-ref]").forEach((src, n) => {
        const target = container.querySelector<HTMLElement>(`[data-obj="${src.dataset.ref}"]`);
        if (!target) return;
        const s = src.getBoundingClientRect();
        const t = target.getBoundingClientRect();
        const sx = s.left + s.width / 2 - box.left;
        const sy = s.top + s.height / 2 - box.top;
        const toRight = t.left - box.left >= sx;
        const ex = (toRight ? t.left : t.right) - box.left + (toRight ? -3 : 3);
        const ey = Math.min(Math.max(sy, t.top - box.top + 14), t.bottom - box.top - 14);
        const bend = Math.max(36, Math.abs(ex - sx) / 2);
        const c1 = sx + (toRight ? bend : -bend);
        const c2 = ex + (toRight ? -bend : bend);
        next.push({ id: `${n}`, to: src.dataset.ref!, d: `M${sx},${sy} C${c1},${sy} ${c2},${ey} ${ex},${ey}` });
      });
      setPaths(next);
      setSize({ w: box.width, h: box.height });
      return next.map((p) => p.d).join("|") + `${box.width}x${box.height}`;
    };

    // Follow layout animations until positions hold still for a few frames (capped, in case something loops).
    let frame = 0;
    let last = "";
    let stableFrames = 0;
    const giveUpAt = performance.now() + 3000;
    const loop = () => {
      const now = measure();
      stableFrames = now === last ? stableFrames + 1 : 0;
      last = now;
      if (stableFrames < 8 && performance.now() < giveUpAt) frame = requestAnimationFrame(loop);
    };
    loop();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [containerRef, stepKey]);

  return (
    <svg className="arrows" width={size.w} height={size.h} aria-hidden="true">
      <defs>
        <marker id="arrowhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="var(--ink)" />
        </marker>
      </defs>
      {paths.map((p) => (
        <path key={p.id} d={p.d} className="arrow" data-emphasized={p.to === emphasized || undefined} markerEnd="url(#arrowhead)" />
      ))}
    </svg>
  );
}
