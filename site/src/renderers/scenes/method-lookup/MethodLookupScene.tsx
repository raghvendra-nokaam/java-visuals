import type { ReactNode } from "react";
import { motion } from "motion/react";
import type { Frame, Trace } from "@java-visuals/trace-schema";
import { shortType } from "../../execution/model";
import { SceneLayout } from "../kit/SceneLayout";
import { lookupPath, parseClasses, type ClassInfo } from "./classes";
import "./method-lookup.css";

/**
 * Dynamic dispatch made visible: the variable (with its declared type), the object it refers to (with its
 * real class), and the class hierarchy. When a method runs, the search for it climbs from the object's class
 * up through its parents, and the class that has the method lights up.
 */
export default function MethodLookupScene({ trace, index, explanation }: { trace: Trace; index: number; explanation: ReactNode }) {
  const step = trace.steps[index]!;
  const classes = parseClasses(trace);
  const known = new Set(classes.map((c) => c.name));
  const frames = step.threads.find((t) => t.id === step.activeThread)?.frames ?? [];
  const top = frames.at(-1);
  const heapType = (id: string) => step.heap.find((o) => o.id === id)?.type;

  // A method of one of the lesson's classes is running: show how Java found it.
  const running = top && known.has(top.className) && top.method !== "<init>" ? top : undefined;
  const receiverId = running ? refOf(running, "this") : undefined;
  const runtimeClass = receiverId ? heapType(receiverId) : undefined;
  const caller = running ? frames.at(-2) : undefined;
  const callerVar = caller && receiverId ? variableFor(caller, receiverId) : undefined;
  const path = running && runtimeClass ? lookupPath(classes, runtimeClass, running.method) : [];

  // Otherwise, show the variable the lesson is about to call a method on.
  const mainFrame = frames[0];
  const subject = callerVar ?? (mainFrame ? subjectOf(mainFrame, (id) => known.has(heapType(id) ?? "")) : undefined);
  const objectClass = runtimeClass ?? (subject?.value.kind === "ref" ? heapType(subject.value.id) : undefined);
  const building = top?.method === "<init>" ? top.className : undefined;
  const printed = step.console.trim().split("\n").filter(Boolean);

  return (
    <SceneLayout trace={trace} index={index} title="Java looking up which version of a method to run" explanation={explanation}>
      <div className="ml">
        <p className="sr-only">{ariaFor(subject?.name, subject?.type, objectClass, running?.method, path)}</p>
        <div className="ml-left">
          <section className="ml-panel">
            <h2 className="ml-heading">The variable</h2>
            {subject ? (
              <p className="ml-var">
                <span className="ml-type">{shortType(subject.type)}</span> <span className="ml-name">{subject.name}</span>
              </p>
            ) : (
              <p className="ml-muted">{building ? `Building a ${building}…` : "Nothing yet"}</p>
            )}
            {subject && <p className="ml-note">Its type decides which methods you may call.</p>}
          </section>
          <motion.div className="ml-arrow" aria-hidden="true" animate={{ opacity: subject ? 1 : 0.2 }}>
            refers to ↓
          </motion.div>
          <section className="ml-panel" data-kind="object">
            <h2 className="ml-heading">The object</h2>
            {objectClass ? (
              <motion.p key={objectClass} className="ml-object" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                a <strong>{objectClass}</strong>
              </motion.p>
            ) : (
              <p className="ml-muted">—</p>
            )}
            {objectClass && <p className="ml-note">Its class decides which version runs.</p>}
          </section>
          {running && subject && (
            <p className="ml-call">
              <code>
                {subject.name}.{running.method}()
              </code>
            </p>
          )}
          {printed.length > 0 && (
            <section className="ml-panel" data-kind="console">
              <h2 className="ml-heading">Printed</h2>
              <pre>{printed.join("\n")}</pre>
            </section>
          )}
        </div>
        <ClassTree classes={classes} objectClass={objectClass} method={running?.method} path={path} />
      </div>
    </SceneLayout>
  );
}

function ClassTree({ classes, objectClass, method, path }: { classes: ClassInfo[]; objectClass?: string; method?: string; path: string[] }) {
  const roots = classes.filter((c) => !c.parent || !classes.some((k) => k.name === c.parent));
  const children = (name: string) => classes.filter((c) => c.parent === name);
  const found = path.at(-1);

  const box = (c: ClassInfo) => {
    const step = path.indexOf(c.name);
    const state = step < 0 ? undefined : c.name === found ? "found" : "searched";
    return (
      <motion.div
        key={`${c.name}:${method}:${path.join()}`}
        className="ml-class"
        data-state={state}
        data-object={c.name === objectClass || undefined}
        initial={state ? { scale: 1 } : false}
        animate={state ? { scale: [1, 1.06, 1] } : { scale: 1 }}
        transition={{ delay: Math.max(step, 0) * 0.45, duration: 0.4 }}
      >
        {c.name === objectClass && <span className="ml-tag">the object's class{method ? ": search starts here" : ""}</span>}
        <span className="ml-class-name">
          {c.abstract && <span className="ml-abstract">abstract </span>}
          class {c.name}
        </span>
        <ul className="ml-methods">
          {c.methods.length === 0 && <li className="ml-muted">(no methods of its own)</li>}
          {c.methods.map((m) => (
            <li key={m.name} data-hit={(c.name === found && m.name === method) || undefined} data-abstract={m.abstract || undefined}>
              {m.name}(){m.abstract && " — abstract, no body"}
            </li>
          ))}
        </ul>
        {state === "searched" && <span className="ml-miss">no {method}() here, go up ↑</span>}
        {state === "found" && <span className="ml-hit">runs this {method}()</span>}
      </motion.div>
    );
  };

  return (
    <section className="ml-tree" aria-label="Class hierarchy">
      <h2 className="ml-heading">The classes</h2>
      {roots.map((r) => (
        <div key={r.name} className="ml-family">
          {box(r)}
          <div className="ml-children">{children(r.name).map(box)}</div>
        </div>
      ))}
    </section>
  );
}

type Local = Frame["locals"][number];

function refOf(frame: Frame, name: string): string | undefined {
  const v = frame.locals.find((l) => l.name === name)?.value;
  return v?.kind === "ref" ? v.id : undefined;
}

/** The variable in `frame` holding object `id`, preferring a named one over `this`. */
function variableFor(frame: Frame, id: string): Local | undefined {
  const holders = frame.locals.filter((l) => l.value.kind === "ref" && l.value.id === id);
  return holders.find((l) => l.name !== "this") ?? holders[0];
}

/** The latest local in `frame` that refers to one of the lesson's objects (the loop variable, here). */
function subjectOf(frame: Frame, isLessonObject: (id: string) => boolean): Local | undefined {
  return frame.locals.filter((l) => l.value.kind === "ref" && isLessonObject(l.value.id)).at(-1);
}

function ariaFor(name?: string, type?: string, objectClass?: string, method?: string, path: string[] = []): string {
  if (!name || !objectClass) return "No object in play yet.";
  const base = `${shortType(type ?? "")} variable ${name} refers to a ${objectClass}.`;
  if (!method || path.length === 0) return base;
  return `${base} Looking up ${method}(): searched ${path.join(", then ")}; runs ${path.at(-1)}'s version.`;
}
