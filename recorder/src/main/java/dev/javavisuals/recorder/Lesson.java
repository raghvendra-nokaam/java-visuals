package dev.javavisuals.recorder;

import java.io.IOException;
import java.io.StringWriter;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import javax.tools.DiagnosticCollector;
import javax.tools.JavaFileObject;
import javax.tools.ToolProvider;

/**
 * A Lesson directory on disk and its compiled Lesson Program.
 *
 * @param id          lesson path relative to lessons/, e.g. "memory/method-calls"
 * @param sources     the Lesson Program's .java files, entry file first
 * @param classesDir  compiled output (with full debug info)
 * @param classNames  binary names of every class the Lesson Program defines; only these are stepped
 */
record Lesson(String id, Path dir, List<Path> sources, Path classesDir, Set<String> classNames) {

    /** By convention the entry point is {@code Program.main}; lesson.yaml may override this in Phase 4. */
    static final String MAIN_CLASS = "Program";

    static Lesson compile(Path dir) throws IOException {
        dir = dir.toAbsolutePath().normalize();
        List<Path> sources;
        try (Stream<Path> files = Files.list(dir)) {
            sources = files.filter(p -> p.toString().endsWith(".java"))
                    .sorted((a, b) -> isEntry(a) == isEntry(b) ? a.compareTo(b) : isEntry(a) ? -1 : 1)
                    .toList();
        }
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
