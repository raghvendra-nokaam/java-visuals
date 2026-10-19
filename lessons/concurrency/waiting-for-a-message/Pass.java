class Pass {
    private String dish;

    String collect() throws InterruptedException {
        synchronized (this) { // @mark take-lock
            while (dish == null) { // @mark check // @mark check@Waiter#2
                wait(); // @mark wait // @mark wait@Waiter#2
            }
            String plate = dish; // @mark collect
            dish = null;
            notifyAll();
            return plate;
        }
    }

    void serve(String food) throws InterruptedException {
        synchronized (this) { // @mark put-lock
            while (dish != null) {
                wait();
            }
            dish = food; // @mark deposit
            notifyAll(); // @mark notify
        }
    }
}
