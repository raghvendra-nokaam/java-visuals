## @cadence

Big releases kept slipping, and finished features waited years for the rest. In 2017 Mark Reinhold, chief architect of the Java platform, proposed a fixed schedule: a release every six months containing whatever is ready.

## Predict @cadence

How many feature releases shipped from Java 10 in 2018 to Java 27 in 2026?

- [ ] 9
- [x] 18
- [ ] 27

> Java 10 through 27 is 18 releases in eight and a half years, nearly twice as many as the 21 years before, and each one is smaller.

## @java-10

The first six-month release was small on purpose. `var` lets the compiler work out a local variable's type, which is still checked at compile time just as strictly.

## @java-11

Most teams don't upgrade every six months. They move between LTS releases, and Java 11 became the first big jump for companies leaving Java 8.

## @java-12

A preview feature is complete but not yet permanent. You switch it on with a flag, try it, and send feedback, and it may change before it's final.

## @java-13

Text blocks went through the same process: preview first, standard two releases later.

## @java-14

Switch expressions became standard after two previews. Helpful NullPointerExceptions arrived too, telling you exactly which reference was null instead of only the line number.

## @java-15

With text blocks final, multi-line strings like JSON or SQL no longer need a `+` and a `\n` on every line.

## @java-16

A record is a class whose job is to carry data. Java writes the constructor, accessors, `equals`, `hashCode` and `toString` for you, and its fields can't change.

## @java-17

Sealed classes let a type list exactly which classes may extend it, which pays off once pattern matching can check that you handled every case. Java 17 became the next LTS, and a common upgrade target from 8 and 11.

## @java-18

Before Java 18, the default character set depended on the operating system, so the same program could read a file differently on Windows and Linux. Now it's UTF-8 everywhere.

## @java-19

Virtual threads preview the biggest change to concurrency since Java 5. A virtual thread is managed by the JVM rather than the operating system, so a program can run millions of them.

## @java-20

Not every release adds final features. Java 20 was entirely previews and incubators, the schedule doing its job of shipping work in progress for feedback.

## Predict @java-20

Which release is the next long-term support release after Java 17?

- [x] Java 21
- [ ] Java 23
- [ ] Java 25

> LTS releases come every two years since Java 17: 21 in 2023, then 25 in 2025.

## @java-21

Virtual threads, record patterns and pattern matching for `switch` all became final in the same release, making Java 21 one of the most important since Java 8.

## @java-22

The underscore says "I don't need this variable" in places like `catch (Exception _)`. The Foreign Function & Memory API lets Java call native libraries without writing JNI glue code.

## @java-23

Javadoc comments can now be written in Markdown instead of HTML, and generational ZGC became the default mode.

## @java-24

Stream gatherers let you write your own stream operations, like windows of consecutive elements. Under the hood, virtual threads got much better at working with `synchronized` code.

## Predict @java-24

What does Hello, world look like in Java 25?

- [ ] The same as always: a public class with `public static void main`
- [x] `void main() { IO.println("Hello, world"); }` with no class at all
- [ ] Just `println("Hello, world")` on its own line

> Compact source files let a first program be just a method. The class is implied, and `IO.println` is available without an import.

## @java-25

Java 25 is the current LTS and the version every Lesson Program on this site uses. Compact object headers make each object on the Heap a little smaller, which adds up across millions of objects.

## @java-26

Applets, the feature that put Java in browsers in 1996, were finally removed 30 years later. HTTP/3 support brings the HTTP Client up to date.

## @java-27

The most recent release. G1, the garbage collector that became the default in Java 9, is now the default everywhere, and compact object headers are on for everyone. In March 2027, the next release follows.
