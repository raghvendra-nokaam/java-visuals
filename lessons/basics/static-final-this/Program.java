public class Program {
    public static void main(String[] args) {
        Ticket first = new Ticket("Ada"); // @mark first
        Ticket second = new Ticket("Bo"); // @mark second
        String who = second.holder(); // @mark call
        System.out.println(Ticket.issued + " tickets at " + Ticket.PRICE + " each"); // @mark result
    } // @mark end
}

class Ticket {
    static final int PRICE = 12;
    static int issued = 0;
    final int number;
    final String name;

    Ticket(String name) {
        issued++; // @mark count
        this.number = issued; // @mark this
        this.name = name;
    }

    String holder() {
        return name + " has ticket " + number; // @mark return
    }
}
