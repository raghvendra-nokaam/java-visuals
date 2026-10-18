## @start

Two transfers will move money between the same two accounts, in opposite directions.

## @join

A moves 10 from checking to savings, and B moves 20 from savings to checking. Each one locks the account it takes money from, then the account it puts money into.

## @lock-first

A is about to lock `checking`, the account it takes money from.

## @lock-second

A holds checking's lock. Now it needs savings's lock as well.

## @lock-first@B in default

The scheduler switches to B. B is about to lock `savings`, its own `from` account.

## @lock-first@B in ordered

The scheduler switches to B, at the same moment as in the deadlock. But B sorted the accounts too, so it also starts with `checking`.

## Predict @lock-second@B in default

B holds savings and is about to ask for checking, which A holds, while A is about to ask for savings. What happens?

- [ ] B waits a moment, then A finishes and everything carries on
- [x] Each waits for the other's lock, forever
- [ ] The JVM notices and takes one of the locks away

> A can't continue without savings, and B can't continue without checking. Each holds what the other needs, and Java doesn't break the tie. This is a deadlock.

## @lock-second@A#2 in default

A asks for savings, but B holds it. A is blocked.

## @lock-second@B#2 in default

B asks for checking, which A holds. Now each thread is waiting for the other, so neither will ever run again. The program doesn't crash; it just stops making progress, and in a real server those threads stay stuck until it's restarted.

## @choose-order in ordered

The fix: before locking anything, both threads sort the two accounts by name, so every thread locks checking before savings.

## @lock-first@B#2 in ordered

B wants checking first, but A has it, so B waits. B holds nothing while it waits, so A can still get everything it needs.

## @result in ordered

110 and 90: both transfers finished. When every thread takes locks in the same order, a cycle of threads waiting for each other can't form.

## @end in ordered

Switch Variant to see the same moment with the opposite lock order.
