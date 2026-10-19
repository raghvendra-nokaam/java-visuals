## @start

Seventeen apples, five people. An expression is anything that works out to a value, like `apples / people`. The operators in it decide how.

## Predict @divide

`apples / people` is about to run, with both values `int`s. What will `each` hold?

- [ ] 3.4
- [x] 3
- [ ] 4

> When both sides are `int`, `/` is integer division: it throws away everything after the decimal point. It doesn't round, so even 19 / 5 gives 3.

## @remainder

`each` is 3. Integer division dropped the .4. The `%` operator, called remainder or modulo, gives what's left after dividing: 17 = 5 × 3 + 2.

## @cast

`(double)` is a cast: it turns `apples` into the `double` 17.0 before dividing. With a `double` on one side, `/` does real division, and the answer is 3.4.

## @counter

Counting is so common that Java has shortcuts for it. Watch `served` change.

## @increment

`served++` adds one to `served`. It's short for `served = served + 1`.

## @compound

`served += 4` is short for `served = served + 4`. There's `-=`, `*=`, `/=` and `%=` too.

## @compare

`>=` compares two numbers and gives a `boolean`. The others are `>`, `<`, `<=`, `==` (equal) and `!=` (not equal). Note that `==` compares, while a single `=` assigns.

## Predict @and

`enough` is `true`, and `left == 0` is `false`. What is `enough && left == 0`?

- [ ] `true`, because one side is true
- [x] `false`, because both sides must be true
- [ ] It doesn't compile: you can't mix `&&` and `==`

> `&&` means "and": both sides must be `true`. `||` means "or": one is enough. Both are lazy. If the left side already decides the answer, the right side never runs.

## @concat

`+` means something different when one side is a `String`: it joins text. `each` becomes `"3"` and is glued on the end.

## @end

Integer division drops the fraction, `%` gives the remainder, a cast changes a value's type, and `+` means "join" when text is involved. Those four cause most beginner surprises.
