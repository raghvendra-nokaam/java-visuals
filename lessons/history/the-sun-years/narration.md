## @java-1-0

Java began in 1991 as Oak, a language James Gosling's team at Sun designed for consumer devices. It shipped as Java in 1996 with one big promise: compile once to bytecode, and the same file runs on any machine that has a JVM.

## @java-1-1

Programs got bigger fast. Version 1.1 added the pieces that business software needed, such as database access with JDBC and inner classes for event handling.

## Predict @java-1-1

Before the next release, which class would you use for a list that grows as you add to it?

- [ ] `ArrayList`
- [x] `Vector`
- [ ] `LinkedList`

> Java 1.0 and 1.1 had `Vector` and `Hashtable`, and that was about it. `ArrayList`, `LinkedList` and `HashMap` all arrive in 1.2 as part of the Collections Framework.

## @java-1-2

The Collections Framework gave Java a shared vocabulary of interfaces. Code could ask for a `List` and not care whether it got an `ArrayList` or a `LinkedList`, a habit Java programmers still follow.

## @java-1-3

Early JVMs interpreted bytecode one instruction at a time, which gave Java a reputation for being slow. HotSpot changed that: it spots the hot code that runs most and compiles just that to fast machine code.

## @java-1-4

Java's process was opening up. Version 1.4 was the first designed through the Java Community Process, where companies and individuals propose and review changes together.

## Predict @java-1-4

In Java 1.4, what does `list.get(0)` give back?

- [ ] Whatever type you put in, such as a `String`
- [x] An `Object`, which you have to cast yourself
- [ ] A copy of the element

> Collections stored plain `Object`s, so every read needed a cast, and a wrong cast only failed when the program ran. The next release moves that check into the compiler.

## @java-5

Generics let the compiler know what a collection holds, so mistakes show up when you compile instead of when users run your program. Many Java 5 features, like varargs and the enhanced `for` loop, are new syntax over the same JVM. The linked lesson shows one running.

## @openjdk

Sun began publishing Java's source code under a free-software license. Anyone could now read, build and change the JDK, and today almost every Java distribution is built from OpenJDK.

## @java-6

Java 6 renamed the platform Java SE and made the JVM noticeably faster. It also turned out to be the last release from Sun. The next chapter starts with a new owner.
