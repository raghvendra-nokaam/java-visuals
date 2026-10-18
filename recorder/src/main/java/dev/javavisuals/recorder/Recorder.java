package dev.javavisuals.recorder;

import com.sun.jdi.Bootstrap;
import com.sun.jdi.IncompatibleThreadStateException;
import com.sun.jdi.ObjectReference;
import com.sun.jdi.PrimitiveValue;
import com.sun.jdi.StackFrame;
import com.sun.jdi.ThreadReference;
import com.sun.jdi.VMDisconnectedException;
import com.sun.jdi.VirtualMachine;
import com.sun.jdi.connect.Connector;
import com.sun.jdi.event.Event;
import com.sun.jdi.event.EventSet;
import com.sun.jdi.event.MethodEntryEvent;
import com.sun.jdi.event.MethodExitEvent;
import com.sun.jdi.event.StepEvent;
import com.sun.jdi.event.ThreadDeathEvent;
import com.sun.jdi.event.ThreadStartEvent;
import com.sun.jdi.event.VMDisconnectEvent;
import com.sun.jdi.event.VMStartEvent;
import com.sun.jdi.request.EventRequest;
import com.sun.jdi.request.StepRequest;
import dev.javavisuals.recorder.model.Trace;
import dev.javavisuals.recorder.model.Trace.Location;
import dev.javavisuals.recorder.model.Trace.SourceFile;
import dev.javavisuals.recorder.model.Trace.Step;
import dev.javavisuals.recorder.model.Trace.SubStep;
import dev.javavisuals.recorder.model.Value;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.TimeUnit;

/**
 * Runs one Lesson Program under JDI and turns its execution into a Trace (ADR-0001, ADR-0002).
 *
 * <p>Method entry/exit events track each Lesson Program invocation so Frames get per-call ids; step events
 * produce one Step each, captured while the VM is suspended.
 *
 * <p>Threads are scheduled deterministically. Every event suspends only its own thread, and every Lesson
 * thread except the one whose turn it is stays suspended ("parked"): parking a thread is simply not resuming
 * it, and each parked thread holds exactly one suspension. So exactly one thread runs Lesson code at a time,
 * and the same Program and Schedule always record the same Trace. Snapshots are consistent because every
 * thread that can touch Lesson objects is suspended while the Heap is read.
 *
 * <p>A newly started thread is run up to its first Lesson line before anything else is captured, so it
 * always appears at the same Step. When the running thread stops making progress the Recorder looks at why:
 * blocked on a lock, waiting (join, wait, sleep), or just busy in the JDK.
 */
final class Recorder {

    /** Never step into the platform: its frames are hidden and stepping through it is slow. */
    private static final List<String> EXCLUDED = List.of("java.*", "javax.*", "jdk.*", "sun.*", "com.sun.*");
    private static final int MAX_STEPS = 2_000;
    /** How long the running thread may go without an event before we check whether it's stuck. */
    private static final long STALL_MS = 400;
    /** How long a thread may stay busy in JDK code (no events, still runnable) before we give up. */
    private static final long BUSY_LIMIT_MS = 20_000;
    /** How long a newly started thread may take to reach Lesson code before we decide it isn't a Lesson thread. */
    private static final long SETTLE_LIMIT_MS = 3_000;

    private final Lesson lesson;
    private final Scheduler scheduler;
    private final String scheduleId;
    private final List<Step> steps = new ArrayList<>();
    private final Map<ThreadReference, List<String>> frameIds = new HashMap<>();
    private final List<dev.javavisuals.recorder.model.Event> pending = new ArrayList<>();
    private final ByteArrayOutputStream console = new ByteArrayOutputStream();
    /** Index in {@link #pending} → returned Object, resolved once the next Step's Heap is known. */
    private final Map<Integer, Long> pendingReturnRefs = new HashMap<>();

    /** Threads that have run Lesson code, in the order they started. */
    private final List<ThreadReference> lessonThreads = new ArrayList<>();
    /** Started (in the main thread group) but not yet in Lesson code. */
    private final Set<ThreadReference> starting = new LinkedHashSet<>();
    /** Threads in the main group that turned out never to run Lesson code (e.g. the JVM's shutdown thread). */
    private final Set<ThreadReference> ignored = new HashSet<>();
    /** Suspended by us, waiting for their turn. */
    private final Set<ThreadReference> parked = new HashSet<>();
    /** Done with Lesson code; never parked again so the JVM can shut down. */
    private final Set<ThreadReference> done = new HashSet<>();
    /** Parked at their first line, which hasn't been captured yet. */
    private final Set<ThreadReference> needsFirstStep = new HashSet<>();
    /** Threads whose current blocked or waiting episode already has its Step; cleared when they run again. */
    private final Set<ThreadReference> reportedBlocked = new HashSet<>();
    private final Set<ThreadReference> reportedWaiting = new HashSet<>();
    /** Waiting threads we tried since the last Step; not tried again until something changes. */
    private final Set<ThreadReference> triedWaiting = new HashSet<>();
    private final Map<ThreadReference, StepRequest> stepRequests = new HashMap<>();
    /** Per thread: "frameId:line" of its last captured Step, to tell a line's first visit from its Sub-steps. */
    private final Map<ThreadReference, String> lastVisit = new HashMap<>();

    private ThreadReference current;
    private boolean switchRequested;
    private boolean ended;
    private long busySince = -1;
    private int nextFrameId = 1;
    private boolean stepping;
    private VirtualMachine vm;
    private StateCapture capture;
    private InputStream stdout;
    private List<SourceFile> source;
    private SubSteps subSteps;
    private Map<String, List<String>> markersByLine;

    private Recorder(Lesson lesson, Schedule schedule) {
        this.lesson = lesson;
        this.scheduler = new Scheduler(schedule);
        this.scheduleId = schedule.id();
    }

    static Trace record(Lesson lesson, String variantId) throws Exception {
        return record(lesson, variantId, Schedule.SEQUENTIAL);
    }

    static Trace record(Lesson lesson, String variantId, Schedule schedule) throws Exception {
        return new Recorder(lesson, schedule).run(variantId);
    }

    private Trace run(String variantId) throws Exception {
        source = new ArrayList<>();
        for (var path : lesson.sources()) {
            source.add(new SourceFile(path.getFileName().toString(), Files.readAllLines(path)));
        }
        markersByLine = Markers.byLine(source);
        vm = launch();
        capture = new StateCapture(vm, lesson.classNames());
        subSteps = new SubSteps(vm, source);
        stdout = vm.process().getInputStream();
        try {
            loop();
        } finally {
            vm.process().waitFor(10, TimeUnit.SECONDS);
            vm.process().destroyForcibly();
        }
        scheduler.checkFinished();

        List<Step> grouped = groupSubSteps(steps);
        return new Trace(Trace.SCHEMA_VERSION, lesson.id(), variantId, scheduleId, source,
                Markers.resolve(source, grouped), grouped);
    }

    private VirtualMachine launch() throws Exception {
        var connector = Bootstrap.virtualMachineManager().defaultConnector();
        Map<String, Connector.Argument> args = connector.defaultArguments();
        args.get("main").setValue(Lesson.MAIN_CLASS);
        args.get("options").setValue("-cp " + lesson.classesDir() + " -Dstdout.encoding=UTF-8");
        return connector.launch(args);
    }

    // ------------------------------------------------------------------ event loop

    private void loop() throws Exception {
        var queue = vm.eventQueue();
        while (!ended) {
            boolean watching = stepping && current != null;
            EventSet set = watching ? queue.remove(STALL_MS) : queue.remove();
            try {
                if (set == null) {
                    onStall();
                } else {
                    busySince = -1;
                    if (handle(set)) return;
                }
            } catch (VMDisconnectedException e) {
                return;
            }
        }
    }

    /** Handles one event set; returns true once the VM is gone. */
    private boolean handle(EventSet set) throws Exception {
        List<Event> events = new ArrayList<>();
        set.forEach(events::add);
        // Track threads and invocations before capturing a Step at the same location.
        events.sort(Comparator.comparingInt(Recorder::order));
        ThreadReference eventThread = null;
        for (Event event : events) {
            if (event instanceof com.sun.jdi.event.LocatableEvent l) eventThread = l.thread();
            switch (event) {
                case VMStartEvent e -> requestEvents();
                case ThreadStartEvent e -> {
                    eventThread = e.thread();
                    onThreadStart(e.thread());
                }
                case MethodEntryEvent e -> onEntry(e);
                case MethodExitEvent e -> onExit(e);
                case ThreadDeathEvent e -> {
                    eventThread = e.thread();
                    onThreadDeath(e.thread());
                }
                case StepEvent e -> onStep(e);
                case VMDisconnectEvent e -> {
                    return true;
                }
                default -> { }
            }
        }
        if (switchRequested) switchThreads();
        // A parked thread stays suspended by this very event; everything else carries on.
        if (eventThread == null || !parked.contains(eventThread)) set.resume();
        return false;
    }

    private static int order(Event e) {
        return switch (e) {
            case ThreadStartEvent t -> 0;
            case MethodEntryEvent m -> 1;
            case MethodExitEvent m -> 1;
            case ThreadDeathEvent t -> 2;
            case StepEvent s -> 3;
            default -> 4;
        };
    }

    private void requestEvents() {
        var requests = vm.eventRequestManager();
        for (String className : lesson.classNames()) {
            var entry = requests.createMethodEntryRequest();
            entry.addClassFilter(className);
            entry.setSuspendPolicy(EventRequest.SUSPEND_EVENT_THREAD);
            entry.enable();
            var exit = requests.createMethodExitRequest();
            exit.addClassFilter(className);
            exit.setSuspendPolicy(EventRequest.SUSPEND_EVENT_THREAD);
            exit.enable();
        }
        var start = requests.createThreadStartRequest();
        start.setSuspendPolicy(EventRequest.SUSPEND_EVENT_THREAD);
        start.enable();
        var death = requests.createThreadDeathRequest();
        death.setSuspendPolicy(EventRequest.SUSPEND_EVENT_THREAD);
        death.enable();
    }

    // ------------------------------------------------------------------ threads

    /** A thread the Lesson Program starts lives in the main thread group; JDK helper threads don't. */
    private void onThreadStart(ThreadReference thread) {
        if (!stepping || !isLessonStarted(thread)) return;
        starting.add(thread);
        parked.add(thread); // suspended by its own start event; settle() lets it run to its first line
    }


    private boolean isLessonStarted(ThreadReference thread) {
        var group = thread.threadGroup();
        return group != null && group.name().equals("main") && !lessonThreads.contains(thread)
                && !ignored.contains(thread) && !thread.name().equals("DestroyJavaVM");
    }

    private void onThreadDeath(ThreadReference thread) {
        starting.remove(thread);
        if (!lessonThreads.contains(thread)) return;
        finish(thread);
    }

    /** The thread has left Lesson code for good: stop tracking its steps and let it run to its end. */
    private void finish(ThreadReference thread) {
        if (!done.add(thread)) return;
        var request = stepRequests.remove(thread);
        if (request != null) vm.eventRequestManager().deleteEventRequest(request);
        if (parked.remove(thread)) thread.resume();
        if (thread.equals(current)) {
            scheduler.onFinished(thread.name());
            switchRequested = true;
        }
    }

    /** Parks a thread that is already suspended (by its own event, or by us in {@link #onStall}). */
    private void park(ThreadReference thread) {
        parked.add(thread);
    }

    private void unpark(ThreadReference thread) {
        if (parked.remove(thread)) thread.resume();
    }

    /**
     * Ends the current thread's turn and starts the next one. The current thread is suspended (by its event,
     * or by {@link #onStall}); parking it is just leaving it that way.
     */
    private void switchThreads() throws Exception {
        while (switchRequested && !ended) {
            switchRequested = false;
            if (current != null && !done.contains(current)) park(current);
            current = null;
            ThreadReference next = chooseNext();
            if (next == null) {
                onNothingCanRun();
                return;
            }
            current = next;
            if (needsFirstStep.remove(next)) {
                // Still parked, so every Lesson thread is suspended for the capture.
                StackFrame top = firstLessonFrame(next);
                captureStep(next, top.location(), "running", null);
                afterCapture(next, top.location(), null);
            }
            if (!switchRequested) unpark(next);
        }
    }

    private ThreadReference chooseNext() throws IncompatibleThreadStateException {
        Schedule.Turn turn = scheduler.current();
        if (turn != null) {
            ThreadReference thread = lessonThreads.stream().filter(t -> t.name().equals(turn.thread())).findFirst()
                    .orElseThrow(() -> scheduler.fail(turn, "no thread named \"" + turn.thread() + "\" has started yet (started: "
                            + lessonThreads.stream().map(ThreadReference::name).toList() + ")"));
            if (done.contains(thread)) throw scheduler.fail(turn, thread.name() + " has already finished");
            ThreadReference holder = lockHolder(thread);
            if (holder != null) throw scheduler.fail(turn, thread.name() + " is blocked on a lock held by " + holder.name());
            return thread;
        }
        // Schedule used up: the first thread, in creation order, that can make progress.
        for (ThreadReference thread : lessonThreads) {
            if (done.contains(thread) || triedWaiting.contains(thread)) continue;
            if (lockHolder(thread) == null) return thread;
        }
        return null;
    }

    /** The thread holding the lock {@code thread} is blocked on, or null if it isn't blocked (or the lock is free). */
    private ThreadReference lockHolder(ThreadReference thread) throws IncompatibleThreadStateException {
        ThreadReference aqsOwner = StateCapture.aqsLockOwner(thread);
        if (aqsOwner != null) return aqsOwner;
        if (thread.status() != ThreadReference.THREAD_STATUS_MONITOR || !vm.canGetCurrentContendedMonitor()) return null;
        ObjectReference monitor = thread.currentContendedMonitor();
        return monitor == null ? null : monitor.owningThread();
    }

    /** No thread can run but some aren't done: a deadlock if they're blocked on each other's locks. */
    private void onNothingCanRun() throws Exception {
        List<ThreadReference> alive = lessonThreads.stream().filter(t -> !done.contains(t)).toList();
        if (alive.isEmpty()) return;
        List<ThreadReference> blocked = new ArrayList<>();
        for (ThreadReference t : alive) if (lockHolder(t) != null) blocked.add(t);
        if (blocked.isEmpty()) {
            throw new IllegalStateException("No thread can make progress: " + alive.stream().map(ThreadReference::name).toList()
                    + " are all waiting. A Lesson Program must be able to finish.");
        }
        ThreadReference last = blocked.getLast();
        pending.add(dev.javavisuals.recorder.model.Event.deadlock(blocked.stream().map(capture::threadId).toList()));
        captureStep(last, StateCapture.blockedLocation(firstLessonFrame(last).location()), "blocked", null);
        ended = true;
        vm.exit(1);
    }

    /** The running thread produced no event for a while: find out whether it's blocked, waiting or just busy. */
    private void onStall() throws Exception {
        ThreadReference thread = current;
        thread.suspend();
        try {
            ThreadReference holder = lockHolder(thread);
            int status = thread.status();
            if (holder != null || status == ThreadReference.THREAD_STATUS_MONITOR) {
                // Blocked on a synchronized lock, or queued for a ReentrantLock: the same thing to the Learner.
                if (holder == null) return; // the lock was just freed; it will get it
                if (reportedBlocked.add(thread)) {
                    captureStep(thread, StateCapture.blockedLocation(firstLessonFrame(thread).location()), "blocked", null);
                }
                scheduler.onBlocked(thread.name(), holder.name());
                switchRequested = true;
            } else switch (status) {
                case ThreadReference.THREAD_STATUS_WAIT, ThreadReference.THREAD_STATUS_SLEEPING -> {
                    // wait() in Lesson code is part of the lesson; join() and friends happen inside the JDK.
                    if (capture.isWaitingInLessonCode(thread) && reportedWaiting.add(thread)) {
                        captureStep(thread, firstLessonFrame(thread).location(), "waiting", null);
                    }
                    triedWaiting.add(thread);
                    scheduler.onWaiting(thread.name());
                    switchRequested = true;
                }
                default -> {
                    if (busySince < 0) busySince = System.currentTimeMillis();
                    if (System.currentTimeMillis() - busySince > BUSY_LIMIT_MS) {
                        throw new IllegalStateException(thread.name() + " ran for " + BUSY_LIMIT_MS / 1000
                                + "s without reaching another line of the Lesson Program");
                    }
                }
            }
            if (switchRequested) {
                busySince = -1;
                switchThreads();
            }
        } finally {
            if (!ended && !parked.contains(thread)) thread.resume();
        }
    }

    /**
     * Runs every newly started thread until it enters Lesson code, where its entry event suspends it, and
     * leaves it parked there. Done before each capture so a started thread always first appears at its first
     * line, never mid-startup. Every other Lesson thread is suspended meanwhile.
     */
    private void settle() throws Exception {
        // A new thread posts its start event on its own schedule, possibly after its parent has already reached
        // the next line. It's in the thread list as soon as start() returns, so pick it up from there too.
        for (ThreadReference thread : vm.allThreads()) {
            if (isLessonStarted(thread) && !starting.contains(thread) && !done.contains(thread)
                    && thread.status() != ThreadReference.THREAD_STATUS_ZOMBIE) {
                starting.add(thread);
            }
        }
        // Threads stopped at their start event: let them go on to their first Lesson line.
        for (ThreadReference thread : starting) unpark(thread);

        long deadline = System.currentTimeMillis() + SETTLE_LIMIT_MS;
        while (!starting.isEmpty()) {
            EventSet set = vm.eventQueue().remove(Math.max(STALL_MS, deadline - System.currentTimeMillis()));
            if (set == null) {
                if (System.currentTimeMillis() < deadline) continue;
                for (ThreadReference thread : List.copyOf(starting)) {
                    int status = thread.status();
                    boolean progressing = status == ThreadReference.THREAD_STATUS_RUNNING
                            || status == ThreadReference.THREAD_STATUS_NOT_STARTED;
                    // Still starting up (e.g. a cold JVM loading classes): keep waiting, within the busy limit.
                    if (progressing && System.currentTimeMillis() - deadline < BUSY_LIMIT_MS) continue;
                    System.err.println("recorder: " + thread.name() + " never reached Lesson Program code; ignoring it");
                    starting.remove(thread);
                    ignored.add(thread);
                }
                continue;
            }
            boolean keep = false;
            for (Event event : set) {
                switch (event) {
                    case ThreadStartEvent e -> {
                        if (stepping && isLessonStarted(e.thread())) starting.add(e.thread());
                    }
                    case MethodEntryEvent e when starting.contains(e.thread()) -> {
                        onEntry(e);
                        parked.add(e.thread()); // stays suspended by this entry event
                        keep = true;
                    }
                    case ThreadDeathEvent e -> starting.remove(e.thread());
                    default -> { }
                }
            }
            if (!keep) set.resume();
        }
    }

    // ------------------------------------------------------------------ invocations and steps

    private void onEntry(MethodEntryEvent e) throws Exception {
        ThreadReference thread = e.thread();
        boolean isMain = e.method().name().equals("main") && e.method().isStatic();
        // Static initializers that run before main are setup, not part of the lesson.
        if (!stepping && !isMain) return;

        if (!lessonThreads.contains(thread)) {
            lessonThreads.add(thread);
            if (starting.remove(thread)) needsFirstStep.add(thread);
            stepRequests.put(thread, newStepRequest(thread, StepRequest.STEP_LINE));
        }
        String frameId = "f" + nextFrameId++;
        frameIds.computeIfAbsent(thread, t -> new ArrayList<>()).add(frameId);
        pending.add(dev.javavisuals.recorder.model.Event.call(capture.threadId(thread), frameId));

        if (!stepping) {
            // A line step from here would complete on main's *second* line, so capture the first one now.
            stepping = true;
            current = thread;
            captureStep(thread, e.location(), "running", null);
            afterCapture(thread, e.location(), null);
        }
    }

    private void onExit(MethodExitEvent e) {
        ThreadReference thread = e.thread();
        List<String> ids = frameIds.get(thread);
        if (ids == null || ids.isEmpty()) return;
        String frameId = ids.removeLast();
        Value value = e.returnValue() instanceof PrimitiveValue p ? StateCapture.primitive(p) : null;
        pending.add(dev.javavisuals.recorder.model.Event.ret(capture.threadId(thread), frameId, value));
        if (e.returnValue() instanceof ObjectReference o) pendingReturnRefs.put(pending.size() - 1, o.uniqueID());
        if (ids.isEmpty() && stepping) finish(thread);
    }

    private void onStep(StepEvent e) throws Exception {
        ThreadReference thread = e.thread();
        if (!stepping || done.contains(thread) || !capture.isLessonFrame(thread.frame(0))) return;
        var location = e.location();
        String label = null;
        if (subSteps.isSubStepLine(location)) {
            setStepSize(thread, StepRequest.STEP_MIN);
            label = subSteps.label(location, thread.frame(0));
            if (label == null) return; // an instruction that only moves values around
        } else {
            setStepSize(thread, StepRequest.STEP_LINE);
        }
        reportedBlocked.remove(thread);
        reportedWaiting.remove(thread);
        captureStep(thread, location, "running", label);
        afterCapture(thread, location, label);
    }

    /** Lets the Schedule know a Step happened, and ends the turn if it says so. */
    private void afterCapture(ThreadReference thread, com.sun.jdi.Location location, String label) throws Exception {
        String visit = frameIds.get(thread).getLast() + ":" + location.lineNumber();
        boolean firstVisit = label == null || !visit.equals(lastVisit.get(thread));
        lastVisit.put(thread, visit);
        List<String> markers = markersByLine.getOrDefault(location.sourceName() + ":" + location.lineNumber(), List.of());
        if (scheduler.afterStep(thread.name(), markers, firstVisit)) switchRequested = true;
    }

    private void setStepSize(ThreadReference thread, int size) {
        StepRequest request = stepRequests.get(thread);
        if (request != null && request.size() == size) return;
        if (request != null) vm.eventRequestManager().deleteEventRequest(request);
        stepRequests.put(thread, newStepRequest(thread, size));
    }

    private StepRequest newStepRequest(ThreadReference thread, int size) {
        var request = vm.eventRequestManager().createStepRequest(thread, size, StepRequest.STEP_INTO);
        EXCLUDED.forEach(request::addClassExclusionFilter);
        request.setSuspendPolicy(EventRequest.SUSPEND_EVENT_THREAD);
        request.enable();
        return request;
    }

    private StackFrame firstLessonFrame(ThreadReference thread) throws IncompatibleThreadStateException {
        return thread.frames().stream().filter(capture::isLessonFrame).findFirst()
                .orElseThrow(() -> new IllegalStateException(thread.name() + " has no Lesson Program frame"));
    }

    private void captureStep(ThreadReference thread, com.sun.jdi.Location location, String state, String subStepLabel)
            throws Exception {
        settle();
        noticeNotifiedWaiters(thread);
        if (steps.size() >= MAX_STEPS) {
            throw new IllegalStateException("Trace passed " + MAX_STEPS + " Steps; keep Lesson Programs small");
        }
        var here = new Location(location.sourceName(), location.lineNumber());
        Location previous = steps.isEmpty() ? null : steps.getLast().location();

        Set<ThreadReference> finished = new HashSet<>(done);
        var result = capture.capture(thread, state, frameIds, previous, lessonThreads, finished);
        String newOutput = drainStdout();
        String consoleSoFar = console.toString(StandardCharsets.UTF_8);
        if (!newOutput.isEmpty()) pending.add(dev.javavisuals.recorder.model.Event.output(newOutput));

        // A returned Object is only worth pointing at if it's still on the Heap (not a discarded temporary).
        pendingReturnRefs.forEach((index, uniqueId) -> {
            String id = capture.idOf(uniqueId);
            if (id != null && result.heap().stream().anyMatch(o -> o.id().equals(id))) {
                var r = pending.get(index);
                pending.set(index, dev.javavisuals.recorder.model.Event.ret(r.thread(), r.frameId(), Value.ref(id)));
            }
        });

        // Placeholder index/count; groupSubSteps fills in the real ones once the whole run is known.
        SubStep subStep = subStepLabel == null ? null : new SubStep(0, 2, subStepLabel);
        Step step = new Step(here, subStep, capture.threadId(thread), result.threads(), result.statics(),
                result.heap(), consoleSoFar, null);
        steps.add(EventDiff.withEvents(step, steps.isEmpty() ? null : steps.getLast(), pending));
        pending.clear();
        pendingReturnRefs.clear();
        triedWaiting.clear();
    }

    /** How long a parked waiter gets to show it was notified (it then tries to re-take its lock). */
    private static final long NOTIFY_PROBE_MS = 300;

    /**
     * A thread parked inside {@code wait()} looks the same to JDI whether or not it has been notified. Let it run
     * briefly: if it was notified it immediately tries to re-take its lock and shows as blocked; if not, it keeps
     * waiting. Only done while another (suspended) thread holds that lock, so it can't get back into Lesson code.
     */
    private void noticeNotifiedWaiters(ThreadReference active) throws Exception {
        if (!vm.canGetMonitorInfo()) return;
        for (ThreadReference thread : lessonThreads) {
            if (thread.equals(active) || done.contains(thread) || !parked.contains(thread)) continue;
            if (thread.status() != ThreadReference.THREAD_STATUS_WAIT || !capture.isWaitingInLessonCode(thread)) continue;
            ObjectReference monitor = waitTarget(thread);
            ThreadReference owner = monitor == null ? null : monitor.owningThread();
            if (owner == null || owner.equals(thread)) continue;
            thread.resume();
            long until = System.currentTimeMillis() + NOTIFY_PROBE_MS;
            while (thread.status() == ThreadReference.THREAD_STATUS_WAIT && System.currentTimeMillis() < until) {
                Thread.sleep(5);
            }
            thread.suspend();
        }
    }

    /** The object a thread is inside {@code wait()} on: the receiver of the {@code Object.wait} frame. */
    private static ObjectReference waitTarget(ThreadReference thread) throws IncompatibleThreadStateException {
        for (StackFrame frame : thread.frames()) {
            var method = frame.location().method();
            if (method.declaringType().name().equals("java.lang.Object") && !method.isNative() && !method.isStatic()) {
                return frame.thisObject();
            }
        }
        return null;
    }

    /**
     * Numbers each run of Sub-steps: consecutive Sub-step Steps of one thread on one line of one Frame, even
     * when other threads' Steps are interleaved between them. A run of one is just an ordinary Step.
     */
    static List<Step> groupSubSteps(List<Step> steps) {
        List<Step> out = new ArrayList<>(steps);
        Map<String, List<Integer>> open = new HashMap<>(); // thread → indexes in the current run
        Map<String, String> openKey = new HashMap<>();
        java.util.function.Consumer<String> closeRun = thread -> {
            List<Integer> run = open.remove(thread);
            openKey.remove(thread);
            if (run == null) return;
            for (int k = 0; k < run.size(); k++) {
                Step s = out.get(run.get(k));
                SubStep sub = run.size() == 1 ? null : new SubStep(k, run.size(), s.subStep().label());
                out.set(run.get(k), new Step(s.location(), sub, s.activeThread(), s.threads(), s.statics(), s.heap(),
                        s.console(), s.events()));
            }
        };
        for (int i = 0; i < steps.size(); i++) {
            Step s = steps.get(i);
            String thread = s.activeThread();
            if (s.subStep() == null) {
                closeRun.accept(thread);
                continue;
            }
            String frame = s.threads().stream().filter(t -> t.id().equals(thread)).findFirst()
                    .map(t -> t.frames().isEmpty() ? "" : t.frames().getLast().id()).orElse("");
            String key = frame + ":" + s.location().file() + ":" + s.location().line();
            if (!Objects.equals(openKey.get(thread), key)) closeRun.accept(thread);
            open.computeIfAbsent(thread, t -> new ArrayList<>()).add(i);
            openKey.put(thread, key);
        }
        List.copyOf(open.keySet()).forEach(closeRun);
        return out;
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
