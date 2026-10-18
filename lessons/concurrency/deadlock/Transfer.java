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
        synchronized (from) { // @mark lock-first // @mark lock-first@B
            synchronized (to) { // @mark lock-second // @mark lock-second@B // @mark lock-second@A#2 // @mark lock-second@B#2
                from.balance -= amount; // @mark move
                to.balance += amount;
            }
        }
    }
}
