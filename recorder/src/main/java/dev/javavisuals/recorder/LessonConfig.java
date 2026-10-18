package dev.javavisuals.recorder;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

/**
 * The parts of lesson.yaml the recorder needs: the Lesson kind and its Variant ids.
 * Execution Lessons get Traces; Pipeline Lessons with a Program get its bytecode listing.
 * The site owns full validation of lesson.yaml (site/src/content.config.ts).
 */
record LessonConfig(String kind, List<VariantConfig> variantConfigs) {

    /** A Variant: its id, and the Schedule it records under, if any. */
    record VariantConfig(String id, String schedule) {}

    private static final ObjectMapper YAML = new ObjectMapper(new YAMLFactory());

    static LessonConfig read(Path lessonDir) throws IOException {
        Path file = lessonDir.resolve("lesson.yaml");
        if (!Files.exists(file)) return new LessonConfig("execution", List.of(new VariantConfig(Lesson.DEFAULT_VARIANT, null)));
        JsonNode root = YAML.readTree(file.toFile());
        String kind = root.path("kind").asText("");
        if (kind.isEmpty()) throw new IllegalArgumentException(file + ": missing `kind`");
        List<VariantConfig> variants = new ArrayList<>();
        root.path("variants").forEach(v -> variants.add(new VariantConfig(
                v.path("id").asText(), v.hasNonNull("schedule") ? v.get("schedule").asText() : null)));
        if (variants.isEmpty()) variants.add(new VariantConfig(Lesson.DEFAULT_VARIANT, null));
        if (!variants.getFirst().id().equals(Lesson.DEFAULT_VARIANT)) {
            throw new IllegalArgumentException(file + ": the first Variant must be `" + Lesson.DEFAULT_VARIANT + "`");
        }
        return new LessonConfig(kind, List.copyOf(variants));
    }

    List<String> variants() {
        return variantConfigs.stream().map(VariantConfig::id).toList();
    }

    boolean isExecution() {
        return kind.equals("execution");
    }

    boolean isPipeline() {
        return kind.equals("pipeline");
    }
}
