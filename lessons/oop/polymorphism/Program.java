public class Program {
    public static void main(String[] args) {
        Animal[] pets = new Animal[3];
        pets[0] = new Dog(); // @mark create
        pets[1] = new Cat();
        pets[2] = new Fish();
        for (Animal pet : pets) { // @mark loop
            String sound = pet.speak(); // @mark call // @mark call@main#3 // @mark call@main#5
            System.out.println(sound); // @mark print
        }
    } // @mark end
}

class Animal {
    String speak() {
        return "..."; // @mark animal-speak
    }
}

class Dog extends Animal {
    @Override
    String speak() {
        return "Woof"; // @mark dog-speak
    }
}

class Cat extends Animal {
    @Override
    String speak() {
        return "Meow"; // @mark cat-speak
    }
}

class Fish extends Animal {
}
