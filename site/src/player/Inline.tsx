/** Text with `backticks` rendered as code. */
export function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(/`([^`]+)`/).map((part, i) => (i % 2 ? <code key={i}>{part}</code> : part))}
    </>
  );
}
