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

    /**
     * Resolves the Markers this run reached. A Variant may take a path that never reaches some Markers (a thread
     * that never has to wait, a deadlock that stops the program); those are left out. {@link #checkReached}
     * then fails the recording if a Marker is reached by no Variant at all, which is almost always a typo.
     */
    static Map<String, Integer> resolve(List<SourceFile> sources, List<Step> steps) {
        Map<String, Integer> markers = new LinkedHashMap<>();
        for (Declared marker : declared(sources)) {
            if (markers.containsKey(marker.key())) {
                throw new IllegalStateException("Marker \"" + marker.key() + "\" is declared twice");
            }
            Integer step = find(steps, marker);
            if (step != null) markers.put(marker.key(), step);
        }
        return markers;
    }

    /** Fails if a Marker declared in any Variant's sources was reached by none of them. */
    static void checkReached(Map<String, List<SourceFile>> sourcesByVariant, Map<String, Map<String, Integer>> markersByVariant) {
        java.util.Set<String> reached = new java.util.HashSet<>();
        markersByVariant.values().forEach(m -> reached.addAll(m.keySet()));
        for (var entry : sourcesByVariant.entrySet()) {
            for (Declared marker : declared(entry.getValue())) {
                if (!reached.contains(marker.key())) {
                    throw new IllegalStateException("Marker \"" + marker.key() + "\" (" + marker.file() + ":" + marker.line()
                            + ") matches no Step in any Variant");
                }
            }
        }
    }

    record Declared(String key, String file, int line, String thread, int hit) {}

    static List<Declared> declared(List<SourceFile> sources) {
        List<Declared> declared = new java.util.ArrayList<>();
        for (SourceFile file : sources) {
            for (int i = 0; i < file.lines().size(); i++) {
                Matcher m = MARK.matcher(file.lines().get(i));
                while (m.find()) {
                    String key = m.group(0).replaceFirst("//\\s*@mark\\s+", "");
                    int hit = m.group(3) == null ? 1 : Integer.parseInt(m.group(3));
                    declared.add(new Declared(key, file.path(), i + 1, m.group(2), hit));
                }
            }
        }
        return declared;
    }

    /** "file:line" → the (unqualified) Marker names on that line; used to tell when a Schedule's turn is over. */
    static Map<String, List<String>> byLine(List<SourceFile> sources) {
        Map<String, List<String>> byLine = new java.util.HashMap<>();
        for (SourceFile file : sources) {
            for (int i = 0; i < file.lines().size(); i++) {
                Matcher m = MARK.matcher(file.lines().get(i));
                while (m.find()) byLine.computeIfAbsent(file.path() + ":" + (i + 1), k -> new java.util.ArrayList<>()).add(m.group(1));
            }
        }
        return byLine;
    }

    private static Integer find(List<Step> steps, Declared marker) {
        int seen = 0;
        for (int i = 0; i < steps.size(); i++) {
            Step s = steps.get(i);
            boolean here = s.location().file().equals(marker.file()) && s.location().line() == marker.line()
                    && (s.subStep() == null || s.subStep().index() == 0);
            if (here && (marker.thread() == null || marker.thread().equals(s.activeThread())) && ++seen == marker.hit()) return i;
        }
        return null;
    }
}
