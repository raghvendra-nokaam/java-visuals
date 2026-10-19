## @start

So far, programs ran top to bottom, one line after another. Control flow lets a program skip lines or repeat them. Keep an eye on the highlighted line as it jumps around.

## @if

An `if` checks a `boolean` condition. `temperature > 30` is `false`, so Java skips the block in braces and tries the `else if`.

## Predict @if

Which line will run next after the conditions are checked?

- [ ] `advice = "Stay inside";`
- [x] `advice = "T-shirt weather";`
- [ ] `advice = "Bring a jacket";`

> 24 isn't above 30, but it is above 20. Java takes the first branch whose condition is `true` and skips all the others.

## @chosen

Only one branch of an `if`/`else if`/`else` chain ever runs. Once this one finishes, Java jumps past the rest of the chain.

## @for

A `for` loop has three parts: start (`int day = 1`), keep going while (`day <= 3`), and after each lap (`day++`). `day` exists only inside the loop.

## @body

The body runs once per lap. Watch `day` and `total` change with each lap.

## @body@main#3

Third lap: `day` is 3. After this, `day++` makes it 4, `day <= 3` is `false`, and the loop ends.

## @after-for

`total` is 1 + 2 + 3 = 6, and `day` is gone: it only existed inside the loop.

## @while

A `while` loop checks its condition before every lap, and stops as soon as the condition is `false`. Use it when you don't know in advance how many laps you'll need.

## Predict @while

`countdown` starts at 2. How many times will `countdown--` run?

- [ ] 1
- [x] 2
- [ ] 3

> 2 > 0, so run: 1. 1 > 0, so run: 0. 0 > 0 is `false`, so stop. That's two laps.

## @switch

A `switch` compares one value against several cases. Written with arrows like this, it's an expression: it produces a value, here assigned to `size`. `default` catches anything no case matched.

## @end

`if` chooses, `for` and `while` repeat, and `switch` picks one of many. Every program you'll ever write is built from these plus method calls.
