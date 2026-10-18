import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MotionConfig } from "motion/react";
import { initialState, reduce, SPEEDS, type PlayerAction, type PlayerState } from "./core";
import { Inline } from "./Inline";
import type { Renderer } from "./renderer";
import {
  narrationAt,
  promptsByStep,
  resolveAnchor,
  unresolvedAnchors,
  variantSwitchTarget,
  type DetailLevel,
  type LessonScript,
  type StepSource,
} from "./script";
import "./player.css";

interface Props<T extends StepSource> {
  /** Variant id → its Steps, in the order the switcher lists them. */
  variants: Record<string, T>;
  variantLabels?: Record<string, string>;
  script: LessonScript;
  renderer: Renderer<T>;
  defaultLevel: DetailLevel;
  /** Whether this Lesson has JVM-level content worth switching to. */
  offersJvmDetail: boolean;
  /** Called once the Learner reaches the last Step. */
  onReachEnd?: () => void;
  next?: { title: string; href: string };
}

/** Base delay between Steps at 1× speed. */
const STEP_MS = 1300;

export default function Player<T extends StepSource>({
  variants,
  variantLabels = {},
  script,
  renderer,
  defaultLevel,
  offersJvmDetail,
  onReachEnd,
  next,
}: Props<T>) {
  const variantIds = Object.keys(variants);
  const [variantId, setVariantId] = useState(variantIds[0]!);
  const [level, setLevel] = useState<DetailLevel>(defaultLevel);
  const [state, setState] = useState<PlayerState>(() => initialState());
  const data = variants[variantId]!;
  const prompts = useMemo(() => promptsByStep(script, data, variantId), [script, data, variantId]);
  const config = useMemo(() => ({ stepCount: data.steps.length, promptSteps: new Set(prompts.keys()) }), [data, prompts]);
  const dispatch = useCallback((action: PlayerAction) => setState((s) => reduce(s, action, config)), [config]);
  const continueRef = useRef<HTMLButtonElement>(null);
  const firstChoiceRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const missing = unresolvedAnchors(script, data, variantId);
    if (missing.length) console.warn(`Lesson script anchors with no matching Marker: ${missing.join(", ")}`);
  }, [script, data, variantId]);

  useEffect(() => {
    if (!state.playing) return;
    const timer = setTimeout(() => dispatch({ type: "next" }), STEP_MS / state.speed);
    return () => clearTimeout(timer);
  }, [state.playing, state.index, state.speed, dispatch]);

  const atEnd = state.index === config.stepCount - 1;
  useEffect(() => {
    if (atEnd) onReachEnd?.();
  }, [atEnd, onReachEnd]);

  useEffect(() => {
    if (state.prompt?.phase === "asking") firstChoiceRef.current?.focus();
    if (state.prompt?.phase === "revealed") continueRef.current?.focus();
  }, [state.prompt]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement;
      const tag = target.tagName;
      if (tag === "SELECT" || tag === "TEXTAREA" || (tag === "INPUT" && (target as HTMLInputElement).type !== "range")) return;
      const onControl = tag === "BUTTON" || tag === "INPUT";
      switch (e.key) {
        case "ArrowRight":
          if (tag === "INPUT") return; // the scrubber handles its own arrows
          e.preventDefault();
          dispatch({ type: "next" });
          break;
        case "ArrowLeft":
          if (tag === "INPUT") return;
          e.preventDefault();
          dispatch({ type: "prev" });
          break;
        case " ":
          if (onControl) return; // let Space activate the focused control
          e.preventDefault();
          dispatch({ type: "toggle" });
          break;
        case "Home":
          if (tag === "INPUT") return;
          dispatch({ type: "seek", index: 0 });
          break;
        case "End":
          if (tag === "INPUT") return;
          dispatch({ type: "seek", index: config.stepCount - 1 });
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch, config.stepCount]);

  const switchVariant = (next: string) => {
    const index = variantSwitchTarget(data, state.index, variants[next]!);
    setVariantId(next);
    setState((s) => reduce(s, { type: "reset", index }, { ...config, stepCount: variants[next]!.steps.length }));
  };

  const last = config.stepCount - 1;
  const narration = narrationAt(script, data, state.index, level, variantId);
  const prompt = state.prompt ? prompts.get(state.index) : undefined;
  const waitingPrompt = !state.prompt && prompts.has(state.index) && !state.answered.has(state.index);
  const ticks = [
    ...script.narration
      .filter((n) => !n.variant || n.variant === variantId)
      .map((n) => ({ at: resolveAnchor(data, n.at), kind: "narration" as const })),
    ...[...prompts.keys()].map((at) => ({ at, kind: "prompt" as const })),
  ].filter((t): t is { at: number; kind: "narration" | "prompt" } => t.at !== undefined && t.at > 0);

  return (
    <MotionConfig reducedMotion="user" transition={{ type: "spring", duration: 0.45, bounce: 0.15 }}>
      <div className="player">
        <header className="player-header">
          <h1 className="lesson-title">{script.title}</h1>
          <div className="player-options">
            {variantIds.length > 1 && (
              <label className="option">
                <span>Variant</span>
                <select value={variantId} onChange={(e) => switchVariant(e.target.value)}>
                  {variantIds.map((id) => (
                    <option key={id} value={id}>
                      {variantLabels[id] ?? id}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {offersJvmDetail && (
              <div className="segmented" role="group" aria-label="Detail level">
                <button type="button" aria-pressed={level === "simple"} onClick={() => setLevel("simple")}>
                  Simple
                </button>
                <button type="button" aria-pressed={level === "jvm"} onClick={() => setLevel("jvm")}>
                  JVM detail
                </button>
              </div>
            )}
          </div>
        </header>

        <p className="small-screen-note">This lesson is easiest to follow on a tablet or larger screen.</p>

        <renderer.View
          data={data}
          index={state.index}
          level={level}
          onSeek={(index) => dispatch({ type: "seek", index })}
          explanation={
            <section className="narration" aria-label="Explanation">
              {prompt ? (
                <PromptPanel
                  prompt={prompt}
                  state={state.prompt!}
                  onChoose={(choice) => dispatch({ type: "choose", choice })}
                  onContinue={() => dispatch({ type: "continue" })}
                  firstChoiceRef={firstChoiceRef}
                  continueRef={continueRef}
                />
              ) : (
                <>
                  {narration && <Prose text={narration.text} className="narration-text" />}
                  {waitingPrompt && <p className="narration-hint">Step forward to answer a question about what happens next.</p>}
                  {atEnd && next && (
                    <p className="narration-next">
                      Next lesson: <a href={next.href}>{next.title}</a>
                    </p>
                  )}
                </>
              )}
            </section>
          }
        />

        <p className="sr-only" aria-live="polite">
          {renderer.describe(data, state.index, level)}
        </p>

        <nav className="controls" aria-label="Playback">
          <div className="control-buttons">
            <IconButton label="Restart" onClick={() => dispatch({ type: "seek", index: 0 })} disabled={state.index === 0}>
              <path d="M6 5v14M19 5l-9 7 9 7z" />
            </IconButton>
            <IconButton label="Step back (Left arrow)" onClick={() => dispatch({ type: "prev" })} disabled={state.index === 0}>
              <path d="M15 5l-7 7 7 7" />
            </IconButton>
            <IconButton
              label={state.playing ? "Pause (Space)" : "Play (Space)"}
              onClick={() => dispatch({ type: "toggle" })}
              disabled={state.prompt !== null}
              primary
            >
              {state.playing ? <path d="M8 5v14M16 5v14" /> : <path d="M7 4l13 8-13 8z" />}
            </IconButton>
            <IconButton
              label="Step forward (Right arrow)"
              onClick={() => dispatch({ type: "next" })}
              disabled={state.index === last || state.prompt !== null}
            >
              <path d="M9 5l7 7-7 7" />
            </IconButton>
          </div>

          <div className="scrubber">
            <input
              type="range"
              min={0}
              max={last}
              value={state.index}
              onChange={(e) => dispatch({ type: "seek", index: Number(e.target.value) })}
              aria-label="Step"
              aria-valuetext={`Step ${state.index + 1} of ${config.stepCount}`}
            />
            <div className="scrubber-ticks" aria-hidden="true">
              {ticks.map((t, i) => (
                <span key={i} className="tick" data-kind={t.kind} style={{ left: `${(t.at / last) * 100}%` }} />
              ))}
            </div>
          </div>

          <span className="step-count">
            Step {state.index + 1} of {config.stepCount}
          </span>

          <label className="option">
            <span>Speed</span>
            <select value={state.speed} onChange={(e) => dispatch({ type: "speed", speed: Number(e.target.value) })}>
              {SPEEDS.map((s) => (
                <option key={s} value={s}>
                  {s}×
                </option>
              ))}
            </select>
          </label>
        </nav>
      </div>
    </MotionConfig>
  );
}

function PromptPanel({
  prompt,
  state,
  onChoose,
  onContinue,
  firstChoiceRef,
  continueRef,
}: {
  prompt: LessonScript["prompts"][number];
  state: NonNullable<PlayerState["prompt"]>;
  onChoose: (choice: number) => void;
  onContinue: () => void;
  firstChoiceRef: React.RefObject<HTMLButtonElement | null>;
  continueRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const revealed = state.phase === "revealed";
  const correct = revealed && state.choice === prompt.answer;
  return (
    <div className="prompt">
      <Prose text={prompt.question} className="prompt-question" />
      <ul className="prompt-choices">
        {prompt.choices.map((choice, i) => {
          const verdict = !revealed ? undefined : i === prompt.answer ? "right" : i === state.choice ? "wrong" : undefined;
          return (
            <li key={i}>
              <button
                type="button"
                ref={i === 0 ? firstChoiceRef : undefined}
                className="prompt-choice"
                data-verdict={verdict}
                aria-pressed={revealed ? state.choice === i : undefined}
                disabled={revealed}
                onClick={() => onChoose(i)}
              >
                <Inline text={choice} />
                {verdict === "right" && <span className="sr-only"> (correct answer)</span>}
                {verdict === "wrong" && <span className="sr-only"> (your answer)</span>}
              </button>
            </li>
          );
        })}
      </ul>
      {revealed && (
        <div className="prompt-result" role="status">
          <p>
            <strong>{correct ? "Right." : "Not quite."}</strong> <Inline text={prompt.explanation} />
          </p>
          <button type="button" className="button-primary" ref={continueRef} onClick={onContinue}>
            Show what happens
          </button>
        </div>
      )}
    </div>
  );
}

/** Narration prose: blank-line-separated paragraphs, with `backticks` as code. */
function Prose({ text, className }: { text: string; className: string }) {
  return (
    <>
      {text.split("\n\n").map((paragraph, i) => (
        <p key={i} className={className}>
          <Inline text={paragraph} />
        </p>
      ))}
    </>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  primary,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button type="button" className="icon-button" data-primary={primary || undefined} aria-label={label} title={label} onClick={onClick} disabled={disabled}>
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        {children}
      </svg>
    </button>
  );
}
