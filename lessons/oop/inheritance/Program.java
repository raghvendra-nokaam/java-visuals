public class Program {
    public static void main(String[] args) {
        Dog rex = new Dog("Rex"); // @mark create
        rex.eat(); // @mark inherited
        rex.fetch(); // @mark own
        System.out.println(rex.name + ": " + rex.meals + " meal, " + rex.balls + " ball"); // @mark end
    }
}

class Animal {
    String name;
    int meals;

    Animal(String name) {
        this.name = name; // @mark animal-constructor
    }

    void eat() {
        meals++; // @mark eat
    }
}

class Dog extends Animal {
    int balls;

    Dog(String name) {
        super(name); // @mark super
    }

    void fetch() {
        balls++; // @mark fetch
    }
}
