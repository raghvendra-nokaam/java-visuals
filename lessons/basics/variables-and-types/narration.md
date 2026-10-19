## @start

A variable is a named box that holds one value. In Java every box has a type, fixed when you declare it, and the type decides what the box can hold. Step through to watch the boxes appear.

## @int

`int age = 30;` makes a box called `age` that can only hold whole numbers, and puts 30 in it. An `int` holds numbers up to about 2.1 billion, positive or negative.

## @long

The world's population doesn't fit in an `int`. A `long` holds much bigger whole numbers. The `L` at the end tells Java this literal is a `long`; the underscores are just there to make it easier to read.

## @double

`double` holds numbers with a decimal point. It's precise to about 15 digits, which is fine for most things but not for money: banks use whole cents or `BigDecimal` instead.

## @boolean

A `boolean` is the smallest idea there is: `true` or `false`. Every `if` and every loop condition comes down to one.

## @char

A `char` holds a single character in single quotes: `'A'`. Text in double quotes is a `String`, a different thing entirely.

## Predict @string

`int`, `long`, `double`, `boolean` and `char` are all lowercase. Why does `String` start with a capital S?

- [ ] It's a typo that Java kept for compatibility
- [x] `String` is a class, not a primitive type
- [ ] Capital letters mark types that use more memory

> Java has exactly eight primitive types: `byte`, `short`, `int`, `long`, `float`, `double`, `boolean` and `char`. Everything else, `String` included, is a class, and class names start with a capital letter.

## @string

`String` is a class. A `String` variable holds a Reference to a `String` object rather than the text itself, which the Memory Track draws in detail. Java gives strings special treatment, such as the `"..."` literal and `+`, so they feel almost primitive.

## @reassign

`age = age + 1` reads the box, adds one, and writes the result back into the same box. There's no `int` this time: the variable already exists, so this just changes what's inside it.

## @copy

`int copy = age;` copies the value 31 into a brand-new box. The two boxes are now completely separate.

## Predict @change-copy

`copy` is about to become 99. What will `age` hold afterwards?

- [x] 31
- [ ] 99
- [ ] 30

> Assigning a primitive copies its value. Changing `copy` later has no effect on `age`.

## @concat

`age` is still 31: changing `copy` didn't touch it. Now `+` with a `String` on one side glues text together, turning the numbers into text along the way.

## @end

Every variable here was declared with a type, got a value, and some changed later. That's the whole life of a variable inside one method. When `main` returns, all of these boxes disappear.
