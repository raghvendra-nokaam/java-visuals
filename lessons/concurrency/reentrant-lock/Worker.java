class Worker implements Runnable {
    private final Counter counter;

    Worker(Counter counter) {
        this.counter = counter;
    }

    public void run() {
        counter.increment(); // @mark call-increment
    }
}
