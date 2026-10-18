package dev.javavisuals.recorder;

import java.nio.file.Path;

/**
 * Runs a Lesson Program under the Java Debug Interface and writes its Trace as JSON.
 *
 * <pre>recorder record &lt;lesson-dir&gt; [--out &lt;file&gt;]</pre>
 *
 * Writes {@code <lesson-dir>/traces/default.json} unless {@code --out} is given.
 */
public final class Main {

    static final String USAGE = "usage: recorder record <lesson-dir> [--out <file>]";

    private Main() {}

    public static void main(String[] args) throws Exception {
        if (args.length < 2 || !args[0].equals("record") || (args.length != 2 && args.length != 4)
                || (args.length == 4 && !args[2].equals("--out"))) {
            System.err.println(USAGE);
            System.exit(2);
        }
        Path dir = Path.of(args[1]);
        String variant = "default";
        Path out = args.length == 4 ? Path.of(args[3]) : dir.resolve("traces").resolve(variant + ".json");

        var lesson = Lesson.compile(dir);
        var trace = Recorder.record(lesson, variant);
        TraceJson.write(trace, out);
        System.err.printf("recorder: %s → %s (%d Steps, %d Markers)%n",
                lesson.id(), out, trace.steps().size(), trace.markers().size());
    }

    /** Proves the JDI module resolves on the toolchain JDK. */
    static boolean jdiAvailable() {
        return ModuleLayer.boot().findModule("jdk.jdi").isPresent();
    }
}
