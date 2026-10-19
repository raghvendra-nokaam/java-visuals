class TicketOffice {
    int sold;

    void sellOne() {
        synchronized (this) { // @mark lock // @mark lock@B#2
            sold++; // @mark record // @mark record@B @substeps
        }
    }
}
