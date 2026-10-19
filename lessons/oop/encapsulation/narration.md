## @start

The bank's rule: a balance never goes below zero. Encapsulation means the object keeps its data to itself and lets other code change it only through methods that enforce the rules.

## @create

`balance` is `private`: only code inside `Account` can read or write it. Everybody else has to go through `withdraw` and `balance()`.

## @create in public-field

This time `balance` is `public`: any code anywhere can read it and write it. `withdraw` still checks the rule, but only for callers that use it.

## @check

`withdraw` checks the rule before touching the field. 30 is not more than 100, so the money can be taken.

## @take

`balance -= amount` runs inside the class, which is allowed to touch its own `private` field.

## Predict @overdraw

Someone tries to withdraw 500 from an account holding 70. What happens?

- [x] `withdraw` refuses and returns `false`; the balance stays 70
- [ ] The balance becomes -430
- [ ] The program crashes

> The only way to change `balance` is `withdraw`, and `withdraw` checks first. The rule can't be broken from outside.

## @refuse in default

500 is more than 70, so `withdraw` returns `false` without touching `balance`. The caller learns the withdrawal failed and the account stays valid.

## @end

The balance is still 70. Code outside `Account` can't write `account.balance = -1000`: it wouldn't compile. The class guards its own rules, so they hold however it's used.

## @overdraw in public-field

`balance` is `public` in this Variant, so any code can change it directly and skip `withdraw` altogether.

## Predict @overdraw in public-field

`main` subtracts 500 straight from the public field. What happens?

- [ ] Java refuses, because `withdraw` has a check
- [x] The balance becomes -430
- [ ] The program crashes

> The check lives in `withdraw`, and this line doesn't call `withdraw`. With the field `public`, nothing stands between other code and the data.

## @end in public-field

-430: the bank's rule is broken, and nothing in `Account` could stop it. That's why fields are almost always `private`, with methods deciding what changes are allowed.
