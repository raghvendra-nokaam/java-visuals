public class Program {
    public static void main(String[] args) throws InterruptedException {
        Counter counter = new Counter();
        Thread a = new Thread(new Worker(counter), "A"); // @mark create-threads
        Thread b = new Thread(new Worker(counter), "B");
        a.start(); // @mark start-threads
        b.start();
        a.join(); // @mark join
        b.join();
        System.out.println(counter.count); // @mark result
    } // @mark end
}
