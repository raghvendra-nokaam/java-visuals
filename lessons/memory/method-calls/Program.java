public class Program {
    public static void main(String[] args) {
        int x = 2;
        int y = 3;
        int sum = add(x, y); // @mark call-add
        Point p = new Point(sum, 0); // @mark new-point
        System.out.println(p); // @mark print
        p = null; // @mark object-dropped
    } // @mark end

    static int add(int a, int b) {
        int result = a + b; // @mark add-compute
        return result;
    }
}

record Point(int x, int y) {} // @mark point-constructor
