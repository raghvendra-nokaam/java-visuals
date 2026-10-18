/**
 * Which Lessons this Learner has finished, kept in their browser (there are no accounts).
 * Storage can be missing or throw (private mode, blocked site data), so every access is guarded and the
 * site works the same without it.
 */
const KEY = "java-visuals:progress:v1";
const EVENT = "java-visuals:progress";

type Progress = Record<string, string>; // lesson id → ISO date completed

export function completedLessons(): Progress {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? (parsed as Progress) : {};
  } catch {
    return {};
  }
}

export function markCompleted(lessonId: string): void {
  try {
    const progress = completedLessons();
    if (progress[lessonId]) return;
    progress[lessonId] = new Date().toISOString();
    localStorage.setItem(KEY, JSON.stringify(progress));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // Progress is a convenience; losing it is fine.
  }
}

/** Calls back now and whenever progress changes in this tab or another. */
export function onProgressChange(callback: (progress: Progress) => void): () => void {
  const fire = () => callback(completedLessons());
  window.addEventListener(EVENT, fire);
  window.addEventListener("storage", fire);
  fire();
  return () => {
    window.removeEventListener(EVENT, fire);
    window.removeEventListener("storage", fire);
  };
}
