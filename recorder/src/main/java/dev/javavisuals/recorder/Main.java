package dev.javavisuals.recorder;

/**
 * Runs a Lesson Program under the Java Debug Interface and writes its Trace as JSON.
 * The recording itself lands in Phase 2; see docs/build-plan.md.
 */
public final class Main {

    static final String USAGE = "usage: recorder record <lesson-dir>";

    private Main() {}

    public static void main(String[] args) {
        if (args.length != 2 || !args[0].equals("record")) {
            System.err.println(USAGE);
            System.exit(2);
        }
        System.err.println("recorder: recording is not implemented yet (Phase 2)");
        System.exit(1);
    }

    /** Proves the JDI module resolves on the toolchain JDK. */
    static boolean jdiAvailable() {
        return ModuleLayer.boot().findModule("jdk.jdi").isPresent();
    }
}
