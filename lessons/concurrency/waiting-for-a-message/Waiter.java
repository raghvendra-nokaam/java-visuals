class Waiter implements Runnable {
    private final Pass pass;

    Waiter(Pass pass) {
        this.pass = pass;
    }

    public void run() {
        try {
            String plate = pass.collect(); // @mark take
            System.out.println("Served " + plate); // @mark got
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
