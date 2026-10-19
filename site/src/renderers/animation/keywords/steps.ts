import type { AnimationStep } from "../types";

export type Group = "all" | "types" | "structure" | "access" | "modifiers" | "objects" | "flow" | "errors" | "threads" | "unused" | "contextual";

export interface KeywordsStep extends AnimationStep {
  stage: Group;
  /** A short example with this group's keywords in use; they're highlighted in the visual. */
  example: string[];
}

/** Every reserved keyword in Java 25 (JLS §3.9), sorted into the groups the lesson walks through. */
export const groups: { id: Exclude<Group, "all" | "contextual">; label: string; words: string[] }[] = [
  { id: "types", label: "Primitive types", words: ["byte", "short", "int", "long", "float", "double", "boolean", "char", "void"] },
  { id: "structure", label: "Organising code", words: ["package", "import", "class", "interface", "enum", "extends", "implements"] },
  { id: "access", label: "Who can see it", words: ["public", "protected", "private"] },
  { id: "modifiers", label: "Modifiers", words: ["static", "final", "abstract", "native", "transient", "strictfp"] },
  { id: "objects", label: "Objects", words: ["new", "this", "super", "instanceof"] },
  { id: "flow", label: "Control flow", words: ["if", "else", "switch", "case", "default", "for", "do", "while", "break", "continue", "return"] },
  { id: "errors", label: "Errors", words: ["try", "catch", "finally", "throw", "throws", "assert"] },
  { id: "threads", label: "Threads", words: ["synchronized", "volatile"] },
  { id: "unused", label: "Reserved, never used", words: ["goto", "const", "_"] },
];

/** Words that are keywords only in certain places, so they can still be used as names elsewhere. */
export const contextual = ["var", "record", "yield", "sealed", "permits", "non-sealed", "when", "module", "exports", "requires"];
/** Look like keywords but are literal values. */
export const literals = ["true", "false", "null"];

export const steps: KeywordsStep[] = [
  { id: "all", stage: "all", title: "Java's reserved keywords", example: ["public class Hello {", "    public static void main(String[] args) {", '        System.out.println("Hello");', "    }", "}"] },
  { id: "types", stage: "types", title: "Primitive types", example: ["int count = 3;", "double price = 4.99;", "boolean done = false;", "void reset() { count = 0; }"] },
  { id: "structure", stage: "structure", title: "Organising code", example: ["package shop;", "import java.util.List;", "", "class Cart extends Basket implements Payable {", "}", "enum Size { SMALL, LARGE }"] },
  { id: "access", stage: "access", title: "Who can see it", example: ["public class Account {", "    private int balance;", "    protected void audit() { }", "    public int balance() { return balance; }", "}"] },
  { id: "modifiers", stage: "modifiers", title: "Modifiers", example: ["static int created = 0;", "final String id;", "static final double TAX = 0.2;", "abstract class Shape {", "    abstract double area();", "}"] },
  { id: "objects", stage: "objects", title: "Objects", example: ["Dog d = new Dog(\"Rex\");", "", "Dog(String name) {", "    super(name);", "    this.tricks = 0;", "}", "if (pet instanceof Dog dog) { }"] },
  { id: "flow", stage: "flow", title: "Control flow", example: ["for (int i = 0; i < 10; i++) {", "    if (i == 3) continue;", "    if (i == 8) break;", "}", "switch (size) {", "    case SMALL -> price = 2;", "    default -> price = 3;", "}", "return price;"] },
  { id: "errors", stage: "errors", title: "Errors", example: ["void load() throws IOException {", "    try {", "        read();", "    } catch (IOException e) {", '        throw new IllegalStateException("broken", e);', "    } finally {", "        close();", "    }", "}"] },
  { id: "threads", stage: "threads", title: "Threads", example: ["volatile boolean running = true;", "", "synchronized void add() {", "    count++;", "}"] },
  { id: "unused", stage: "unused", title: "Reserved, never used", example: ["int goto = 1;   // doesn't compile", "int const = 2;  // doesn't compile", "int _ = 3;      // doesn't compile", "", "(a, _) -> a     // _ means \"unused\""] },
  { id: "contextual", stage: "contextual", title: "Not quite keywords", example: ["var names = List.of(\"Ada\", \"Bo\");", "record Point(int x, int y) { }", "boolean ok = true;", "String none = null;", "int var = 5;   // still compiles"] },
];
