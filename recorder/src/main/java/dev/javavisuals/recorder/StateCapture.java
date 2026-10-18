package dev.javavisuals.recorder;

import com.sun.jdi.AbsentInformationException;
import com.sun.jdi.ArrayReference;
import com.sun.jdi.BooleanValue;
import com.sun.jdi.CharValue;
import com.sun.jdi.ClassLoaderReference;
import com.sun.jdi.ClassObjectReference;
import com.sun.jdi.Field;
import com.sun.jdi.IncompatibleThreadStateException;
import com.sun.jdi.LocalVariable;
import com.sun.jdi.ModuleReference;
import com.sun.jdi.ObjectCollectedException;
import com.sun.jdi.ObjectReference;
import com.sun.jdi.PrimitiveValue;
import com.sun.jdi.ReferenceType;
import com.sun.jdi.StackFrame;
import com.sun.jdi.StringReference;
import com.sun.jdi.ThreadGroupReference;
import com.sun.jdi.ThreadReference;
import com.sun.jdi.VirtualMachine;
import dev.javavisuals.recorder.model.Trace.Frame;
import dev.javavisuals.recorder.model.Trace.HeapObject;
import dev.javavisuals.recorder.model.Trace.Location;
import dev.javavisuals.recorder.model.Trace.Monitor;
import dev.javavisuals.recorder.model.Trace.StaticFields;
import dev.javavisuals.recorder.model.Trace.ThreadState;
import dev.javavisuals.recorder.model.Trace.Variable;
import dev.javavisuals.recorder.model.Value;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Reads the full program state (Stacks, statics, Heap) out of a suspended debuggee.
 * Keeps identity across captures: Object ids, which Objects are JDK Internals, and where each was allocated.
 */
final class StateCapture {

    /** Lesson Programs are tiny by design; a Heap this big means the walk escaped into the JDK. */
    private static final int MAX_HEAP_OBJECTS = 300;
    private static final int MAX_ARRAY_ELEMENTS = 100;

    private static final Set<String> BOXED = Set.of(
            "java.lang.Boolean", "java.lang.Byte", "java.lang.Character", "java.lang.Short",
            "java.lang.Integer", "java.lang.Long", "java.lang.Float", "java.lang.Double");

    private final VirtualMachine vm;
    private final Set<String> lessonClasses;
    private final Map<Long, String> objectIds = new HashMap<>();
    private final Map<String, ObjectReference> objects = new LinkedHashMap<>();
    private final Set<String> internal = new HashSet<>();
    private final Map<String, Location> allocatedAt = new HashMap<>();
    private final Map<Long, String> threadIds = new HashMap<>();
    /** Per thread: the last capture at which each Object was reachable from that thread's own Frames. */
    private final Map<String, Map<String, Integer>> reachableFromThread = new HashMap<>();
    /** Per Frame id: the line it is executing and the capture at which it started that line. */
    private final Map<String, int[]> lineStartedAt = new HashMap<>();
    private int captureIndex = -1;
    private boolean firstCapture = true;

    StateCapture(VirtualMachine vm, Set<String> lessonClasses) {
        this.vm = vm;
        this.lessonClasses = lessonClasses;
    }

    record State(List<ThreadState> threads, List<StaticFields> statics, List<HeapObject> heap) {}

    /**
     * @param active        the thread this Step is about
     * @param activeState   how to show it: "running", or "blocked" when it stalled waiting for a lock
     * @param frameIds      per thread, the ids of its live Lesson Program invocations, outermost first
     * @param previousLine  where execution was at the previous Step; new Objects are attributed to it
     * @param lessonThreads every thread that has run Lesson Program code, in the order they started
     * @param finished      those that have ended; shown as terminated with an empty Stack
     */
    State capture(ThreadReference active, String activeState, Map<ThreadReference, List<String>> frameIds,
            Location previousLine, List<ThreadReference> lessonThreads, Set<ThreadReference> finished)
            throws IncompatibleThreadStateException {
        var walk = new Walk();
        locks = LockView.of(lessonThreads.stream().filter(t -> !finished.contains(t)).toList());

        List<ThreadState> threads = new ArrayList<>();
        for (ThreadReference thread : lessonThreads) {
            if (finished.contains(thread)) {
                threads.add(new ThreadState(threadId(thread), thread.name(), "terminated", List.of(),
                        thread.isVirtual() ? "virtual" : null, null));
                continue;
            }
            List<String> ids = frameIds.getOrDefault(thread, List.of());
            threads.add(captureThread(thread, thread.equals(active) ? activeState : null, ids, walk));
        }

        List<StaticFields> statics = captureStatics(walk);

        walk.drain();

        // In flight: reachable from the active thread's own Frames at some point during the line its top Frame is
        // still executing, so it is held on the operand stack (a just-constructed `new`, a just-returned value)
        // and is not garbage yet. Reachability through other threads doesn't count: they can't have handed it over.
        List<String> activeIds = frameIds.getOrDefault(active, List.of());
        Map<String, Integer> reachedByActive = reachableFromThread.getOrDefault(threadId(active), Map.of());
        if (!activeIds.isEmpty()) {
            String top = activeIds.getLast();
            int line = active.frame(0).location().lineNumber();
            int[] started = lineStartedAt.get(top);
            if (started == null || started[0] != line) lineStartedAt.put(top, started = new int[] {line, captureIndex + 1});
            int lineStart = started[1];
            Set<String> reached = new HashSet<>(walk.seen.values());
            for (var known : List.copyOf(objects.entrySet())) {
                if (!reached.contains(known.getKey()) && reachedByActive.getOrDefault(known.getKey(), -1) >= lineStart) {
                    walk.enqueue(known.getValue(), false);
                }
            }
            walk.drain();
        }
        captureIndex++;
        Set<String> live = new HashSet<>(walk.seen.values());

        // Anything seen before but unreachable now is Eligible, as is whatever only it references.
        // A JDK Internal is different: the JDK may still hold it (e.g. ArrayList's shared empty array), so it
        // just leaves the Heap instead of being shown as garbage.
        for (var known : List.copyOf(objects.entrySet())) {
            String id = known.getKey();
            if (live.contains(id)) continue;
            if (internal.contains(id)) {
                objects.remove(id);
                try {
                    known.getValue().enableCollection();
                } catch (ObjectCollectedException ignored) {
                    // Already gone.
                }
            } else {
                walk.enqueue(known.getValue(), false);
            }
        }
        walk.drain();

        for (var entry : walk.newlyFound.entrySet()) {
            String id = entry.getKey();
            if (firstCapture || !entry.getValue()) internal.add(id);
            else if (previousLine != null) allocatedAt.put(id, previousLine);
        }
        firstCapture = false;

        if (walk.seen.size() > MAX_HEAP_OBJECTS) {
            throw new IllegalStateException("Heap grew past " + MAX_HEAP_OBJECTS + " Objects; keep Lesson Programs small");
        }

        List<HeapObject> heap = walk.seen.values().stream()
                .sorted(Comparator.comparingInt(id -> Integer.parseInt(id.substring(1))))
                .map(id -> heapObject(id, objects.get(id), live.contains(id) ? "live" : "eligible", threads))
                .toList();
        recordReachableFromActive(threadId(active), threads, heap);
        return new State(threads, statics, heap);
    }

    private void recordReachableFromActive(String activeId, List<ThreadState> threads, List<HeapObject> heap) {
        Map<String, HeapObject> byId = new HashMap<>();
        heap.forEach(o -> byId.put(o.id(), o));
        Deque<String> queue = new ArrayDeque<>();
        threads.stream().filter(t -> t.id().equals(activeId)).flatMap(t -> t.frames().stream())
                .flatMap(f -> f.locals().stream()).map(Variable::value)
                .filter(v -> "ref".equals(v.kind())).forEach(v -> queue.add(v.id()));
        Map<String, Integer> reached = reachableFromThread.computeIfAbsent(activeId, k -> new HashMap<>());
        Set<String> seen = new HashSet<>();
        while (!queue.isEmpty()) {
            String id = queue.poll();
            if (!seen.add(id) || !byId.containsKey(id)) continue;
            reached.put(id, captureIndex);
            HeapObject o = byId.get(id);
            if (o.fields() != null) o.fields().forEach(f -> { if ("ref".equals(f.value().kind())) queue.add(f.value().id()); });
            if (o.elements() != null) o.elements().forEach(v -> { if ("ref".equals(v.kind())) queue.add(v.id()); });
        }
    }

    /** Our id for an Object already seen, or null. */
    String idOf(long uniqueId) {
        return objectIds.get(uniqueId);
    }

    String threadId(ThreadReference thread) {
        return threadIds.computeIfAbsent(thread.uniqueID(), k -> {
            String base = thread.name().replaceAll("[^A-Za-z0-9_-]", "-");
            String id = base;
            for (int n = 2; threadIds.containsValue(id); n++) id = base + "-" + n;
            return id;
        });
    }

    boolean isLessonFrame(StackFrame frame) {
        return lessonClasses.contains(frame.location().declaringType().name());
    }

    /**
     * Where a thread blocked on a lock really is. The JVM reports a thread stuck in {@code monitorenter} as
     * already past it, which would show it on the line after the {@code synchronized}; step back to the lock.
     */
    static com.sun.jdi.Location blockedLocation(com.sun.jdi.Location location) {
        byte[] code = location.method().bytecodes();
        int at = (int) location.codeIndex();
        if (at > 0 && at <= code.length && (code[at - 1] & 0xff) == 0xc2) { // monitorenter
            var lock = location.method().locationOfCodeIndex(at - 1);
            if (lock != null) return lock;
        }
        return location;
    }

    private ThreadState captureThread(ThreadReference thread, String activeState, List<String> ids, Walk walk)
            throws IncompatibleThreadStateException {
        List<StackFrame> lessonFrames = thread.frames().stream().filter(this::isLessonFrame).toList().reversed();
        if (lessonFrames.size() != ids.size()) {
            throw new IllegalStateException("Thread " + thread.name() + " has " + lessonFrames.size()
                    + " Lesson Program frames but " + ids.size() + " tracked invocations");
        }
        List<Frame> frames = new ArrayList<>();
        for (int i = 0; i < lessonFrames.size(); i++) {
            StackFrame f = lessonFrames.get(i);
            boolean top = i == lessonFrames.size() - 1;
            var location = top && thread.status() == ThreadReference.THREAD_STATUS_MONITOR ? blockedLocation(f.location()) : f.location();
            frames.add(new Frame(ids.get(i), location.declaringType().name(), location.method().name(),
                    location.lineNumber(), locals(f, walk)));
        }
        String state = activeState != null ? activeState : status(thread);
        String kind = thread.isVirtual() ? "virtual" : null;
        // Only where it's meaningful: a running thread is on a carrier by definition; for a waiting or blocked one
        // read it. A thread merely parked by the recorder stays mounted as an artifact of recording, so say nothing.
        Boolean mounted = !thread.isVirtual() ? null
                : state.equals("running") ? Boolean.TRUE
                : state.equals("waiting") || state.equals("blocked") ? mounted(thread) : null;
        return new ThreadState(threadId(thread), thread.name(), state, frames, kind, mounted);
    }

    private List<Variable> locals(StackFrame frame, Walk walk) {
        List<Variable> locals = new ArrayList<>();
        var method = frame.location().method();
        if (!method.isStatic() && !method.isNative()) {
            locals.add(new Variable("this", method.declaringType().name(), walk.value(frame.thisObject(), true)));
        }
        try {
            List<LocalVariable> visible = frame.visibleVariables();
            Map<LocalVariable, com.sun.jdi.Value> values = frame.getValues(visible);
            for (LocalVariable v : visible) {
                locals.add(new Variable(v.name(), v.typeName(), walk.value(values.get(v), true)));
            }
        } catch (AbsentInformationException e) {
            List<com.sun.jdi.Value> args = frame.getArgumentValues();
            List<String> types = method.argumentTypeNames();
            for (int i = 0; i < args.size(); i++) {
                locals.add(new Variable("arg" + i, types.get(i), walk.value(args.get(i), true)));
            }
        }
        return locals;
    }

    private List<StaticFields> captureStatics(Walk walk) {
        List<StaticFields> statics = new ArrayList<>();
        for (String name : lessonClasses.stream().sorted().toList()) {
            for (ReferenceType type : vm.classesByName(name)) {
                if (!type.isPrepared()) continue;
                List<Field> fields = type.fields().stream().filter(f -> f.isStatic() && !f.isSynthetic()).toList();
                if (fields.isEmpty()) continue;
                Map<Field, com.sun.jdi.Value> values = type.getValues(fields);
                statics.add(new StaticFields(name, fields.stream()
                        .map(f -> new Variable(f.name(), f.typeName(), walk.value(values.get(f), true)))
                        .toList()));
            }
        }
        return statics;
    }

    private HeapObject heapObject(String id, ObjectReference obj, String state, List<ThreadState> threads) {
        String type = obj.referenceType().name();
        boolean isInternal = internal.contains(id);
        Location allocated = allocatedAt.get(id);
        var refs = new Walk.ReadOnly(objectIds);

        if (obj instanceof StringReference s) {
            return new HeapObject(id, type, "object", List.of(), null, javaLiteral(s.value()), state, isInternal,
                    true, allocated, null);
        }
        if (BOXED.contains(type)) {
            var v = obj.getValue(obj.referenceType().fieldByName("value"));
            return new HeapObject(id, type, "object", List.of(), null, refs.value(v).display(), state, isInternal,
                    true, allocated, null);
        }
        if (obj instanceof ArrayReference array) {
            List<Value> elements = array.getValues(0, Math.min(array.length(), MAX_ARRAY_ELEMENTS)).stream()
                    .map(refs::value).toList();
            return new HeapObject(id, type, "array", null, elements, null, state, isInternal, false, allocated,
                    monitor(obj, threads));
        }
        if (isReentrantLock(obj)) {
            // Its state lives in JDK internals; show it the way a synchronized lock is shown instead.
            return new HeapObject(id, type, "object", List.of(), null, null, state, isInternal, false, allocated,
                    reentrantLockMonitor(obj, threads));
        }
        List<Variable> fields = obj instanceof ThreadReference t ? threadFields(t, refs)
                : opaque(obj) ? List.of() : instanceFields(obj.referenceType()).stream()
                        .map(f -> new Variable(f.name(), f.typeName(), refs.value(obj.getValue(f))))
                        .toList();
        // A Thread object is opaque, but its name is what the Learner needs to match it to a Stack.
        String display = obj instanceof ThreadReference t ? javaLiteral(t.name()) : null;
        return new HeapObject(id, type, "object", fields, null, display, state, isInternal, false, allocated,
                monitor(obj, threads));
    }

    /**
     * The Object's lock as the Learner sees it, built from the threads' side: what each Lesson thread owns, is
     * trying to enter, and is waiting on. Asking the Object instead misses virtual threads entirely.
     */
    private Monitor monitor(ObjectReference obj, List<ThreadState> threads) {
        ThreadReference ownerThread = locks.owner().get(obj);
        String owner = ownerThread == null ? null : threadId(ownerThread);
        List<String> blocked = new ArrayList<>();
        List<String> waiting = new ArrayList<>();
        if (owner != null) locks.contending().getOrDefault(obj, List.of()).forEach(t -> blocked.add(threadId(t)));
        locks.waitingOn().getOrDefault(obj, List.of()).forEach(t -> waiting.add(threadId(t)));
        if (owner == null && blocked.isEmpty() && waiting.isEmpty()) return null;
        return new Monitor(owner, ownerThread == null ? 0 : locks.holds().getOrDefault(obj, 1), blocked, waiting);
    }

    private LockView locks = LockView.EMPTY;

    /** Who owns, is entering, and is waiting on each monitor, for the Lesson threads alive at one capture. */
    record LockView(Map<ObjectReference, ThreadReference> owner, Map<ObjectReference, Integer> holds,
            Map<ObjectReference, List<ThreadReference>> contending, Map<ObjectReference, List<ThreadReference>> waitingOn) {

        static final LockView EMPTY = new LockView(Map.of(), Map.of(), Map.of(), Map.of());

        static LockView of(List<ThreadReference> threads) throws IncompatibleThreadStateException {
            Map<ObjectReference, ThreadReference> owner = new HashMap<>();
            Map<ObjectReference, Integer> holds = new HashMap<>();
            Map<ObjectReference, List<ThreadReference>> contending = new HashMap<>();
            Map<ObjectReference, List<ThreadReference>> waitingOn = new HashMap<>();
            for (ThreadReference t : threads) {
                if (t.virtualMachine().canGetMonitorFrameInfo()) {
                    for (var info : t.ownedMonitorsAndFrames()) {
                        owner.put(info.monitor(), t);
                        holds.merge(info.monitor(), 1, Integer::sum);
                    }
                }
                if (isBlockedOnMonitor(t)) {
                    ObjectReference m = t.currentContendedMonitor();
                    if (m == null) m = Recorder.waitTarget(t);
                    if (m != null) contending.computeIfAbsent(m, k -> new ArrayList<>()).add(t);
                } else if (isWaiting(t)) {
                    ObjectReference m = Recorder.waitTarget(t);
                    if (m != null) waitingOn.computeIfAbsent(m, k -> new ArrayList<>()).add(t);
                }
            }
            return new LockView(owner, holds, contending, waitingOn);
        }

        ThreadReference ownerOf(ObjectReference monitor) {
            return monitor == null ? null : owner.get(monitor);
        }
    }

    /**
     * A Thread's Runnable. In JDK 25 it lives in {@code Thread.holder.task}; if a future JDK moves it, threads
     * simply show no fields rather than failing the recording.
     */
    static com.sun.jdi.Value threadTask(ThreadReference thread) {
        Field holderField = thread.referenceType().fieldByName("holder");
        if (holderField == null || !(thread.getValue(holderField) instanceof ObjectReference holder)) return null;
        Field task = holder.referenceType().fieldByName("task");
        return task == null ? null : holder.getValue(task);
    }

    private static List<Variable> threadFields(ThreadReference thread, Walk.ReadOnly refs) {
        com.sun.jdi.Value task = threadTask(thread);
        return task == null ? List.of() : List.of(new Variable("task", "java.lang.Runnable", refs.value(task)));
    }

    // ---- java.util.concurrent locks (JDK 25 layout; a different layout just shows no lock state) ----

    private static final String REENTRANT_LOCK = "java.util.concurrent.locks.ReentrantLock";
    private static final String AQS = "java.util.concurrent.locks.AbstractQueuedSynchronizer";

    static boolean isReentrantLock(ObjectReference obj) {
        return obj.referenceType().name().equals(REENTRANT_LOCK);
    }

    private static com.sun.jdi.Value field(ObjectReference obj, String name) {
        if (obj == null) return null;
        Field f = obj.referenceType().fieldByName(name);
        return f == null ? null : obj.getValue(f);
    }

    /** Owner, hold count and queued threads of a ReentrantLock, read from its AQS state. */
    private Monitor reentrantLockMonitor(ObjectReference lock, List<ThreadState> threads) {
        if (!(field(lock, "sync") instanceof ObjectReference sync)) return null;
        Set<String> known = new HashSet<>();
        threads.forEach(t -> known.add(t.id()));
        String owner = field(sync, "exclusiveOwnerThread") instanceof ThreadReference t ? threadId(t) : null;
        int holds = field(sync, "state") instanceof com.sun.jdi.IntegerValue v ? v.value() : 0;
        List<String> queued = new ArrayList<>();
        // The queue runs head → tail; walk back from the tail, which is always linked, then reverse.
        for (var node = field(sync, "tail"); node instanceof ObjectReference n; node = field(n, "prev")) {
            if (field(n, "waiter") instanceof ThreadReference w && known.contains(threadId(w))) queued.add(threadId(w));
            if (queued.size() > MAX_HEAP_OBJECTS) break;
        }
        java.util.Collections.reverse(queued);
        if (owner != null && !known.contains(owner)) owner = null;
        if (owner == null && queued.isEmpty()) return null;
        return new Monitor(owner, holds, queued, List.of());
    }

    /**
     * The thread that owns the ReentrantLock (or other AQS lock) {@code thread} is queued for, or null. A thread
     * waiting for such a lock is parked, not blocked on a monitor, so it has to be recognised from its frames.
     */
    static ThreadReference aqsLockOwner(ThreadReference thread) throws IncompatibleThreadStateException {
        if (thread.status() != ThreadReference.THREAD_STATUS_WAIT) return null;
        for (StackFrame frame : thread.frames()) {
            var method = frame.location().method();
            if (method.declaringType().name().equals(AQS) && method.name().equals("acquire")) {
                return field(frame.thisObject(), "exclusiveOwnerThread") instanceof ThreadReference owner
                        && !owner.equals(thread) ? owner : null;
            }
        }
        return null;
    }

    /** True when the thread is inside {@code Object.wait()} called directly from Lesson Program code. */
    boolean isWaitingInLessonCode(ThreadReference thread) throws IncompatibleThreadStateException {
        for (StackFrame frame : thread.frames()) {
            if (frame.location().declaringType().name().equals("java.lang.Object")) continue;
            return isLessonFrame(frame);
        }
        return false;
    }

    /** Instance fields, superclass fields first, each class in declaration order. */
    private static List<Field> instanceFields(ReferenceType type) {
        Deque<ReferenceType> chain = new ArrayDeque<>();
        for (ReferenceType t = type; t instanceof com.sun.jdi.ClassType c; t = c.superclass()) chain.push(t);
        if (chain.isEmpty()) chain.push(type);
        List<Field> fields = new ArrayList<>();
        for (ReferenceType t : chain) {
            t.fields().stream().filter(f -> !f.isStatic() && !f.isSynthetic()).forEach(fields::add);
        }
        return fields;
    }

    /** JVM plumbing we never expand: its fields lead deep into the runtime. */
    private static boolean opaque(ObjectReference obj) {
        return obj instanceof ClassObjectReference || obj instanceof ClassLoaderReference
                || obj instanceof ThreadReference || obj instanceof ThreadGroupReference
                || obj instanceof ModuleReference;
    }

    /** Blocked on a lock nobody holds any more: it will get it as soon as it runs, so it's really just ready. */
    private boolean lockIsFree(ThreadReference thread) {
        try {
            ObjectReference monitor = thread.currentContendedMonitor();
            if (monitor == null) monitor = Recorder.waitTarget(thread);
            return monitor != null && locks.ownerOf(monitor) == null && monitor.owningThread() == null;
        } catch (IncompatibleThreadStateException | UnsupportedOperationException e) {
            return false;
        }
    }

    /** In wait(), sleep(), join() or parked, rather than blocked on a lock. */
    static boolean isWaiting(ThreadReference thread) {
        int vs = virtualState(thread);
        if (vs >= 0) return vs == 3 || vs == 4 || vs == 6 || vs == 7 || (vs >= 15 && vs <= 18);
        int st = thread.status();
        return st == ThreadReference.THREAD_STATUS_WAIT || st == ThreadReference.THREAD_STATUS_SLEEPING;
    }

    // ---- virtual threads (JDK 25 VirtualThread.state values) ----

    private static final int VT_BLOCKING = 12, VT_BLOCKED = 13, VT_SUSPENDED_BIT = 256;

    /** VirtualThread.state without the "suspended" bit, or -1 for platform threads. */
    static int virtualState(ThreadReference thread) {
        if (!thread.isVirtual()) return -1;
        Field f = thread.referenceType().fieldByName("state");
        return f != null && thread.getValue(f) instanceof com.sun.jdi.IntegerValue v ? v.value() & ~VT_SUSPENDED_BIT : -1;
    }

    /**
     * An unmounted virtual thread queued to (re)enter a monitor, e.g. just notified. The JVM may still report it
     * as waiting, but its own state says otherwise.
     */
    static boolean isVirtualBlockedOnMonitor(ThreadReference thread) {
        int state = virtualState(thread);
        return state == VT_BLOCKING || state == VT_BLOCKED;
    }

    private static boolean isBlockedOnMonitor(ThreadReference thread) {
        return thread.status() == ThreadReference.THREAD_STATUS_MONITOR || isVirtualBlockedOnMonitor(thread);
    }

    /** Whether a virtual thread is on a carrier right now (null for platform threads). */
    static Boolean mounted(ThreadReference thread) {
        if (!thread.isVirtual()) return null;
        Field f = thread.referenceType().fieldByName("carrierThread");
        return f != null && thread.getValue(f) != null;
    }

    private String status(ThreadReference thread) {
        try {
            if (aqsLockOwner(thread) != null) return "blocked";
        } catch (IncompatibleThreadStateException e) {
            // not suspended: fall back to the plain status
        }
        if (isVirtualBlockedOnMonitor(thread)) return lockIsFree(thread) ? "runnable" : "blocked";
        int vs = virtualState(thread);
        if (vs >= 0) {
            // A virtual thread's own state is the truth; the JVM's status lags while it's unmounted.
            if (vs == 99) return "terminated";
            return isWaiting(thread) ? "waiting" : "runnable";
        }
        return switch (thread.status()) {
            case ThreadReference.THREAD_STATUS_MONITOR -> lockIsFree(thread) ? "runnable" : "blocked";
            case ThreadReference.THREAD_STATUS_WAIT, ThreadReference.THREAD_STATUS_SLEEPING -> "waiting";
            case ThreadReference.THREAD_STATUS_ZOMBIE -> "terminated";
            default -> "runnable";
        };
    }

    static Value primitive(PrimitiveValue v) {
        String type = v.type().name();
        String display = switch (v) {
            case CharValue c -> "'" + escape(String.valueOf(c.value()), '\'') + "'";
            case BooleanValue b -> String.valueOf(b.value());
            default -> v.toString();
        };
        return Value.primitive(type, display);
    }

    static String javaLiteral(String s) {
        return "\"" + escape(s, '"') + "\"";
    }

    private static String escape(String s, char quote) {
        var sb = new StringBuilder();
        for (char c : s.toCharArray()) {
            switch (c) {
                case '\n' -> sb.append("\\n");
                case '\t' -> sb.append("\\t");
                case '\r' -> sb.append("\\r");
                case '\\' -> sb.append("\\\\");
                default -> {
                    if (c == quote) sb.append('\\');
                    sb.append(c);
                }
            }
        }
        return sb.toString();
    }

    /** One breadth-first pass over the object graph for a single capture. */
    private final class Walk {
        /** uniqueID → our id, in discovery order. */
        final Map<Long, String> seen = new LinkedHashMap<>();
        /** Objects first discovered in this capture → whether any Reference to them was "direct". */
        final Map<String, Boolean> newlyFound = new LinkedHashMap<>();
        private final Deque<ObjectReference> queue = new ArrayDeque<>();

        /**
         * @param direct the Reference comes from a local, a static, a field of a Lesson Program Object, or an
         *               element of a non-internal array — i.e. code the Learner can see created or holds it
         */
        Value value(com.sun.jdi.Value v, boolean direct) {
            return switch (v) {
                case null -> Value.NULL;
                case PrimitiveValue p -> primitive(p);
                case ObjectReference o -> Value.ref(enqueue(o, direct));
                default -> throw new IllegalStateException("Unexpected value " + v);
            };
        }

        String enqueue(ObjectReference obj, boolean direct) {
            String id = objectIds.computeIfAbsent(obj.uniqueID(), k -> {
                String fresh = "o" + (objectIds.size() + 1);
                newlyFound.put(fresh, false);
                objects.put(fresh, obj);
                try {
                    obj.disableCollection();
                } catch (ObjectCollectedException ignored) {
                    // It was already gone; it will simply never show as Eligible.
                }
                return fresh;
            });
            if (objects.putIfAbsent(id, obj) == null) obj.disableCollection(); // a dropped internal came back
            if (direct) newlyFound.computeIfPresent(id, (k, was) -> true);
            if (seen.putIfAbsent(obj.uniqueID(), id) == null) queue.add(obj);
            return id;
        }

        void drain() {
            while (!queue.isEmpty()) {
                ObjectReference obj = queue.poll();
                if (obj instanceof ThreadReference t) {
                    // The one part of a Thread the Learner cares about: the Runnable it will run.
                    com.sun.jdi.Value task = threadTask(t);
                    if (task != null) value(task, true);
                    continue;
                }
                if (obj instanceof StringReference || BOXED.contains(obj.referenceType().name()) || opaque(obj)
                        || isReentrantLock(obj)) {
                    continue;
                }
                String id = objectIds.get(obj.uniqueID());
                boolean childrenDirect = lessonClasses.contains(obj.referenceType().name())
                        || (obj instanceof ArrayReference && !internal.contains(id) && !isFreshInternal(id));
                if (obj instanceof ArrayReference array) {
                    for (var v : array.getValues(0, Math.min(array.length(), MAX_ARRAY_ELEMENTS))) {
                        value(v, childrenDirect);
                    }
                } else {
                    for (Field f : instanceFields(obj.referenceType())) value(obj.getValue(f), childrenDirect);
                }
                if (seen.size() > MAX_HEAP_OBJECTS) return;
            }
        }

        /** A brand-new object that (so far) only has indirect References. */
        private boolean isFreshInternal(String id) {
            Boolean direct = newlyFound.get(id);
            return firstCapture || (direct != null && !direct);
        }

        /** Converts values without discovering anything — used once the walk is complete. */
        record ReadOnly(Map<Long, String> ids) {
            Value value(com.sun.jdi.Value v) {
                return switch (v) {
                    case null -> Value.NULL;
                    case PrimitiveValue p -> primitive(p);
                    case ObjectReference o -> Value.ref(ids.get(o.uniqueID()));
                    default -> throw new IllegalStateException("Unexpected value " + v);
                };
            }
        }
    }
}
