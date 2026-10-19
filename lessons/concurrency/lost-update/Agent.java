class Agent implements Runnable {
    private final TicketOffice office;

    Agent(TicketOffice office) {
        this.office = office;
    }

    public void run() {
        office.sellOne(); // @mark sell
    }
}
