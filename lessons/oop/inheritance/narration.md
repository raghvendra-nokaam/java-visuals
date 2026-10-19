## @start

Every dog is an animal, but not every animal fetches. `Dog extends Animal` says that a `Dog` gets everything an `Animal` has, its fields and methods, and then adds its own.

## @super

Building a `Dog` starts with its constructor. Its first job is `super(name)`: call `Animal`'s constructor to set up the animal part of this object.

## @animal-constructor

This is `Animal`'s constructor running for the same new object. Look at `this`: it's a `Dog`, with `name`, `meals` and `balls`. There's only one object, built in layers.

## Predict @inherited

`Dog` never declares an `eat` method. What happens when `rex.eat()` runs?

- [ ] It doesn't compile, because `Dog` has no `eat`
- [x] It runs `Animal`'s `eat`, which `Dog` inherited
- [ ] It creates a separate `Animal` object to do the eating

> A subclass inherits its parent's methods. `rex.eat()` runs `Animal`'s code on `rex` itself.

## @eat

This is `Animal`'s code, but `this` is still Rex, the `Dog`. `meals++` updates Rex's own `meals` field.

## @fetch

`fetch` exists only in `Dog`. An `Animal` that isn't a dog couldn't call it.

## @end

One object, with fields from both classes: `name` and `meals` from `Animal`, `balls` from `Dog`. Inheritance lets you write shared behaviour once, in the parent, and add only what's different in each child.
