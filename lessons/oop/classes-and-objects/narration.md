## @start

A class is a description: "a lamp has a room and is either on or off, and it can be turned on". An object is one actual lamp built from that description. One class can make as many objects as you like.

## @create

`new Lamp("desk")` builds a `Lamp` object and runs its constructor, the special method named after the class that sets the new object up.

## @constructor

Inside the constructor, `this` is the brand-new lamp. Its fields start at default values: `null` for `room` and `false` for `on`. This line copies the parameter into the field.

## @second

`desk` now holds a lamp whose `room` is "desk". A second `new` builds a second, completely separate lamp from the same class.

## Predict @call

`desk.turnOn()` sets `on = true`. Which lamps will be on afterwards?

- [x] Only the desk lamp
- [ ] Both lamps, since they share the class `Lamp`
- [ ] Neither, until the program prints them

> Each object has its own copy of every (non-`static`) field. A method changes the fields of the object it was called on, the one before the dot.

## @turn-on

Inside `turnOn`, `this` is the desk lamp, because `turnOn` was called on `desk`. `on` here is short for `this.on`.

## @ask

The desk lamp is on and the porch lamp is still off. `isOn()` doesn't change anything: it just reports a field's value. Methods that answer questions like this are very common.

## @print

Each `describe()` call reads the fields of its own lamp, so the two lamps describe themselves differently.

## @end

One class, two objects, each with its own state. The class holds the code, the objects hold the data, and a method always works on the object it was called on.
