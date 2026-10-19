public class Program {
    public static void main(String[] args) throws InterruptedException {
        Pass pass = new Pass();
        Thread waiter = new Thread(new Waiter(pass), "Waiter"); // @mark create-threads
        Thread chef = new Thread(new Chef(pass), "Chef");
        waiter.start(); // @mark start-threads
        chef.start();
        waiter.join(); // @mark join
        chef.join();
    } // @mark end
}
