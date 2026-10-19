public class Program {
    public static void main(String[] args) {
        Account account = new Account(100); // @mark create
        account.withdraw(30); // @mark withdraw
        boolean ok = account.withdraw(500); // @mark overdraw
        System.out.println("Balance: " + account.balance()); // @mark end
    }
}

class Account {
    private int balance;

    Account(int opening) {
        balance = opening;
    }

    boolean withdraw(int amount) {
        if (amount > balance) { // @mark check
            return false; // @mark refuse
        }
        balance -= amount; // @mark take
        return true;
    }

    int balance() {
        return balance;
    }
}
