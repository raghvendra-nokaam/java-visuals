## @write

This is the program we'll follow. `main` loops three times, calling `square` and printing each result. Everything in this lesson happens between saving this file and seeing 1, 4 and 9.

## @compile

`javac` doesn't produce machine code for your CPU. It turns each method into bytecode, compact instructions for a virtual machine, and saves them in `Program.class`. `square` is only four instructions.

## Predict @compile

Which computers can run this `Program.class`?

- [ ] Only computers with the same CPU as the one that compiled it
- [x] Any computer with a JVM, whatever its CPU or operating system
- [ ] Only computers that also have `Program.java`

> Bytecode targets the JVM, not a real CPU. Each platform's JVM translates it, which is what "write once, run anywhere" means.

## @launch

Typing `java Program` starts a JVM: a program whose job is to run bytecode. Before your class is even loaded, it sets up memory and loads hundreds of core classes it needs for itself.

## @load

Loading means finding a class's bytes and turning them into a class the JVM can use. Each class loader asks its parent first, so core classes always come from the JDK. Neither parent has `Program`, so the application class loader reads it from the class path.

## @verify

The JVM doesn't trust bytecode, not even bytecode from `javac`. Before a single instruction runs, the verifier checks that this code can't corrupt memory, a big part of why Java programs can't scribble over memory the way C programs can.

## @prepare

Preparation sets aside memory for the class's static fields and fills it with default values. `limit` is 0 for now, even though the source says 3.

## Predict @prepare

What will `limit` hold after the next stage?

- [ ] Still 0, until `main` assigns it
- [x] 3
- [ ] It isn't set until a line of `main` reads it

> The next stage, initialization, runs the class's static initializer, which sets `limit` to 3 before `main` ever starts.

## @initialize

`javac` collected `= 3` into a special method, `static {}`. The JVM runs it exactly once, just before `Program` is first used.

## @run-main

Now the JVM calls `main` on the main thread and pushes its Frame onto the Stack, exactly as the Memory lessons show.

## @resolve

Bytecode refers to other methods and fields by name, through numbered entries like `#19`. The first time an instruction uses one, the JVM looks the name up, finds the real method, and remembers the answer for every later call. That's why resolution happens while the program runs.

## @interpret-load

This is the third call, `square(3)`, running in the interpreter. Bytecode works on an operand stack: instructions push values onto it and pop values off it. `iload_0` copies local variable 0, which is `n`, onto the stack.

## @interpret-load-again

The same instruction again. Now two copies of 3 are waiting on the stack.

## Predict @interpret-load-again

`imul` runs next. What will the operand stack hold afterwards?

- [ ] 3, 3 and 9
- [x] Just 9
- [ ] 6

> `imul` pops both values, multiplies them, and pushes the single result. Every arithmetic instruction works this way.

## @interpret-multiply

`imul` popped both 3s and pushed 9.

## @interpret-return

`ireturn` pops the result and hands it back. `square`'s Frame is popped, and 9 lands on `main`'s operand stack, ready for `println`.

## @jit

Interpreting one instruction at a time is flexible but slow. The JVM counts how often each method runs. After a couple of hundred calls, the C1 compiler turns it into machine code, and after thousands, C2 recompiles it with heavier optimizations. Our program finishes long before that.

## @exit

When `main` returns and no other non-daemon threads are running, the JVM shuts down. That's the whole journey: compile, load, verify, prepare, initialize, interpret, and, for busy code, compile again.
