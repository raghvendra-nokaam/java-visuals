public class Program {
    public static void main(String[] args) throws InterruptedException {
        Board board = new Board();
        Thread a = new Thread(new Signer(board, "Ada", 0), "A"); // @mark create-threads
        Thread b = new Thread(new Signer(board, "Bo", 1), "B");
        a.start(); // @mark start-threads
        b.start();
        a.join(); // @mark join
        b.join();
        System.out.println(board.names[0] + " and " + board.names[1]); // @mark result
    } // @mark end
}
