## @start

The kitchen from the last lesson, unchanged, except the waiter and chef are started as virtual threads with `Thread.ofVirtual()`.

## @start-waiter

`Thread.ofVirtual().start(...)` creates and starts a virtual thread in one go. It's still a `Thread`, with its own Stack, but it doesn't own an operating-system thread.

## @start-waiter in platform

`Thread.ofPlatform().start(...)` creates an ordinary platform thread, the kind every lesson so far has used. Each one is backed by its own operating-system thread for its whole life.

## @join

To run, a virtual thread sits at one of a few shared desks: carrier threads, the platform threads the JVM lends to whichever virtual thread has work to do.

## @join in platform

Each platform thread has its own desk, its own operating-system thread, whether it's working or not. Switch Variant to compare with virtual threads.

## @check

The waiter is at the counter, checking for a dish. While it works, it's sitting at a desk.

## @wait

The counter is empty, so the waiter is about to call `wait()`.

## Predict @wait

A virtual thread is about to wait inside a `synchronized` block. What happens to the desk it's sitting at?

- [ ] It stays reserved for the waiter until it wakes up
- [x] The waiter gets up and leaves it free for other virtual threads
- [ ] The JVM opens a new desk for the waiter

> Since Java 24, a virtual thread that waits, even inside `synchronized`, unmounts and frees its carrier. Before that it stayed stuck to the desk ("pinned"), which could leave other virtual threads with nowhere to sit.

## @wait@Waiter#2

The waiter is waiting and has left its desk. It isn't using any operating-system thread now: its Stack is kept on the Heap until the bell rings. That's why a program can have millions of virtual threads.

## @wait@Waiter#2 in platform

The waiter is waiting, but as a platform thread it keeps its desk, its operating-system thread, the whole time, doing nothing. A few thousand of those and the machine runs out.

## @notify

The chef is about to ring the bell.

## @check@Waiter#2

The chef left the counter, so the waiter sat down at a desk again and carries on where it left off. It might even be a different desk: a virtual thread isn't tied to any one carrier.

## @check@Waiter#2 in platform

The chef left the counter, and the waiter carries on at the same desk it had all along.

## @got

Same kitchen, same soup. The difference is cost: a waiting virtual thread uses almost nothing, so you can have one per task, even a million tasks, instead of sharing a small pool.
