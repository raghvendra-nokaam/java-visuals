## @start

`Dog` and `Cat` each override `speak()` with their own version. `Fish` doesn't. All three are `Animal`s, so they can share one `Animal[]` array.

## @loop

Each lap, `pet` holds one of the pets. Its type is `Animal`, but the object it refers to is a `Dog`, a `Cat` or a `Fish`.

## Predict @call

`pet` is declared as an `Animal`, and right now it refers to a `Dog`. Which `speak()` will run?

- [ ] `Animal`'s, because `pet` is an `Animal` variable
- [x] `Dog`'s, because the object is a `Dog`
- [ ] Both, one after the other

> The variable's type decides which methods you're allowed to call. The object's real class decides which version actually runs.

## @dog-speak

Java started its search at the object's own class, `Dog`, found a `speak()` there, and ran it. The variable's type `Animal` didn't matter. Choosing a method by the object's class while the program runs is called dynamic dispatch.

## @call@main#3

Same line, a different object: this time `pet` refers to a `Cat`.

## @cat-speak

The search started at `Cat` and found `Cat`'s own `speak()`. One line of code, a different method each lap: that's polymorphism ("many forms").

## Predict @call@main#5

`pet` now refers to a `Fish`, and `Fish` doesn't override `speak()`. What happens?

- [ ] It doesn't compile
- [ ] It throws an exception at run time
- [x] Java moves up to `Animal` and runs its `speak()`

> The search walks up the class hierarchy until it finds the method. The compiler already checked that `Animal` has a `speak()`, so the search always succeeds.

## @animal-speak

Nothing in `Fish`, so the search moved up to `Animal` and ran its version. Overriding is optional: a subclass changes only the behaviour it wants to.

## @end

The calling code never asks "is this a dog or a cat?". Each object brings its own behaviour, so you can add a `Parrot` later without changing this loop.
