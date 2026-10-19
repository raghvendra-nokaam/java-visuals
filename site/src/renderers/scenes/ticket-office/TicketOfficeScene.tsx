import type { ReactNode } from "react";
import type { Trace } from "@java-visuals/trace-schema";
import { Badge, Person } from "../kit/Person";
import { SceneLayout } from "../kit/SceneLayout";
import { fieldText, markersHere, objectOfType, readModifyWrite, stateWord, threadById } from "../kit/trace";

/**
 * The lost update as a ticket office: agents A and B each sell one ticket and add it to the shared tally
 * (TicketOffice.sold). Each agent's thought bubble shows the number it read and is holding in its head,
 * which is exactly the stale value that makes an update go missing.
 */
export default function TicketOfficeScene({ trace, index, explanation }: { trace: Trace; index: number; explanation: ReactNode }) {
  const step = trace.steps[index]!;
  const office = objectOfType(step, "TicketOffice");
  const tally = fieldText(step, office, "sold") || "0";
  const owner = office?.monitor?.owner;
  const hasLock = trace.source.some((f) => f.lines.some((l) => l.includes("synchronized")));
  const markers = markersHere(trace, step);
  const agents = (["A", "B"] as const).map((id) => ({ id, thread: threadById(step, id), rmw: readModifyWrite(trace, index, id) }));
  const handedOut = agents.reduce((n, a) => n + a.rmw.writes, 0);
  const finished = agents.every((a) => a.thread?.state === "terminated");
  const main = threadById(step, "main");
  const last = index === trace.steps.length - 1;

  return (
    <SceneLayout trace={trace} index={index} title="Two ticket agents updating one shared tally of tickets sold" explanation={explanation}>
      <svg viewBox="0 0 720 545" role="img" aria-label={`Tally board says ${tally}. ${agents.map((a) => `Agent ${a.id} is ${stateWord(a.thread)}`).join(". ")}.`}>
        {/* The shared tally board: TicketOffice.sold */}
        <rect className="scene-thing" x={250} y={24} width={220} height={130} rx={12} />
        <text className="scene-label" x={360} y={54} textAnchor="middle">
          Tickets sold (tally)
        </text>
        <text key={tally} className="scene-big-number scene-flash" x={360} y={118} textAnchor="middle">
          {tally}
        </text>
        <text className="scene-person-role" x={360} y={144} textAnchor="middle">
          office.sold
        </text>
        {hasLock && (
          <g transform="translate(470 40)">
            {owner ? <Badge text={`Lock held by ${owner}`} y={0} x={64} /> : <Badge text="Lock is free" y={0} x={50} />}
          </g>
        )}

        {/* Booths where each agent sells to a customer */}
        {agents.map((a, i) => (
          <g key={a.id}>
            <rect className="scene-surface" x={i === 0 ? 70 : 490} y={486} width={160} height={34} rx={6} />
            <text className="scene-label" x={i === 0 ? 150 : 570} y={509} textAnchor="middle">
              Booth {a.id}
            </text>
          </g>
        ))}
        <text className="scene-label" x={360} y={540} textAnchor="middle">
          Tickets handed to customers: {handedOut}
        </text>

        {main && (
          <Person
            name="Manager"
            role="main thread"
            x={620}
            y={300}
            tone="main"
            active={step.activeThread === "main"}
            faded={main.state === "terminated"}
            badge={step.activeThread === "main" ? undefined : main.frames.length === 0 ? "done" : "waiting for agents"}
            bubble={step.activeThread === "main" ? managerBubble(markers, tally) : undefined}
          />
        )}

        {agents.map((a, i) => {
          if (!a.thread) return null;
          const active = step.activeThread === a.id;
          const midUpdate = a.rmw.stage === "about-to-read" || a.rmw.stage === "holding" || a.rmw.stage === "about-to-write";
          const blocked = a.thread.state === "blocked";
          const atBoard = midUpdate || blocked || (active && (markers.includes("record") || markers.includes("lock")));
          const x = blocked ? (i === 0 ? 205 : 515) : atBoard ? (i === 0 ? 300 : 420) : i === 0 ? 150 : 570;
          const y = atBoard ? 330 : 420;
          const done = a.thread.state === "terminated";
          return (
            <Person
              key={a.id}
              name={`Agent ${a.id}`}
              role={`thread ${a.id}`}
              x={x}
              y={y}
              tone={i === 0 ? "a" : "b"}
              active={active}
              faded={done}
              badge={done ? `${a.rmw.writes} ticket sold` : stateWord(a.thread)}
              bubble={bubbleFor(step.subStep?.label, active, blocked, a.rmw, markers)}
            >
              {owner === a.id && <Key x={26} y={-20} />}
            </Person>
          );
        })}

        {last && finished && (
          <g className="scene-banner" data-tone={Number(tally) === handedOut ? "good" : "bad"} transform="translate(360 200)">
            <rect x={-250} y={-20} width={500} height={34} rx={8} />
            <text x={0} y={3} textAnchor="middle">
              {Number(tally) === handedOut
                ? `${handedOut} tickets sold, and the tally says ${tally}.`
                : `${handedOut} tickets sold, but the tally says ${tally}: a sale was lost.`}
            </text>
          </g>
        )}
      </svg>
    </SceneLayout>
  );
}

function managerBubble(markers: string[], tally: string): { text: string; kind: "say" } | undefined {
  if (markers.includes("create-threads")) return { text: "Hire two agents", kind: "say" };
  if (markers.includes("start-threads")) return { text: "Open the booths", kind: "say" };
  if (markers.includes("join")) return { text: "Wait for both", kind: "say" };
  if (markers.includes("result")) return { text: `Tally: ${tally}`, kind: "say" };
  return undefined;
}

function bubbleFor(
  label: string | undefined,
  active: boolean,
  blocked: boolean,
  rmw: ReturnType<typeof readModifyWrite>,
  markers: string[],
): { text: string; kind?: "think" | "say" | "wait" } | undefined {
  if (blocked) return { text: "Waiting for the lock", kind: "wait" };
  const seen = Number(rmw.seen ?? "0");
  if (active) {
    if (label?.startsWith("read ")) return { text: `The tally says ${rmw.seen}`, kind: "think" };
    if (label === "add") return { text: `${seen} + 1 = ${seen + 1}`, kind: "think" };
    if (label?.startsWith("write ")) return { text: `Write ${seen + 1}`, kind: "say" };
    if (markers.includes("lock")) return { text: "Take the lock first", kind: "say" };
    if (markers.includes("sell")) return { text: "Sold one! Update the tally", kind: "say" };
    return undefined;
  }
  // Paused in the middle of an update: still holding the number it read.
  if (rmw.stage === "holding") return { text: `Holding ${seen}`, kind: "think" };
  if (rmw.stage === "about-to-write") return { text: `About to write ${seen + 1}`, kind: "think" };
  return undefined;
}

function Key({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} aria-hidden="true">
      <circle className="scene-key" cx={0} cy={0} r={7} />
      <rect className="scene-key" x={6} y={-2.5} width={16} height={5} />
      <rect className="scene-key" x={16} y={2} width={3} height={5} />
    </g>
  );
}
