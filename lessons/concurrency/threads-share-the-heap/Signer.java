class Signer implements Runnable {
    private final GuestBook book;
    private final String name;
    private final int line;

    Signer(GuestBook book, String name, int line) {
        this.book = book;
        this.name = name;
        this.line = line;
    }

    public void run() {
        int letters = name.length(); // @mark local // @mark local@B
        book.signatures[line] = name; // @mark sign
    }
}
