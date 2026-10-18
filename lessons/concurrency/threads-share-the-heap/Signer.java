class Signer implements Runnable {
    private final Board board;
    private final String name;
    private final int slot;

    Signer(Board board, String name, int slot) {
        this.board = board;
        this.name = name;
        this.slot = slot;
    }

    public void run() {
        int letters = name.length(); // @mark local // @mark local@B
        board.names[slot] = name; // @mark sign
    }
}
