const MISMATCH_DELAY_MS = 800;
const MATCH_FEEDBACK_MS = 350;

const elements = {
  setupForm: document.querySelector('#game-setup'),
  homeScreen: document.querySelector('#home'),
  gameScreen: document.querySelector('#game'),
  cardGrid: document.querySelector('#card-grid'),
  gameTheme: document.querySelector('#game-theme'),
  timeValue: document.querySelector('#time-value'),
  movesValue: document.querySelector('#moves-value'),
  matchesValue: document.querySelector('#matches-value'),
  pairsValue: document.querySelector('#pairs-value'),
  announcement: document.querySelector('#game-announcement'),
  pauseButton: document.querySelector('#pause-button'),
  pauseDialog: document.querySelector('#pause-dialog'),
  resumeButton: document.querySelector('#resume-button'),
  restartButton: document.querySelector('#restart-button'),
  resultDialog: document.querySelector('#result-dialog'),
  resultSummary: document.querySelector('#result-summary'),
  replayButton: document.querySelector('#replay-button'),
  recordTitle: document.querySelector('#record-title'),
  bestRecord: document.querySelector('#best-record'),
  themeToggle: document.querySelector('#theme-toggle'),
  soundToggle: document.querySelector('#sound-toggle'),
  homeLink: document.querySelector('#home-link'),
};

let gameState = createGameState();
const appData = loadPreferences();
appData.records ??= {};
appData.sound ??= true;
setSoundEnabled(appData.sound);

let timerId = null;
let timerStartedAt = null;
let accumulatedTimeMs = 0;
let pendingResolutionId = null;

function getCardElement(cardId) {
  return elements.cardGrid.querySelector(`[data-card-id="${cardId}"]`);
}

function announce(message) {
  elements.announcement.textContent = '';
  window.requestAnimationFrame(() => {
    elements.announcement.textContent = message;
  });
}

function updateSoundButton() {
  const enabled = appData.sound;
  elements.soundToggle.textContent = enabled ? '🔊' : '🔇';
  elements.soundToggle.setAttribute('aria-pressed', String(!enabled));
  elements.soundToggle.setAttribute('aria-label', enabled ? '효과음 끄기' : '효과음 켜기');
}

function updateStatus() {
  elements.timeValue.textContent = formatTime(gameState.elapsedSeconds);
  elements.movesValue.textContent = gameState.moves;
  elements.matchesValue.textContent = gameState.matchedPairIds.length;
}

function calculateElapsedSeconds(now = performance.now()) {
  const runningTime = timerStartedAt === null ? 0 : now - timerStartedAt;
  return Math.floor((accumulatedTimeMs + runningTime) / 1000);
}

function updateTimer() {
  gameState.elapsedSeconds = calculateElapsedSeconds();
  elements.timeValue.textContent = formatTime(gameState.elapsedSeconds);
}

function startTimer() {
  if (timerStartedAt !== null || timerId !== null) return;

  timerStartedAt = performance.now();
  timerId = window.setInterval(updateTimer, 250);
}

function pauseTimer() {
  if (timerStartedAt !== null) {
    accumulatedTimeMs += performance.now() - timerStartedAt;
    timerStartedAt = null;
  }

  if (timerId !== null) {
    window.clearInterval(timerId);
    timerId = null;
  }

  gameState.elapsedSeconds = Math.floor(accumulatedTimeMs / 1000);
  updateStatus();
}

function resumeTimer() {
  const hasStarted = accumulatedTimeMs > 0 || gameState.moves > 0 || gameState.selectedCardIds.length > 0;
  if (hasStarted) startTimer();
}

function resetRuntime() {
  if (pendingResolutionId !== null) {
    window.clearTimeout(pendingResolutionId);
    pendingResolutionId = null;
  }
  if (timerId !== null) window.clearInterval(timerId);

  timerId = null;
  timerStartedAt = null;
  accumulatedTimeMs = 0;
}

function getSelectedOptions() {
  const formData = new FormData(elements.setupForm);
  return {
    theme: formData.get('theme'),
    difficulty: formData.get('difficulty'),
  };
}

function startGame({ theme, difficulty }) {
  resetRuntime();

  const deck = createDeck(theme, difficulty);
  gameState = createGameState({ status: 'playing', theme, difficulty, deck });

  elements.cardGrid.style.setProperty('--grid-columns', DIFFICULTIES[difficulty].columns);
  elements.gameTheme.textContent = `${theme === 'animals' ? '동물 친구들' : '웹 개발'} · ${DIFFICULTIES[difficulty].label}`;
  elements.pairsValue.textContent = DIFFICULTIES[difficulty].pairs;
  elements.cardGrid.setAttribute('aria-busy', 'false');
  renderDeck(elements.cardGrid, deck);
  updateStatus();
  showScreen(elements.gameScreen, elements.homeScreen);
  announce('게임이 시작되었습니다. 카드를 선택하세요.');
}

function recordKey(theme, difficulty) {
  return `${theme}:${difficulty}`;
}

function saveBestRecord() {
  const key = recordKey(gameState.theme, gameState.difficulty);
  const previous = appData.records[key];
  const current = { time: gameState.elapsedSeconds, moves: gameState.moves };
  const isNewRecord = !previous
    || current.time < previous.time
    || (current.time === previous.time && current.moves < previous.moves);

  if (isNewRecord) {
    appData.records[key] = current;
    savePreferences(appData);
  }

  return isNewRecord;
}

function updateBestRecord() {
  const { theme, difficulty } = getSelectedOptions();
  const record = appData.records[recordKey(theme, difficulty)];

  if (!record) {
    elements.recordTitle.textContent = '아직 기록이 없어요';
    elements.bestRecord.textContent = '첫 게임을 완료하고 기록을 남겨보세요.';
    return;
  }

  elements.recordTitle.textContent = `${DIFFICULTIES[difficulty].label} 최고 기록`;
  elements.bestRecord.textContent = `${formatTime(record.time)} · ${record.moves}회 이동`;
}

function completeGame() {
  gameState.status = 'completed';
  gameState.inputLocked = true;
  pauseTimer();

  const isNewRecord = saveBestRecord();
  const recordMessage = isNewRecord ? ' 새로운 최고 기록입니다!' : '';
  elements.resultSummary.textContent = `${formatTime(gameState.elapsedSeconds)} 동안 ${gameState.moves}회 이동했어요.${recordMessage}`;
  announce(`게임 완료. ${gameState.moves}회 이동, ${formatTime(gameState.elapsedSeconds)} 기록입니다.`);
  updateBestRecord();
  playSound('complete');
  elements.resultDialog.showModal();
}

function resolvePair() {
  const [firstId, secondId] = gameState.selectedCardIds;
  const firstCard = findCard(gameState.deck, firstId);
  const secondCard = findCard(gameState.deck, secondId);
  const firstElement = getCardElement(firstId);
  const secondElement = getCardElement(secondId);

  gameState.moves += 1;
  gameState.inputLocked = true;
  elements.cardGrid.setAttribute('aria-busy', 'true');
  updateStatus();

  if (isMatchingPair(firstCard, secondCard)) {
    gameState.matchedPairIds.push(firstCard.pairId);
    markCardAsMatched(firstElement, firstCard);
    markCardAsMatched(secondElement, secondCard);
    announce(`${firstCard.symbol} 카드의 짝을 찾았습니다.`);
    playSound('match');
    const completed = isGameComplete(gameState.matchedPairIds, gameState.difficulty);

    // 마지막 짝을 찾은 순간 기록을 확정하고, 시각 피드백 뒤 결과를 표시한다.
    if (completed) pauseTimer();

    pendingResolutionId = window.setTimeout(() => {
      pendingResolutionId = null;
      gameState.selectedCardIds = [];
      elements.cardGrid.setAttribute('aria-busy', 'false');
      updateStatus();

      if (completed) {
        completeGame();
        return;
      }

      gameState.inputLocked = false;
    }, MATCH_FEEDBACK_MS);
    return;
  }

  announce('두 카드가 다릅니다. 다시 닫힙니다.');
  playSound('mismatch');
  pendingResolutionId = window.setTimeout(() => {
    pendingResolutionId = null;
    hideCard(firstElement, gameState.deck.indexOf(firstCard));
    hideCard(secondElement, gameState.deck.indexOf(secondCard));
    gameState.selectedCardIds = [];
    gameState.inputLocked = false;
    elements.cardGrid.setAttribute('aria-busy', 'false');
  }, MISMATCH_DELAY_MS);
}

function selectCard(cardElement) {
  if (gameState.status !== 'playing' || gameState.inputLocked) return;

  const cardId = cardElement.dataset.cardId;
  const card = findCard(gameState.deck, cardId);
  if (!card || gameState.selectedCardIds.includes(cardId) || gameState.matchedPairIds.includes(card.pairId)) return;

  if (gameState.moves === 0 && gameState.selectedCardIds.length === 0) startTimer();

  gameState.selectedCardIds.push(cardId);
  revealCard(cardElement, card);
  playSound('flip');
  announce(`${card.symbol} 카드를 열었습니다.`);

  if (gameState.selectedCardIds.length === 2) resolvePair();
}

elements.setupForm.addEventListener('submit', (event) => {
  event.preventDefault();
  startGame(getSelectedOptions());
});

elements.setupForm.addEventListener('change', updateBestRecord);

elements.cardGrid.addEventListener('click', (event) => {
  const cardElement = event.target.closest('.memory-card');
  if (cardElement && elements.cardGrid.contains(cardElement)) selectCard(cardElement);
});

elements.pauseButton.addEventListener('click', () => {
  if (gameState.status !== 'playing' || gameState.inputLocked) return;
  gameState.status = 'paused';
  pauseTimer();
  elements.pauseDialog.showModal();
});

function resumeGame() {
  if (gameState.status !== 'paused') return;
  gameState.status = 'playing';
  resumeTimer();
  if (elements.pauseDialog.open) elements.pauseDialog.close();
  announce('게임을 계속합니다.');
}

elements.resumeButton.addEventListener('click', resumeGame);

elements.pauseDialog.addEventListener('cancel', (event) => {
  event.preventDefault();
  resumeGame();
});

elements.resultDialog.addEventListener('cancel', (event) => {
  event.preventDefault();
});

elements.restartButton.addEventListener('click', () => {
  if (!window.confirm('현재 게임을 중단하고 새로 시작할까요?')) return;
  startGame({ theme: gameState.theme, difficulty: gameState.difficulty });
});

elements.replayButton.addEventListener('click', () => {
  elements.resultDialog.close();
  startGame({ theme: gameState.theme, difficulty: gameState.difficulty });
});

function goHome() {
  if (elements.pauseDialog.open) elements.pauseDialog.close();
  if (elements.resultDialog.open) elements.resultDialog.close();
  resetRuntime();
  gameState = createGameState();
  showScreen(elements.homeScreen, elements.gameScreen);
  updateBestRecord();
}

function requestGoHome() {
  const gameInProgress = gameState.status === 'playing' || gameState.status === 'paused';
  if (gameInProgress && !window.confirm('현재 게임을 중단하고 홈으로 이동할까요?')) return;
  goHome();
}

document.querySelectorAll('[data-action="go-home"]').forEach((button) => {
  button.addEventListener('click', requestGoHome);
});

elements.homeLink.addEventListener('click', (event) => {
  event.preventDefault();
  requestGoHome();
});

elements.soundToggle.addEventListener('click', () => {
  appData.sound = toggleSound();
  savePreferences(appData);
  updateSoundButton();
  if (appData.sound) playSound('flip');
});

elements.themeToggle.addEventListener('click', () => {
  const isDark = document.documentElement.dataset.theme !== 'dark';
  document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
  elements.themeToggle.setAttribute('aria-pressed', String(isDark));
  elements.themeToggle.querySelector('span').textContent = isDark ? '☀' : '☾';
  appData.themeMode = isDark ? 'dark' : 'light';
  savePreferences(appData);
});

const initialTheme = appData.themeMode ?? 'dark';
document.documentElement.dataset.theme = initialTheme;
elements.themeToggle.setAttribute('aria-pressed', String(initialTheme === 'dark'));
elements.themeToggle.querySelector('span').textContent = initialTheme === 'dark' ? '☀' : '☾';

updateSoundButton();
updateBestRecord();
