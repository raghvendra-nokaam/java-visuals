import java.util.concurrent.locks.ReentrantLock;

class RecordsRoom {
    private final ReentrantLock door = new ReentrantLock();
    int filed;
    int turnedAway;

    void fileReport() {
        if (door.tryLock()) { // @mark lock // @mark lock@B
            try {
                addToCabinet(1); // @mark call-add
            } finally {
                door.unlock(); // @mark unlock
            }
        } else {
            turnedAway++; // @mark gave-up
        }
    }

    private void addToCabinet(int reports) {
        door.lock(); // @mark relock
        try {
            filed += reports; // @mark update @substeps
        } finally {
            door.unlock();
        }
    }
}
