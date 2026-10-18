/**
 * Renderer-agnostic playback state. Pure: the Player component feeds it actions and renders the result.
 */
export interface PlayerState {
  index: number;
  playing: boolean;
  speed: number;
  /** A Predict Prompt blocking the move past `index`. */
  prompt: { phase: "asking" } | { phase: "revealed"; choice: number } | null;
  /** Steps whose Predict Prompt has been answered; they no longer block. */
  answered: ReadonlySet<number>;
}

export interface PlayerConfig {
  stepCount: number;
  promptSteps: ReadonlySet<number>;
}

export type PlayerAction =
  | { type: "next" }
  | { type: "prev" }
  | { type: "seek"; index: number }
  | { type: "play" }
  | { type: "pause" }
  | { type: "toggle" }
  | { type: "choose"; choice: number }
  | { type: "continue" }
  | { type: "speed"; speed: number }
  | { type: "reset"; index?: number };

export const SPEEDS = [0.5, 1, 2] as const;

export function initialState(index = 0): PlayerState {
  return { index, playing: false, speed: 1, prompt: null, answered: new Set() };
}

export function reduce(state: PlayerState, action: PlayerAction, config: PlayerConfig): PlayerState {
  const last = config.stepCount - 1;
  const clamp = (i: number) => Math.max(0, Math.min(last, i));

  switch (action.type) {
    case "next": {
      if (state.prompt) return state;
      if (state.index >= last) return { ...state, playing: false };
      if (config.promptSteps.has(state.index) && !state.answered.has(state.index)) {
        return { ...state, playing: false, prompt: { phase: "asking" } };
      }
      const index = state.index + 1;
      return { ...state, index, playing: state.playing && index < last };
    }
    case "prev":
      return { ...state, index: clamp(state.index - 1), playing: false, prompt: null };
    case "seek":
      return { ...state, index: clamp(action.index), playing: false, prompt: null };
    case "play":
      if (state.prompt) return state;
      // Playing from the end starts over, like a media player.
      return { ...state, playing: true, index: state.index >= last ? 0 : state.index };
    case "pause":
      return { ...state, playing: false };
    case "toggle":
      return reduce(state, { type: state.playing ? "pause" : "play" }, config);
    case "choose":
      if (state.prompt?.phase !== "asking") return state;
      return {
        ...state,
        prompt: { phase: "revealed", choice: action.choice },
        answered: new Set([...state.answered, state.index]),
      };
    case "continue":
      if (state.prompt?.phase !== "revealed") return state;
      return { ...state, prompt: null, index: clamp(state.index + 1) };
    case "speed":
      return { ...state, speed: action.speed };
    case "reset":
      return { ...initialState(clamp(action.index ?? 0)), speed: state.speed, answered: state.answered };
  }
}
