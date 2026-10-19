public class Program {
    public static void main(String[] args) {
        int apples = 17;
        int people = 5;
        int each = apples / people; // @mark divide
        int left = apples % people; // @mark remainder
        double exact = (double) apples / people; // @mark cast
        int served = 0; // @mark counter
        served++; // @mark increment
        served += 4; // @mark compound
        boolean enough = each >= 3; // @mark compare
        boolean fair = enough && left == 0; // @mark and
        String label = "Each gets " + each; // @mark concat
        System.out.println(label + ", " + left + " left over");
    } // @mark end
}
