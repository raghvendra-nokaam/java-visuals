public class Program {
    public static void main(String[] args) throws InterruptedException {
        Mailbox box = new Mailbox();
        Thread reader = Thread.ofVirtual().name("Reader").start(new Reader(box)); // @mark start-reader
        Thread writer = Thread.ofVirtual().name("Writer").start(new Writer(box)); // @mark start-writer
        reader.join(); // @mark join
        writer.join();
    } // @mark end
}
