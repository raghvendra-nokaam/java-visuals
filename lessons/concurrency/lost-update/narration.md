## @start

Two threads will each add 1 to the same `Counter`. It starts at 0, so you'd expect it to end at 2.

## @join

A and B are ready, both holding a Reference to the one Counter on the Heap.

## @increment

`count++` looks like one action, but it's three: read `count`, add 1, write it back. This line is split into those parts so you can see each one.

## Predict @increment

A is about to read `count`. If the scheduler switches to B right after A's read, what will B read?

- [ ] 1, because A has already counted
- [x] 0, because A hasn't written anything back yet
- [ ] Nothing: B has to wait until A is done

> A's new value exists only inside A's own working space until A writes it back. Until then, `count` on the Heap is still 0, and nothing stops B from reading it.

## @increment@B

B is about to read `count`, and it's still 0. Both threads will be working from the same stale value, and each will write back 1.

## @increment@B in lucky

This time A finished writing 1 before B started, so B is about to read 1.

## @result

It printed 1. There were two increments, but B's write replaced A's. That's a lost update. Nothing crashed and nothing warned you: the answer is just wrong, and only some timings show it.

## @result in lucky

It printed 2. Same code, different timing. That's why race conditions are so hard to find: most runs look fine.

## @lock in synchronized

`synchronized (this)` takes the Counter's lock before touching `count`. Only one thread can hold a given object's lock at a time.

## @lock@B#2 in synchronized

B wants the Counter's lock, but A holds it, so B is blocked. It can't run at all until A lets go.

## @increment@B in synchronized

A released the lock as it left the `synchronized` block. B got the lock and is about to read 1, A's result.

## @result in synchronized

2, every time, whatever the timing. While one thread holds the lock, no other thread using the same lock can get between its read and its write.
