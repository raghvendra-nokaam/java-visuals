package dev.javavisuals.recorder;

import com.fasterxml.jackson.core.util.DefaultIndenter;
import com.fasterxml.jackson.core.util.DefaultPrettyPrinter;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.ObjectWriter;
import dev.javavisuals.recorder.model.Trace;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

/** Serializes Traces as 2-space-indented JSON with a trailing newline. */
final class TraceJson {

    static final ObjectMapper MAPPER = new ObjectMapper();

    private static final ObjectWriter WRITER = MAPPER.writer(new DefaultPrettyPrinter()
            .withObjectIndenter(new DefaultIndenter("  ", "\n"))
            .withArrayIndenter(new DefaultIndenter("  ", "\n"))
            .withSeparators(DefaultPrettyPrinter.DEFAULT_SEPARATORS.withObjectFieldValueSpacing(
                    com.fasterxml.jackson.core.util.Separators.Spacing.AFTER)));

    private TraceJson() {}

    static String toJson(Trace trace) throws IOException {
        return WRITER.writeValueAsString(trace) + "\n";
    }

    static void write(Trace trace, Path file) throws IOException {
        Files.createDirectories(file.getParent());
        Files.writeString(file, toJson(trace));
    }
}
