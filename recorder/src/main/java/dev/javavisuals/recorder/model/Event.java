package dev.javavisuals.recorder.model;

import com.fasterxml.jackson.annotation.JsonInclude;

/** One entry of Step.events; only the fields relevant to {@code type} are set. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record Event(
        String type, String thread, String frameId, String objectId, Target target, Value value, String text) {

    public static Event call(String thread, String frameId) {
        return new Event("call", thread, frameId, null, null, null, null);
    }

    public static Event ret(String thread, String frameId, Value value) {
        return new Event("return", thread, frameId, null, null, value, null);
    }

    public static Event allocate(String objectId) {
        return new Event("allocate", null, null, objectId, null, null, null);
    }

    public static Event assign(Target target, Value value) {
        return new Event("assign", null, null, null, target, value, null);
    }

    public static Event eligible(String objectId) {
        return new Event("eligible", null, null, objectId, null, null, null);
    }

    public static Event output(String text) {
        return new Event("output", null, null, null, null, null, text);
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
