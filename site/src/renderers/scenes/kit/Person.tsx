import { AnimatePresence, motion } from "motion/react";

export interface PersonProps {
  name: string;
  /** Short role shown under the name, e.g. "thread A". */
  role?: string;
  x: number;
  y: number;
  tone: "a" | "b" | "c" | "main";
  active?: boolean;
  faded?: boolean;
  badge?: string;
  bubble?: { text: string; kind?: "think" | "say" | "wait" };
  /** Extra decoration drawn next to the figure (a key, tickets, a dish). */
  children?: React.ReactNode;
}

/** A person in a scene: one thread, drawn as a figure that walks to where the action is. */
export function Person({ name, role, x, y, tone, active, faded, badge, bubble, children }: PersonProps) {
  return (
    <motion.g
      className="scene-person"
      data-tone={tone}
      data-active={active || undefined}
      initial={false}
      animate={{ x, y, opacity: faded ? 0.55 : 1 }}
      transition={{ type: "spring", duration: 0.6, bounce: 0.15 }}
    >
      <circle className="scene-person-head" cx={0} cy={-52} r={17} />
      <path className="scene-person-body" d="M -24 -4 Q -24 -31 0 -31 Q 24 -31 24 -4 Z" />
      <text className="scene-person-name" x={0} y={18} textAnchor="middle">
        {name}
      </text>
      {role && (
        <text className="scene-person-role" x={0} y={36} textAnchor="middle">
          {role}
        </text>
      )}
      {badge && <Badge text={badge} y={56} />}
      {children}
      <AnimatePresence>
        {bubble && (
          <motion.g
            key={bubble.text}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Bubble text={bubble.text} kind={bubble.kind ?? "think"} />
          </motion.g>
        )}
      </AnimatePresence>
    </motion.g>
  );
}

const CHAR = 8.6;

/** A rounded caption box centred on (0, y). Widths come from a character estimate; scene text is short. */
export function Badge({ text, y, x = 0 }: { text: string; y: number; x?: number }) {
  const w = text.length * CHAR * 0.85 + 16;
  return (
    <g className="scene-badge" transform={`translate(${x} ${y})`}>
      <rect x={-w / 2} y={-13} width={w} height={24} rx={12} />
      <text x={0} y={4} textAnchor="middle">
        {text}
      </text>
    </g>
  );
}

function Bubble({ text, kind }: { text: string; kind: "think" | "say" | "wait" }) {
  const w = Math.max(64, text.length * CHAR + 24);
  return (
    <g className="scene-bubble" data-kind={kind} transform="translate(0 -86)">
      <rect x={-w / 2} y={-38} width={w} height={34} rx={kind === "say" ? 8 : 17} />
      {kind === "think" ? (
        <>
          <circle cx={-6} cy={4} r={4} />
          <circle cx={-12} cy={12} r={2.5} />
        </>
      ) : (
        <path d="M -6 -5 L 0 6 L 6 -5 Z" />
      )}
      <text x={0} y={-15} textAnchor="middle">
        {text}
      </text>
    </g>
  );
}
