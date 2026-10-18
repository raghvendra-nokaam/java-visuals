## @call

Java 1.4 has no varargs, so to pass three numbers you build the array yourself with `new int[] {3, 4, 5}`.

## @call in java-5

With Java 5 varargs you just write `sum(3, 4, 5)`. Watch what reaches `sum`.

## Predict @call

Where will the array `new int[] {3, 4, 5}` live?

- [ ] Inside `sum`'s Frame
- [x] On the Heap, with `numbers` holding a Reference to it
- [ ] Inside `main`'s Frame

> Arrays are objects, so they live on the Heap. `sum` gets a copy of the Reference, like any other object argument.

## Predict @call in java-5

What will `sum` receive for `sum(3, 4, 5)`?

- [ ] Three separate `int` parameters
- [x] A Reference to an `int[]` that the compiler arranged to create
- [ ] A `List<Integer>`

> Varargs is the compiler's work. `javac` turns `sum(3, 4, 5)` into `sum(new int[] {3, 4, 5})`, so the JVM runs exactly what the Java 1.4 version runs.

## @inside

`numbers` holds a Reference to an `int[]` on the Heap. Both versions look exactly like this.

## @loop

The Java 1.4 loop keeps its own counter `i` and reads `numbers[i]` each time around.

## @loop in java-5

The enhanced `for` loop hides the counter: `n` is simply each element in turn. The index still exists, but only in compiled code you never see.

## @return

Same total, 12, and the same memory picture in both versions.

## @done

`sum`'s Frame is gone, and with it the only Reference to the array, so the array is eligible for garbage collection.

## @end

Switch Variant to compare. The source changed in Java 5, but the JVM and the memory picture didn't. Much of Java's history works like this: the compiler does more of the work so you write less.
