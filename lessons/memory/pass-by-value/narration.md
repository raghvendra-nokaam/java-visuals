## @start

`main` sets up two variables: an `int`, and a Reference to a `Box`. Then it hands both to `change`.

## @call

Calling `change(count, box)` copies each argument into the new Frame. Java always copies; there's no way to pass a variable itself.

## Predict @call

What does `change` receive in its parameter `b`?

- [ ] The variable `box` itself
- [ ] A copy of the Box object
- [x] A copy of the Reference, pointing at the same Box

> Arguments are always copied. For an object, the thing copied is the Reference: two arrows, still one Box.

## @inside

`n` is a copy of `count`, and `b` is a copy of `box`'s Reference, so both arrows lead to the same Box. `n = 99` changes only the copy.

## @use-box

`n` is 99, but `count` in `main` is still 1. Changing a parameter never touches the caller's variable. Next, `b = new Box(99)` points `b` at a brand-new Box.

## @use-box in mutate

`n` is 99, but `count` in `main` is still 1. Next, `b.value = 99` follows `b`'s arrow, which leads to the same Box `main` is using.

## Predict @use-box

When `change` returns, what will `main` print?

- [ ] `99 99`
- [ ] `1 99`
- [x] `1 1`

> `b = new Box(99)` only re-points the copy. `main`'s `box` still refers to the original Box, whose value is still 1.

## Predict @use-box in mutate

When `change` returns, what will `main` print?

- [ ] `99 99`
- [x] `1 99`
- [ ] `1 1`

> `b` and `box` refer to the same Box, so a change to its field through `b` is visible to `main`. `count` was copied, so it stays 1.

## @leaving

`b` now points at the new Box, while `main`'s `box` still points at the original. When `change` returns, its Frame and both copies disappear.

## @leaving in mutate

The one Box that `main` and `change` share now holds 99. When `change` returns its Frame disappears, but the change to the Box stays.

## @after

`change`'s Frame is gone and nothing refers to the Box it created, so that Box is eligible for garbage collection. `main`'s `box` never moved.

## @after in mutate

`change`'s Frame is gone. `count` is still 1 but `box.value` is 99, because the change was made to the object, not to the variable.

## @end

Java is always pass-by-value. For objects, the value copied is the Reference: a method can change the object it points to, but never the caller's variable. Switch Variant at the top to compare the two versions of `change`.
