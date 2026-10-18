/** A Timeline Lesson's Steps: one Version Stop per Step, Markers named after stop ids. */
export interface Timeline {
  steps: VersionStop[];
  markers: Record<string, number>;
}

export interface VersionStop {
  id: string;
  /** As Java named it at the time: "JDK 1.0", "J2SE 5.0", "Java SE 8", "JDK 17". */
  version: string;
  /** ISO date, YYYY-MM-DD. */
  released: string;
  /** A release, or an event in Java's history (an acquisition, a change in how Java ships). */
  kind: "release" | "event";
  landmark: boolean;
  lts: boolean;
  headline: string;
  features: string[];
  code?: { before: CodeSample; after: CodeSample };
  /** An Execution Lesson that shows this stop's change running. */
  lesson?: { id: string; title: string; href: string };
}

export interface CodeSample {
  label: string;
  source: string;
}

/** Closest two stops may sit on the rail, as a fraction of its width, so their dots never overlap. */
export const MIN_RAIL_GAP = 0.03;

/**
 * Where each stop sits on the rail, 0–1, proportional to its date so the gaps between releases are visible.
 * Stops closer than MIN_RAIL_GAP (an event a month before a release) are nudged apart, keeping their order.
 */
export function railPositions(stops: VersionStop[]): number[] {
  const times = stops.map((s) => Date.parse(`${s.released}T00:00:00Z`));
  const first = Math.min(...times);
  const span = Math.max(...times) - first;
  if (span === 0) return times.map(() => 0.5);
  const positions = times.map((t) => (t - first) / span);
  for (let i = 1; i < positions.length; i++) {
    positions[i] = Math.max(positions[i]!, positions[i - 1]! + MIN_RAIL_GAP);
  }
  // If that pushed the last stop off the end, pin it there and pull earlier stops back the same way.
  if (positions.at(-1)! > 1) {
    positions[positions.length - 1] = 1;
    for (let i = positions.length - 2; i >= 0; i--) {
      positions[i] = Math.max(0, Math.min(positions[i]!, positions[i + 1]! - MIN_RAIL_GAP));
    }
  }
  return positions;
}

export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function year(iso: string): string {
  return iso.slice(0, 4);
}

/** Step Description for screen readers. */
export function describe(stop: VersionStop): string {
  const when = stop.kind === "event" ? formatDate(stop.released) : `released ${formatDate(stop.released)}`;
  const tags = [stop.lts && "long-term support release", stop.landmark && "landmark"].filter(Boolean).join(", ");
  const features = stop.features.length ? ` ${stop.features.join(". ")}.` : "";
  return `${stop.version}, ${when}${tags ? ` (${tags})` : ""}. ${stop.headline}.${features}`;
}
