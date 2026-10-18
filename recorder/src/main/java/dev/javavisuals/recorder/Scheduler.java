package dev.javavisuals.recorder;

import java.util.Collection;

/**
 * Tracks progress through a {@link Schedule}: which thread's turn it is and when that turn is over.
 * The Recorder asks it after every Step and whenever the running thread blocks, waits or finishes.
 * Mistakes in a Schedule fail the recording with the turn that went wrong.
 */
final class Scheduler {

    private final Schedule schedule;
    private int index;
    private boolean reachedMarker;
    private int remaining;

    Scheduler(Schedule schedule) {
        this.schedule = schedule;
    }

    /** The turn in progress, or null once the Schedule is used up (threads then run in creation order). */
    Schedule.Turn current() {
        return index < schedule.turns().size() ? schedule.turns().get(index) : null;
    }

    /** After {@code thread} produced a Step. Returns true when its turn just ended. */
    boolean afterStep(String thread, Collection<String> markersHere, boolean firstVisitOfLine) {
        Schedule.Turn turn = current();
        if (turn == null || !turn.thread().equals(thread) || !turn.untilMarker()) return false;
        if (!reachedMarker) {
            if (!firstVisitOfLine || !markersHere.contains(turn.until())) return false;
            reachedMarker = true;
            remaining = turn.steps();
            return remaining == 0 && advance();
        }
        return --remaining <= 0 && advance();
    }

    boolean onFinished(String thread) {
        Schedule.Turn turn = current();
        if (turn == null || !turn.thread().equals(thread)) return false;
        if (turn.until() == null) return advance();
        throw fail(turn, thread + " finished before reaching \"" + turn.until() + "\"");
    }

    boolean onBlocked(String thread, String lockHolder) {
        Schedule.Turn turn = current();
        if (turn == null || !turn.thread().equals(thread)) return false;
        if (Schedule.BLOCKED.equals(turn.until())) return advance();
        throw fail(turn, thread + " blocked waiting for a lock held by " + lockHolder
                + ". If that's intended, end this turn with `until: blocked`");
    }

    boolean onWaiting(String thread) {
        Schedule.Turn turn = current();
        if (turn == null || !turn.thread().equals(thread)) return false;
        if (Schedule.WAITING.equals(turn.until())) return advance();
        throw fail(turn, thread + " started waiting (join, wait or sleep). If that's intended, end this turn with `until: waiting`");
    }

    /** Called when the program ends; a Schedule that never got to all its turns is a mistake. */
    void checkFinished() {
        Schedule.Turn turn = current();
        if (turn != null) throw fail(turn, "the program ended before this turn could run");
    }

    IllegalStateException fail(Schedule.Turn turn, String why) {
        return new IllegalStateException("Schedule \"" + schedule.id() + "\", turn " + (index + 1) + " (" + turn + "): " + why);
    }

    private boolean advance() {
        index++;
        reachedMarker = false;
        remaining = 0;
        return true;
    }
}
