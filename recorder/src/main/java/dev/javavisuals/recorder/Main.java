package dev.javavisuals.recorder;

import dev.javavisuals.recorder.model.Trace;
import java.io.IOException;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.spi.ToolProvider;
import java.util.stream.Stream;

/**
 * Runs Lesson Programs under the Java Debug Interface and writes their Traces as JSON.
 *
 * <pre>
 * recorder record &lt;lesson-dir&gt;        every Variant of one Lesson → &lt;lesson-dir&gt;/traces/&lt;variant&gt;.json
 *                                     (a Pipeline Lesson gets &lt;lesson-dir&gt;/traces/bytecode.txt instead)
 * recorder record-all &lt;lessons-dir&gt;   every Execution and Pipeline Lesson under it
 * </pre>
 */
public final class Main {

    static final String USAGE = "usage: recorder record <lesson-dir> | recorder record-all <lessons-dir>";

    private Main() {}

    public static void main(String[] args) throws Exception {
        if (args.length != 2) usage();
        switch (args[0]) {
            case "record" -> record(Path.of(args[1]));
            case "record-all" -> {
                List<Path> lessons = findRecordableLessons(Path.of(args[1]));
                if (lessons.isEmpty()) System.err.println("recorder: nothing to record under " + args[1]);
                for (Path lesson : lessons) record(lesson);
            }
            default -> usage();
        }
    }

    private static void record(Path dir) throws Exception {
        if (LessonConfig.read(dir).isPipeline()) writeBytecode(dir);
        else recordLesson(dir);
    }

    /**
     * Writes {@code javap -c -p} output for every class of a Pipeline Lesson's Program, so the lesson shows the
     * bytecode javac really produces rather than a hand-typed copy.
     */
    static Path writeBytecode(Path dir) throws Exception {
        Lesson lesson = Lesson.compile(dir);
        var javap = ToolProvider.findFirst("javap").orElseThrow(() -> new IllegalStateException("javap not found"));
        var listing = new StringWriter();
        List<String> classes = lesson.classNames().stream()
                .sorted((a, b) -> a.equals(Lesson.MAIN_CLASS) ? -1 : b.equals(Lesson.MAIN_CLASS) ? 1 : a.compareTo(b))
                .toList();
        for (String className : classes) {
            var err = new StringWriter();
            Path classFile = lesson.classesDir().resolve(className.replace('.', '/') + ".class");
            int status = javap.run(new PrintWriter(listing), new PrintWriter(err), "-c", "-p", classFile.toString());
            if (status != 0) throw new IllegalStateException("javap failed for " + className + ": " + err);
        }
        Path out = dir.resolve("traces").resolve("bytecode.txt");
        Files.createDirectories(out.getParent());
        Files.writeString(out, listing.toString());
        System.err.printf("recorder: %s → bytecode for %d class(es)%n", lesson.id(), classes.size());
        return out;
    }

    /** Records every Variant and removes Traces for Variants that no longer exist. */
    static Map<String, Trace> recordLesson(Path dir) throws Exception {
        LessonConfig config = LessonConfig.read(dir);
        Map<String, Trace> traces = new LinkedHashMap<>();
        Path tracesDir = dir.resolve("traces");
        for (LessonConfig.VariantConfig v : config.variantConfigs()) {
            String variant = v.id();
            boolean hasOverlay = Files.isDirectory(dir.resolve("variants").resolve(variant));
            if (!variant.equals(Lesson.DEFAULT_VARIANT) && !hasOverlay && v.schedule() == null) {
                throw new IllegalArgumentException("Variant \"" + variant + "\" has neither a variants/" + variant
                        + "/ directory nor a schedule, so it would be identical to default");
            }
            Lesson lesson = Lesson.compile(dir, variant);
            Schedule schedule = v.schedule() == null ? Schedule.SEQUENTIAL : Schedule.read(dir, v.schedule());
            Trace trace = Recorder.record(lesson, variant, schedule);
            TraceJson.write(trace, tracesDir.resolve(variant + ".json"));
            traces.put(variant, trace);
            System.err.printf("recorder: %s [%s] → %d Steps, %d Markers%n",
                    lesson.id(), variant, trace.steps().size(), trace.markers().size());
        }
        try (Stream<Path> existing = Files.list(tracesDir)) {
            for (Path stale : existing.filter(p -> !traces.containsKey(p.getFileName().toString().replace(".json", ""))).toList()) {
                Files.delete(stale);
            }
        }
        return traces;
    }

    /** Execution Lessons, and Pipeline Lessons that have a Program to disassemble. */
    static List<Path> findRecordableLessons(Path root) throws IOException {
        try (Stream<Path> files = Files.walk(root)) {
            return files.filter(p -> p.getFileName().toString().equals("lesson.yaml"))
                    .map(Path::getParent)
                    .filter(dir -> {
                        try {
                            LessonConfig config = LessonConfig.read(dir);
                            return config.isExecution()
                                    || (config.isPipeline() && Files.exists(dir.resolve(Lesson.MAIN_CLASS + ".java")));
                        } catch (IOException e) {
                            throw new IllegalStateException(e);
                        }
                    })
                    .sorted()
                    .toList();
        }
    }

    private static void usage() {
        System.err.println(USAGE);
        System.exit(2);
    }

    /** Proves the JDI module resolves on the toolchain JDK. */
    static boolean jdiAvailable() {
        return ModuleLayer.boot().findModule("jdk.jdi").isPresent();
    }
}
