public class Program {
    public static void main(String[] args) throws InterruptedException {
        GuestBook book = new GuestBook();
        Thread a = new Thread(new Signer(book, "Ada", 0), "A"); // @mark create-threads
        Thread b = new Thread(new Signer(book, "Bo", 1), "B");
        a.start(); // @mark start-threads
        b.start();
        a.join(); // @mark join
        b.join();
        System.out.println(book.signatures[0] + " and " + book.signatures[1] + " signed"); // @mark result
    } // @mark end
}
