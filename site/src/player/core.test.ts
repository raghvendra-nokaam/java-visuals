import { describe, expect, it } from "vitest";
import { initialState, reduce, type PlayerAction, type PlayerState } from "./core";

const config = { stepCount: 5, promptSteps: new Set([2]) };
const run = (actions: PlayerAction[], from: PlayerState = initialState()) =>
  actions.reduce((s, a) => reduce(s, a, config), from);

describe("player core", () => {
  it("steps forward and back within bounds", () => {
    expect(run([{ type: "prev" }]).index).toBe(0);
    expect(run([{ type: "next" }, { type: "next" }]).index).toBe(2);
    expect(run([{ type: "seek", index: 99 }]).index).toBe(4);
    expect(run([{ type: "seek", index: 4 }, { type: "next" }]).index).toBe(4);
  });

  it("a Predict Prompt blocks moving past its Step until answered", () => {
    const blocked = run([{ type: "seek", index: 2 }, { type: "next" }]);
    expect(blocked.index).toBe(2);
    expect(blocked.prompt).toEqual({ phase: "asking" });
    expect(reduce(blocked, { type: "next" }, config)).toBe(blocked);

    const revealed = reduce(blocked, { type: "choose", choice: 1 }, config);
    expect(revealed.prompt).toEqual({ phase: "revealed", choice: 1 });
    expect(revealed.index).toBe(2);

    const moved = reduce(revealed, { type: "continue" }, config);
    expect(moved.index).toBe(3);
    expect(moved.prompt).toBeNull();

    // Once answered, it never blocks again, even after scrubbing back.
    expect(run([{ type: "seek", index: 2 }, { type: "next" }], moved).index).toBe(3);
  });

  it("playback pauses at a Predict Prompt and at the end", () => {
    const playing = run([{ type: "play" }, { type: "next" }, { type: "next" }]);
    expect(playing.index).toBe(2);
    expect(playing.playing).toBe(true);
    const atPrompt = reduce(playing, { type: "next" }, config);
    expect(atPrompt.playing).toBe(false);
    expect(atPrompt.prompt?.phase).toBe("asking");

    const end = run([{ type: "seek", index: 3 }, { type: "play" }, { type: "next" }]);
    expect(end).toMatchObject({ index: 4, playing: false });
  });

  it("play is ignored while a prompt is open; playing from the end restarts", () => {
    const blocked = run([{ type: "seek", index: 2 }, { type: "next" }]);
    expect(reduce(blocked, { type: "play" }, config).playing).toBe(false);
    expect(run([{ type: "seek", index: 4 }, { type: "play" }])).toMatchObject({ index: 0, playing: true });
  });

  it("scrubbing or stepping back dismisses an open prompt", () => {
    const blocked = run([{ type: "seek", index: 2 }, { type: "next" }]);
    expect(reduce(blocked, { type: "prev" }, config)).toMatchObject({ index: 1, prompt: null });
    expect(reduce(blocked, { type: "seek", index: 4 }, config)).toMatchObject({ index: 4, prompt: null });
  });
});
