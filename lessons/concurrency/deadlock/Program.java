public class Program {
    public static void main(String[] args) throws InterruptedException {
        Account checking = new Account("checking", 100);
        Account savings = new Account("savings", 100);
        Thread a = new Thread(new Transfer(checking, savings, 10), "A"); // @mark create-threads
        Thread b = new Thread(new Transfer(savings, checking, 20), "B");
        a.start(); // @mark start-threads
        b.start();
        a.join(); // @mark join
        b.join();
        System.out.println(checking.balance + " " + savings.balance); // @mark result
    } // @mark end
}
