public class Program {
    public static void main(String[] args) {
        int total = sum(new int[] {3, 4, 5}); // @mark call
        System.out.println(total); // @mark done
    } // @mark end

    static int sum(int[] numbers) {
        int total = 0; // @mark inside
        for (int i = 0; i < numbers.length; i++) { // @mark loop
            total += numbers[i];
        }
        return total; // @mark return
    }
}
