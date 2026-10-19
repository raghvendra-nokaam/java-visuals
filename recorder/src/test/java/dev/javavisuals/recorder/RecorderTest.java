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
    void writesRealBytecodeForAnimationLessons() throws Exception {
        Path dir = Path.of("build/pipeline-lesson/lessons/jvm/how-java-runs");
        Files.createDirectories(dir);
        Files.copy(REPO.resolve("lessons/jvm/how-java-runs/Program.java"), dir.resolve("Program.java"),
                java.nio.file.StandardCopyOption.REPLACE_EXISTING);
        Files.writeString(dir.resolve("lesson.yaml"), "kind: animation\n");

        String listing = Files.readString(Main.writeBytecode(dir));

        assertTrue(listing.contains("static int square(int);"), listing);
        assertTrue(listing.contains("0: iload_0\n         1: iload_0\n         2: imul\n         3: ireturn"), listing);
        assertTrue(listing.contains("static {};"), listing);
        assertTrue(Main.findRecordableLessons(Path.of("build/pipeline-lesson/lessons")).contains(dir));
    }

    @Test
    void unluckyScheduleLosesAnUpdateTheSameWayEveryTime() throws Exception {
        Path dir = REPO.resolve("lessons/concurrency/lost-update");
        Schedule unlucky = Schedule.read(dir, "unlucky");
        Trace first = Recorder.record(Lesson.compile(dir), "default", unlucky);
        Trace second = Recorder.record(Lesson.compile(dir), "default", unlucky);
        assertEquals(TraceJson.toJson(first), TraceJson.toJson(second));

        assertEquals("1 tickets recorded\n", first.steps().getLast().console());
        List<String> reads = first.steps().stream()
                .filter(s -> s.subStep() != null && s.subStep().label().startsWith("read sold"))
                .map(s -> s.activeThread() + " " + s.subStep().label()).toList();
        assertEquals(List.of("A read sold (0)", "B read sold (0)"), reads);
    }

    @Test
    void synchronizedMakesTheSecondThreadWaitForTheLock() throws Exception {
        Path dir = REPO.resolve("lessons/concurrency/lost-update");
        Trace trace = Recorder.record(Lesson.compile(dir, "synchronized"), "synchronized", Schedule.read(dir, "contended"));

        Step blocked = trace.steps().stream().filter(s -> s.threads().stream()
                .anyMatch(t -> t.id().equals(s.activeThread()) && t.state().equals("blocked"))).findFirst().orElseThrow();
        assertEquals("B", blocked.activeThread());
        HeapObject counter = objectsOfTypeIn(blocked, "TicketOffice").getFirst();
        assertEquals("A", counter.monitor().owner());
        assertEquals(List.of("B"), counter.monitor().blocked());
        assertTrue(blocked.events().contains(Event.lock("lock-block", "B", counter.id())));
        assertEquals("2 tickets recorded\n", trace.steps().getLast().console());
    }

    @Test
    void opposingLockOrderEndsInADeadlock() throws Exception {
        Path dir = REPO.resolve("lessons/concurrency/deadlock");
        Trace trace = Recorder.record(Lesson.compile(dir), "default", Schedule.read(dir, "deadlock"));
        Step last = trace.steps().getLast();
        Event deadlock = last.events().stream().filter(e -> e.type().equals("deadlock")).findFirst().orElseThrow();
        assertEquals(List.of("A", "B"), deadlock.threads());
        assertFalse(trace.markers().containsKey("result"), "the program never reaches its result line");
    }

    @Test
    void aScheduleNamingAThreadThatNeverStartedFailsClearly() throws Exception {
        Path dir = REPO.resolve("lessons/concurrency/lost-update");
        var bad = new Schedule("bad", List.of(new Schedule.Turn("main", "join", 0), new Schedule.Turn("Z", null, 0)));
        var error = org.junit.jupiter.api.Assertions.assertThrows(IllegalStateException.class,
                () -> Recorder.record(Lesson.compile(dir), "default", bad));
        assertTrue(error.getMessage().contains("turn 2") && error.getMessage().contains("no thread named \"Z\""), error.getMessage());
    }

    @Test
    void aThreadQueuedForAReentrantLockIsShownBlockedWithTheHolderAndHoldCount() throws Exception {
        Path dir = REPO.resolve("lessons/concurrency/reentrant-lock");
        Trace trace = Recorder.record(Lesson.compile(dir), "default", Schedule.read(dir, "contended"));
        Step blocked = trace.steps().stream().filter(s -> s.threads().stream()
                .anyMatch(t -> t.id().equals(s.activeThread()) && t.state().equals("blocked"))).findFirst().orElseThrow();
        assertEquals("B", blocked.activeThread());
        HeapObject lock = objectsOfTypeIn(blocked, "java.util.concurrent.locks.ReentrantLock").getFirst();
        assertEquals(List.of(), lock.fields(), "JDK internals stay hidden");
        assertEquals("A", lock.monitor().owner());
        assertEquals(2, lock.monitor().entryCount(), "increment() and add() each hold it");
        assertEquals(List.of("B"), lock.monitor().blocked());
        assertEquals("2 filed, 0 turned away\n", trace.steps().getLast().console());

        Trace tryLock = Recorder.record(Lesson.compile(dir, "try-lock"), "try-lock", Schedule.read(dir, "try-lock"));
        assertEquals("1 filed, 1 turned away\n", tryLock.steps().getLast().console());
    }

    @Test
    void waitGetsAWaitingStepAndReleasesTheLock() throws Exception {
        Path dir = REPO.resolve("lessons/concurrency/waiting-for-a-message");
        Trace trace = Recorder.record(Lesson.compile(dir), "default", Schedule.read(dir, "waiter-first"));
        Step waiting = trace.steps().stream().filter(s -> s.threads().stream()
                .anyMatch(t -> t.id().equals(s.activeThread()) && t.state().equals("waiting"))).findFirst().orElseThrow();
        assertEquals("Waiter", waiting.activeThread());
        assertEquals(7, waiting.location().line());
        HeapObject box = objectsOfTypeIn(waiting, "Pass").getFirst();
        assertEquals(null, box.monitor().owner(), "wait() gave the lock up");
        assertEquals(List.of("Waiter"), box.monitor().waiting());
        assertEquals("Served soup\n", trace.steps().getLast().console());

        // notifyAll() moves the waiter from waiting to wanting the lock; once the chef lets go it is simply ready.
        List<String> readerStates = new java.util.ArrayList<>();
        for (Step s : trace.steps()) {
            String state = s.threads().stream().filter(t -> t.id().equals("Waiter")).findFirst().map(t -> t.state()).orElse("-");
            if (readerStates.isEmpty() || !readerStates.getLast().equals(state)) readerStates.add(state); // collapse repeats
        }
        assertTrue(String.join(" ", readerStates).contains("waiting blocked runnable running"), readerStates.toString());
    }

    @Test
    void aWaitingVirtualThreadLetsGoOfItsCarrier() throws Exception {
        Path dir = REPO.resolve("lessons/concurrency/virtual-threads");
        Trace trace = Recorder.record(Lesson.compile(dir), "default", Schedule.read(dir, "waiter-first"));
        var reader = (java.util.function.Function<Step, Trace.ThreadState>) s ->
                s.threads().stream().filter(t -> t.id().equals("Waiter")).findFirst().orElseThrow();

        Step waiting = trace.steps().stream().filter(s -> s.activeThread().equals("Waiter")
                && reader.apply(s).state().equals("waiting")).findFirst().orElseThrow();
        assertEquals("virtual", reader.apply(waiting).kind());
        assertEquals(Boolean.FALSE, reader.apply(waiting).mounted(), "unmounted while it waits, even inside synchronized");
        Step running = trace.steps().stream().filter(s -> s.activeThread().equals("Waiter")).findFirst().orElseThrow();
        assertEquals(Boolean.TRUE, reader.apply(running).mounted());
        assertTrue(objectsOfTypeIn(waiting, "java.lang.VirtualThread").size() == 2);
        // The lock story is the same as with platform threads, reconstructed from the threads' side.
        assertEquals(List.of("Waiter"), objectsOfTypeIn(waiting, "Pass").getFirst().monitor().waiting());
        assertEquals("Served soup\n", trace.steps().getLast().console());

        Trace platform = Recorder.record(Lesson.compile(dir, "platform"), "platform", Schedule.read(dir, "waiter-first"));
        assertTrue(platform.steps().stream().flatMap(s -> s.threads().stream()).allMatch(t -> t.kind() == null && t.mounted() == null));
    }

    @Test
    void aMarkerNoVariantReachesFailsTheRecording() throws Exception {
        Path dir = Path.of("build/unreached-marker/lessons/test/variants");
        copyTree(Path.of("src/test/resources/lessons/test/variants"), dir);
        Files.writeString(dir.resolve("Helper.java"), """
                class Helper {
                    static int twice(int n) {
                        return n * 2;
                    }

                    static void neverCalled() {
                        System.out.println(); // @mark nowhere
                    }
                }
                """);
        var error = org.junit.jupiter.api.Assertions.assertThrows(IllegalStateException.class, () -> Main.recordLesson(dir));
        assertTrue(error.getMessage().contains("\"nowhere\"") && error.getMessage().contains("any Variant"), error.getMessage());
    }

    private static List<HeapObject> objectsOfTypeIn(Step step, String type) {
        return step.heap().stream().filter(o -> o.type().equals(type)).toList();
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
