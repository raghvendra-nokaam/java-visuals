## @start

The lost-update Counter again, but now it guards `count` with a `ReentrantLock`, a lock object you take with `lock()` and release with `unlock()`.

## @join

Both threads share the Counter, and through it one `ReentrantLock` on the Heap.

## @lock

A is about to call `lock()`. Nobody holds the lock, so A gets it straight away.

## @relock

A already holds the lock and is about to lock it again in `add`. A plain lock would make A wait for itself, forever.

## Predict @relock

What happens when A calls `lock()` on a lock it already holds?

- [ ] A waits for itself, forever
- [x] A gets it again, and the lock counts how many times it's held
- [ ] It throws an exception

> That's what "reentrant" means: the thread that holds the lock can take it again, and it's only free once every `lock()` has been matched by an `unlock()`. `synchronized` locks work the same way.

## @update

A holds the lock twice and is about to read `count`.

## @lock@B in default

The scheduler switches to B while A is in the middle of its update. B is about to call `lock()`.

## @lock@B#2 in default

A holds the lock, so B joins the lock's queue and waits. From the outside it's just like being blocked on `synchronized`: B can't do anything until A lets go.

## @unlock in default

A releases the lock. It held it twice, so this last `unlock()` is the one that actually frees it, and hands it to B, first in the queue.

## @update@B in default

B holds the lock now and is about to read 1, A's result.

## @result in default

2 added, 0 gave up. Same safety as `synchronized`, but the lock is an object you can pass around, query, and use in ways a `synchronized` block can't.

## @lock@B in try-lock

B is about to call `tryLock()`. Unlike `lock()`, it never waits: it takes the lock if it's free and returns `true`, or returns `false` at once.

## @gave-up in try-lock

The lock was held, so `tryLock()` returned `false` and B took the `else` branch instead of waiting. Useful when waiting would be worse than skipping the work.

## @result in try-lock

1 added, 1 gave up. Nothing was lost by accident this time: B chose to skip its increment rather than wait. Switch Variant to compare with `lock()`.
