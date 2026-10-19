## @all

Java reserves 51 words that you can't use as names for your variables, methods or classes. You've met a dozen already. Each group below does one kind of job; step through, or click a group to jump to it.

## @types

The eight primitive types, plus `void`, which means "this method returns nothing". These are the only types written in lowercase, because they're built into the language rather than defined as classes.

## @structure

These shape a program. `class`, `interface` and `enum` declare new types. `extends` and `implements` connect them, which the OOP Track covers. `package` and `import` organise classes into folders and let you use classes from other packages.

## @access

Access modifiers decide who can use a class, field or method. `private` means only this class, `protected` adds subclasses and the same package, and `public` means everyone. Leaving the modifier off means "only this package".

## Predict @access

Why would you make `balance` `private` and add a `public` method to read it?

- [ ] Private fields use less memory
- [x] So other code can read the balance but can't set it to anything it likes
- [ ] Public fields can't hold numbers

> Hiding fields behind methods lets the class protect its own rules, such as "the balance never goes below zero". That idea is called encapsulation.

## @modifiers

`static` makes something belong to the class rather than to each object. `final` means it can't change: a variable assigned once, a method that can't be overridden, or a class that can't be extended. `abstract` marks something unfinished that a subclass must complete. `native`, `transient` and `strictfp` are rarely needed.

## @objects

`new` creates an object. `this` is the current object and `super` is its parent class's part. `instanceof` checks what kind of object something really is, and can name it in the same breath.

## @flow

Decisions and loops: `if`/`else`, `switch` with `case` and `default`, and the loops `for`, `while` and `do`. `break` leaves a loop, `continue` skips to its next lap, and `return` leaves the whole method.

## @errors

When something goes wrong, code can `throw` an exception. `try` runs code that might fail, `catch` handles the failure, and `finally` runs either way, which makes it the place to clean up. `throws` warns callers that a method can fail. `assert` checks something you believe is always true.

## @threads

`synchronized` lets only one thread at a time into a block, and `volatile` makes every thread see a field's latest value. The Concurrency Track shows both in action.

## @unused

`goto` and `const` are reserved but do nothing: Java's designers kept them so that nobody could use them as names. A lone `_` can't be a name either. Since Java 22 it means "I don't need this value".

## @contextual

These look like keywords but aren't reserved. `var`, `record`, `yield` and the others are keywords only in particular places, so old code that used `var` as a name still compiles. `true`, `false` and `null` are literals: values, like `42` or `"hi"`.
