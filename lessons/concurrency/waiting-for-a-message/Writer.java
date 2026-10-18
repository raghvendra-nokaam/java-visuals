class Writer implements Runnable {
    private final Mailbox box;

    Writer(Mailbox box) {
        this.box = box;
    }

    public void run() {
        try {
            box.put("hello"); // @mark put
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
