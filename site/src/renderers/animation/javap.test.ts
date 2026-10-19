import { describe, expect, it } from "vitest";
import { findMethod, parseJavap } from "./javap";

// Real `javap -c -p` output for lessons/jvm/how-java-runs/Program.java on JDK 25.
const listing = `Compiled from "Program.java"
public class Program {
  static int limit;

  public Program();
    Code:
         0: aload_0
         1: invokespecial #1                  // Method java/lang/Object."<init>":()V
         4: return

  static int square(int);
    Code:
         0: iload_0
         1: iload_0
         2: imul
         3: ireturn

  static {};
    Code:
         0: iconst_3
         1: putstatic     #7                  // Field limit:I
         4: return
}
`;

describe("javap listing", () => {
  it("splits methods and instructions, skipping fields", () => {
    const methods = parseJavap(listing);
    expect(methods.map((m) => m.header)).toEqual(["public Program();", "static int square(int);", "static {};"]);
    expect(findMethod(methods, "square(").instructions).toEqual([
      { offset: 0, text: "iload_0" },
      { offset: 1, text: "iload_0" },
      { offset: 2, text: "imul" },
      { offset: 3, text: "ireturn" },
    ]);
    expect(findMethod(methods, "static {}").instructions[1]).toEqual({ offset: 1, text: "putstatic #7 // Field limit:I" });
  });

  it("names the missing method", () => {
    expect(() => findMethod(parseJavap(listing), "main(")).toThrow(/main\(/);
  });
});
