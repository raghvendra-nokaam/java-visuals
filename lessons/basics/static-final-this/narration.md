## @start

A box office prints numbered tickets. Each `Ticket` remembers its own number and holder, but the count of tickets issued so far has to be shared by all of them. Keywords decide which is which.

## @start in per-object

This Variant is the same program, except `issued` isn't `static`. Watch what that does to the ticket numbers.

## @first

`new` creates an object from a class, then runs its constructor. The class is the blueprint; each `new` makes another object from it.

## @count

`issued` is `static`: it belongs to the class `Ticket` itself, not to any one ticket. There's exactly one `issued`, shown under Static fields, however many tickets exist.

## @count in per-object

Without `static`, `issued` is an ordinary field. Every `Ticket` gets its own `issued`, starting at 0.

## @this

`this` means "the object being built (or used) right now". `this.number` is that ticket's own `number`. It also tells the field `name` apart from the parameter `name`.

## Predict @second

The second ticket is about to be created. What number will it get?

- [ ] 1, because every ticket starts counting from 0
- [x] 2, because `issued` is shared and already 1
- [ ] It depends on which thread runs first

> One `static` counter, shared by every `Ticket`. The first ticket left it at 1, so the second makes it 2.

## Predict @second in per-object

The second ticket is about to be created, and `issued` is no longer `static`. What number will it get?

- [x] 1
- [ ] 2
- [ ] 0

> The new ticket gets its own fresh `issued`, starting at 0, so it counts to 1 again. Both tickets say "ticket 1".

## @call

`final` fields can be set once, in the constructor, and never again. Try writing `number = 5` anywhere else and the code won't compile. `PRICE` is `static final`: one shared value that never changes, a constant. Constants are named in capitals by convention.

## @return

`return` ends the method and hands a value back to the caller, which stores it in `who`. A method declared `String` must return a `String` on every path.

## @result

`Ticket.issued` is read through the class name, with no object needed, because it belongs to the class.

## @result in per-object

There's no shared count any more, so the best we can do is ask one ticket. Each only counted itself: two tickets, and both think they're ticket 1.

## @end

`static` means one per class, not one per object. `final` means assigned once. `this` is the current object, `new` makes objects, and `return` hands a value back.
