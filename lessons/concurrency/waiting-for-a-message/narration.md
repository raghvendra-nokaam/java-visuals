## @start

In a restaurant kitchen, the pass is the counter where the chef puts finished dishes and waiters pick them up. Here a Waiter thread wants a dish that a Chef thread hasn't made yet. If the waiter gets there first, it has to wait without pacing up and down.

## @join

The waiter and the chef share one `Pass`. Its `dish` starts out `null`: the counter is empty.

## @take-lock

The waiter is about to take the pass's lock. Both `collect` and `serve` use it, so only one of them can be at the counter at a time.

## @check

The waiter is at the counter and about to check whether a dish is there.

## @wait in default

The counter is empty, so the waiter is about to call `wait()`.

## Predict @wait in default

The waiter calls `wait()` while holding the pass's lock. Can the chef get to the counter to put the dish down?

- [ ] No: the waiter keeps the lock while it waits
- [x] Yes: `wait()` gives up the lock until the waiter is woken
- [ ] Only after a timeout

> `wait()` gives up the lock and puts the thread to sleep in one step. That's what lets the chef in. When the waiter wakes up, it must get the lock back before it continues.

## @wait@Waiter#2 in default

The waiter is asleep at the side, holding nothing. It won't run again until someone calls `notify()` or `notifyAll()` on the same pass.

## @put-lock in default

The chef is about to take the lock. The waiter gave it up when it called `wait()`, so the counter is free.

## @deposit

The chef is about to put the soup on the counter.

## @notify in default

The chef is about to ring the bell: `notifyAll()` wakes every thread waiting on the pass.

## Predict @notify in default

When the chef rings the bell, does the waiter pick up the soup straight away?

- [ ] Yes, right away
- [x] Not until the chef steps away from the counter and releases the lock
- [ ] No, the waiter also needs `start()` again

> The bell moves the waiter from sleeping to wanting the counter. The chef still holds the lock, so the waiter can't continue until the chef's `synchronized` block ends.

## @check@Waiter#2 in default

The waiter is awake and has the counter again, so it checks once more. That's why the check is a `while`, not an `if`: by the time a woken thread runs, things may have changed, and threads can even wake up without a bell.

## @collect

There's soup on the counter. The waiter is about to take it and leave the counter empty.

## @got

The waiter serves the soup, without ever pacing back and forth while it waited.

## @put-lock in chef-first

The chef got there first, so the counter is free and empty.

## @check in chef-first

The waiter is at the counter and about to check. The soup is already there, so it won't need to wait.

## @got in chef-first

The waiter never called `wait()`. It only waits when it has to. Switch Variant to see it wait.
