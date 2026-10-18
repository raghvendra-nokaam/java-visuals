package dev.javavisuals.recorder;

import dev.javavisuals.recorder.model.Trace;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

/**
 * Runs Lesson Programs under the Java Debug Interface and writes their Traces as JSON.
 *
 * <pre>
 * recorder record &lt;lesson-dir&gt;        every Variant of one Lesson → &lt;lesson-dir&gt;/traces/&lt;variant&gt;.json
 * recorder record-all &lt;lessons-dir&gt;   every Execution Lesson under it
 * </pre>
 */
public final class Main {

    static final String USAGE = "usage: recorder record <lesson-dir> | recorder record-all <lessons-dir>";

    private Main() {}

    public static void main(String[] args) throws Exception {
        if (args.length != 2) usage();
        switch (args[0]) {
            case "record" -> recordLesson(Path.of(args[1]));
            case "record-all" -> {
                List<Path> lessons = findExecutionLessons(Path.of(args[1]));
                if (lessons.isEmpty()) System.err.println("recorder: no Execution Lessons under " + args[1]);
                for (Path lesson : lessons) recordLesson(lesson);
            }
            default -> usage();
        }
    }

    /** Records every Variant and removes Traces for Variants that no longer exist. */
    static Map<String, Trace> recordLesson(Path dir) throws Exception {
        LessonConfig config = LessonConfig.read(dir);
        Map<String, Trace> traces = new LinkedHashMap<>();
        Path tracesDir = dir.resolve("traces");
        for (String variant : config.variants()) {
            Lesson lesson = Lesson.compile(dir, variant);
            Trace trace = Recorder.record(lesson, variant);
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

    static List<Path> findExecutionLessons(Path root) throws IOException {
        try (Stream<Path> files = Files.walk(root)) {
            return files.filter(p -> p.getFileName().toString().equals("lesson.yaml"))
                    .map(Path::getParent)
                    .filter(dir -> {
                        try {
                            return LessonConfig.read(dir).isExecution();
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
