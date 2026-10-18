public class Program {
    public static void main(String[] args) {
        int count = 1;
        Box box = new Box(1); // @mark setup
        change(count, box); // @mark call
        System.out.println(count + " " + box.value); // @mark after
    } // @mark end

    static void change(int n, Box b) {
        n = 99; // @mark inside
        b.value = 99; // @mark use-box
    } // @mark leaving
}
