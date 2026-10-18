package dev.javavisuals.recorder.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;
import java.util.Map;

/**
 * In-memory form of a Trace. Mirrors trace-schema/schema/trace.schema.json; see docs/trace-format.md.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record Trace(
        int schemaVersion,
        String lessonId,
        String variantId,
        String scheduleId,
        List<SourceFile> source,
        Map<String, Integer> markers,
        List<Step> steps) {

    public static final int SCHEMA_VERSION = 1;

    public record SourceFile(String path, List<String> lines) {}

    public record Location(String file, int line) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Step(
            Location location,
            SubStep subStep,
            String activeThread,
            List<ThreadState> threads,
            List<StaticFields> statics,
            List<HeapObject> heap,
            String console,
            List<Event> events) {}

    public record SubStep(int index, int count, String label) {}

    public record ThreadState(String id, String name, String state, List<Frame> frames) {}

    public record Frame(String id, String className, String method, int line, List<Variable> locals) {}

    public record StaticFields(String className, List<Variable> fields) {}

    public record Variable(String name, String type, Value value) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record HeapObject(
            String id,
            String type,
            String shape,
            List<Variable> fields,
            List<Value> elements,
            String display,
            String state,
            boolean internal,
            boolean inline,
            Location allocatedAt,
            Monitor monitor) {}

    public record Monitor(String owner, int entryCount, List<String> blocked, List<String> waiting) {}
}
