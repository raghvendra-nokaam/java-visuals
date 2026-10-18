class Reader implements Runnable {
    private final Mailbox box;

    Reader(Mailbox box) {
        this.box = box;
    }

    public void run() {
        try {
            String message = box.take(); // @mark take
            System.out.println(message); // @mark got
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
