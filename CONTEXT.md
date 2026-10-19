# Java Visuals

An open-source platform that teaches Java — from its history and the basics through objects, the JVM, memory, and concurrency — by animating what actually happens when code runs.

## Language

### People

**Learner**:
Someone learning Java, from their first variable to understanding what happens underneath the code; ranges from students to developers preparing for senior roles.
_Avoid_: User, student, beginner

### Curriculum

**Track**:
An ordered group of Lessons on one subject area (History, Basics, Objects and classes, JVM, Memory, Concurrency…), shown in a suggested sequence.
_Avoid_: Course, module, section

**Prerequisite**:
A Lesson that another Lesson declares the Learner should understand first; advisory, never a lock.
_Avoid_: Requirement, dependency

### Lessons

**Lesson**:
A single teachable unit on one concept, presented visually. Every Lesson is exactly one of: Timeline Lesson, Animation Lesson, Execution Lesson.
_Avoid_: Tutorial, page, chapter

**Timeline Lesson**:
A Lesson structured as stops along Java's version history, each showing what changed and why it mattered; may embed Execution Lessons for before/after comparisons.
_Avoid_: History page

**Version Stop**:
One point on a Timeline Lesson: a Java release, or a **Turning Point** in Java's history that isn't a release (Oracle buying Sun, the move to six-month releases). A **Landmark** Version Stop (1.0, 1.2, 5, 8, 9, 11, 17, 21, 25) gets full treatment; others are brief.
_Avoid_: Milestone, release card, event (in UI copy)

**Animation Lesson**:
A Lesson that plays a bespoke animated visual Step by Step with no code walkthrough, such as a flow of Stages (source → bytecode → class loading → JIT) or a reference card.
_Avoid_: Pipeline lesson (former name), diagram lesson, flowchart

**View**:
How an Execution Lesson draws program state: **Variables** (default: the current method's variables), **Memory** (the Stack and Heap diagram), or a **Scene** (a bespoke real-life picture driven by the Trace).
_Avoid_: Mode, layout

**Stage**:
One step of the flow in an Animation Lesson (e.g. "ClassLoader verifies bytecode").
_Avoid_: Phase

**Execution Lesson**:
A Lesson that visualizes a Lesson Program running step by step.
_Avoid_: Code lesson, simulation

**Lesson Program**:
The fixed Java 25 source code an Execution Lesson runs and visualizes.
_Avoid_: Example, snippet, demo code

**Variant**:
A named, author-defined modification of a Lesson Program that a Learner can switch to (e.g. with vs. without `synchronized`, 2 vs. 4 threads).
_Avoid_: Option, setting, mode

**Detail Level**:
How much real JVM machinery a visualization reveals — **Simple** (stack, frames, heap, references) or **JVM** (generations, object headers, monitors, bytecode). Each Lesson sets a default; the Learner may switch where the Lesson provides both.
_Avoid_: Zoom, depth, difficulty

**Trace**:
The recorded, ordered sequence of Steps produced by running one Variant of a Lesson Program on a real JVM.
_Avoid_: Recording, log, execution history

**Step**:
One moment in a Lesson that the Player can land on. In an Execution Lesson it comes from a Trace (current line plus the full state of every Stack and the Heap); in a Timeline Lesson it is a Version Stop; in an Animation Lesson it is a Stage.
_Avoid_: Frame (reserved for the memory model), tick, snapshot, slide

**Player**:
The single playback interface every Lesson uses — play/pause, step, scrub, speed, Narration, Predict Prompts.
_Avoid_: Viewer, stepper, animator

**Step Description**:
A plain-text rendering of one Step's state (e.g. "Stack: main → add(2,3). Heap: 1 Object"), for screen readers.
_Avoid_: Alt text, transcript

**Marker**:
A named comment in a Lesson Program (e.g. `// @mark race-read`) that Narration and Predict Prompts attach to; resolved to a concrete Step at record time, optionally qualified by thread and hit count (`race-read@thread-2#1`).
_Avoid_: Anchor, tag, label

**Sub-step**:
A Step finer than one source line, used where a single line hides meaningful work (e.g. `count++` as read → add → write).
_Avoid_: Micro-step, instruction step

**Schedule**:
An author-defined interleaving of threads that the recorder enforces when producing a Trace, so a concurrency outcome (such as a lost update) is guaranteed to appear.
_Avoid_: Interleaving (as a noun for the artifact), scenario, seed

**Turn**:
One entry in a Schedule: run a named thread until it reaches a Marker (plus some Steps), blocks, waits, or finishes.
_Avoid_: Slice, phase, segment

**Narration**:
Author-written explanation attached to specific Steps, shown as playback reaches them; the only explanatory text in a Lesson.
_Avoid_: Caption, commentary, description

**Predict Prompt**:
A pause point in a Lesson where the Learner must guess what happens next before it is revealed.
_Avoid_: Quiz, question, checkpoint

### Memory model

**Stack**:
The per-thread column of Frames shown in a visualization.

**Frame**:
One method invocation on a Stack, holding its parameters and local variables.
_Avoid_: Stack frame, activation record (in UI copy)

**Heap**:
The shared region where Objects live, visible to every Stack.

**Object**:
An instance on the Heap, drawn as a box with its fields.

**Reference**:
A pointer from a variable or field to an Object, drawn as an arrow.
_Avoid_: Pointer, address

**JDK Internal**:
An Object the JVM or standard library creates that the Lesson Program did not directly create (e.g. an `ArrayList`'s backing array); hidden unless the Lesson opts to show it at the JVM Detail Level.
_Avoid_: System object, hidden object

**Eligible**:
The state of an Object no longer reachable by any Reference; drawn greyed out but still present on the Heap.
_Avoid_: Dead, garbage, freed

**Collected**:
The state of an Object actually removed by a garbage collection, shown only in Lessons that explicitly depict GC.
_Avoid_: Deleted, freed, destroyed

### Locks

**Monitor**:
The lock belonging to an Object, drawn on that Object with its owning thread and waiting threads.
_Avoid_: Mutex, intrinsic lock (in UI copy)
