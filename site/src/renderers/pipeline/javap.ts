/** One method (or static initializer) from `javap -c -p` output. */
export interface BytecodeMethod {
  /** The declaration line as javap prints it, e.g. "static int square(int);". */
  header: string;
  instructions: { offset: number; text: string }[];
}

/** Splits `javap -c -p` output into methods. Enough structure to highlight instructions; not a full parser. */
export function parseJavap(listing: string): BytecodeMethod[] {
  const methods: BytecodeMethod[] = [];
  let current: BytecodeMethod | undefined;
  let pendingHeader: string | undefined;
  for (const raw of listing.split("\n")) {
    const line = raw.trimEnd();
    const instruction = line.match(/^\s+(\d+): (.+)$/);
    if (instruction && current) {
      current.instructions.push({ offset: Number(instruction[1]), text: instruction[2]!.replace(/\s{2,}/g, " ") });
    } else if (/^\s{4}Code:$/.test(line) && pendingHeader) {
      current = { header: pendingHeader, instructions: [] };
      methods.push(current);
      pendingHeader = undefined;
    } else if (/^\s{2}\S.*;$/.test(line)) {
      pendingHeader = line.trim();
      current = undefined;
    }
  }
  return methods;
}

/** The method whose header contains `name`, e.g. "square(" or "static {}". */
export function findMethod(methods: BytecodeMethod[], name: string): BytecodeMethod {
  const found = methods.find((m) => m.header.includes(name));
  if (!found) throw new Error(`No method matching "${name}" in the bytecode listing`);
  return found;
}
