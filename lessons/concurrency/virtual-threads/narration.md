## @start

The Reader and Writer from the last lesson again, unchanged, except that they're started as virtual threads with `Thread.ofVirtual()`.

## @start-reader

`Thread.ofVirtual().start(...)` creates and starts a virtual thread in one go. On the Heap it's a `VirtualThread` object, a kind of `Thread`, and it gets its own Stack just like a platform thread.

## @start-reader in platform

`Thread.ofPlatform().start(...)` creates an ordinary platform thread, the kind every lesson so far has used. Each one is backed by its own operating-system thread for its whole life.

## @join

A virtual thread doesn't own an operating-system thread. To run, it's mounted on a carrier: one of a small pool of platform threads the JVM shares between all virtual threads.

## @join in platform

Each platform thread has its own operating-system thread, whether it's running or not. Switch Variant to compare with virtual threads.

## @check

Reader holds the Mailbox's lock and is about to check for a message. While it runs, it's on a carrier.

## @wait

The Mailbox is empty, so Reader is about to call `wait()`.

## Predict @wait

A virtual thread is about to wait inside a `synchronized` block. What happens to the carrier it's running on?

- [ ] It stays tied to Reader until Reader wakes up
- [x] Reader lets go of it, so another virtual thread can use it
- [ ] The JVM creates a new carrier for Reader

> Since Java 24, a virtual thread that waits, even inside `synchronized`, unmounts and frees its carrier. Before that it stayed stuck to the carrier ("pinned"), which could starve other virtual threads.

## @wait@Reader#2

Reader is waiting and unmounted. It's not using any operating-system thread at all now: its Stack is kept on the Heap until it's woken up. That's why a program can have millions of virtual threads.

## @wait@Reader#2 in platform

Reader is waiting, but as a platform thread it keeps its operating-system thread the whole time, doing nothing. A few thousand of those and a machine runs out.

## @notify

Writer is about to call `notifyAll()`.

## @check@Reader#2

Writer released the lock, so Reader was mounted on a carrier again and continues where it left off. It may even be a different carrier than before: a virtual thread isn't tied to any particular one.

## @check@Reader#2 in platform

Writer released the lock, and Reader carries on on the same operating-system thread it had all along.

## @got

Same program, same result. The difference is cost: a waiting virtual thread uses almost nothing, so you can have one per task, even for a million tasks, instead of sharing a small pool.
