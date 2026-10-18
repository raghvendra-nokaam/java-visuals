package dev.javavisuals.recorder;

import dev.javavisuals.recorder.model.Event;
import dev.javavisuals.recorder.model.Event.Target;
import dev.javavisuals.recorder.model.Trace.Frame;
import dev.javavisuals.recorder.model.Trace.HeapObject;
import dev.javavisuals.recorder.model.Trace.Step;
import dev.javavisuals.recorder.model.Trace.Variable;
import dev.javavisuals.recorder.model.Value;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Fills Step.events. Calls, returns and output come from the debugger as they happen; allocations,
 * assignments and eligibility are derived by diffing against the previous Step.
 *
 * <p>Canonical order: returns, allocations, calls, assignments, eligibility, output. An assignment that
 * writes the value a slot already held is invisible to the diff and is not reported.
 */
final class EventDiff {

    private EventDiff() {}

    static Step withEvents(Step step, Step prev, List<Event> observed) {
        List<Event> events = new ArrayList<>();
        observed.stream().filter(e -> e.type().equals("return")).forEach(events::add);

        Map<String, HeapObject> before = new HashMap<>();
        if (prev != null) prev.heap().forEach(o -> before.put(o.id(), o));
        if (prev != null) {
            step.heap().stream()
                    .filter(o -> !before.containsKey(o.id()) && !o.internal())
                    .forEach(o -> events.add(Event.allocate(o.id())));
        }

        observed.stream().filter(e -> e.type().equals("call")).forEach(events::add);

        if (prev != null) {
            Map<String, Frame> prevFrames = new HashMap<>();
            prev.threads().forEach(t -> t.frames().forEach(f -> prevFrames.put(f.id(), f)));
            step.threads().forEach(t -> t.frames().forEach(f -> {
                Frame old = prevFrames.get(f.id());
                if (old != null) diffVariables(old.locals(), f.locals(), name -> Target.local(f.id(), name), events);
            }));

            for (HeapObject obj : step.heap()) {
                HeapObject old = before.get(obj.id());
                if (old == null) continue;
                if (obj.fields() != null) {
                    diffVariables(old.fields(), obj.fields(), name -> Target.field(obj.id(), name), events);
                }
                if (obj.elements() != null) {
                    for (int i = 0; i < obj.elements().size(); i++) {
                        Value was = i < old.elements().size() ? old.elements().get(i) : null;
                        if (!obj.elements().get(i).equals(was)) events.add(Event.assign(Target.element(obj.id(), i), obj.elements().get(i)));
                    }
                }
            }

            Map<String, List<Variable>> prevStatics = new HashMap<>();
            prev.statics().forEach(s -> prevStatics.put(s.className(), s.fields()));
            step.statics().forEach(s -> diffVariables(prevStatics.getOrDefault(s.className(), List.of()), s.fields(),
                    name -> Target.staticField(s.className(), name), events));

            step.heap().stream()
                    .filter(o -> o.state().equals("eligible") && before.containsKey(o.id())
                            && before.get(o.id()).state().equals("live"))
                    .forEach(o -> events.add(Event.eligible(o.id())));
        }

        observed.stream().filter(e -> e.type().equals("output")).forEach(events::add);
        return new Step(step.location(), step.subStep(), step.activeThread(), step.threads(), step.statics(),
                step.heap(), step.console(), events);
    }

    private static void diffVariables(List<Variable> before, List<Variable> after,
            java.util.function.Function<String, Target> target, List<Event> events) {
        Map<String, Value> old = new HashMap<>();
        before.forEach(v -> old.put(v.name(), v.value()));
        for (Variable v : after) {
            if (!Objects.equals(old.get(v.name()), v.value())) events.add(Event.assign(target.apply(v.name()), v.value()));
        }
    }
}
