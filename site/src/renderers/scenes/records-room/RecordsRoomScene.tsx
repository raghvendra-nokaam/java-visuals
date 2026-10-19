import type { ReactNode } from "react";
import type { Trace } from "@java-visuals/trace-schema";
import { Badge, Person } from "../kit/Person";
import { SceneLayout } from "../kit/SceneLayout";
import { fieldText, markersHere, objectOfType, readModifyWrite, stateWord, threadById } from "../kit/trace";

/**
 * ReentrantLock as a records room with one key: the clerk holding the key works inside, others queue at the
 * door (lock) or walk away (tryLock). The key shows how many times its holder has taken it (reentrancy).
 */
export default function RecordsRoomScene({ trace, index, explanation }: { trace: Trace; index: number; explanation: ReactNode }) {
  const step = trace.steps[index]!;
  const room = objectOfType(step, "RecordsRoom");
  const filed = fieldText(step, room, "filed") || "0";
  const turnedAway = fieldText(step, room, "turnedAway") || "0";
  const lock = objectOfType(step, "ReentrantLock");
  const holder = lock?.monitor?.owner ?? null;
  const holds = lock?.monitor?.entryCount ?? 0;
  const queue = lock?.monitor?.blocked ?? [];
  const markers = markersHere(trace, step);
  const main = threadById(step, "main");
  const last = index === trace.steps.length - 1;

  return (
    <SceneLayout trace={trace} index={index} title="Two clerks sharing one key to a records room" explanation={explanation}>
      <svg viewBox="0 0 720 545" role="img" aria-label={`Key ${holder ? `held by clerk ${holder}` : "on the hook"}. Reports filed: ${filed}.`}>
        {/* The room, its door and the cabinet */}
        <rect className="scene-surface" x={330} y={40} width={360} height={330} rx={8} />
        <text className="scene-label" x={510} y={70} textAnchor="middle">Records room</text>
        <rect x={322} y={250} width={16} height={100} fill={holder ? "var(--heap)" : "var(--paper)"} stroke="var(--ink)" strokeWidth={2} />
        <text className="scene-person-role" x={330} y={372} textAnchor="middle">door</text>
        <rect className="scene-thing" x={560} y={100} width={110} height={120} rx={6} />
        <text className="scene-label" x={615} y={128} textAnchor="middle">Cabinet</text>
        <text key={filed} className="scene-big-number scene-flash" x={615} y={190} textAnchor="middle">{filed}</text>
        <text className="scene-person-role" x={615} y={210} textAnchor="middle">reports filed</text>

        {/* The key: on its hook when free */}
        <rect x={250} y={180} width={50} height={6} fill="var(--ink-soft)" />
        <text className="scene-person-role" x={275} y={172} textAnchor="middle">key hook</text>
        {!holder && <Key x={265} y={200} />}
        {holder && <Badge text={holds > 1 ? `Key: ${holder}, held ${holds} times` : `Key: ${holder}`} x={230} y={100} />}
        {queue.length > 0 && <Badge text={`Queue at the door: ${queue.join(", ")}`} x={230} y={132} />}

        {main && (
          <Person
            name="Manager"
            role="main thread"
            x={620}
            y={460}
            tone="main"
            active={step.activeThread === "main"}
            badge={step.activeThread === "main" ? undefined : main.frames.length === 0 ? "done" : "waiting"}
            bubble={step.activeThread === "main" && markers.includes("result") ? { text: `${filed} filed, ${turnedAway} turned away`, kind: "say" } : undefined}
          />
        )}

        {(["A", "B"] as const).map((id, i) => {
          const t = threadById(step, id);
          if (!t) return null;
          const active = step.activeThread === id;
          const inside = holder === id;
          const queued = queue.includes(id);
          const done = t.state === "terminated";
          const rmw = readModifyWrite(trace, index, id);
          const x = inside ? 450 : queued ? 250 : 90 + i * 120;
          const y = inside ? 300 : queued ? 350 : 420;
          return (
            <Person
              key={id}
              name={`Clerk ${id}`}
              role={`thread ${id}`}
              x={x}
              y={y}
              tone={i === 0 ? "a" : "b"}
              active={active}
              faded={done}
              badge={done ? "done" : queued ? "queued for the key" : stateWord(t)}
              bubble={clerkBubble(step.subStep?.label, active, queued, rmw, markers)}
            >
              {inside && <Key x={28} y={-22} />}
            </Person>
          );
        })}

        {last && (
          <g className="scene-banner" data-tone="good" transform="translate(360 515)">
            <rect x={-200} y={-20} width={400} height={34} rx={8} />
            <text x={0} y={3} textAnchor="middle">{`${filed} filed, ${turnedAway} turned away`}</text>
          </g>
        )}
      </svg>
    </SceneLayout>
  );
}

function clerkBubble(
  label: string | undefined,
  active: boolean,
  queued: boolean,
  rmw: ReturnType<typeof readModifyWrite>,
  markers: string[],
): { text: string; kind?: "think" | "say" | "wait" } | undefined {
  if (queued) return { text: "Waiting for the key", kind: "wait" };
  if (!active) return undefined;
  const seen = Number(rmw.seen ?? "0");
  if (label?.startsWith("read ")) return { text: `Cabinet says ${rmw.seen}`, kind: "think" };
  if (label === "add") return { text: `${seen} + 1 = ${seen + 1}`, kind: "think" };
  if (label?.startsWith("write ")) return { text: `Write ${seen + 1}`, kind: "say" };
  if (markers.includes("relock")) return { text: "Same key opens the cabinet", kind: "say" };
  if (markers.includes("unlock")) return { text: "Hang the key back", kind: "say" };
  if (markers.includes("gave-up")) return { text: "Key's taken. Come back later", kind: "say" };
  if (markers.includes("lock")) return { text: "Take the key", kind: "say" };
  if (markers.includes("call-file")) return { text: "File my report", kind: "say" };
  return undefined;
}

function Key({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} aria-hidden="true">
      <circle className="scene-key" cx={0} cy={0} r={8} />
      <rect className="scene-key" x={7} y={-3} width={18} height={6} />
      <rect className="scene-key" x={18} y={2} width={3} height={6} />
    </g>
  );
}
