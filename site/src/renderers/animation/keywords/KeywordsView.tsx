import type { ReactNode } from "react";
import { motion } from "motion/react";
import type { AnimationData } from "../types";
import { contextual, groups, literals, type Group, type KeywordsStep } from "./steps";
import "./keywords.css";

interface Props {
  data: AnimationData<KeywordsStep>;
  index: number;
  explanation: ReactNode;
  onSeek: (index: number) => void;
}

/** A reference card of every reserved keyword, grouped by job; the current group lights up with an example. */
export default function KeywordsView({ data, index, explanation, onSeek }: Props) {
  const step = data.steps[index]!;
  const highlight = new Set(
    step.stage === "all" ? [] : step.stage === "contextual" ? [...contextual, ...literals] : groups.find((g) => g.id === step.stage)!.words,
  );
  const jump = (stage: Group) => {
    const target = data.steps.findIndex((s) => s.stage === stage);
    if (target >= 0) onSeek(target);
  };
  const state = (id: Group) => (step.stage === "all" ? "all" : step.stage === id ? "current" : "other");

  return (
    <div className="kw">
      <div className="kw-card" aria-label="Java's reserved keywords by group">
        {groups.map((g) => (
          <button key={g.id} type="button" className="kw-group" data-state={state(g.id)} onClick={() => jump(g.id)} aria-current={step.stage === g.id || undefined}>
            <span className="kw-group-label">{g.label}</span>
            <span className="kw-chips">
              {g.words.map((w, i) => (
                <motion.code
                  key={w}
                  className="kw-chip"
                  initial={false}
                  animate={step.stage === g.id ? { y: [0, -4, 0] } : { y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.35 }}
                >
                  {w}
                </motion.code>
              ))}
            </span>
          </button>
        ))}
        <button type="button" className="kw-group kw-group-wide" data-state={state("contextual")} data-kind="contextual" onClick={() => jump("contextual")} aria-current={step.stage === "contextual" || undefined}>
          <span className="kw-group-label">Not reserved: contextual keywords and literals</span>
          <span className="kw-chips">
            {[...contextual, ...literals].map((w) => (
              <code key={w} className="kw-chip">{w}</code>
            ))}
          </span>
        </button>
      </div>
      <div className="kw-side">
        <figure className="kw-example">
          <figcaption>{step.title}</figcaption>
          <pre>
            <code>
              {step.example.map((line, i) => (
                <span key={`${step.id}:${i}`} className="kw-line">
                  {highlightWords(line, highlight)}
                  {"\n"}
                </span>
              ))}
            </code>
          </pre>
        </figure>
        {explanation}
      </div>
    </div>
  );
}

/** Splits a line into words and marks the ones in `words`, leaving comments and strings alone. */
function highlightWords(line: string, words: Set<string>): ReactNode[] {
  const comment = line.indexOf("//");
  const code = comment >= 0 ? line.slice(0, comment) : line;
  const parts = code.split(/("[^"]*"|non-sealed|[A-Za-z_][A-Za-z0-9_]*)/);
  const out: ReactNode[] = parts.map((p, i) => (words.has(p) ? <mark key={i} className="kw-hit">{p}</mark> : p));
  if (comment >= 0) out.push(<span key="c" className="kw-comment">{line.slice(comment)}</span>);
  return out;
}
