public class Program {
    public static void main(String[] args) {
        int x = 2;
        int y = 3;
        int sum = add(x, y);
        Point p = new Point(sum, 0);
        System.out.println(p);
        p = null; // @mark object-dropped
    }

    static int add(int a, int b) {
        int result = a + b; // @mark add-compute
        return result;
    }
}

record Point(int x, int y) {}
