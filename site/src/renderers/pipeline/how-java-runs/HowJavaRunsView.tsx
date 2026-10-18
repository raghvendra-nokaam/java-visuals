import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { stripMarkers } from "../../execution/model";
import { findMethod, parseJavap, type BytecodeMethod } from "../javap";
import type { PipelineData } from "../types";
import { TIER3_INVOCATIONS, TIER4_INVOCATIONS, type HowJavaRunsStep, type Stage } from "./steps";
import "./how-java-runs.css";

interface Props {
  data: PipelineData<HowJavaRunsStep>;
  index: number;
  explanation: ReactNode;
  onSeek: (index: number) => void;
}

/** Where each Stage lights up on the pipeline diagram. */
const nodeFor: Record<Stage, string> = {
  source: "java-file",
  javac: "javac",
  launch: "jvm",
  load: "load",
  verify: "verify",
  prepare: "prepare",
  initialize: "initialize",
  resolve: "resolve",
  run: "stacks",
  interpret: "interpreter",
  jit: "jit",
  exit: "jvm",
};

export default function HowJavaRunsView({ data, index, explanation, onSeek }: Props) {
  const step = data.steps[index]!;
  const methods = parseJavap(data.bytecode ?? "");
  const current = nodeFor[step.stage];
  const reached = new Set(data.steps.slice(0, index + 1).map((s) => nodeFor[s.stage]));
  if (index >= 1) reached.add("class-file");
  const state = (node: string) => (node === current ? "current" : reached.has(node) ? "past" : "future");
  const jump = (stage: Stage) => {
    const target = data.steps.findIndex((s) => s.stage === stage);
    if (target >= 0) onSeek(target);
  };

  return (
    <div className="hjr">
      <figure className="hjr-diagram" aria-label="The path from source file to running code">
        <Node id="java-file" state={state("java-file")} onClick={() => jump("source")} kind="file">
          Program.java
        </Node>
        <Arrow label="javac" state={state("javac")} onClick={() => jump("javac")} />
        <Node id="class-file" state={state("class-file")} onClick={() => jump("javac")} kind="file">
          Program.class
        </Node>
        <Arrow label="java" state={state("jvm")} onClick={() => jump("launch")} />
        <div className="hjr-jvm" data-state={state("jvm")}>
          <span className="hjr-jvm-label">JVM</span>
          <div className="hjr-group">
            <span className="hjr-group-label">Class loading</span>
            <div className="hjr-row">
              <Node id="load" state={state("load")} onClick={() => jump("load")}>Load</Node>
              <Node id="verify" state={state("verify")} onClick={() => jump("verify")}>Verify</Node>
              <Node id="prepare" state={state("prepare")} onClick={() => jump("prepare")}>Prepare</Node>
              <Node id="initialize" state={state("initialize")} onClick={() => jump("initialize")}>Initialize</Node>
            </div>
          </div>
          <div className="hjr-group">
            <span className="hjr-group-label">Running</span>
            <div className="hjr-row">
              <Node id="stacks" state={state("stacks")} onClick={() => jump("run")}>Thread stack</Node>
              <Node id="resolve" state={state("resolve")} onClick={() => jump("resolve")}>Resolve</Node>
              <Node id="interpreter" state={state("interpreter")} onClick={() => jump("interpret")}>Interpreter</Node>
              <Node id="jit" state={state("jit")} onClick={() => jump("jit")}>JIT compiler</Node>
            </div>
          </div>
        </div>
      </figure>

      <div className="hjr-body">
        {/* Keyed by stage, so the interpreter's Steps share one panel and its operand stack animates between them. */}
        <motion.section
          key={step.stage}
          className="hjr-detail"
          aria-label={step.title}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <h2 className="hjr-title">{step.title}</h2>
          <Detail step={step} data={data} methods={methods} />
        </motion.section>
        <div className="hjr-side">{explanation}</div>
      </div>
    </div>
  );
}

function Detail({ step, data, methods }: { step: HowJavaRunsStep; data: PipelineData<HowJavaRunsStep>; methods: BytecodeMethod[] }) {
  switch (step.stage) {
    case "source":
      return <Listing title={data.program?.path ?? "Program.java"} lines={(data.program?.lines ?? []).map(stripMarkers)} />;
    case "javac":
      return (
        <>
          <ol className="hjr-phases" aria-label="What javac does">
            <li>Parse the source</li>
            <li>Check types and names</li>
            <li>Generate bytecode</li>
          </ol>
          <div className="hjr-methods">
            {["main(", "square(", "static {}"].map((name) => (
              <Bytecode key={name} method={findMethod(methods, name)} />
            ))}
          </div>
        </>
      );
    case "launch":
      return (
        <ul className="hjr-facts">
          <li>The operating system starts a JVM process</li>
          <li>The JVM reserves memory for the Heap and for class data (Metaspace)</li>
          <li>Core classes such as <code>java.lang.Object</code> load from a shared archive, already parsed</li>
          <li>The <code>main</code> thread starts, with an empty Stack</li>
        </ul>
      );
    case "load":
      return (
        <ol className="hjr-loaders" aria-label="Class loaders, child first">
          <li data-found>
            <strong>Application class loader</strong>
            <span>Searches the class path</span>
            <code>Program.class: found</code>
          </li>
          <li>
            <strong>Platform class loader</strong>
            <span>JDK modules like java.sql</span>
            <code>asked first: not here</code>
          </li>
          <li>
            <strong>Bootstrap class loader</strong>
            <span>Core classes in java.base, such as String</span>
            <code>asked first: not here</code>
          </li>
        </ol>
      );
    case "verify":
      return (
        <>
          <ul className="hjr-checks">
            <li>Every instruction gets operands of the type it expects</li>
            <li>Jumps land on the start of a real instruction</li>
            <li>The operand stack never underflows or grows past its declared size</li>
            <li>Methods and fields are used with the right types</li>
          </ul>
          <Bytecode method={findMethod(methods, "square(")} />
        </>
      );
    case "prepare":
      return <Statics value="0" note="default value, set during preparation" />;
    case "initialize":
      return (
        <>
          <Bytecode method={findMethod(methods, "static {}")} />
          <Statics value="3" note="set by the static initializer" />
        </>
      );
    case "run":
      return (
        <div className="hjr-stack" aria-label="main thread's Stack">
          <div className="hjr-frame">
            <strong>main</strong>
            <span>args, i = 1</span>
          </div>
        </div>
      );
    case "resolve":
      return (
        <div className="hjr-resolve">
          <code className="hjr-symbolic">invokestatic #19 // Method square:(I)I</code>
          <span className="hjr-resolve-arrow" aria-hidden="true" />
          <span>
            A direct reference to <code>Program.square</code>, kept for every later call
          </span>
        </div>
      );
    case "interpret": {
      const s = step.interpreter!;
      return (
        <div className="hjr-interpreter">
          <Bytecode method={findMethod(methods, "square(")} current={s.offset} />
          <div className="hjr-frame-state">
            <div>
              <span className="hjr-label">Local variables</span>
              <dl className="hjr-locals">
                {Object.entries(s.locals).map(([name, value]) => (
                  <div key={name}>
                    <dt>{name}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div>
              <span className="hjr-label">Operand stack</span>
              <ol className="hjr-operands" aria-label={`Operand stack: ${s.operands.join(", ") || "empty"}`}>
                <AnimatePresence initial={false}>
                  {s.operands.map((v, i) => (
                    <motion.li key={`${i}:${v}`} layout initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
                      {v}
                    </motion.li>
                  ))}
                </AnimatePresence>
                {s.operands.length === 0 && <li className="hjr-empty">empty</li>}
              </ol>
            </div>
            {s.returned && (
              <p className="hjr-returned">
                Returned <strong>{s.returned}</strong> to <code>main</code>
              </p>
            )}
          </div>
        </div>
      );
    }
    case "jit":
      return <JitLadder />;
    case "exit":
      return (
        <div className="hjr-console">
          <span className="hjr-label">Output</span>
          <pre>{"1\n4\n9"}</pre>
        </div>
      );
  }
}

function JitLadder() {
  const max = TIER4_INVOCATIONS * 1.2;
  const pct = (n: number) => `${(n / max) * 100}%`;
  return (
    <div className="hjr-jit">
      <div className="hjr-jit-bar" role="img" aria-label={`Calls to square: interpreted until ${TIER3_INVOCATIONS}, then C1 until ${TIER4_INVOCATIONS}, then C2`}>
        <span className="hjr-tier" data-tier="0" style={{ width: pct(TIER3_INVOCATIONS) }} />
        <span className="hjr-tier" data-tier="3" style={{ width: pct(TIER4_INVOCATIONS - TIER3_INVOCATIONS) }} />
        <span className="hjr-tier" data-tier="4" style={{ flex: 1 }} />
        <span className="hjr-jit-you" style={{ left: pct(3) }} />
      </div>
      <ul className="hjr-jit-legend">
        <li data-tier="0">Interpreted, while the JVM counts calls</li>
        <li data-tier="3">After about {TIER3_INVOCATIONS} calls: compiled quickly by C1</li>
        <li data-tier="4">After about {TIER4_INVOCATIONS.toLocaleString("en-US")} calls: optimized by C2</li>
        <li data-tier="you">This program calls square 3 times, so it never leaves the interpreter</li>
      </ul>
    </div>
  );
}

function Node({ id, state, onClick, kind, children }: { id: string; state: string; onClick: () => void; kind?: "file"; children: ReactNode }) {
  return (
    <button type="button" className="hjr-node" data-node={id} data-kind={kind} data-state={state} aria-current={state === "current" ? "step" : undefined} onClick={onClick}>
      {children}
    </button>
  );
}

function Arrow({ label, state, onClick }: { label: string; state: string; onClick: () => void }) {
  return (
    <button type="button" className="hjr-arrow" data-state={state} onClick={onClick} aria-label={`${label} step`}>
      <code>{label}</code>
      <span aria-hidden="true" className="hjr-arrow-line" />
    </button>
  );
}

function Listing({ title, lines }: { title: string; lines: string[] }) {
  return (
    <figure className="hjr-listing">
      <figcaption>{title}</figcaption>
      {/* Focusable so keyboard users can scroll long lines. */}
      <pre tabIndex={0} aria-label={title}>
        <code>{lines.join("\n").trimEnd()}</code>
      </pre>
    </figure>
  );
}

function Bytecode({ method, current }: { method: BytecodeMethod; current?: number }) {
  return (
    <figure className="hjr-bytecode">
      <figcaption>
        <code>{method.header}</code>
      </figcaption>
      <ol tabIndex={0} aria-label={`Bytecode for ${method.header}`}>
        {method.instructions.map((ins) => (
          <li key={ins.offset} data-current={ins.offset === current || undefined} aria-current={ins.offset === current ? "step" : undefined}>
            <span className="hjr-offset">{ins.offset}</span>
            <code>{ins.text}</code>
          </li>
        ))}
      </ol>
    </figure>
  );
}

function Statics({ value, note }: { value: string; note: string }) {
  return (
    <table className="hjr-statics">
      <caption>Program's static fields, in Metaspace</caption>
      <tbody>
        <tr>
          <th scope="row">
            <code>int limit</code>
          </th>
          <td>
            <motion.span key={value} className="hjr-value" initial={{ scale: 1.4 }} animate={{ scale: 1 }}>
              {value}
            </motion.span>
          </td>
          <td className="hjr-note">{note}</td>
        </tr>
      </tbody>
    </table>
  );
}
