public class Program {
    public static void main(String[] args) {
        Lamp desk = new Lamp("desk"); // @mark create
        Lamp porch = new Lamp("porch"); // @mark second
        desk.turnOn(); // @mark call
        boolean lit = desk.isOn(); // @mark ask
        System.out.println(desk.describe() + ", " + porch.describe()); // @mark print
    } // @mark end
}

class Lamp {
    String room;
    boolean on;

    Lamp(String room) {
        this.room = room; // @mark constructor
    }

    void turnOn() {
        on = true; // @mark turn-on
    }

    boolean isOn() {
        return on;
    }

    String describe() {
        return room + " lamp is " + (on ? "on" : "off");
    }
}
