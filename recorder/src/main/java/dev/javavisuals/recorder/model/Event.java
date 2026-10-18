package dev.javavisuals.recorder.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

/** One entry of Step.events; only the fields relevant to {@code type} are set. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record Event(
        String type,
        String thread,
        String frameId,
        String objectId,
        Target target,
        Value value,
        String text,
        List<String> threads) {

    public static Event call(String thread, String frameId) {
        return new Event("call", thread, frameId, null, null, null, null, null);
    }

    public static Event ret(String thread, String frameId, Value value) {
        return new Event("return", thread, frameId, null, null, value, null, null);
    }

    public static Event allocate(String objectId) {
        return new Event("allocate", null, null, objectId, null, null, null, null);
    }

    public static Event assign(Target target, Value value) {
        return new Event("assign", null, null, null, target, value, null, null);
    }

    public static Event eligible(String objectId) {
        return new Event("eligible", null, null, objectId, null, null, null, null);
    }

    public static Event output(String text) {
        return new Event("output", null, null, null, null, null, text, null);
    }

    /** {@code lock-acquire}, {@code lock-release} or {@code lock-block}: a thread and the Object whose Monitor it used. */
    public static Event lock(String type, String thread, String objectId) {
        return new Event(type, thread, null, objectId, null, null, null, null);
    }

    /** {@code thread-start} or {@code thread-end}. */
    public static Event thread(String type, String thread) {
        return new Event(type, thread, null, null, null, null, null, null);
    }

    /** Every listed thread is blocked waiting for a lock another of them holds; the program can never finish. */
    public static Event deadlock(List<String> threads) {
        return new Event("deadlock", null, null, null, null, null, null, threads);
    }

    /** Where an assignment landed: a local, an Object field, an array slot, or a static. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Target(String frameId, String name, String objectId, String field, Integer index, String className) {

        public static Target local(String frameId, String name) {
            return new Target(frameId, name, null, null, null, null);
        }

        public static Target field(String objectId, String field) {
            return new Target(null, null, objectId, field, null, null);
        }

        public static Target element(String objectId, int index) {
            return new Target(null, null, objectId, null, index, null);
        }

        public static Target staticField(String className, String field) {
            return new Target(null, null, null, field, null, className);
        }
    }
}
