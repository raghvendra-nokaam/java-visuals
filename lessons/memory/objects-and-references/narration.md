## @start

This line does two jobs. First `new` creates a `Dog` object on the Heap, then a Reference to it is stored in the variable `rex`.

## @constructor

The constructor runs with `this` pointing at the new Dog. Its fields start out as `null` and `0`, and these lines fill them in.

## @constructor jvm

The constructor runs with `this` pointing at the new Dog. The String `"Rex"` is an object too. At JVM detail you can see it on the Heap, while the Simple view writes Strings inline to keep the picture readable.

## @alias

`rex` now holds a Reference to the Dog. Next, `Dog alias = rex;` copies that Reference, not the Dog.

## Predict @alias

How many `Dog` objects exist after `Dog alias = rex;` runs?

- [ ] Two: the original, and a copy for `alias`
- [x] One, with two References pointing at it
- [ ] None until `alias` is used

> Assigning a Reference copies the arrow, not the object. Only `new` creates objects.

## @change-through-alias

Two arrows, one Dog. `alias.age = 4` follows `alias`'s arrow and changes the object at the end of it.

## Predict @change-through-alias

After `alias.age = 4` runs, what is `rex.age`?

- [ ] 3, because only `alias` was changed
- [x] 4, because `rex` and `alias` refer to the same Dog
- [ ] It doesn't compile: you can't change a field through a second variable

> There's only one Dog, so a change made through either Reference is visible through both.

## @create-fido

`rex.age` is 4 now, even though that line never mentioned `rex`. A second `new` is about to create a separate Dog for `fido`.

## @compare

`==` on References asks whether two arrows point at the same object. It doesn't look at names or ages.

## Predict @compare

What will `same` and `different` hold?

- [ ] Both `true`, since all three variables hold Dogs
- [x] `same` is `true` and `different` is `false`
- [ ] Both `false`, because `==` only works on primitives

> `==` compares References. `rex` and `alias` point at the same object; `fido` points at a different one. To compare what's inside two objects you'd write an `equals` method.

## @object-to-object

Fields can hold References too. `rex.friend = fido` draws an arrow from one object to another.

## @follow

`rex.friend.name` follows two arrows: from `rex` to its Dog, then from that Dog's `friend` field to Fido.

## @end

It printed Fido. Every object here is still reachable from `main`'s Frame, so nothing is eligible for garbage collection.
