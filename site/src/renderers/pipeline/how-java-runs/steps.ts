import type { PipelineStep } from "../types";

export type Stage =
  | "source"
  | "javac"
  | "launch"
  | "load"
  | "verify"
  | "prepare"
  | "initialize"
  | "run"
  | "resolve"
  | "interpret"
  | "jit"
  | "exit";

export interface HowJavaRunsStep extends PipelineStep {
  stage: Stage;
  /** Interpreter Steps: the instruction just executed in `square`, and the frame state after it. */
  interpreter?: { offset: number; locals: Record<string, string>; operands: string[]; returned?: string };
}

/**
 * The Steps of "How Java runs your code". Facts here were checked on JDK 25: the bytecode comes from javap at
 * build time, the class-loader chain is app → platform → bootstrap, and the JIT tier thresholds are
 * Tier3InvocationThreshold=200 and Tier4InvocationThreshold=5000 (java -XX:+PrintFlagsFinal).
 */
export const steps: HowJavaRunsStep[] = [
  { id: "write", stage: "source", title: "You write Program.java" },
  { id: "compile", stage: "javac", title: "javac compiles it to bytecode" },
  { id: "launch", stage: "launch", title: "java Program starts a JVM" },
  { id: "load", stage: "load", title: "A class loader finds Program.class" },
  { id: "verify", stage: "verify", title: "The verifier checks the bytecode" },
  { id: "prepare", stage: "prepare", title: "Static fields get default values" },
  { id: "initialize", stage: "initialize", title: "The static initializer runs" },
  { id: "run-main", stage: "run", title: "main starts on the main thread" },
  { id: "resolve", stage: "resolve", title: "First use resolves a symbolic reference" },
  {
    id: "interpret-load",
    stage: "interpret",
    title: "iload_0 pushes n onto the operand stack",
    interpreter: { offset: 0, locals: { n: "3" }, operands: ["3"] },
  },
  {
    id: "interpret-load-again",
    stage: "interpret",
    title: "iload_0 pushes n again",
    interpreter: { offset: 1, locals: { n: "3" }, operands: ["3", "3"] },
  },
  {
    id: "interpret-multiply",
    stage: "interpret",
    title: "imul pops two values and pushes their product",
    interpreter: { offset: 2, locals: { n: "3" }, operands: ["9"] },
  },
  {
    id: "interpret-return",
    stage: "interpret",
    title: "ireturn hands the top value back to main",
    interpreter: { offset: 3, locals: { n: "3" }, operands: [], returned: "9" },
  },
  { id: "jit", stage: "jit", title: "Hot code gets compiled to machine code" },
  { id: "exit", stage: "exit", title: "main returns and the JVM exits" },
];

export const TIER3_INVOCATIONS = 200;
export const TIER4_INVOCATIONS = 5000;
