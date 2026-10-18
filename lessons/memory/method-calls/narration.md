## @start

Every Java program starts by calling `main`. The JVM pushes a Frame for it onto the main thread's Stack: a private workspace that holds `main`'s local variables.

## @start jvm

Every Java program starts by calling `main`. The JVM pushes a Frame for it onto the main thread's Stack. `args` points to a `String[]` the JVM created before your code ran, a JDK Internal that the Simple view hides.

## @call-add

`x` and `y` live inside `main`'s Frame. An `int` stores its value directly in the variable, with no object involved.

## Predict @call-add

What happens on the Stack when `add(x, y)` is called?

- [ ] `add`'s code runs inside `main`'s Frame
- [x] A new Frame for `add` is pushed on top of `main`'s
- [ ] `x` and `y` move to the Heap so `add` can reach them

> Every method call gets its own Frame. It's pushed when the call starts and popped when the method returns.

## @add-compute

Calling `add` pushed a new Frame on top of `main`'s. Its parameters `a` and `b` are copies of `x` and `y`, because Java always passes arguments by value.

## @new-point

`add` returned 5 and its Frame was popped. Its locals `a`, `b` and `result` are gone for good. The returned value landed in `sum`.

## Predict @new-point

Where will the new `Point` object live?

- [ ] Inside `main`'s Frame, next to `p`
- [ ] In the variable `p` itself
- [x] On the Heap, with `p` holding a Reference to it

> Objects always live on the Heap. Variables of object type hold a Reference to them, never the object itself.

## @point-constructor

`new` created a `Point` on the Heap and then ran its constructor in a new Frame. `this` refers to the object being built, and its fields start at 0 until the constructor sets them.

## @print

`p` doesn't contain the `Point`. It holds a Reference, drawn as the arrow, to the object on the Heap.

## @object-dropped

`println` called `Point`'s `toString` to get its text. The JDK frames in between are hidden, so you only see the code that belongs to this program.

## Predict @object-dropped

After `p = null` runs, what happens to the `Point` object?

- [ ] It is deleted immediately
- [x] It stays on the Heap, unreachable, until the garbage collector removes it
- [ ] It moves into `main`'s Frame

> Java never frees objects the moment you stop using them. Unreachable objects wait on the Heap until the garbage collector runs.

## @end

Nothing references the `Point` any more, so it is eligible for garbage collection. It's greyed out but still in memory until the garbage collector decides to run.
