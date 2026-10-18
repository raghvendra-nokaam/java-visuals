package dev.javavisuals.recorder;

import com.sun.jdi.Bootstrap;
import com.sun.jdi.ObjectReference;
import com.sun.jdi.PrimitiveValue;
import com.sun.jdi.ThreadReference;
import com.sun.jdi.VMDisconnectedException;
import com.sun.jdi.VirtualMachine;
import com.sun.jdi.connect.Connector;
import com.sun.jdi.event.ClassPrepareEvent;
import com.sun.jdi.event.Event;
import com.sun.jdi.event.LocatableEvent;
import com.sun.jdi.event.MethodEntryEvent;
import com.sun.jdi.event.MethodExitEvent;
import com.sun.jdi.event.StepEvent;
import com.sun.jdi.event.VMDeathEvent;
import com.sun.jdi.event.VMDisconnectEvent;
import com.sun.jdi.event.VMStartEvent;
import com.sun.jdi.request.EventRequest;
import com.sun.jdi.request.StepRequest;
import dev.javavisuals.recorder.model.Trace;
import dev.javavisuals.recorder.model.Trace.Location;
import dev.javavisuals.recorder.model.Trace.SourceFile;
import dev.javavisuals.recorder.model.Trace.Step;
import dev.javavisuals.recorder.model.Value;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Runs one Lesson Program under JDI and turns its execution into a Trace (ADR-0001).
 *
 * <p>Method entry/exit events track each Lesson Program invocation so Frames get per-call ids;
 * line-step events (step-into, JDK excluded) produce one Step each, captured while the VM is suspended.
 */
final class Recorder {

    /** Never step into the platform: its frames are hidden and stepping through it is slow. */
    private static final List<String> EXCLUDED = List.of("java.*", "javax.*", "jdk.*", "sun.*", "com.sun.*");
    private static final int MAX_STEPS = 2_000;

    private final Lesson lesson;
    private final List<Step> steps = new ArrayList<>();
    private final Map<ThreadReference, List<String>> frameIds = new HashMap<>();
    private final List<dev.javavisuals.recorder.model.Event> pending = new ArrayList<>();
    private final ByteArrayOutputStream console = new ByteArrayOutputStream();
    /** Index in {@link #pending} → returned Object, resolved once the next Step's Heap is known. */
    private final Map<Integer, Long> pendingReturnRefs = new HashMap<>();
    private int nextFrameId = 1;
    private boolean stepping;
    private VirtualMachine vm;
    private StateCapture capture;
    private InputStream stdout;

    private Recorder(Lesson lesson) {
        this.lesson = lesson;
    }

    static Trace record(Lesson lesson, String variantId) throws Exception {
        return new Recorder(lesson).run(variantId);
    }

    private Trace run(String variantId) throws Exception {
        vm = launch();
        capture = new StateCapture(vm, lesson.classNames());
        stdout = vm.process().getInputStream();
        try {
            loop();
        } finally {
            vm.process().waitFor(10, TimeUnit.SECONDS);
            vm.process().destroyForcibly();
        }

        List<SourceFile> source = new ArrayList<>();
        for (var path : lesson.sources()) {
            source.add(new SourceFile(path.getFileName().toString(), Files.readAllLines(path)));
        }
        return new Trace(Trace.SCHEMA_VERSION, lesson.id(), variantId, null, source,
                Markers.resolve(source, steps), steps);
    }

    private VirtualMachine launch() throws Exception {
        var connector = Bootstrap.virtualMachineManager().defaultConnector();
        Map<String, Connector.Argument> args = connector.defaultArguments();
        args.get("main").setValue(Lesson.MAIN_CLASS);
        args.get("options").setValue("-cp " + lesson.classesDir() + " -Dstdout.encoding=UTF-8");
        return connector.launch(args);
    }

    private void loop() throws Exception {
        var queue = vm.eventQueue();
        while (true) {
            var set = queue.remove();
            // Within one set, track invocations before capturing a Step at the same location.
            List<Event> events = new ArrayList<>();
            set.forEach(events::add);
            events.sort((a, b) -> Boolean.compare(a instanceof StepEvent, b instanceof StepEvent));
            try {
                for (Event event : events) {
                    switch (event) {
                        case VMStartEvent e -> requestInvocationEvents();
                        case MethodEntryEvent e -> onEntry(e);
                        case MethodExitEvent e -> onExit(e);
                        case StepEvent e -> captureStep(e);
                        case ClassPrepareEvent e -> { }
                        case VMDeathEvent e -> { }
                        case VMDisconnectEvent e -> {
                            return;
                        }
                        default -> { }
                    }
                }
                set.resume();
            } catch (VMDisconnectedException e) {
                return;
            }
        }
    }

    private void requestInvocationEvents() {
        var requests = vm.eventRequestManager();
        for (String className : lesson.classNames()) {
            var entry = requests.createMethodEntryRequest();
            entry.addClassFilter(className);
            entry.setSuspendPolicy(EventRequest.SUSPEND_ALL);
            entry.enable();
            var exit = requests.createMethodExitRequest();
            exit.addClassFilter(className);
            exit.setSuspendPolicy(EventRequest.SUSPEND_ALL);
            exit.enable();
        }
    }

    private void onEntry(MethodEntryEvent e) throws Exception {
        boolean isMain = e.method().name().equals("main") && e.method().isStatic();
        // Static initializers that run before main are setup, not part of the lesson.
        if (!stepping && !isMain) return;
        String frameId = "f" + nextFrameId++;
        frameIds.computeIfAbsent(e.thread(), t -> new ArrayList<>()).add(frameId);
        pending.add(dev.javavisuals.recorder.model.Event.call(capture.threadId(e.thread()), frameId));

        if (!stepping) {
            // A line step from here would complete on main's *second* line, so capture the first one now.
            stepping = true;
            captureStep(e);
            var step = vm.eventRequestManager().createStepRequest(e.thread(), StepRequest.STEP_LINE, StepRequest.STEP_INTO);
            EXCLUDED.forEach(step::addClassExclusionFilter);
            step.setSuspendPolicy(EventRequest.SUSPEND_ALL);
            step.enable();
        }
    }

    private void onExit(MethodExitEvent e) {
        List<String> ids = frameIds.get(e.thread());
        if (ids == null || ids.isEmpty()) return;
        String frameId = ids.removeLast();
        Value value = e.returnValue() instanceof PrimitiveValue p ? StateCapture.primitive(p) : null;
        pending.add(dev.javavisuals.recorder.model.Event.ret(capture.threadId(e.thread()), frameId, value));
        if (e.returnValue() instanceof ObjectReference o) pendingReturnRefs.put(pending.size() - 1, o.uniqueID());
    }

    private void captureStep(LocatableEvent e) throws Exception {
        if (!stepping || !capture.isLessonFrame(e.thread().frame(0))) return;
        if (steps.size() >= MAX_STEPS) {
            throw new IllegalStateException("Trace passed " + MAX_STEPS + " Steps; keep Lesson Programs small");
        }
        var location = e.location();
        var here = new Location(location.sourceName(), location.lineNumber());
        Location previous = steps.isEmpty() ? null : steps.getLast().location();

        var state = capture.capture(e.thread(), frameIds, previous);
        String newOutput = drainStdout();
        String consoleSoFar = console.toString(StandardCharsets.UTF_8);
        if (!newOutput.isEmpty()) pending.add(dev.javavisuals.recorder.model.Event.output(newOutput));

        // A returned Object is only worth pointing at if it's still on the Heap (not a discarded temporary).
        pendingReturnRefs.forEach((index, uniqueId) -> {
            String id = capture.idOf(uniqueId);
            if (id != null && state.heap().stream().anyMatch(o -> o.id().equals(id))) {
                var r = pending.get(index);
                pending.set(index, dev.javavisuals.recorder.model.Event.ret(r.thread(), r.frameId(), Value.ref(id)));
            }
        });

        Step step = new Step(here, null, capture.threadId(e.thread()), state.threads(), state.statics(),
                state.heap(), consoleSoFar, null);
        steps.add(EventDiff.withEvents(step, steps.isEmpty() ? null : steps.getLast(), pending));
        pending.clear();
        pendingReturnRefs.clear();
    }

    /**
     * Everything the debuggee printed before it was suspended has already been written to the pipe,
     * so reading what's available now attributes output to the right Step.
     */
    private String drainStdout() throws IOException {
        var fresh = new ByteArrayOutputStream();
        int available;
        while ((available = stdout.available()) > 0) {
            fresh.write(stdout.readNBytes(available));
        }
        console.write(fresh.toByteArray());
        return fresh.toString(StandardCharsets.UTF_8);
    }
}
