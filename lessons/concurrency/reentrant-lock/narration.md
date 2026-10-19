## @start

A records room has one door and one key, a `ReentrantLock`. Two clerks, threads A and B, each want to file one report in the cabinet inside.

## @join

Both clerks share the one records room, and through it the one key.

## @lock

Clerk A is about to take the key with `lock()`. Nobody has it, so A gets it straight away.

## @relock

A is inside, holding the key, and is about to unlock the cabinet's own door with the same key. A plain lock would make A wait for itself, forever.

## Predict @relock

What happens when clerk A calls `lock()` on a key it's already holding?

- [ ] A waits for itself, forever
- [x] A gets it again, and the lock counts how many times A is holding it
- [ ] It throws an exception

> That's what "reentrant" means: whoever holds the lock can take it again, and it's only free once every `lock()` has a matching `unlock()`. `synchronized` locks work the same way.

## @update

A is holding the key twice and is about to read how many reports are filed.

## @lock@B in default

The scheduler switches to clerk B while A is mid-filing. B is about to ask for the key with `lock()`.

## @lock@B#2 in default

A has the key, so B waits in the queue at the door. It's just like being blocked on `synchronized`: B can't do anything until A comes out.

## @unlock in default

A is leaving. It was holding the key twice, so this last `unlock()` is the one that actually frees it, and hands it to B, first in the queue.

## @update@B in default

B has the key now and is about to read 1, A's report.

## @result in default

2 filed, 0 turned away. As safe as `synchronized`, but the lock is an object: you can ask who holds it, try it without waiting, and pass it around.

## @lock@B in try-lock

Clerk B is about to call `tryLock()`. Unlike `lock()`, it never queues: it takes the key if it's on the hook and returns `true`, or returns `false` at once.

## @gave-up in try-lock

The key was taken, so `tryLock()` returned `false` and B walked away instead of waiting. Useful when waiting would be worse than coming back later.

## @result in try-lock

1 filed, 1 turned away. Nothing was lost by accident: B chose not to wait. Switch Variant to compare with `lock()`.
