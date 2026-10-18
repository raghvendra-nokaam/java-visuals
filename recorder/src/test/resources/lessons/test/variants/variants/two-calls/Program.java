public class Program {
    public static void main(String[] args) {
        int total = Helper.twice(1); // @mark first
        total += Helper.twice(total);
        System.out.println(total); // @mark done
    }
}
