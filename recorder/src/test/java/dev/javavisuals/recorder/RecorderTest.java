package dev.javavisuals.recorder;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import dev.javavisuals.recorder.model.Event;
import dev.javavisuals.recorder.model.Trace;
import dev.javavisuals.recorder.model.Trace.HeapObject;
import dev.javavisuals.recorder.model.Trace.Step;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

class RecorderTest {

    private static final Path REPO = Path.of("..").toAbsolutePath().normalize();
    private static Trace edge;

    @BeforeAll
    static void recordEdgeCases() throws Exception {
        edge = Recorder.record(Lesson.compile(Path.of("src/test/resources/lessons/test/edge-cases")), "default");
        // Leave it where the TypeScript validator can check it too (see trace-schema/scripts/validate.ts).
        TraceJson.write(edge, Path.of("build/traces/edge-cases.json"));
    }

    @Test
    void reproducesTheHandWrittenFixture() throws Exception {
        Trace trace = Recorder.record(Lesson.compile(REPO.resolve("lessons/memory/method-calls")), "default");
        var recorded = TraceJson.MAPPER.readTree(TraceJson.toJson(trace));
        var fixture = TraceJson.MAPPER.readTree(Files.readString(REPO.resolve("trace-schema/fixtures/method-calls.json")));
        assertEquals(fixture, recorded);
    }

    @Test
    void onlyLessonProgramFramesAppear() {
        for (Step step : edge.steps()) {
            step.threads().forEach(t -> t.frames().forEach(f ->
                    assertTrue(List.of("Program", "Point").contains(f.className()), f.className())));
        }
    }

    @Test
    void discardedObjectIsLiveDuringItsLineAndEligibleAfter() {
        int discard = edge.markers().get("discard");
        Step lineAfter = firstStepAtLine(9);
        HeapObject discarded = objectsOfType(lineAfter, "Point").stream()
                .filter(o -> o.allocatedAt() != null && o.allocatedAt().line() == 8)
                .findFirst().orElseThrow();
        assertEquals("eligible", discarded.state());
        assertTrue(lineAfter.events().contains(Event.eligible(discarded.id())));
        for (int i = discard; edge.steps().get(i).location().line() != 9; i++) {
            find(edge.steps().get(i), discarded.id()).ifPresent(o -> assertEquals("live", o.state()));
        }
    }

    @Test
    void returnedObjectStaysLiveInFlightAndCarriesTheReturnValue() {
        Step backInMain = edge.steps().stream()
                .filter(s -> s.events().stream().anyMatch(e -> e.type().equals("return") && e.value() != null && e.value().kind().equals("ref")))
                .findFirst().orElseThrow();
        String id = backInMain.events().stream().filter(e -> e.type().equals("return")).findFirst().orElseThrow().value().id();
        assertEquals(9, backInMain.location().line());
        for (Step step : edge.steps()) find(step, id).ifPresent(o -> assertEquals("live", o.state()));
    }

    @Test
    void stringsAreInlineAndCollectionInternalsAreHidden() {
        Step last = edge.steps().getLast();
        HeapObject greeting = objectsOfType(last, "java.lang.String").stream()
                .filter(o -> "\"hi\"".equals(o.display())).findFirst().orElseThrow();
        assertTrue(greeting.inline());
        assertFalse(greeting.internal());

        HeapObject list = objectsOfType(last, "java.util.ArrayList").getFirst();
        assertFalse(list.internal());
        assertEquals(11, list.allocatedAt().line());
        HeapObject backing = objectsOfType(last, "java.lang.Object[]").getFirst();
        assertTrue(backing.internal());
        assertEquals(null, backing.allocatedAt());
        // The Point inside the list is still the Lesson Program's own Object, not an internal.
        String pointId = backing.elements().getFirst().id();
        assertFalse(find(last, pointId).orElseThrow().internal());
    }

    @Test
    void staticAndArrayWritesAreAssignEvents() {
        assertTrue(edge.steps().stream().flatMap(s -> s.events().stream()).anyMatch(e ->
                e.type().equals("assign") && "Program".equals(e.target().className()) && "counter".equals(e.target().field())
                        && e.value().display().equals("1")));

        Step afterWrite = edge.steps().get(edge.markers().get("array-write") + 1);
        assertTrue(afterWrite.events().stream().anyMatch(e ->
                e.type().equals("assign") && Integer.valueOf(1).equals(e.target().index()) && e.value().display().equals("5")));
    }

    @Test
    void consoleOutputLandsOnTheStepAfterThePrint() {
        Step last = edge.steps().getLast();
        assertEquals("hi1\n", last.console());
        assertNotNull(last.events().stream().filter(e -> e.type().equals("output")).findFirst().orElse(null));
    }

    @Test
    void recordsEveryVariantWithOverlaidSources() throws Exception {
        Path dir = Path.of("build/variants-lesson");
        copyTree(Path.of("src/test/resources/lessons/test/variants"), dir.resolve("lessons/test/variants"));
        Path lesson = dir.resolve("lessons/test/variants");
        Files.createDirectories(lesson.resolve("traces"));
        Files.writeString(lesson.resolve("traces/removed-variant.json"), "{}");

        var traces = Main.recordLesson(lesson);

        assertEquals(List.of("default", "two-calls"), List.copyOf(traces.keySet()));
        assertEquals("2\n", traces.get("default").steps().getLast().console());
        assertEquals("6\n", traces.get("two-calls").steps().getLast().console());
        // Helper.java is shared; Program.java comes from the overlay.
        assertEquals(List.of("Program.java", "Helper.java"),
                traces.get("two-calls").source().stream().map(Trace.SourceFile::path).toList());
        assertEquals(traces.get("default").markers().keySet(), traces.get("two-calls").markers().keySet());
        assertTrue(Files.exists(lesson.resolve("traces/two-calls.json")));
        assertFalse(Files.exists(lesson.resolve("traces/removed-variant.json")), "stale Trace should be removed");
    }

    @Test
    void writesRealBytecodeForPipelineLessons() throws Exception {
        Path dir = Path.of("build/pipeline-lesson/lessons/jvm/how-java-runs");
        Files.createDirectories(dir);
        Files.copy(REPO.resolve("lessons/jvm/how-java-runs/Program.java"), dir.resolve("Program.java"),
                java.nio.file.StandardCopyOption.REPLACE_EXISTING);
        Files.writeString(dir.resolve("lesson.yaml"), "kind: pipeline\n");

        String listing = Files.readString(Main.writeBytecode(dir));

        assertTrue(listing.contains("static int square(int);"), listing);
        assertTrue(listing.contains("0: iload_0\n         1: iload_0\n         2: imul\n         3: ireturn"), listing);
        assertTrue(listing.contains("static {};"), listing);
        assertTrue(Main.findRecordableLessons(Path.of("build/pipeline-lesson/lessons")).contains(dir));
    }

    private static void copyTree(Path from, Path to) throws java.io.IOException {
        try (var paths = Files.walk(from)) {
            for (Path p : paths.toList()) {
                Path target = to.resolve(from.relativize(p).toString());
                if (Files.isDirectory(p)) Files.createDirectories(target);
                else Files.copy(p, target, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
            }
        }
    }

    private static Step firstStepAtLine(int line) {
        return edge.steps().stream().filter(s -> s.location().line() == line).findFirst().orElseThrow();
    }

    private static List<HeapObject> objectsOfType(Step step, String type) {
        return step.heap().stream().filter(o -> o.type().equals(type)).toList();
    }

    private static Optional<HeapObject> find(Step step, String id) {
        return step.heap().stream().filter(o -> o.id().equals(id)).findFirst();
    }
}
