public class Program {
    public static void main(String[] args) throws InterruptedException {
        RecordsRoom room = new RecordsRoom();
        Thread a = new Thread(new Clerk(room), "A"); // @mark create-threads
        Thread b = new Thread(new Clerk(room), "B");
        a.start(); // @mark start-threads
        b.start();
        a.join(); // @mark join
        b.join();
        System.out.println(room.filed + " filed, " + room.turnedAway + " turned away"); // @mark result
    } // @mark end
}
