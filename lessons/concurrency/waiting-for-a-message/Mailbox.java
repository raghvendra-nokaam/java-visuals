class Mailbox {
    private String message;

    String take() throws InterruptedException {
        synchronized (this) { // @mark take-lock
            while (message == null) { // @mark check // @mark check@Reader#2
                wait(); // @mark wait // @mark wait@Reader#2
            }
            String taken = message; // @mark collect
            message = null;
            notifyAll();
            return taken;
        }
    }

    void put(String text) throws InterruptedException {
        synchronized (this) { // @mark put-lock
            while (message != null) {
                wait();
            }
            message = text; // @mark deposit
            notifyAll(); // @mark notify
        }
    }
}
