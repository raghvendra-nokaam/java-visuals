public class Program {
    public static void main(String[] args) throws InterruptedException {
        TicketOffice office = new TicketOffice();
        Thread a = new Thread(new Agent(office), "A"); // @mark create-threads
        Thread b = new Thread(new Agent(office), "B");
        a.start(); // @mark start-threads
        b.start();
        a.join(); // @mark join
        b.join();
        System.out.println(office.sold + " tickets recorded"); // @mark result
    } // @mark end
}
