class Chef implements Runnable {
    private final Pass pass;

    Chef(Pass pass) {
        this.pass = pass;
    }

    public void run() {
        try {
            pass.serve("soup"); // @mark put
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
