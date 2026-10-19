import type { ReactNode } from "react";
import type { Trace } from "@java-visuals/trace-schema";
import { CodePanel } from "../../execution/ExecutionView";
import "./scene.css";

/**
 * The frame every scene sits in: the scene itself first, then the explanation, with the real code one click
 * away. The scene tells the story; the code is there for anyone who wants to see what's really running.
 */
export function SceneLayout({
  trace,
  index,
  title,
  explanation,
  children,
}: {
  trace: Trace;
  index: number;
  /** Accessible name for the scene picture. */
  title: string;
  explanation: ReactNode;
  children: ReactNode;
}) {
  const step = trace.steps[index]!;
  return (
    <div className="scene-layout">
      <figure className="scene-stage" aria-label={title}>
        {children}
      </figure>
      <div className="scene-side">
        {explanation}
        <details className="scene-code">
          <summary>Show the code</summary>
          <CodePanel trace={trace} step={step} highlightLine={null} onHoverLine={() => {}} />
        </details>
      </div>
    </div>
  );
}
