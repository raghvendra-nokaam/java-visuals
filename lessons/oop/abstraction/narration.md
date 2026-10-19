## @start

Every shape can describe itself the same way, "area" followed by a number, but each kind of shape works out its area differently. Abstraction means writing the shared part once and leaving a gap, a promise, for the part only subclasses know.

## @create

`Shape` is `abstract`, so `new Shape()` wouldn't compile: a shape with no area formula is unfinished. `abstract double area();` has no body. It's a promise that every concrete shape must keep. `Circle` and `Square` both keep it.

## Predict @call

`shape` refers to a `Circle`, and `Circle` has no `describe()` of its own. Where will Java find it?

- [x] In `Shape`, the parent class
- [ ] Nowhere: abstract classes can't have ordinary methods
- [ ] Java will create a `Shape` object to run it

> Abstract classes can mix finished methods with abstract ones. `Circle` inherits `describe()` from `Shape`.

## @describe

`describe()` is `Shape`'s code, and it calls `area()`, which `Shape` doesn't implement. `this` is the `Circle`, so the search for `area()` starts at `Circle`.

## @circle-area

`Circle`'s `area()` runs. `Shape`'s code called it without knowing what kind of shape it was dealing with: the abstract method was the gap, and the subclass filled it.

## @call@main#3

Next lap: same call, but `shape` now refers to a `Square`.

## @describe@main#3

The same `describe()` code again. This time `this` is a `Square`, so `area()` will find `Square`'s version.

## @square-area

Different formula, same `describe()`. This is how frameworks are built: the general code lives in an abstract parent and calls abstract methods that each subclass fills in.

## @end

An `interface` takes the same idea further: a type that is nothing but promises, which any class can `implement`. Either way, code can depend on what something can do rather than exactly what it is.
