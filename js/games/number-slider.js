/* =====================================================
   MIND PLAY — NUMBER SLIDER
   Easy: 3x3 | Medium: 4x4 | Hard: 5x5
   Features:
   - Random solvable puzzles
   - Move counter and timer
   - Keyboard and touch-friendly controls
   - Hint, restart and completion score
   - MindPlay game registration
   ===================================================== */

(function () {
  "use strict";

  window.MindPlayGames = window.MindPlayGames || {};

  const GAME_ID = "number-slider";

  const LEVELS = {
    easy: { size: 3, label: "Easy" },
    medium: { size: 4, label: "Medium" },
    hard: { size: 5, label: "Hard" }
  };

  let root = null;
  let options = {};
  let difficulty = "easy";
  let size = 3;
  let board = [];
  let initialBoard = [];
  let moves = 0;
  let hints = 0;
  let startedAt = 0;
  let timerId = null;
  let completed = false;
  let selected = -1;

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }

    return array;
  }

  function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;

    return String(min).padStart(2, "0") + ":" +
      String(sec).padStart(2, "0");
  }

  function elapsedSeconds() {
    return Math.floor((Date.now() - startedAt) / 1000);
  }

  function goalBoard() {
    return Array.from(
      { length: size * size },
      (_, index) => (index + 1) % (size * size)
    );
  }

  function isSolved() {
    const goal = goalBoard();

    return board.every((value, index) => value === goal[index]);
  }

  function blankIndex() {
    return board.indexOf(0);
  }

  function isAdjacent(indexA, indexB) {
    const rowA = Math.floor(indexA / size);
    const colA = indexA % size;
    const rowB = Math.floor(indexB / size);
    const colB = indexB % size;

    return (
      Math.abs(rowA - rowB) +
      Math.abs(colA - colB) === 1
    );
  }

  function swap(indexA, indexB) {
    [board[indexA], board[indexB]] =
      [board[indexB], board[indexA]];
  }

  // Scramble by making legal moves from the solved state.
  // This guarantees the generated board is solvable.
  function createPuzzle() {
    board = goalBoard();

    const totalMoves = size === 3 ? 70 : size === 4 ? 160 : 260;
    let previousBlank = -1;

    for (let i = 0; i < totalMoves; i++) {
      const blank = blankIndex();

      let choices = board
        .map((_, index) => index)
        .filter(index =>
          isAdjacent(index, blank) &&
          index !== previousBlank
        );

      if (!choices.length) {
        choices = board
          .map((_, index) => index)
          .filter(index => isAdjacent(index, blank));
      }

      const next = choices[
        Math.floor(Math.random() * choices.length)
      ];

      previousBlank = blank;
      swap(blank, next);
    }

    // Avoid starting with an already-solved board.
    if (isSolved()) {
      const blank = blankIndex();
      const neighbour = board.findIndex((_, index) =>
        isAdjacent(index, blank)
      );

      swap(blank, neighbour);
    }

    initialBoard = board.slice();
  }

  function showFeedback(message, state = "info") {
    if (!root) return;

    const element = root.querySelector("#sliderFeedback");

    if (element) {
      element.textContent = message;
      element.dataset.state = state;
    }
  }

  function render() {
    if (!root) return;

    root.innerHTML = `
      <section class="game-panel number-slider-game">

        <div class="game-metrics">
          <div class="game-metric">
            <span class="game-metric-label">Moves</span>
            <strong id="sliderMoves">${moves}</strong>
          </div>

          <div class="game-metric">
            <span class="game-metric-label">Time</span>
            <strong id="sliderTimer">00:00</strong>
          </div>

          <div class="game-metric">
            <span class="game-metric-label">Hints</span>
            <strong id="sliderHints">${hints}</strong>
          </div>
        </div>

        <div class="slider-intro">
          <span class="ttt-level">
            ${LEVELS[difficulty].label.toUpperCase()} · ${size}×${size}
          </span>

          <p>Slide the tiles into numerical order.</p>
          <p class="sudoku-footnote">
            Move a numbered tile into the empty space.
            The blank belongs in the bottom-right corner.
          </p>
        </div>

        <div
          class="number-slider-board"
          style="--slider-size:${size}"
          role="grid"
          aria-label="Number slider puzzle"
        >
          ${board.map((number, index) => `
            <button
              type="button"
              class="slider-tile ${
                number === 0 ? "is-blank" : ""
              } ${
                number !== 0 && number === index + 1
                  ? "is-correct-position"
                  : ""
              } ${
                selected === index ? "is-selected" : ""
              }"
              data-index="${index}"
              aria-label="${
                number === 0 ? "Empty space" : "Tile " + number
              }"
              ${number === 0 || completed ? "disabled" : ""}
            >${number === 0 ? "" : number}</button>
          `).join("")}
        </div>

        <div
          class="game-feedback"
          id="sliderFeedback"
          aria-live="polite"
        >
          Slide the tiles to solve the puzzle.
        </div>

        <div class="sudoku-tools">
          <button type="button" class="sudoku-tool"
            data-action="hint">Hint</button>

          <button type="button" class="sudoku-tool"
            data-action="restart">Restart</button>
        </div>

        <p class="sudoku-footnote">
          Keyboard: use arrow keys to move a tile into the blank.
        </p>
      </section>
    `;

    root.querySelectorAll("[data-index]").forEach(button => {
      button.addEventListener("click", () => {
        moveTile(Number(button.dataset.index));
      });
    });

    root.querySelector('[data-action="hint"]')
      .addEventListener("click", giveHint);

    root.querySelector('[data-action="restart"]')
      .addEventListener("click", restartPuzzle);

    updateTimer();
  }

  function moveTile(index) {
    if (completed) return;

    const blank = blankIndex();

    if (!isAdjacent(index, blank)) {
      showFeedback(
        "Choose a tile next to the empty space.",
        "warning"
      );
      return;
    }

    swap(index, blank);
    moves++;
    selected = blank;

    render();

    if (isSolved()) {
      finishGame();
    } else {
      showFeedback("Nice move. Keep going!", "success");
    }
  }

  function giveHint() {
    if (completed) return;

    const goal = goalBoard();
    const blank = blankIndex();

    // Find a misplaced tile that can legally move.
    const candidates = board
      .map((value, index) => ({ value, index }))
      .filter(item =>
        item.value !== 0 &&
        item.value !== goal[item.index] &&
        isAdjacent(item.index, blank)
      );

    if (!candidates.length) {
      showFeedback(
        "Try moving a neighbouring tile first.",
        "info"
      );
      return;
    }

    // Prefer moving a tile toward its goal.
    candidates.sort((a, b) => {
      const goalA = a.value - 1;
      const goalB = b.value - 1;

      const distanceA =
        Math.abs(Math.floor(a.index / size) - Math.floor(goalA / size)) +
        Math.abs((a.index % size) - (goalA % size));

      const distanceB =
        Math.abs(Math.floor(b.index / size) - Math.floor(goalB / size)) +
        Math.abs((b.index % size) - (goalB % size));

      return distanceA - distanceB;
    });

    hints++;
    moveTile(candidates[0].index);
    showFeedback(
      "Hint used. Keep solving the puzzle!",
      "info"
    );
  }

  function finishGame() {
    if (completed) return;

    completed = true;
    stopTimer();

    const seconds = elapsedSeconds();
    const base = difficulty === "easy"
      ? 500
      : difficulty === "medium"
        ? 900
        : 1400;

    const score = Math.max(
      100,
      base - moves * 2 - Math.floor(seconds / 5) - hints * 50
    );

    render();

    showFeedback(
      `Puzzle solved! ${moves} moves · ${formatTime(seconds)} · Score ${score}`,
      "success"
    );

    if (typeof options.onComplete === "function") {
      options.onComplete({
        gameId: GAME_ID,
        score,
        moves,
        time: seconds,
        hintsUsed: hints,
        difficulty
      });
    }
  }

  function updateTimer() {
    if (!root) return;

    const timer = root.querySelector("#sliderTimer");

    if (timer) {
      timer.textContent = formatTime(elapsedSeconds());
    }
  }

  function stopTimer() {
    if (timerId !== null) {
      window.clearInterval(timerId);
      timerId = null;
    }
  }

  function startTimer() {
    stopTimer();

    timerId = window.setInterval(() => {
      if (root && !completed) updateTimer();
    }, 1000);
  }

  function onKeyDown(event) {
    if (!root || completed) return;

    if (
      event.target &&
      ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)
    ) {
      return;
    }

    const blank = blankIndex();
    const row = Math.floor(blank / size);
    const col = blank % size;

    let target = -1;

    // Arrow keys move the numbered tile into the blank.
    if (event.key === "ArrowUp" && row < size - 1) {
      target = blank + size;
    } else if (event.key === "ArrowDown" && row > 0) {
      target = blank - size;
    } else if (event.key === "ArrowLeft" && col < size - 1) {
      target = blank + 1;
    } else if (event.key === "ArrowRight" && col > 0) {
      target = blank - 1;
    }

    if (target !== -1) {
      event.preventDefault();
      moveTile(target);
    }
  }

  function restartPuzzle() {
    moves = 0;
    hints = 0;
    completed = false;
    selected = -1;

    createPuzzle();
    startedAt = Date.now();

    render();
    startTimer();

    showFeedback("Fresh puzzle generated. Good luck!", "info");
  }

  function start(level) {
    difficulty = LEVELS[level] ? level : "easy";
    size = LEVELS[difficulty].size;

    moves = 0;
    hints = 0;
    completed = false;
    selected = -1;

    createPuzzle();
    startedAt = Date.now();

    render();
    startTimer();
  }

  function mount(container, suppliedOptions = {}) {
    destroy();

    root = container;
    options = suppliedOptions || {};

    document.addEventListener("keydown", onKeyDown);

    start(options.difficulty || "easy");
  }

  function destroy() {
    stopTimer();
    document.removeEventListener("keydown", onKeyDown);

    if (root) root.innerHTML = "";

    root = null;
    options = {};
  }

  window.MindPlayGames.numberSlider = {
    mount,
    start,
    destroy
  };
})();