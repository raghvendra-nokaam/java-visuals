import { useEffect, useState } from "react";
import { onProgressChange } from "../../progress";
import "./curriculum.css";

export interface LessonListItem {
  id: string;
  title: string;
  summary: string;
  href: string;
  prerequisites: { id: string; title: string; href: string }[];
}

/**
 * A Track's Lessons in suggested order. Server-rendered without progress; on the client it adds
 * which Lessons this Learner has finished.
 */
export default function LessonList({ lessons, compact = false }: { lessons: LessonListItem[]; compact?: boolean }) {
  const [done, setDone] = useState<Record<string, string>>({});
  useEffect(() => onProgressChange(setDone), []);
  const finished = lessons.filter((l) => done[l.id]).length;

  return (
    <div className="lesson-list" data-compact={compact || undefined}>
      {finished > 0 && (
        <p className="lesson-list-progress">
          {finished} of {lessons.length} finished
        </p>
      )}
      <ol>
        {lessons.map((lesson) => (
          <li key={lesson.id} className="lesson-item" data-done={done[lesson.id] ? true : undefined}>
            <span className="lesson-mark" aria-hidden="true" />
            <div>
              <a href={lesson.href} className="lesson-link">
                {lesson.title}
              </a>
              {done[lesson.id] && <span className="sr-only"> (finished)</span>}
              {!compact && <p className="lesson-summary">{lesson.summary}</p>}
              {!compact && lesson.prerequisites.length > 0 && (
                <p className="lesson-prereqs">
                  Builds on{" "}
                  {lesson.prerequisites.map((p, i) => (
                    <span key={p.id}>
                      {i > 0 && ", "}
                      <a href={p.href}>{p.title}</a>
                    </span>
                  ))}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
