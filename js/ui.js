function createCardElement(card, index) {
  const button = document.createElement('button');
  button.className = 'memory-card';
  button.type = 'button';
  button.dataset.cardId = card.id;
  button.setAttribute('role', 'gridcell');
  button.setAttribute('aria-label', `닫힌 카드 ${index + 1}`);
  button.setAttribute('aria-pressed', 'false');
  button.innerHTML = `
    <span class="memory-card__face memory-card__back" aria-hidden="true">?</span>
    <span class="memory-card__face memory-card__front" aria-hidden="true">${card.symbol}</span>
  `;
  return button;
}

function renderDeck(container, deck) {
  const fragment = document.createDocumentFragment();
  deck.forEach((card, index) => fragment.append(createCardElement(card, index)));
  container.replaceChildren(fragment);
}

function revealCard(cardElement, card) {
  cardElement.setAttribute('aria-pressed', 'true');
  cardElement.setAttribute('aria-label', `${card.symbol} 카드, 열림`);
}

function hideCard(cardElement, index) {
  cardElement.setAttribute('aria-pressed', 'false');
  cardElement.setAttribute('aria-label', `닫힌 카드 ${index + 1}`);
}

function markCardAsMatched(cardElement, card) {
  cardElement.classList.add('memory-card--matched');
  cardElement.setAttribute('aria-pressed', 'true');
  cardElement.disabled = true;
  cardElement.setAttribute('aria-label', `${card.symbol} 카드, 짝 맞춤 완료`);
}

function showScreen(activeScreen, inactiveScreen) {
  inactiveScreen.hidden = true;
  activeScreen.hidden = false;
  const heading = activeScreen.querySelector('h1');
  if (heading) {
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }
}
