## @start

An object stays alive as long as something can reach it, starting from a variable in a Frame or a static field. Watch three different ways an object loses that path.

## @reassign

`a` points at Node A. This line creates Node B and points `a` at it instead.

## Predict @reassign

After `a = new Node("B")` runs, what happens to Node A?

- [ ] It's deleted immediately
- [x] It stays on the Heap, but nothing can reach it, so it's eligible for garbage collection
- [ ] It becomes Node B's `next`

> Reassigning a variable removes one arrow. If that was an object's only Reference, the object becomes unreachable, but it stays in memory until the garbage collector runs.

## @call-temp

Node A is eligible: no variable reaches it any more. Next, `makeTemporary` creates an object that only its own local variable refers to.

## @temp

Inside `makeTemporary`, `temp` will hold the only Reference to Node T.

## @temp-return

When this method returns, its Frame is popped, and `temp` goes with it.

## Predict @temp-return

What happens to Node T when `makeTemporary` returns?

- [ ] It moves into `main`'s Frame
- [x] It becomes eligible, because its only Reference lived in the popped Frame
- [ ] Nothing: it's on the Heap, so it's safe

> Being on the Heap doesn't keep an object alive. Only a path of References from a live Frame or a static field does.

## @island

Node T is eligible too. Now the tricky case: two objects that refer to each other.

## @cycle

`x.next` points at Y. This line points `y.next` back at X, closing a loop.

## @drop-x

X and Y now refer to each other. `x = null` removes `main`'s arrow to X.

## Predict @drop-x

After `x = null` runs, is Node X eligible?

- [ ] Yes, because `x` no longer points at it
- [x] No, it can still be reached through `y` and then `y.next`
- [ ] No, because objects in a loop can never be collected

> X can still be reached by starting at `y` and following `next`. An object stays reachable as long as any path leads to it.

## @drop-y

X survives because `y.next` still leads to it. Now `y = null` removes the last arrow from `main` into the pair.

## @end

X and Y still point at each other, but no path from a Frame reaches either one, so both are eligible. The garbage collector looks for reachability, not for References, which is why loops like this don't leak memory in Java.
