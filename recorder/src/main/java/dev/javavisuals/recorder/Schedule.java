package dev.javavisuals.recorder;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * An author-defined interleaving of threads (ADR-0002), read from {@code schedules/<id>.yaml}:
 *
 * <pre>
 * - run: A
 *   until: increment   # a Marker: stop when A is about to run that line
 *   steps: 1           # then this many more of A's Steps
 * - run: B
 *   until: blocked     # or: waiting, or omit "until" to run B until it finishes
 * </pre>
 *
 * After the last Turn, remaining threads run one at a time in the order they were created.
 */
record Schedule(String id, List<Turn> turns) {

    static final String BLOCKED = "blocked";
    static final String WAITING = "waiting";

    /** One thread's turn. {@code until} is a Marker name, {@link #BLOCKED}, {@link #WAITING}, or null (finish). */
    record Turn(String thread, String until, int steps) {

        boolean untilMarker() {
            return until != null && !until.equals(BLOCKED) && !until.equals(WAITING);
        }

        @Override
        public String toString() {
            return "run " + thread + (until == null ? " to the end" : " until " + until) + (steps > 0 ? " + " + steps + " Steps" : "");
        }
    }

    /** Lets threads run one at a time in creation order, each until it finishes, blocks or waits. */
    static final Schedule SEQUENTIAL = new Schedule(null, List.of());

    private static final ObjectMapper YAML = new ObjectMapper(new YAMLFactory());
    private static final Set<String> KEYS = Set.of("run", "until", "steps");

    static Schedule read(Path lessonDir, String id) throws IOException {
        Path file = lessonDir.resolve("schedules").resolve(id + ".yaml");
        if (!Files.exists(file)) throw new IllegalArgumentException("Schedule \"" + id + "\" has no file " + file);
        JsonNode root = YAML.readTree(file.toFile());
        if (root == null || !root.isArray() || root.isEmpty()) {
            throw new IllegalArgumentException(file + ": a Schedule is a non-empty list of turns");
        }
        List<Turn> turns = new ArrayList<>();
        for (JsonNode node : root) {
            node.fieldNames().forEachRemaining(k -> {
                if (!KEYS.contains(k)) throw new IllegalArgumentException(file + ": unknown key \"" + k + "\" (use run, until, steps)");
            });
            String thread = node.path("run").asText("");
            if (thread.isEmpty()) throw new IllegalArgumentException(file + ": every turn needs `run: <thread name>`");
            String until = node.hasNonNull("until") ? node.get("until").asText() : null;
            int steps = node.path("steps").asInt(0);
            if (steps < 0) throw new IllegalArgumentException(file + ": `steps` can't be negative");
            if (steps > 0 && until != null && !new Turn(thread, until, 0).untilMarker()) {
                throw new IllegalArgumentException(file + ": `steps` only makes sense after a Marker");
            }
            turns.add(new Turn(thread, until, steps));
        }
        return new Schedule(id, List.copyOf(turns));
    }
}
