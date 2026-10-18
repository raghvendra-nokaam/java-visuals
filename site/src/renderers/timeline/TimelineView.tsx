import type { ReactNode } from "react";
import { motion } from "motion/react";
import { Inline } from "../../player/Inline";
import { formatDate, railPositions, year, type Timeline, type VersionStop } from "./model";
import "./timeline.css";

interface Props {
  timeline: Timeline;
  index: number;
  explanation: ReactNode;
  onSeek: (index: number) => void;
}

/** A Timeline Lesson Step: the rail of every stop placed by date, the current stop's card, and the narration. */
export default function TimelineView({ timeline, index, explanation, onSeek }: Props) {
  const stops = timeline.steps;
  const stop = stops[index]!;
  const positions = railPositions(stops);
  const labelled = railLabels(stops, positions);

  return (
    <div className="timeline">
      <ol className="rail" aria-label="Stops on this timeline">
        {stops.map((s, i) => (
          <li key={s.id} className="rail-item" style={{ left: `${positions[i]! * 100}%` }}>
            <button
              type="button"
              className="rail-stop"
              data-kind={s.kind}
              data-landmark={s.landmark || undefined}
              data-state={i === index ? "current" : i < index ? "past" : "future"}
              aria-current={i === index ? "step" : undefined}
              aria-label={`${s.version}, ${year(s.released)}`}
              title={`${s.version}, ${year(s.released)}`}
              onClick={() => onSeek(i)}
            />
            {labelled.has(i) && (
              <span className="rail-year" aria-hidden="true">
                {year(s.released)}
              </span>
            )}
          </li>
        ))}
      </ol>

      <div className="timeline-body">
        <motion.article
          key={stop.id}
          className="stop"
          data-landmark={stop.landmark || undefined}
          data-kind={stop.kind}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <StopCard stop={stop} />
        </motion.article>
        <div className="timeline-side">{explanation}</div>
      </div>
    </div>
  );
}

function StopCard({ stop }: { stop: VersionStop }) {
  return (
    <>
      <p className="stop-meta">
        <time dateTime={stop.released}>{formatDate(stop.released)}</time>
        {stop.lts && <span className="stop-badge">Long-term support</span>}
        {stop.kind === "event" && <span className="stop-badge" data-kind="event">Turning point</span>}
      </p>
      <h2 className="stop-version">{stop.version}</h2>
      <p className="stop-headline">
        <Inline text={stop.headline} />
      </p>
      {stop.features.length > 0 && (
        <ul className="stop-features">
          {stop.features.map((f) => (
            <li key={f}>
              <Inline text={f} />
            </li>
          ))}
        </ul>
      )}
      {stop.code && (
        <div className="stop-code">
          {[stop.code.before, stop.code.after].map((sample, i) => (
            <figure key={i} data-side={i === 0 ? "before" : "after"}>
              <figcaption>{sample.label}</figcaption>
              <pre tabIndex={0} aria-label={`${sample.label} code`}>
                <code>{sample.source.trimEnd()}</code>
              </pre>
            </figure>
          ))}
        </div>
      )}
      {stop.lesson && (
        <p className="stop-lesson">
          See it run in a lesson: <a href={stop.lesson.href}>{stop.lesson.title}</a>
        </p>
      )}
    </>
  );
}

/** Years to print under the rail: first, last and landmarks, skipping any that would crowd a neighbour. */
function railLabels(stops: VersionStop[], positions: number[]): Set<number> {
  const wanted = stops.map((s, i) => i).filter((i) => i === 0 || i === stops.length - 1 || stops[i]!.landmark);
  const chosen: number[] = [];
  for (const i of wanted) {
    const last = chosen.at(-1);
    if (last === undefined || positions[i]! - positions[last]! >= 0.07) chosen.push(i);
    else if (i === stops.length - 1) chosen[chosen.length - 1] = i;
  }
  return new Set(chosen);
}
