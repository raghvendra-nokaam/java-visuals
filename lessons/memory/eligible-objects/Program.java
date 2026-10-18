public class Program {
    public static void main(String[] args) {
        Node a = new Node("A"); // @mark create-a
        a = new Node("B"); // @mark reassign
        makeTemporary(); // @mark call-temp
        Node x = new Node("X"); // @mark island
        Node y = new Node("Y");
        x.next = y;
        y.next = x; // @mark cycle
        x = null; // @mark drop-x
        y = null; // @mark drop-y
    } // @mark end

    static void makeTemporary() {
        Node temp = new Node("T"); // @mark temp
    } // @mark temp-return
}

class Node {
    String name;
    Node next;

    Node(String name) {
        this.name = name;
    }
}
