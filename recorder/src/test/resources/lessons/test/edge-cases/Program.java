import java.util.ArrayList;
import java.util.List;

public class Program {
    static int counter = 0;

    public static void main(String[] args) {
        new Point(1, 1); // @mark discard
        Point made = make(); // @mark made
        String greeting = "hi";
        List<Point> points = new ArrayList<>();
        points.add(made);
        counter++;
        int[] nums = {1, 2};
        nums[1] = 5; // @mark array-write
        System.out.println(greeting + counter);
    }

    static Point make() {
        Point p = new Point(2, 3);
        return p;
    }
}

record Point(int x, int y) {}
