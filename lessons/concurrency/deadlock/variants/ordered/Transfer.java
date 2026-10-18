class Transfer implements Runnable {
    private final Account from;
    private final Account to;
    private final int amount;

    Transfer(Account from, Account to, int amount) {
        this.from = from;
        this.to = to;
        this.amount = amount;
    }

    public void run() {
        // Every thread locks the two accounts in the same order: alphabetical by name.
        Account first = from.name.compareTo(to.name) < 0 ? from : to; // @mark choose-order
        Account second = first == from ? to : from;
        synchronized (first) { // @mark lock-first // @mark lock-first@B // @mark lock-first@B#2
            synchronized (second) { // @mark lock-second // @mark lock-second@B
                from.balance -= amount; // @mark move
                to.balance += amount;
            }
        }
    }
}
