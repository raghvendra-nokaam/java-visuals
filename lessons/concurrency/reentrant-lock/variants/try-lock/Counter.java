import java.util.concurrent.locks.ReentrantLock;

class Counter {
    private final ReentrantLock lock = new ReentrantLock();
    int count;
    int missed;

    void increment() {
        if (lock.tryLock()) { // @mark lock // @mark lock@B
            try {
                add(1); // @mark call-add
            } finally {
                lock.unlock(); // @mark unlock
            }
        } else {
            missed++; // @mark gave-up
        }
    }

    private void add(int amount) {
        lock.lock(); // @mark relock
        try {
            count += amount; // @mark update @substeps
        } finally {
            lock.unlock();
        }
    }
}
