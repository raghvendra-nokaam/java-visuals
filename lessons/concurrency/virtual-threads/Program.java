public class Program {
    public static void main(String[] args) throws InterruptedException {
        Pass pass = new Pass();
        Thread waiter = Thread.ofVirtual().name("Waiter").start(new Waiter(pass)); // @mark start-waiter
        Thread chef = Thread.ofVirtual().name("Chef").start(new Chef(pass)); // @mark start-chef
        waiter.join(); // @mark join
        chef.join();
    } // @mark end
}
