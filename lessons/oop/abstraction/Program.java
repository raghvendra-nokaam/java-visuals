public class Program {
    public static void main(String[] args) {
        Shape[] shapes = new Shape[2];
        shapes[0] = new Circle(1); // @mark create
        shapes[1] = new Square(2);
        for (Shape shape : shapes) {
            String text = shape.describe(); // @mark call // @mark call@main#3
            System.out.println(text);
        }
    } // @mark end
}

abstract class Shape {
    abstract double area();

    String describe() {
        return "area " + area(); // @mark describe // @mark describe@main#3
    }
}

class Circle extends Shape {
    double radius;

    Circle(double radius) {
        this.radius = radius;
    }

    double area() {
        return 3.14 * radius * radius; // @mark circle-area
    }
}

class Square extends Shape {
    double side;

    Square(double side) {
        this.side = side;
    }

    double area() {
        return side * side; // @mark square-area
    }
}
