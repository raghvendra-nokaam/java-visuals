public class Program {
    public static void main(String[] args) throws InterruptedException {
        Pass pass = new Pass();
        Thread waiter = Thread.ofPlatform().name("Waiter").start(new Waiter(pass)); // @mark start-waiter
        Thread chef = Thread.ofPlatform().name("Chef").start(new Chef(pass)); // @mark start-chef
        waiter.join(); // @mark join
        chef.join();
    } // @mark end
}
