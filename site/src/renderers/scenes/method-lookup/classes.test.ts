import { describe, expect, it } from "vitest";
import type { Trace } from "@java-visuals/trace-schema";
import { lookupPath, parseClasses } from "./classes";

const source = `public class Program {
    public static void main(String[] args) {
    }
}

abstract class Shape {
    abstract double area();

    String describe() {
        return "area " + area();
    }
}

class Circle extends Shape {
    Circle(double radius) {
    }

    double area() {
        return 3.14;
    }
}

class Dot extends Circle {
}`;

const trace = { source: [{ path: "Program.java", lines: source.split("\n") }] } as unknown as Trace;

describe("method lookup", () => {
  it("reads the lesson's classes, parents and methods, leaving out main's class and constructors", () => {
    expect(parseClasses(trace)).toEqual([
      { name: "Shape", parent: null, abstract: true, methods: [{ name: "area", abstract: true }, { name: "describe", abstract: false }] },
      { name: "Circle", parent: "Shape", abstract: false, methods: [{ name: "area", abstract: false }] },
      { name: "Dot", parent: "Circle", abstract: false, methods: [] },
    ]);
  });

  it("climbs from the object's class to the first class with a non-abstract version", () => {
    const classes = parseClasses(trace);
    expect(lookupPath(classes, "Dot", "area")).toEqual(["Dot", "Circle"]);
    expect(lookupPath(classes, "Dot", "describe")).toEqual(["Dot", "Circle", "Shape"]);
    expect(lookupPath(classes, "Circle", "area")).toEqual(["Circle"]);
  });
});
