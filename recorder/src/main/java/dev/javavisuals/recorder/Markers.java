package dev.javavisuals.recorder;

import dev.javavisuals.recorder.model.Trace.SourceFile;
import dev.javavisuals.recorder.model.Trace.Step;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Resolves {@code // @mark name} comments to Step indices (see docs/trace-format.md#markers).
 * An unqualified name means the first Step at that line; {@code name@thread#hit} means the hit-th time
 * that thread is at that line. An unresolvable Marker fails the recording.
 */
final class Markers {

    private static final Pattern MARK = Pattern.compile(
            "//\\s*@mark\\s+([a-z0-9]+(?:-[a-z0-9]+)*)(?:@([A-Za-z0-9_-]+))?(?:#([1-9][0-9]*))?");

    private Markers() {}

    static Map<String, Integer> resolve(List<SourceFile> sources, List<Step> steps) {
        Map<String, Integer> markers = new LinkedHashMap<>();
        for (SourceFile file : sources) {
            for (int i = 0; i < file.lines().size(); i++) {
                Matcher m = MARK.matcher(file.lines().get(i));
                while (m.find()) {
                    String thread = m.group(2);
                    int hit = m.group(3) == null ? 1 : Integer.parseInt(m.group(3));
                    String key = m.group(0).replaceFirst("//\\s*@mark\\s+", "");
                    if (markers.containsKey(key)) {
                        throw new IllegalStateException("Marker \"" + key + "\" is declared twice");
                    }
                    markers.put(key, find(steps, file.path(), i + 1, thread, hit, key));
                }
            }
        }
        return markers;
    }

    private static int find(List<Step> steps, String file, int line, String thread, int hit, String key) {
        int seen = 0;
        for (int i = 0; i < steps.size(); i++) {
            Step s = steps.get(i);
            boolean here = s.location().file().equals(file) && s.location().line() == line
                    && (s.subStep() == null || s.subStep().index() == 0);
            if (here && (thread == null || thread.equals(s.activeThread())) && ++seen == hit) return i;
        }
        throw new IllegalStateException("Marker \"" + key + "\" (" + file + ":" + line + ") matches no Step");
    }
}
