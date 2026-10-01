const THEMES = {
  animals: ['🦊', '🐼', '🐱', '🐙', '🦁', '🐸', '🐰', '🐨', '🐯', '🐵', '🐧', '🦄'],
  web: ['🌐', '🎨', '⚡', '🧩', '⌨️', '🖱️', '📱', '🔧', '📦', '🚀', '💾', '🔍'],
};

const DIFFICULTIES = {
  easy: { pairs: 6, columns: 4, label: '쉬움' },
  normal: { pairs: 8, columns: 4, label: '보통' },
  hard: { pairs: 12, columns: 6, label: '어려움' },
};

function createDeck(theme, difficulty) {
  const symbols = THEMES[theme].slice(0, DIFFICULTIES[difficulty].pairs);
  const pairs = symbols.flatMap((symbol, pairId) => [
    { id: `${pairId}-a`, pairId, symbol },
    { id: `${pairId}-b`, pairId, symbol },
  ]);

  return shuffle(pairs);
}

function findCard(deck, cardId) {
  return deck.find((card) => card.id === cardId);
}

function isMatchingPair(firstCard, secondCard) {
  return Boolean(firstCard && secondCard && firstCard.id !== secondCard.id && firstCard.pairId === secondCard.pairId);
}

function isGameComplete(matchedPairIds, difficulty) {
  return matchedPairIds.length === DIFFICULTIES[difficulty].pairs;
}
