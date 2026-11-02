/* =========================================
   MIND PLAY — IMAGE MATCHER
   File: js/games/image-matcher.js
   ========================================= */

(function () {
  "use strict";

  window.MindPlayGames = window.MindPlayGames || {};

  const symbols = [
    "🌙", "🚀", "🧠", "💎", "🪐", "⚡",
    "🎯", "🔮", "🦋", "🌟", "🍀", "🎨",
    "🌈", "🧩", "🔥", "🌊", "🦊", "🎵",
    "🌻", "🪄", "🛸", "🐬", "🍄", "🦉"
  ];

  const difficultySettings = {
    easy: {
      pairs: 6,
      previewTime: 1800
    },
    medium: {
      pairs: 8,
      previewTime: 1600
    },
    hard: {
      pairs: 12,
      previewTime: 1400
    }
  };

  let state = null;
  let root = null;
  let callbacks = {};
  let previewTimer = null;
  let mismatchTimer = null;

  function shuffle(items) {
    const result = [...items];

    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (character) => {
      const replacements = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      };

      return replacements[character];
    });
  }

  function setMessage(message, type = "") {
    const element = root?.querySelector("#imMessage");

    if (!element) return;

    element.textContent = message;
    element.className = "game-feedback";

    if (type === "success") {
      element.classList.add("is-success");
    }

    if (type === "error") {
      element.classList.add("is-error");
    }
  }

  function updateMetrics() {
    if (!root || !state) return;

    const moves = root.querySelector("#imMoves");
    const matches = root.querySelector("#imMatches");
    const timer = root.querySelector("#imTimer");
    const progress = root.querySelector("#imProgress");

    if (moves) moves.textContent = state.moves;
    if (matches) {
      matches.textContent =
        `${state.matched.size}/${state.pairs}`;
    }

    if (timer) timer.textContent = state.elapsed;

    if (progress) {
      const percentage =
        (state.matched.size / state.pairs) * 100;

      progress.style.width = `${percentage}%`;
    }
  }

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remaining
    ).padStart(2, "0")}`;
  }

  function clearTimers() {
    if (previewTimer !== null) {
      clearTimeout(previewTimer);
      previewTimer = null;
    }

    if (mismatchTimer !== null) {
      clearTimeout(mismatchTimer);
      mismatchTimer = null;
    }
  }

  function stopClock() {
    if (state?.clockInterval) {
      clearInterval(state.clockInterval);
      state.clockInterval = null;
    }
  }

  function startClock() {
    stopClock();

    state.clockInterval = setInterval(() => {
      if (!state || state.finished || state.previewing) return;

      state.elapsed += 1;
      updateMetrics();
    }, 1000);
  }

  function createCards() {
    const chosen = shuffle(symbols).slice(0, state.pairs);
    const cards = shuffle(
      chosen.flatMap((symbol, index) => [
        {
          id: `${index}-a`,
          pairId: index,
          symbol
        },
        {
          id: `${index}-b`,
          pairId: index,
          symbol
        }
      ])
    );

    state.cards = cards;
  }

  function render() {
    if (!root || !state) return;

    root.innerHTML = `
      <section class="game-panel">
        <div class="game-panel-header">
          <div>
            <div class="game-panel-title">Find the matching pairs</div>
            <div class="game-panel-caption">
              Remember each symbol and its position.
            </div>
          </div>
          <span class="game-pill" id="imDifficulty">
            ${escapeHTML(state.difficulty)}
          </span>
        </div>

        <div class="game-metrics">
          <div class="game-metric">
            <span class="game-metric-value" id="imMoves">0</span>
            <span class="game-metric-label">Moves</span>
          </div>
          <div class="game-metric">
            <span class="game-metric-value" id="imMatches">
              0/${state.pairs}
            </span>
            <span class="game-metric-label">Pairs found</span>
          </div>
          <div class="game-metric">
            <span class="game-metric-value" id="imTimer">00:00</span>
            <span class="game-metric-label">Time</span>
          </div>
        </div>

        <div
          class="memory-progress"
          role="progressbar"
          aria-label="Matching progress"
          aria-valuemin="0"
          aria-valuemax="${state.pairs}"
          aria-valuenow="0"
        >
          <div class="memory-progress-fill" id="imProgress"></div>
        </div>

        <p class="game-subtitle" id="imHint">
          ${state.previewing
            ? "Memorise the symbols before the cards turn over!"
            : "Choose two cards to find a matching pair."}
        </p>

        <div
          class="image-matcher-grid"
          id="imBoard"
          aria-label="Memory matching board"
        >
          ${state.cards.map((card, index) => {
            const isMatched = state.matched.has(card.pairId);
            const isRevealed =
              state.revealed.includes(index) || state.previewing;

            let classes = "memory-card";

            if (isMatched) classes += " is-matched";
            else if (isRevealed) classes += " is-revealed";
            else classes += " is-hidden";

            return `
              <button
                type="button"
                class="${classes}"
                data-index="${index}"
                aria-label="${isRevealed
                  ? `Card ${index + 1}: ${card.symbol}`
                  : `Hidden card ${index + 1}`}"
                ${isMatched || state.previewing || state.finished
                  ? "disabled"
                  : ""}
              >
                ${isRevealed ? card.symbol : "?"}
              </button>
            `;
          }).join("")}
        </div>

        <div class="game-feedback" id="imMessage" aria-live="polite">
          ${state.previewing
            ? "Take a good look at the cards."
            : "Your game is ready!"}
        </div>

        <div class="game-button-row">
          <button type="button" class="game-secondary-button" id="imRestart">
            Restart game
          </button>
        </div>
      </section>
    `;

    const board = root.querySelector("#imBoard");

    board?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-index]");

      if (!button || button.disabled) return;

      const index = Number(button.dataset.index);

      if (!Number.isInteger(index)) return;

      chooseCard(index);
    });

    root.querySelector("#imRestart")?.addEventListener("click", () => {
      start(state.difficulty);
    });

    updateMetrics();
  }

  function chooseCard(index) {
    if (
      !state ||
      state.finished ||
      state.previewing ||
      state.locked ||
      state.revealed.includes(index)
    ) {
      return;
    }

    const card = state.cards[index];

    if (state.matched.has(card.pairId)) return;

    state.revealed.push(index);
    render();

    if (state.revealed.length < 2) {
      setMessage("Choose one more card.");
      return;
    }

    state.moves += 1;

    const firstIndex = state.revealed[0];
    const secondIndex = state.revealed[1];

    const first = state.cards[firstIndex];
    const second = state.cards[secondIndex];

    updateMetrics();

    if (first.pairId === second.pairId) {
      state.matched.add(first.pairId);
      state.revealed = [];

      render();
      setMessage("Excellent! You found a pair.", "success");

      if (state.matched.size === state.pairs) {
        finishGame();
      }

      return;
    }

    state.locked = true;
    setMessage("Not a match. Try to remember their positions.");

    mismatchTimer = setTimeout(() => {
      mismatchTimer = null;

      if (!state || state.finished) return;

      state.revealed = [];
      state.locked = false;

      render();
      setMessage("Try another pair.");
    }, 750);
  }

  function finishGame() {
    state.finished = true;
    state.locked = true;

    clearTimers();
    stopClock();

    const timeBonus = Math.max(0, 300 - state.elapsed);
    const movePenalty = Math.max(
      0,
      (state.moves - state.pairs) * 5
    );

    const score = Math.max(
      10,
      state.pairs * 100 + timeBonus - movePenalty
    );

    render();

    setMessage(
      `You matched every pair! Final score: ${score}`,
      "success"
    );

    const hint = root.querySelector("#imHint");

    if (hint) {
      hint.textContent =
        `Completed in ${formatTime(state.elapsed)} with ${state.moves} moves.`;
    }

    if (typeof callbacks.onComplete === "function") {
      callbacks.onComplete({
        gameId: "image-matcher",
        score,
        moves: state.moves,
        time: state.elapsed,
        difficulty: state.difficulty
      });
    }
  }

  function start(difficulty = "easy") {
    clearTimers();
    stopClock();

    const normalisedDifficulty =
      String(difficulty).toLowerCase();

    const settings =
      difficultySettings[normalisedDifficulty] ||
      difficultySettings.easy;

    state = {
      difficulty: normalisedDifficulty in difficultySettings
        ? normalisedDifficulty
        : "easy",
      pairs: settings.pairs,
      moves: 0,
      elapsed: 0,
      cards: [],
      revealed: [],
      matched: new Set(),
      locked: false,
      previewing: true,
      finished: false,
      clockInterval: null
    };

    createCards();
    render();

    previewTimer = setTimeout(() => {
      previewTimer = null;

      if (!state || state.finished) return;

      state.previewing = false;
      render();

      setMessage("Game started! Find all the pairs.");
      startClock();
    }, settings.previewTime);
  }

  function mount(container, options = {}) {
    if (!container) {
      console.error("Image Matcher needs a container element.");
      return;
    }

    clearTimers();
    stopClock();

    root = container;
    callbacks = options;

    start(options.difficulty || "easy");
  }

  function destroy() {
    clearTimers();
    stopClock();

    if (root) root.innerHTML = "";

    root = null;
    state = null;
    callbacks = {};
  }

  window.MindPlayGames.imageMatcher = {
    mount,
    start,
    destroy
  };

  console.log("Image Matcher is ready!");
})();