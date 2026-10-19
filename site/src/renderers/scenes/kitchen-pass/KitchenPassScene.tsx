import type { ReactNode } from "react";
import type { Trace } from "@java-visuals/trace-schema";
import { Badge, Person } from "../kit/Person";
import { SceneLayout } from "../kit/SceneLayout";
import { fieldText, markersHere, objectOfType, stateWord, threadById } from "../kit/trace";

/**
 * wait/notify as a kitchen pass: the waiter waits for a dish (wait), the chef puts it down and rings the bell
 * (notifyAll). With virtual threads it adds the carrier threads as desks, showing who's sitting at one.
 */
export default function KitchenPassScene({ trace, index, explanation }: { trace: Trace; index: number; explanation: ReactNode }) {
  const step = trace.steps[index]!;
  const pass = objectOfType(step, "Pass");
  const dish = fieldText(step, pass, "dish");
  const atCounter = pass?.monitor?.owner ?? null;
  const markers = markersHere(trace, step);
  const waiter = threadById(step, "Waiter");
  const chef = threadById(step, "Chef");
  const virtual = trace.steps.some((s) => s.threads.some((t) => t.kind === "virtual"));
  const platformWithDesks = !virtual && trace.lessonId.endsWith("virtual-threads");
  const ringing = step.activeThread === "Chef" && markers.includes("notify");
  const height = virtual || platformWithDesks ? 640 : 560;

  const spot = (id: "Waiter" | "Chef", t = threadById(step, id)) => {
    const home = id === "Chef" ? 120 : 600;
    if (!t) return { x: home, y: 380 };
    if (atCounter === id) return { x: id === "Chef" ? 300 : 420, y: 330 };
    if (t.state === "waiting") return { x: 600, y: 468 };
    if (t.state === "blocked") return { x: 520, y: 340 };
    return { x: home, y: 380 };
  };

  return (
    <SceneLayout trace={trace} index={index} title="A waiter waiting at the kitchen pass for the chef's dish" explanation={explanation}>
      <svg viewBox={`0 0 720 ${height}`} role="img" aria-label={`The pass ${dish && dish !== "nothing" ? `has ${dish} on it` : "is empty"}. ${atCounter ? `${atCounter} is at the counter.` : ""}`}>
        <text className="scene-label" x={120} y={60} textAnchor="middle">Kitchen</text>
        <text className="scene-label" x={600} y={60} textAnchor="middle">Dining room</text>
        {/* The pass: the shared counter between kitchen and dining room */}
        <rect className="scene-thing" x={250} y={120} width={220} height={44} rx={6} />
        <text className="scene-label" x={360} y={110} textAnchor="middle">The pass</text>
        <text className="scene-person-role" x={360} y={188} textAnchor="middle">
          {atCounter ? `in use by ${atCounter}` : "free"}
        </text>
        {dish && dish !== "nothing" && (
          <g transform="translate(360 136)">
            <path d="M -26 0 Q 0 26 26 0 Z" fill="var(--surface)" stroke="var(--ink)" strokeWidth={2} />
            <text className="scene-person-role" x={0} y={-6} textAnchor="middle">{dish}</text>
          </g>
        )}
        {/* The bell the chef rings with notifyAll() */}
        <g transform="translate(490 100)">
          <path d="M -12 10 Q -12 -10 0 -12 Q 12 -10 12 10 Z" fill={ringing ? "var(--heap)" : "var(--surface)"} stroke="var(--ink)" strokeWidth={2} />
          {ringing && <Badge text="Ding!" x={44} y={-6} />}
        </g>
        <rect x={555} y={482} width={90} height={14} rx={4} fill="var(--paper)" stroke="var(--rule)" strokeWidth={2} />
        <text className="scene-person-role" x={652} y={494}>bench</text>

        {threadById(step, "main") && (
          <Person
            name="Manager"
            role="main thread"
            x={360}
            y={450}
            tone="main"
            active={step.activeThread === "main"}
            badge={step.activeThread === "main" ? undefined : main(step)}
            bubble={step.activeThread === "main" && markers.includes("join") ? { text: "Wait for both", kind: "say" } : undefined}
          />
        )}
        {chef && (
          <Person
            name="Chef"
            role={chef.kind === "virtual" ? "virtual thread" : "thread"}
            {...spot("Chef", chef)}
            tone="b"
            active={step.activeThread === "Chef"}
            faded={chef.state === "terminated"}
            badge={chef.state === "terminated" ? "done" : stateWord(chef)}
            bubble={step.activeThread === "Chef" ? chefBubble(markers) : undefined}
          />
        )}
        {waiter && (
          <Person
            name="Waiter"
            role={waiter.kind === "virtual" ? "virtual thread" : "thread"}
            {...spot("Waiter", waiter)}
            tone="a"
            active={step.activeThread === "Waiter"}
            faded={waiter.state === "terminated"}
            badge={waiter.state === "terminated" ? "done" : waiter.state === "waiting" ? "asleep until the bell" : waiter.state === "blocked" ? "woken, wants the pass" : stateWord(waiter)}
            bubble={waiterBubble(step.activeThread === "Waiter", waiter.state, markers, dish)}
          />
        )}

        {virtual && <Desks threads={[chef, waiter]} y={610} />}
        {platformWithDesks && <OwnThreads threads={[chef, waiter]} y={610} />}
      </svg>
    </SceneLayout>
  );
}

type T = ReturnType<typeof threadById>;

function main(step: Trace["steps"][number]) {
  return step.threads.filter((t) => t.id !== "main").length === 0 ? undefined : "waiting for both";
}

/** Carrier threads as two desks: a virtual thread sits at one only while it's mounted. */
function Desks({ threads, y }: { threads: T[]; y: number }) {
  const seated = threads.filter((t) => t?.mounted === true).map((t) => t!.name);
  const away = threads.filter((t) => t?.mounted === false).map((t) => t!.name);
  return (
    <g>
      <text className="scene-label" x={20} y={y - 34}>Carrier threads (shared desks)</text>
      {[0, 1].map((i) => (
        <g key={i} transform={`translate(${70 + i * 170} ${y - 22})`}>
          <rect className="scene-surface" x={-60} y={0} width={140} height={30} rx={4} />
          <text className="scene-person-role" x={10} y={20} textAnchor="middle">{seated[i] ? `${seated[i]} is here` : "free"}</text>
        </g>
      ))}
      {away.length > 0 && <Badge text={`Not using a desk: ${away.join(", ")}`} x={560} y={y - 7} />}
    </g>
  );
}

/** Platform threads: each owns an operating-system thread for life, working or not. */
function OwnThreads({ threads, y }: { threads: T[]; y: number }) {
  return (
    <g>
      <text className="scene-label" x={20} y={y - 34}>Operating-system threads (one each, for life)</text>
      {threads.filter(Boolean).map((t, i) => (
        <g key={t!.id} transform={`translate(${70 + i * 170} ${y - 22})`}>
          <rect className="scene-surface" x={-60} y={0} width={140} height={30} rx={4} />
          <text className="scene-person-role" x={10} y={20} textAnchor="middle">
            {t!.state === "terminated" ? "released" : `held by ${t!.name}`}
          </text>
        </g>
      ))}
    </g>
  );
}

function chefBubble(markers: string[]): { text: string; kind: "say" } | undefined {
  if (markers.includes("put")) return { text: "Soup's nearly ready", kind: "say" };
  if (markers.includes("put-lock")) return { text: "To the pass", kind: "say" };
  if (markers.includes("deposit")) return { text: "Soup goes on the pass", kind: "say" };
  if (markers.includes("notify")) return { text: "Ring the bell", kind: "say" };
  return undefined;
}

function waiterBubble(active: boolean, state: string, markers: string[], dish: string): { text: string; kind?: "think" | "say" | "wait" } | undefined {
  if (state === "waiting") return { text: "Zzz... waiting for the bell", kind: "wait" };
  if (state === "blocked") return { text: "Bell! Waiting for the pass", kind: "wait" };
  if (!active) return undefined;
  if (markers.includes("take")) return { text: "Go and get a dish", kind: "say" };
  if (markers.includes("take-lock")) return { text: "To the pass", kind: "say" };
  if (markers.includes("check")) return { text: dish && dish !== "nothing" ? `There's ${dish}!` : "Anything there?", kind: "think" };
  if (markers.includes("wait")) return { text: "Nothing yet. I'll wait", kind: "say" };
  if (markers.includes("collect")) return { text: `Take the ${dish}`, kind: "say" };
  if (markers.includes("got")) return { text: "Serving the soup", kind: "say" };
  return undefined;
}
