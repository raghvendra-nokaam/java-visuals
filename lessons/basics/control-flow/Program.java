public class Program {
    public static void main(String[] args) {
        int temperature = 24;
        String advice;
        if (temperature > 30) { // @mark if
            advice = "Stay inside";
        } else if (temperature > 20) {
            advice = "T-shirt weather"; // @mark chosen
        } else {
            advice = "Bring a jacket";
        }
        int total = 0; // @mark after-if
        for (int day = 1; day <= 3; day++) { // @mark for
            total += day; // @mark body // @mark body@main#3
        }
        int countdown = 2; // @mark after-for
        while (countdown > 0) { // @mark while
            countdown--;
        }
        String size = switch (total) { // @mark switch
            case 0 -> "none";
            case 6 -> "six";
            default -> "lots";
        };
        System.out.println(advice + ", " + size); // @mark end
    }
}
