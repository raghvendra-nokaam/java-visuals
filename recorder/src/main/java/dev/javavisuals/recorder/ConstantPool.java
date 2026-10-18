package dev.javavisuals.recorder;

import com.sun.jdi.ReferenceType;
import java.io.ByteArrayInputStream;
import java.io.DataInputStream;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

/**
 * Just enough of a class's constant pool (JVMS §4.4) to name the field an instruction reads or writes.
 * JDI hands over the raw pool bytes; this walks them once per class.
 */
final class ConstantPool {

    /** A field reference: the class that declares it and the field's name. */
    record FieldRef(String className, String name) {}

    private final Map<Integer, FieldRef> fieldRefs = new HashMap<>();

    private ConstantPool(ReferenceType type) throws IOException {
        int count = type.constantPoolCount();
        var in = new DataInputStream(new ByteArrayInputStream(type.constantPool()));
        String[] utf8 = new String[count];
        int[] classNameIndex = new int[count];
        int[][] nameAndType = new int[count][];
        int[][] fieldRef = new int[count][];
        for (int i = 1; i < count; i++) {
            int tag = in.readUnsignedByte();
            switch (tag) {
                case 1 -> utf8[i] = in.readUTF();
                case 3, 4 -> in.skipNBytes(4);
                case 5, 6 -> {
                    in.skipNBytes(8);
                    i++; // longs and doubles take two slots
                }
                case 7 -> classNameIndex[i] = in.readUnsignedShort();
                case 8, 16, 19, 20 -> in.skipNBytes(2);
                case 9 -> fieldRef[i] = new int[] {in.readUnsignedShort(), in.readUnsignedShort()};
                case 10, 11, 17, 18 -> in.skipNBytes(4);
                case 12 -> nameAndType[i] = new int[] {in.readUnsignedShort(), in.readUnsignedShort()};
                case 15 -> in.skipNBytes(3);
                default -> throw new IOException("Unknown constant pool tag " + tag + " in " + type.name());
            }
        }
        for (int i = 1; i < count; i++) {
            if (fieldRef[i] == null) continue;
            String owner = utf8[classNameIndex[fieldRef[i][0]]];
            String name = utf8[nameAndType[fieldRef[i][1]][0]];
            fieldRefs.put(i, new FieldRef(owner.replace('/', '.'), name));
        }
    }

    private static final Map<ReferenceType, ConstantPool> CACHE = new HashMap<>();

    static ConstantPool of(ReferenceType type) throws IOException {
        ConstantPool pool = CACHE.get(type);
        if (pool == null) CACHE.put(type, pool = new ConstantPool(type));
        return pool;
    }

    FieldRef field(int index) {
        return fieldRefs.get(index);
    }
}
