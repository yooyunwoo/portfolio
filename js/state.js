const initialState = Object.freeze({
  status: 'idle',
  theme: 'animals',
  difficulty: 'normal',
  deck: [],
  selectedCardIds: [],
  matchedPairIds: [],
  moves: 0,
  elapsedSeconds: 0,
  inputLocked: false,
});

function createGameState(overrides = {}) {
  return {
    ...initialState,
    ...overrides,
    deck: [...(overrides.deck ?? initialState.deck)],
    selectedCardIds: [],
    matchedPairIds: [],
  };
}
