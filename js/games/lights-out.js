(function () {
  "use strict";

  window.MindPlayGames = window.MindPlayGames || {};

  const GAME_ID = "lights-out";

  let container = null;
  let options = {};
  let difficulty = "easy";
  let size = 5;
  let board = [];
  let moves = 0;
  let seconds = 0;
  let timer = null;
  let started = false;
  let finished = false;
  let keyHandler = null;
  let focusedIndex = 0;
  let puzzleNumber = 0;

  const settings = {
    easy: { size: 5, scramble: 8 },
    medium: { size: 5, scramble: 16 },
    hard: { size: 6, scramble: 24 }
  };

  function formatTime(value) {
    const mins = Math.floor(value / 60);
    const secs = value % 60;

    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  function stopTimer() {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }

  function showMessage(text, type = "info") {
    const element = container?.querySelector(".lights-feedback");

    if (!element) return;

    element.textContent = text;
    element.className = `lights-feedback ${type}`;
  }

  function updateStats() {
    if (!container) return;

    const movesEl = container.querySelector("[data-lights-moves]");
    const timeEl = container.querySelector("[data-lights-time]");
    const remainingEl = container.querySelector("[data-lights-remaining]");

    if (movesEl) movesEl.textContent = moves;
    if (timeEl) timeEl.textContent = formatTime(seconds);

    if (remainingEl) {
      remainingEl.textContent = board.filter(Boolean).length;
    }
  }

  function toggleAt(index) {
    const row = Math.floor(index / size);
    const col = index % size;

    const positions = [
      [row, col],
      [row - 1, col],
      [row + 1, col],
      [row, col - 1],
      [row, col + 1]
    ];

    for (const [r, c] of positions) {
      if (r < 0 || r >= size || c < 0 || c >= size) {
        continue;
      }

      const targetIndex = r * size + c;
      board[targetIndex] = !board[targetIndex];
    }
  }

  function hasWon() {
    return board.every(light => light === false);
  }

  function renderBoard() {
    const boardElement = container?.querySelector(".lights-board");

    if (!boardElement) return;

    boardElement.innerHTML = "";
    boardElement.style.setProperty("--lights-size", size);

    board.forEach((isOn, index) => {
      const button = document.createElement("button");

      button.type = "button";
      button.className = "lights-tile";
      button.classList.toggle("is-on", isOn);
      button.classList.toggle("is-off", !isOn);

      const row = Math.floor(index / size) + 1;
      const col = (index % size) + 1;

      button.setAttribute(
        "aria-label",
        `Row ${row}, column ${col}, light ${isOn ? "on" : "off"}`
      );

      button.setAttribute("aria-pressed", String(isOn));
      button.tabIndex = index === focusedIndex ? 0 : -1;
      button.textContent = isOn ? "●" : "";

      button.addEventListener("click", () => {
        makeMove(index);
      });

      boardElement.appendChild(button);
    });

    updateStats();
  }

  function finishGame() {
    if (finished) return;

    finished = true;
    started = false;
    stopTimer();

    const baseScore = {
      easy: 100,
      medium: 160,
      hard: 220
    }[difficulty];

    const score = Math.max(
      10,
      baseScore - moves * 3 - seconds
    );

    showMessage(
      `Puzzle solved! Score: ${score} | Moves: ${moves} | Time: ${formatTime(seconds)}`,
      "success"
    );

    if (typeof options.onComplete === "function") {
      options.onComplete({
        gameId: GAME_ID,
        score,
        moves,
        time: seconds,
        difficulty
      });
    }
  }

  function makeMove(index) {
    if (!started || finished) return;

    toggleAt(index);
    moves++;
    focusedIndex = index;

    renderBoard();

    if (hasWon()) {
      finishGame();
    } else {
      showMessage("Good move! Turn off the remaining lights.");
    }
  }

  function startClock() {
    stopTimer();

    timer = setInterval(() => {
      if (!started || finished) return;

      seconds++;
      updateStats();
    }, 1000);
  }

  function createPuzzle() {
    board = Array(size * size).fill(false);

    const scrambleCount = settings[difficulty].scramble;

    // Start with every light OFF, then apply valid moves.
    // Applying the same moves again can always solve this puzzle.
    let lastIndex = -1;

    for (let i = 0; i < scrambleCount; i++) {
      let index = Math.floor(Math.random() * board.length);

      if (board.length > 1 && index === lastIndex) {
        index = (index + 1) % board.length;
      }

      toggleAt(index);
      lastIndex = index;
    }

    // Make sure the starting board is not already solved.
    if (hasWon()) {
      toggleAt(Math.floor(board.length / 2));
    }
  }
  function newGame() {
    stopTimer();

    const config = settings[difficulty];

    size = config.size;
    moves = 0;
    seconds = 0;
    focusedIndex = 0;
    started = true;
    finished = false;
    puzzleNumber++;

    createPuzzle();
    renderBoard();

    showMessage("Turn off every light to solve the puzzle!");
    startClock();
  }

  function buildUI() {
    container.innerHTML = `
      <section class="game-panel lights-game">

        <div class="game-metrics">
          <div class="game-metric">
            <span>Moves</span>
            <strong data-lights-moves>0</strong>
          </div>

          <div class="game-metric">
            <span>Time</span>
            <strong data-lights-time>00:00</strong>
          </div>

          <div class="game-metric">
            <span>Lights On</span>
            <strong data-lights-remaining>0</strong>
          </div>
        </div>

        <p class="lights-description">
          Switch off every light. Clicking a tile toggles that tile
          and its neighbors above, below, left and right.
        </p>

        <div class="lights-board-wrap">
          <div
            class="lights-board"
            role="group"
            aria-label="Lights Out puzzle"
          ></div>
        </div>

        <p class="lights-feedback" aria-live="polite">
          Turn off every light to solve the puzzle!
        </p>

        <div class="game-actions">
          <button
            type="button"
            class="game-button secondary"
            data-lights-reset
          >
            Restart Puzzle
          </button>

          <button
            type="button"
            class="game-button"
            data-lights-new
          >
            New Puzzle
          </button>
        </div>

      </section>
    `;

    container.querySelector("[data-lights-reset]")
      .addEventListener("click", newGame);

    container.querySelector("[data-lights-new]")
      .addEventListener("click", newGame);
  }

  function handleKeydown(event) {
    if (!started || finished || !container) return;

    const boardElement = container.querySelector(".lights-board");

    if (
      !boardElement ||
      !boardElement.contains(document.activeElement)
    ) {
      return;
    }

    let nextIndex = focusedIndex;

    switch (event.key) {
      case "ArrowUp":
        nextIndex = Math.max(0, focusedIndex - size);
        break;

      case "ArrowDown":
        nextIndex = Math.min(
          size * size - 1,
          focusedIndex + size
        );
        break;

      case "ArrowLeft":
        if (focusedIndex % size > 0) {
          nextIndex--;
        }
        break;

      case "ArrowRight":
        if (focusedIndex % size < size - 1) {
          nextIndex++;
        }
        break;

      case "Enter":
      case " ":
        event.preventDefault();
        makeMove(focusedIndex);
        return;

      default:
        return;
    }

    event.preventDefault();

    focusedIndex = nextIndex;
    renderBoard();

    const buttons = boardElement.querySelectorAll(".lights-tile");
    buttons[focusedIndex]?.focus();
  }

  function mount(target, gameOptions = {}) {
    destroy();

    container = target;
    options = gameOptions;
    difficulty = gameOptions.difficulty || "easy";

    if (!settings[difficulty]) {
      difficulty = "easy";
    }

    buildUI();

    keyHandler = handleKeydown;
    document.addEventListener("keydown", keyHandler);

    newGame();
  }

  function start(nextDifficulty = difficulty) {
    if (settings[nextDifficulty]) {
      difficulty = nextDifficulty;
    }

    if (container) {
      newGame();
    }
  }

  function destroy() {
    stopTimer();

    if (keyHandler) {
      document.removeEventListener("keydown", keyHandler);
      keyHandler = null;
    }

    container = null;
    board = [];
    started = false;
    finished = false;
  }

  window.MindPlayGames.lightsOut = {
    mount,
    start,
    destroy
  };
})();