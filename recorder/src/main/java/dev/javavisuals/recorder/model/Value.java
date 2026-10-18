package dev.javavisuals.recorder.model;

import com.fasterxml.jackson.annotation.JsonInclude;

/** A primitive, null, or Reference — flattened to one record so it serializes exactly as the schema's Value. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record Value(String kind, String type, String display, String id) {

    public static final Value NULL = new Value("null", null, null, null);

    public static Value primitive(String type, String display) {
        return new Value("primitive", type, display, null);
    }

    public static Value ref(String id) {
        return new Value("ref", null, null, id);
    }
}
