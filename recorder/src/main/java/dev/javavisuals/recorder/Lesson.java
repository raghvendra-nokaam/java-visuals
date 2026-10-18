package dev.javavisuals.recorder;

import java.io.IOException;
import java.io.StringWriter;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import javax.tools.DiagnosticCollector;
import javax.tools.JavaFileObject;
import javax.tools.ToolProvider;

/**
 * One Variant of a Lesson's Program, compiled.
 *
 * <p>A Variant's sources are the lesson directory's .java files, with any same-named files in
 * {@code variants/<id>/} replacing them (docs/lesson-format.md). The {@code default} Variant is the root files as-is.
 *
 * @param id          lesson path relative to lessons/, e.g. "memory/method-calls"
 * @param sources     the Lesson Program's .java files, entry file first
 * @param classesDir  compiled output (with full debug info)
 * @param classNames  binary names of every class the Lesson Program defines; only these are stepped
 */
record Lesson(String id, Path dir, List<Path> sources, Path classesDir, Set<String> classNames) {

    /** Every Lesson Program's entry point is {@code Program.main}. */
    static final String MAIN_CLASS = "Program";

    static final String DEFAULT_VARIANT = "default";

    static Lesson compile(Path dir) throws IOException {
        return compile(dir, DEFAULT_VARIANT);
    }

    static Lesson compile(Path dir, String variantId) throws IOException {
        dir = dir.toAbsolutePath().normalize();
        Map<String, Path> byName = new TreeMap<>();
        javaFiles(dir).forEach(p -> byName.put(p.getFileName().toString(), p));
        // A Variant's overlay is optional: a Variant may differ only in its Schedule.
        Path overlay = dir.resolve("variants").resolve(variantId);
        if (!variantId.equals(DEFAULT_VARIANT) && Files.isDirectory(overlay)) {
            javaFiles(overlay).forEach(p -> byName.put(p.getFileName().toString(), p));
        }
        List<Path> sources = byName.values().stream()
                .sorted((a, b) -> isEntry(a) == isEntry(b) ? a.compareTo(b) : isEntry(a) ? -1 : 1)
                .toList();
        if (sources.isEmpty() || !isEntry(sources.getFirst())) {
            throw new IllegalArgumentException(dir + " has no " + MAIN_CLASS + ".java");
        }

        Path classesDir = Files.createTempDirectory("lesson-classes");
        var compiler = ToolProvider.getSystemJavaCompiler();
        var diagnostics = new DiagnosticCollector<JavaFileObject>();
        try (var fileManager = compiler.getStandardFileManager(diagnostics, null, null)) {
            var units = fileManager.getJavaFileObjectsFromPaths(sources);
            var options = List.of("-g", "--release", "25", "-proc:none", "-d", classesDir.toString());
            var out = new StringWriter();
            if (!compiler.getTask(out, fileManager, diagnostics, options, null, units).call()) {
                throw new IllegalStateException("Lesson Program failed to compile:\n" + diagnostics.getDiagnostics());
            }
        }

        Set<String> classNames;
        try (Stream<Path> files = Files.walk(classesDir)) {
            classNames = files.filter(p -> p.toString().endsWith(".class"))
                    .map(p -> classesDir.relativize(p).toString().replace(".class", "").replace('/', '.'))
                    .collect(Collectors.toUnmodifiableSet());
        }
        return new Lesson(lessonId(dir), dir, sources, classesDir, classNames);
    }

    private static List<Path> javaFiles(Path dir) throws IOException {
        try (Stream<Path> files = Files.list(dir)) {
            return files.filter(p -> p.toString().endsWith(".java")).toList();
        }
    }

    /** Path below the nearest enclosing "lessons" directory. */
    private static String lessonId(Path dir) {
        List<String> parts = new ArrayList<>();
        for (Path p = dir; p != null && p.getFileName() != null; p = p.getParent()) {
            if (p.getFileName().toString().equals("lessons")) {
                return String.join("/", parts.reversed());
            }
            parts.add(p.getFileName().toString());
        }
        throw new IllegalArgumentException(dir + " is not inside a lessons/ directory");
    }

    private static boolean isEntry(Path p) {
        return p.getFileName().toString().equals(MAIN_CLASS + ".java");
    }
}
