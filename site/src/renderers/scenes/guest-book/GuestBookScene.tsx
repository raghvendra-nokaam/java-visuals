import type { ReactNode } from "react";
import type { Trace } from "@java-visuals/trace-schema";
import { Badge, Person } from "../kit/Person";
import { SceneLayout } from "../kit/SceneLayout";
import { arrayTexts, fieldObject, localText, markersHere, objectOfType, stateWord, threadById } from "../kit/trace";

const GUESTS = [
  { id: "A", name: "Ada", tone: "a" as const, home: 130 },
  { id: "B", name: "Bo", tone: "b" as const, home: 590 },
];

/**
 * Threads sharing the Heap as two guests signing one guest book: each keeps private notes (their own Stack,
 * the local `letters`), but both write into the same GuestBook object.
 */
export default function GuestBookScene({ trace, index, explanation }: { trace: Trace; index: number; explanation: ReactNode }) {
  const step = trace.steps[index]!;
  const book = objectOfType(step, "GuestBook");
  const lines = arrayTexts(step, fieldObject(step, book, "signatures"));
  const markers = markersHere(trace, step);
  const main = threadById(step, "main");

  return (
    <SceneLayout trace={trace} index={index} title="Two guests signing one shared guest book" explanation={explanation}>
      <svg viewBox="0 0 720 545" role="img" aria-label={`Guest book line 1: ${lines[0] || "empty"}, line 2: ${lines[1] || "empty"}.`}>
        {/* The shared guest book (one object on the Heap) */}
        <rect className="scene-thing" x={220} y={24} width={280} height={170} rx={10} />
        <line x1={360} y1={30} x2={360} y2={188} stroke="var(--heap)" strokeWidth={2} />
        <text className="scene-label" x={290} y={58} textAnchor="middle">Guest book</text>
        <text className="scene-person-role" x={290} y={78} textAnchor="middle">shared by all</text>
        {[0, 1].map((i) => (
          <g key={i}>
            <text className="scene-person-role" x={378} y={74 + i * 52}>
              line {i + 1}
            </text>
            <line x1={378} y1={108 + i * 52} x2={484} y2={108 + i * 52} stroke="var(--ink-soft)" strokeWidth={1.5} />
            <text key={lines[i]} className="scene-person-name scene-flash" x={384} y={102 + i * 52}>
              {lines[i] ?? ""}
            </text>
          </g>
        ))}

        {main && (
          <Person
            name="Host"
            role="main thread"
            x={360}
            y={470}
            tone="main"
            active={step.activeThread === "main"}
            badge={step.activeThread === "main" ? undefined : main.frames.length === 0 ? "done" : "waiting for guests"}
            bubble={step.activeThread === "main" ? hostBubble(markers) : undefined}
          />
        )}

        {GUESTS.map((g) => {
          const t = threadById(step, g.id);
          if (!t) return null;
          const active = step.activeThread === g.id;
          const atBook = active && (markers.includes("sign") || markers.includes("local"));
          const done = t.state === "terminated";
          const letters = localText(step, g.id, "letters");
          return (
            <Person
              key={g.id}
              name={g.name}
              role={`thread ${g.id}`}
              x={atBook ? (g.id === "A" ? 290 : 430) : g.home}
              y={atBook ? 330 : 380}
              tone={g.tone}
              active={active}
              faded={done}
              badge={done ? "signed" : stateWord(t)}
              bubble={active ? guestBubble(markers, g.name, g.id === "A" ? 1 : 2) : undefined}
            >
              {/* Private notepad: this thread's own local variables */}
              {!done && (
                <g transform="translate(34 -60)">
                  <rect className="scene-surface" x={0} y={-16} width={96} height={44} rx={4} />
                  <text className="scene-person-role" x={8} y={0}>own notes</text>
                  <text className="scene-bubble-text" x={8} y={20} style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, fill: "var(--ink)" }}>
                    {letters !== undefined ? `letters = ${letters}` : "empty"}
                  </text>
                </g>
              )}
            </Person>
          );
        })}
        {!threadById(step, "A") && <Badge text="Guests not started yet" x={360} y={300} />}
      </svg>
    </SceneLayout>
  );
}

function hostBubble(markers: string[]): { text: string; kind: "say" } | undefined {
  if (markers.includes("create-threads")) return { text: "Invite Ada and Bo", kind: "say" };
  if (markers.includes("start-threads")) return { text: "Come in!", kind: "say" };
  if (markers.includes("join")) return { text: "Wait for both to sign", kind: "say" };
  if (markers.includes("result")) return { text: "Everyone signed", kind: "say" };
  return undefined;
}

function guestBubble(markers: string[], name: string, line: number): { text: string; kind: "say" | "think" } | undefined {
  if (markers.includes("local")) return { text: `Count my letters`, kind: "think" };
  if (markers.includes("sign")) return { text: `Write "${name}" on line ${line}`, kind: "say" };
  return undefined;
}
