import type { ReactNode } from "react";
import type { HeapObject, Trace } from "@java-visuals/trace-schema";
import { Badge, Person } from "../kit/Person";
import { SceneLayout } from "../kit/SceneLayout";
import { deadlockedThreads, fieldObject, fieldText, localObject, markersHere, objectOfType, stateWord, threadById } from "../kit/trace";

/**
 * Deadlock as two bank clerks and two ledgers: each clerk must hold both ledgers to move money. A ledger a
 * clerk has locked travels to that clerk; a blocked clerk reaches for the ledger it's waiting for.
 */
export default function BankLedgersScene({ trace, index, explanation }: { trace: Trace; index: number; explanation: ReactNode }) {
  const step = trace.steps[index]!;
  const accounts = step.heap.filter((o) => o.type === "Account");
  const name = (a: HeapObject | undefined) => fieldText(step, a, "name");
  const markers = markersHere(trace, step);
  const stuck = deadlockedThreads(step);
  const clerkX = { A: 150, B: 570 } as const;

  // A held ledger sits beside its clerk, stacked if the clerk holds both; a free one is on the shelf.
  const ledgerSpot = (a: HeapObject, i: number) => {
    const owner = a.monitor?.owner;
    if (owner === "A" || owner === "B") {
      const stack = accounts.filter((o) => o.monitor?.owner === owner).indexOf(a);
      return { x: clerkX[owner] + (owner === "A" ? 110 : -110), y: 190 + stack * 84 };
    }
    return { x: 300 + i * 120, y: 125 };
  };

  return (
    <SceneLayout trace={trace} index={index} title="Two bank clerks each holding one ledger and waiting for the other" explanation={explanation}>
      <svg viewBox="0 0 720 550" role="img" aria-label={
          stuck.length
            ? "Deadlock: each clerk waits for the ledger the other holds."
            : accounts.length
              ? accounts.map((a) => `${name(a)}: ${fieldText(step, a, "balance")}${a.monitor?.owner ? `, held by ${a.monitor.owner}` : ""}`).join(". ")
              : "The bank before any ledgers are opened."
        }>
        <defs>
          <marker id="reach-head" viewBox="0 0 10 10" refX={8} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--wrong)" />
          </marker>
        </defs>
        <rect className="scene-surface" x={250} y={90} width={220} height={70} rx={8} />
        <text className="scene-label" x={360} y={80} textAnchor="middle">Ledger shelf</text>

        {accounts.map((a, i) => {
          const s = ledgerSpot(a, i);
          return (
            <g key={a.id} transform={`translate(${s.x} ${s.y})`} style={{ transition: "transform 0.6s" }}>
              <rect className="scene-thing" x={-52} y={-24} width={104} height={50} rx={4} />
              <text className="scene-label" x={0} y={-4} textAnchor="middle">{name(a)}</text>
              <text key={fieldText(step, a, "balance")} className="scene-person-name scene-flash" x={0} y={18} textAnchor="middle">
                {fieldText(step, a, "balance")}
              </text>
              {a.monitor?.owner && (
                <text className="scene-person-role" x={0} y={44} textAnchor="middle">
                  held by {a.monitor.owner}
                </text>
              )}
            </g>
          );
        })}

        {(["A", "B"] as const).map((id, i) => {
          const t = threadById(step, id);
          if (!t) return null;
          const active = step.activeThread === id;
          const task = localObject(step, id, "this");
          const from = localObject(step, id, "first") ?? fieldObject(step, task, "from");
          const to = localObject(step, id, "second") ?? fieldObject(step, task, "to");
          const amount = task ? fieldText(step, task, "amount") : "";
          const wants = t.state === "blocked" ? accounts.find((a) => a.monitor?.blocked.includes(id)) : undefined;
          return (
            <g key={id}>
              <Person
                name={`Clerk ${id}`}
                role={`thread ${id}`}
                x={clerkX[id]}
                y={420}
                tone={i === 0 ? "a" : "b"}
                active={active}
                faded={t.state === "terminated"}
                badge={t.state === "terminated" ? "done" : wants ? `waiting for ${name(wants)}` : stateWord(t)}
                bubble={!wants && active ? clerkBubble(markers, name(from), name(to), amount) : undefined}
              />
              {wants && <ReachArrow fromX={clerkX[id]} toX={wants.monitor?.owner === "A" ? clerkX.A + 110 : clerkX.B - 110} fromY={330} toY={256} />}
            </g>
          );
        })}

        {stuck.length > 0 && (
          <g className="scene-banner" data-tone="bad" transform="translate(360 520)">
            <rect x={-340} y={-20} width={680} height={34} rx={8} />
            <text x={0} y={3} textAnchor="middle">Deadlock: each clerk holds the ledger the other needs. Both wait forever.</text>
          </g>
        )}
        {index === trace.steps.length - 1 && stuck.length === 0 && (
          <g className="scene-banner" data-tone="good" transform="translate(360 520)">
            <rect x={-200} y={-20} width={400} height={34} rx={8} />
            <text x={0} y={3} textAnchor="middle">Both transfers finished.</text>
          </g>
        )}
        {objectOfType(step, "Transfer") === undefined && <Badge text="Clerks not started yet" x={360} y={300} />}
      </svg>
    </SceneLayout>
  );
}

function clerkBubble(markers: string[], from: string, to: string, amount: string): { text: string; kind: "say" | "think" } | undefined {
  if (markers.includes("choose-order")) return { text: "Always take checking first", kind: "think" };
  if (markers.includes("lock-first")) return { text: `Take the ${from} ledger`, kind: "say" };
  if (markers.includes("lock-second")) return { text: `Now the ${to} ledger`, kind: "say" };
  if (markers.includes("move")) return { text: `Move ${amount}`, kind: "say" };
  return undefined;
}

function ReachArrow({ fromX, toX, fromY, toY }: { fromX: number; toX: number; fromY: number; toY: number }) {
  return (
    <path
      d={`M ${fromX + (toX > fromX ? 30 : -30)} ${fromY} Q ${(fromX + toX) / 2} ${fromY - 20} ${toX} ${toY}`}
      fill="none"
      stroke="var(--wrong)"
      strokeWidth={3}
      strokeDasharray="8 6"
      markerEnd="url(#reach-head)"
    />
  );
}
