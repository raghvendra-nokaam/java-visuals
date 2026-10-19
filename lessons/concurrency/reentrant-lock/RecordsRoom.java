import java.util.concurrent.locks.ReentrantLock;

class RecordsRoom {
    private final ReentrantLock door = new ReentrantLock();
    int filed;
    int turnedAway;

    void fileReport() {
        door.lock(); // @mark lock // @mark lock@B // @mark lock@B#2
        try {
            addToCabinet(1); // @mark call-add
        } finally {
            door.unlock(); // @mark unlock
        }
    }

    private void addToCabinet(int reports) {
        door.lock(); // @mark relock
        try {
            filed += reports; // @mark update // @mark update@B @substeps
        } finally {
            door.unlock();
        }
    }
}
