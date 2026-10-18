public class Program {
    public static void main(String[] args) throws InterruptedException {
        Mailbox box = new Mailbox();
        Thread reader = new Thread(new Reader(box), "Reader"); // @mark create-threads
        Thread writer = new Thread(new Writer(box), "Writer");
        reader.start(); // @mark start-threads
        writer.start();
        reader.join(); // @mark join
        writer.join();
    } // @mark end
}
