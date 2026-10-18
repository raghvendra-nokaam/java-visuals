class Counter {
    int count;

    void increment() {
        synchronized (this) { // @mark lock // @mark lock@B#2
            count++; // @mark increment // @mark increment@B @substeps
        }
    }
}
