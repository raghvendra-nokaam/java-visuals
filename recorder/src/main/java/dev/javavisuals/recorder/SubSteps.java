package dev.javavisuals.recorder;

import com.sun.jdi.Field;
import com.sun.jdi.Location;
import com.sun.jdi.ObjectReference;
import com.sun.jdi.PrimitiveValue;
import com.sun.jdi.ReferenceType;
import com.sun.jdi.StackFrame;
import com.sun.jdi.VirtualMachine;
import dev.javavisuals.recorder.model.Trace.SourceFile;
import java.io.IOException;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Lines marked {@code // @substeps} are recorded one meaningful bytecode instruction at a time, so a line like
 * {@code count++} becomes "read count (5)", "add", "write count": the moments a race happens between.
 * Stack shuffling (loads, dups, constants) is stepped over silently.
 */
final class SubSteps {

    private final Set<String> lines = new HashSet<>();
    private final VirtualMachine vm;

    SubSteps(VirtualMachine vm, List<SourceFile> sources) {
        this.vm = vm;
        for (SourceFile file : sources) {
            for (int i = 0; i < file.lines().size(); i++) {
                if (file.lines().get(i).matches(".*//.*@substeps\\b.*")) lines.add(file.path() + ":" + (i + 1));
            }
        }
    }

    boolean isSubStepLine(Location location) {
        try {
            return lines.contains(location.sourceName() + ":" + location.lineNumber());
        } catch (com.sun.jdi.AbsentInformationException e) {
            return false;
        }
    }

    boolean any() {
        return !lines.isEmpty();
    }

    /**
     * What the instruction about to run at {@code location} does, in a few words, or null if it's one of the
     * instructions that only move values around and shouldn't get its own Step.
     */
    String label(Location location, StackFrame frame) throws IOException {
        byte[] code = location.method().bytecodes();
        int at = (int) location.codeIndex();
        int opcode = code[at] & 0xff;
        return switch (opcode) {
            case 0xb2, 0xb4 -> { // getstatic, getfield
                var ref = fieldAt(location, code, at);
                String value = ref == null ? null : currentValue(ref, frame, opcode == 0xb2);
                yield "read " + (ref == null ? "a field" : ref.name()) + (value == null ? "" : " (" + value + ")");
            }
            case 0xb3, 0xb5 -> { // putstatic, putfield
                var ref = fieldAt(location, code, at);
                yield "write " + (ref == null ? "a field" : ref.name());
            }
            case 0x60, 0x61, 0x62, 0x63 -> "add";
            case 0x64, 0x65, 0x66, 0x67 -> "subtract";
            case 0x68, 0x69, 0x6a, 0x6b -> "multiply";
            case 0x6c, 0x6d, 0x6e, 0x6f -> "divide";
            case 0x70, 0x71, 0x72, 0x73 -> "remainder";
            case 0x84 -> "increment a local variable"; // iinc
            case 0x2e, 0x2f, 0x30, 0x31, 0x32, 0x33, 0x34, 0x35 -> "read an array element";
            case 0x4f, 0x50, 0x51, 0x52, 0x53, 0x54, 0x55, 0x56 -> "write an array element";
            default -> null;
        };
    }

    private ConstantPool.FieldRef fieldAt(Location location, byte[] code, int at) throws IOException {
        if (!vm.canGetConstantPool()) return null;
        int index = ((code[at + 1] & 0xff) << 8) | (code[at + 2] & 0xff);
        return ConstantPool.of(location.declaringType()).field(index);
    }

    /** The value a field read is about to see: from {@code this} for instance fields, from the class for statics. */
    private String currentValue(ConstantPool.FieldRef ref, StackFrame frame, boolean isStatic) {
        try {
            if (isStatic) {
                for (ReferenceType type : vm.classesByName(ref.className())) {
                    Field f = type.fieldByName(ref.name());
                    if (f != null) return display(type.getValue(f));
                }
                return null;
            }
            ObjectReference self = frame.thisObject();
            if (self == null) return null;
            Field f = self.referenceType().fieldByName(ref.name());
            return f == null ? null : display(self.getValue(f));
        } catch (RuntimeException e) {
            return null; // best effort: the label just omits the value
        }
    }

    private static String display(com.sun.jdi.Value v) {
        return v instanceof PrimitiveValue p ? StateCapture.primitive(p).display() : null;
    }
}
