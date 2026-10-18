import java.util.concurrent.locks.ReentrantLock;

class Counter {
    private final ReentrantLock lock = new ReentrantLock();
    int count;
    int missed;

    void increment() {
        lock.lock(); // @mark lock // @mark lock@B // @mark lock@B#2
        try {
            add(1); // @mark call-add
        } finally {
            lock.unlock(); // @mark unlock
        }
    }

    private void add(int amount) {
        lock.lock(); // @mark relock
        try {
            count += amount; // @mark update // @mark update@B @substeps
        } finally {
            lock.unlock();
        }
    }
}
