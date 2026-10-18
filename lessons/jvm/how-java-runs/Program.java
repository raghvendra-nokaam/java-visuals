public class Program {
    static int limit = 3;

    public static void main(String[] args) {
        for (int i = 1; i <= limit; i++) {
            System.out.println(square(i));
        }
    }

    static int square(int n) {
        return n * n;
    }
}
