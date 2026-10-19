class Clerk implements Runnable {
    private final RecordsRoom room;

    Clerk(RecordsRoom room) {
        this.room = room;
    }

    public void run() {
        room.fileReport(); // @mark call-file
    }
}
