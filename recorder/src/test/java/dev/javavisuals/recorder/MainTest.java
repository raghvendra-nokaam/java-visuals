package dev.javavisuals.recorder;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class MainTest {

    @Test
    void runsOnJava25() {
        assertEquals(25, Runtime.version().feature());
    }

    @Test
    void jdiIsAvailable() {
        assertTrue(Main.jdiAvailable());
    }
}
