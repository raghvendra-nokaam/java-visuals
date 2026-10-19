## @start

So far every program has had one thread: `main`. Here `main` is a host who sets out a guest book and invites two guests, Ada and Bo. Each guest is a separate thread.

## @create-threads

`new Thread(...)` gets a guest ready: a Thread object holding the `Signer` task it will run. Nothing happens yet. A Thread does nothing until it's started.

## @start-threads

`start()` sends the guest in. Each thread gets its own Stack, its private notepad, and begins in its task's `run` method.

## @join

Two guests are inside now, plus the host. Only one moves at a time here, and the scheduler decides who. The host is about to wait for Ada with `join`.

## Predict @join

Ada and Bo will each count the letters in their name into a local variable, `letters`. Can Bo see Ada's `letters`?

- [ ] Yes, threads share all memory
- [x] No: each thread's local variables are its own, and only objects like the guest book are shared
- [ ] Only if both run the same class

> Every thread has its own Stack, so locals like `letters` are like a private notepad. The guest book is an object on the Heap, and anyone holding a Reference to it can write in it.

## @local

Ada is about to jot `letters` on her own notepad. Bo will get a separate one.

## @sign

Ada and Bo hold a Reference to the same guest book. Ada is about to write her name on line 0.

## @local@B

Ada has finished. Bo now runs the same code with his own notepad.

## @local@B in interleaved

The scheduler switched to Bo before Ada wrote anything. Threads can be switched between any two Steps, and the program doesn't get a say in when.

## @result

Both names are in the book. Two threads wrote into one shared object, but each wrote its own line, so nothing collided. The next lesson shows what happens when they write to the same place.

## @end

The order the guests signed in changed between Variants, but the book didn't, because they never wrote on the same line. Switch Variant at the top to compare.
