## @start

A ticket office keeps one shared tally of tickets sold. Two agents, threads A and B, will each sell one ticket and add it to the tally. It starts at 0, so it should end at 2.

## @join

Both agents are ready, and both hold a Reference to the same `TicketOffice`. There's one tally, and two people about to update it.

## @record

Recording a sale is `sold++`. It looks like one action, but an agent really does three things: look at the tally, add one in their head, and write the new number back.

## Predict @record

Agent A is about to look at the tally. If agent B also looks before A writes anything back, what will B see?

- [ ] 1, because A has already sold a ticket
- [x] 0, because A hasn't written anything back yet
- [ ] Nothing: B has to wait until A is done

> A's new number exists only in A's head until A writes it back. Until then the tally still says 0, and nothing stops B from reading it.

## @record@B

Agent B is about to look at the tally too, and it still says 0. Both agents will be working from the same old number, and each will write back 1.

## @record@B in lucky

This time agent A finished writing 1 before B looked, so B is about to see 1.

## @result

Two tickets were sold, but the tally says 1. B's write replaced A's: a lost update. Nothing crashed and nothing warned anyone. The number is just wrong, and only some timings show it.

## @result in lucky

The tally says 2. Same code, different timing. That's why race conditions are so hard to find: most runs look fine.

## @lock in synchronized

`synchronized (this)` makes an agent take the office's lock before touching the tally. Only one agent can hold it at a time.

## @lock@B#2 in synchronized

Agent B wants the lock, but A holds it, so B has to wait. It can't even look at the tally until A lets go.

## @record@B in synchronized

A released the lock when it left the `synchronized` block. B got it and is about to see 1, A's result.

## @result in synchronized

2, every time, whatever the timing. While one agent holds the lock, no other agent using the same lock can get between its read and its write.
