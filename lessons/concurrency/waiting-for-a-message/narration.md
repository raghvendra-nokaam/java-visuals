## @start

A Reader thread wants a message that a Writer thread will put in a shared `Mailbox`. If Reader gets there first, it has to wait without wasting time spinning in a loop.

## @join

Both threads share the one Mailbox. Its `message` starts out `null`, so it's empty.

## @take-lock

Reader is about to take the Mailbox's lock. Both `take` and `put` use it, so only one of them can look at `message` at a time.

## @check

Reader holds the lock and is about to check whether a message has arrived.

## @wait in default

The Mailbox is empty, so Reader is about to call `wait()`.

## Predict @wait in default

Reader calls `wait()` while holding the Mailbox's lock. Can Writer get in to put a message?

- [ ] No: Reader keeps the lock while it waits
- [x] Yes: `wait()` releases the lock until Reader is woken up
- [ ] Only after a timeout

> `wait()` gives up the lock and puts the thread to sleep in one step. That's what lets Writer in. When Reader wakes up, it must get the lock back before it continues.

## @wait@Reader#2 in default

Reader is waiting. It holds nothing and won't run again until another thread calls `notify()` or `notifyAll()` on the same object.

## @put-lock in default

Writer is about to take the lock. Reader gave it up when it called `wait()`, so it's free.

## @deposit

Writer is about to store `"hello"` in the Mailbox.

## @notify in default

Writer is about to call `notifyAll()`, which wakes every thread waiting on the Mailbox.

## Predict @notify in default

When Writer calls `notifyAll()`, does Reader start running immediately?

- [ ] Yes, right away
- [x] Not until Writer leaves its `synchronized` block and releases the lock
- [ ] No, Reader also needs `start()` again

> Notifying moves Reader from waiting to wanting the lock. Writer still holds it, so Reader can't continue until Writer finishes its `synchronized` block.

## @check@Reader#2 in default

Reader is awake and holds the lock again, so it checks the condition one more time. That's why the check is a `while`, not an `if`: by the time a woken thread runs, the condition may have changed again, and threads can even wake up without being notified.

## @collect

There's a message now. Reader is about to take it and empty the Mailbox.

## @got

Reader got its message, without ever spinning in a loop burning time while it waited.

## @put-lock in writer-first

Writer got there first, so the lock is free and the Mailbox is empty.

## @check in writer-first

Reader holds the lock and is about to check. Writer already left a message, so Reader won't need to wait.

## @got in writer-first

Reader never called `wait()`. It only waits when it has to. Switch Variant to see it wait.
