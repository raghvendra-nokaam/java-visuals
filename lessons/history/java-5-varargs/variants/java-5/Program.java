public class Program {
    public static void main(String[] args) {
        int total = sum(3, 4, 5); // @mark call
        System.out.println(total); // @mark done
    } // @mark end

    static int sum(int... numbers) {
        int total = 0; // @mark inside
        for (int n : numbers) { // @mark loop
            total += n;
        }
        return total; // @mark return
    }
}
