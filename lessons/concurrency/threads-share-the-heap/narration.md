## @start

So far every program has had one thread: `main`. This one creates a `Board` and two `Signer` tasks that both point at it, then starts two more threads to run them.

## @create-threads

`new Thread(...)` creates a Thread object on the Heap. Its `task` field holds the Signer it will run, but nothing runs yet: a Thread does nothing until it's started.

## @start-threads

`start()` asks the JVM for a real, running thread. Each new thread gets its own Stack and begins in its task's `run` method.

## @join

Three threads now, three Stacks: `main`, A and B. Only one runs at a time here, and the scheduler decides which. `main` is about to wait for A with `join`.

## Predict @join

A and B are about to run the same `run` method. Can A see B's local variables?

- [ ] Yes, threads share all memory
- [x] No: each thread's locals live in its own Stack, and only the Heap is shared
- [ ] Only if both threads run the same class

> Every thread gets its own Stack, so locals like `letters` belong to one thread. Objects on the Heap, like the Board, are shared by every thread that holds a Reference to them.

## @local

`letters` is about to appear in A's own Stack. B will get a separate `letters` in its Stack.

## @sign

A and B both hold a Reference to the same Board. A is about to write its name into slot 0.

## @local@B

A has finished. B now runs the same code with its own Stack and its own `letters`.

## @local@B in interleaved

The scheduler switched to B before A wrote anything. Threads can be switched between any two Steps, and the program doesn't get a say in when.

## @result

Both names are on the Board. Two threads wrote into one shared object, but each wrote its own slot, so nothing collided. The next lesson shows what happens when they write to the same place.

## @end

The order the threads ran in changed between Variants, but the result didn't, because they never touched the same data. Switch Variant at the top to compare.
