public class Program {
    public static void main(String[] args) {
        Dog rex = new Dog("Rex", 3); // @mark create-rex
        Dog alias = rex; // @mark alias
        alias.age = 4; // @mark change-through-alias
        Dog fido = new Dog("Fido", 2); // @mark create-fido
        boolean same = rex == alias; // @mark compare
        boolean different = rex == fido;
        rex.friend = fido; // @mark object-to-object
        System.out.println(rex.friend.name); // @mark follow
    } // @mark end
}

class Dog {
    String name;
    int age;
    Dog friend;

    Dog(String name, int age) {
        this.name = name; // @mark constructor
        this.age = age;
    }
}
