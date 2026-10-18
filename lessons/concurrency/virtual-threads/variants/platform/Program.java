public class Program {
    public static void main(String[] args) throws InterruptedException {
        Mailbox box = new Mailbox();
        Thread reader = Thread.ofPlatform().name("Reader").start(new Reader(box)); // @mark start-reader
        Thread writer = Thread.ofPlatform().name("Writer").start(new Writer(box)); // @mark start-writer
        reader.join(); // @mark join
        writer.join();
    } // @mark end
}
