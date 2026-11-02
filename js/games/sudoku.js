/* =========================================================
   MIND PLAY — SUDOKU 9×9
   Features:
   - Easy, Medium and Hard difficulty
   - New randomized puzzle on every start
   - Sudoku generator with a valid solution
   - Number pad and keyboard input
   - Notes mode, erase and hints
   - Mistake tracking and completion score
   - Registers as window.MindPlayGames.sudoku
   ========================================================= */

(function () {
  "use strict";

  window.MindPlayGames = window.MindPlayGames || {};

  const GAME_ID = "sudoku";
  const SIZE = 9;
  const BOX = 3;

  const LEVELS = {
    easy: {
      label: "Easy",
      clues: 40,
      description: "A gentle warm-up for your logic skills."
    },
    medium: {
      label: "Medium",
      clues: 32,
      description: "Plan carefully. Every number matters."
    },
    hard: {
      label: "Hard",
      clues: 27,
      description: "A serious logic challenge. Think before placing."
    }
  };

  let root = null;
  let options = {};
  let difficulty = "easy";
  let puzzle = [];
  let solution = [];
  let fixed = [];
  let notes = [];
  let selected = -1;
  let mistakes = 0;
  let hintsUsed = 0;
  let completed = false;
  let notesMode = false;
  let startedAt = 0;
  let timerId = null;
  let currentPuzzleKey = "";
  let previousPuzzleKey = "";
  let gameToken = 0;

  /* ---------- GENERAL HELPERS ---------- */

  function copyGrid(grid) {
    return grid.map(row => row.slice());
  }

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function emptyGrid() {
    return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  }

  function cellIndex(row, col) {
    return row * SIZE + col;
  }

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return String(minutes).padStart(2, "0") + ":" +
      String(secs).padStart(2, "0");
  }

  function elapsedSeconds() {
    return Math.floor((Date.now() - startedAt) / 1000);
  }

  function safeText(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  /* ---------- SUDOKU RULES ---------- */

  function canPlace(grid, row, col, number) {
    for (let i = 0; i < SIZE; i++) {
      if (grid[row][i] === number) return false;
      if (grid[i][col] === number) return false;
    }

    const startRow = Math.floor(row / BOX) * BOX;
    const startCol = Math.floor(col / BOX) * BOX;

    for (let r = startRow; r < startRow + BOX; r++) {
      for (let c = startCol; c < startCol + BOX; c++) {
        if (grid[r][c] === number) return false;
      }
    }

    return true;
  }

  function findEmpty(grid) {
    let best = null;
    let bestCandidates = null;

    // Minimum-remaining-values heuristic:
    // choose the empty cell with the fewest legal candidates.
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        if (grid[row][col] !== 0) continue;

        const candidates = [];

        for (let n = 1; n <= 9; n++) {
          if (canPlace(grid, row, col, n)) candidates.push(n);
        }

        if (candidates.length === 0) {
          return { row, col, candidates: [] };
        }

        if (!bestCandidates || candidates.length < bestCandidates.length) {
          best = { row, col };
          bestCandidates = candidates;

          if (candidates.length === 1) {
            return {
              row,
              col,
              candidates
            };
          }
        }
      }
    }

    if (!best) return null;

    return {
      row: best.row,
      col: best.col,
      candidates: bestCandidates
    };
  }

  function solveGrid(grid, randomize) {
    const next = findEmpty(grid);

    if (!next) return true;
    if (next.candidates.length === 0) return false;

    const numbers = randomize
      ? shuffle(next.candidates.slice())
      : next.candidates.slice();

    for (const number of numbers) {
      grid[next.row][next.col] = number;

      if (solveGrid(grid, randomize)) return true;

      grid[next.row][next.col] = 0;
    }

    return false;
  }

  function createSolvedGrid() {
    const grid = emptyGrid();

    // Randomized backtracking creates a valid full solution.
    solveGrid(grid, true);

    return grid;
  }

  function countSolutions(grid, limit = 2) {
    let count = 0;

    function search() {
      if (count >= limit) return;

      const next = findEmpty(grid);

      if (!next) {
        count++;
        return;
      }

      if (next.candidates.length === 0) return;

      for (const number of next.candidates) {
        grid[next.row][next.col] = number;
        search();
        grid[next.row][next.col] = 0;

        if (count >= limit) return;
      }
    }

    search();
    return count;
  }

  /* ---------- PUZZLE GENERATION ---------- */

  function generatePuzzle(level) {
    const targetClues = LEVELS[level].clues;
    const solved = createSolvedGrid();
    const grid = copyGrid(solved);

    const positions = shuffle(
      Array.from({ length: 81 }, (_, index) => index)
    );

    let clues = 81;

    // Remove cells while keeping a unique solution.
    // Some puzzles may finish with slightly more clues if
    // removing another cell would make the puzzle ambiguous.
    for (const position of positions) {
      if (clues <= targetClues) break;

      const row = Math.floor(position / SIZE);
      const col = position % SIZE;
      const previous = grid[row][col];

      grid[row][col] = 0;

      const testGrid = copyGrid(grid);

      if (countSolutions(testGrid, 2) === 1) {
        clues--;
      } else {
        grid[row][col] = previous;
      }
    }

    return {
      puzzle: grid,
      solution: solved
    };
  }

  function generateFreshPuzzle() {
    let generated = null;
    let key = "";
    let attempts = 0;

    // Avoid immediately repeating the previous exact puzzle.
    do {
      generated = generatePuzzle(difficulty);
      key = generated.puzzle.flat().join("");
      attempts++;
    } while (
      key === previousPuzzleKey &&
      attempts < 3
    );

    previousPuzzleKey = key;
    currentPuzzleKey = key;

    puzzle = copyGrid(generated.puzzle);
    solution = copyGrid(generated.solution);
    fixed = puzzle.map(row => row.map(value => value !== 0));
    notes = Array.from(
      { length: 81 },
      () => new Set()
    );

    selected = -1;
    mistakes = 0;
    hintsUsed = 0;
    completed = false;
    notesMode = false;
    startedAt = Date.now();
  }

  /* ---------- BOARD AND UI ---------- */

  function render() {
    if (!root) return;

    const level = LEVELS[difficulty];

    root.innerHTML = `
      <section class="game-panel sudoku-game">
        <div class="game-metrics">
          <div class="game-metric">
            <span class="game-metric-label">Time</span>
            <strong id="sudokuTimer">00:00</strong>
          </div>
          <div class="game-metric">
            <span class="game-metric-label">Mistakes</span>
            <strong id="sudokuMistakes">${mistakes}</strong>
          </div>
          <div class="game-metric">
            <span class="game-metric-label">Hints</span>
            <strong id="sudokuHints">${hintsUsed}</strong>
          </div>
        </div>

        <div class="sudoku-intro">
          <span class="sudoku-level">${level.label} · 9×9</span>
          <p>${level.description}</p>
          <p class="sudoku-help">
            Fill every row, column and 3×3 box with numbers 1–9.
            Each number can appear only once in each row, column and box.
          </p>
        </div>

        <div class="sudoku-board" role="grid" aria-label="Sudoku board">
          ${puzzle.map((row, r) => row.map((value, c) => {
            const index = cellIndex(r, c);
            const classes = [
              "sudoku-cell",
              fixed[r][c] ? "is-fixed" : "",
              value === 0 ? "is-empty" : ""
            ].filter(Boolean).join(" ");

            const noteMarkup = value === 0
              ? `<span class="sudoku-notes">${
                  Array.from({ length: 9 }, (_, i) => {
                    const n = i + 1;
                    return `<span>${notes[index].has(n) ? n : ""}</span>`;
                  }).join("")
                }</span>`
              : "";

            return `
              <button
                type="button"
                class="${classes}"
                data-cell="${index}"
                role="gridcell"
                aria-label="Row ${r + 1}, column ${c + 1}, ${
                  value || "empty"
                }"
                ${fixed[r][c] || completed ? "disabled" : ""}
              >${value || noteMarkup}</button>
            `;
          }).join("")).join("")}
        </div>

        <div class="sudoku-feedback game-feedback" id="sudokuFeedback" aria-live="polite">
          Choose an empty cell, then select a number.
        </div>

        <div class="sudoku-number-pad">
          ${Array.from({ length: 9 }, (_, i) => `
            <button type="button" class="sudoku-number" data-number="${i + 1}">
              ${i + 1}
            </button>
          `).join("")}
        </div>

        <div class="sudoku-tools">
          <button type="button" class="sudoku-tool" data-action="notes">
            ${notesMode ? "✓ Notes On" : "✎ Notes"}
          </button>
          <button type="button" class="sudoku-tool" data-action="erase">
            Erase
          </button>
          <button type="button" class="sudoku-tool" data-action="hint">
            Hint
          </button>
          <button type="button" class="sudoku-tool" data-action="check">
            Check
          </button>
        </div>

        <p class="sudoku-footnote">
          Keyboard: 1–9 to enter · Backspace to erase · Arrow keys to move
        </p>
      </section>
    `;

    bindBoardEvents();
    highlightBoard();
    updateTimer();
  }

  function getFeedback() {
    return root && root.querySelector("#sudokuFeedback");
  }

  function showFeedback(message, type) {
    const feedback = getFeedback();
    if (!feedback) return;

    feedback.textContent = message;
    feedback.dataset.state = type || "info";
  }

  function bindBoardEvents() {
    root.querySelectorAll("[data-cell]").forEach(button => {
      button.addEventListener("click", () => {
        if (completed) return;

        selected = Number(button.dataset.cell);
        highlightBoard();

        const row = Math.floor(selected / SIZE);
        const col = selected % SIZE;

        showFeedback(
          fixed[row][col]
            ? "This number is part of the original puzzle."
            : `Selected row ${row + 1}, column ${col + 1}.`,
          "info"
        );
      });
    });

    root.querySelectorAll("[data-number]").forEach(button => {
      button.addEventListener("click", () => {
        enterNumber(Number(button.dataset.number));
      });
    });

    root.querySelectorAll("[data-action]").forEach(button => {
      button.addEventListener("click", () => {
        const action = button.dataset.action;

        if (action === "notes") {
          notesMode = !notesMode;
          button.textContent = notesMode ? "✓ Notes On" : "✎ Notes";
          showFeedback(
            notesMode
              ? "Notes mode is on. Add possible numbers to an empty cell."
              : "Notes mode is off.",
            "info"
          );
        }

        if (action === "erase") eraseSelected();
        if (action === "hint") giveHint();
        if (action === "check") checkBoard();
      });
    });
  }

  function highlightBoard() {
    if (!root) return;

    const buttons = root.querySelectorAll("[data-cell]");
    const selectedRow = selected < 0 ? -1 : Math.floor(selected / SIZE);
    const selectedCol = selected < 0 ? -1 : selected % SIZE;
    const selectedValue = selected < 0
      ? 0
      : puzzle[selectedRow][selectedCol];

    buttons.forEach(button => {
      const index = Number(button.dataset.cell);
      const row = Math.floor(index / SIZE);
      const col = index % SIZE;
      const value = puzzle[row][col];

      button.classList.toggle("is-selected", index === selected);

      button.classList.toggle(
        "is-related",
        selected >= 0 &&
        (row === selectedRow || col === selectedCol ||
          (
            Math.floor(row / BOX) === Math.floor(selectedRow / BOX) &&
            Math.floor(col / BOX) === Math.floor(selectedCol / BOX)
          ))
      );

      button.classList.toggle(
        "is-same-number",
        selectedValue !== 0 && value === selectedValue
      );
    });
  }

  /* ---------- GAMEPLAY ---------- */

  function enterNumber(number) {
    if (completed) return;

    if (selected < 0) {
      showFeedback("First choose an empty cell.", "warning");
      return;
    }

    const row = Math.floor(selected / SIZE);
    const col = selected % SIZE;

    if (fixed[row][col]) {
      showFeedback("Choose an empty cell first.", "warning");
      return;
    }

    if (notesMode) {
      const set = notes[selected];

      if (set.has(number)) set.delete(number);
      else set.add(number);

      render();
      return;
    }

    if (solution[row][col] !== number) {
      mistakes++;

      const mistakeDisplay = root.querySelector("#sudokuMistakes");
      if (mistakeDisplay) mistakeDisplay.textContent = mistakes;

      showFeedback(
        "That number doesn't fit. Recheck the row, column and box.",
        "error"
      );

      const cell = root.querySelector(`[data-cell="${selected}"]`);
      if (cell) {
        cell.classList.add("is-wrong");
        window.setTimeout(() => cell.classList.remove("is-wrong"), 550);
      }

      return;
    }

    puzzle[row][col] = number;
    notes[selected].clear();

    // Remove the placed number from notes in its row, column and box.
    for (let i = 0; i < SIZE; i++) {
      notes[cellIndex(row, i)].delete(number);
      notes[cellIndex(i, col)].delete(number);
    }

    const startRow = Math.floor(row / BOX) * BOX;
    const startCol = Math.floor(col / BOX) * BOX;

    for (let r = startRow; r < startRow + BOX; r++) {
      for (let c = startCol; c < startCol + BOX; c++) {
        notes[cellIndex(r, c)].delete(number);
      }
    }

    if (isSolved()) {
      finishGame();
    } else {
      showFeedback("Good move. Keep going!", "success");
      render();
    }
  }

  function eraseSelected() {
    if (completed) return;

    if (selected < 0) {
      showFeedback("Choose a cell to erase first.", "warning");
      return;
    }

    const row = Math.floor(selected / SIZE);
    const col = selected % SIZE;

    if (fixed[row][col]) {
      showFeedback("Original puzzle numbers cannot be erased.", "warning");
      return;
    }

    puzzle[row][col] = 0;
    notes[selected].clear();

    render();
    showFeedback("Cell cleared.", "info");
  }

  function giveHint() {
    if (completed) return;

    let index = selected;

    if (index < 0) {
      const emptyCells = [];

      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          if (puzzle[r][c] === 0) {
            emptyCells.push(cellIndex(r, c));
          }
        }
      }

      if (emptyCells.length === 0) return;
      index = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      selected = index;
    }

    const row = Math.floor(index / SIZE);
    const col = index % SIZE;

    if (fixed[row][col] || puzzle[row][col] !== 0) {
      showFeedback("Select an empty cell for a hint.", "warning");
      return;
    }

    puzzle[row][col] = solution[row][col];
    notes[index].clear();
    hintsUsed++;

    const hintDisplay = root.querySelector("#sudokuHints");
    if (hintDisplay) hintDisplay.textContent = hintsUsed;

    if (isSolved()) {
      finishGame();
    } else {
      render();
      showFeedback("Hint used. Keep solving the remaining cells.", "success");
    }
  }

  function checkBoard() {
    if (completed) return;

    let empty = 0;
    let incorrect = 0;

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (puzzle[r][c] === 0) empty++;
        else if (puzzle[r][c] !== solution[r][c]) incorrect++;
      }
    }

    if (incorrect > 0) {
      showFeedback("Some numbers need another look.", "error");
    } else if (empty > 0) {
      showFeedback(`${empty} empty cells remaining. You're on track!`, "info");
    } else {
      finishGame();
    }
  }

  function isSolved() {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (puzzle[r][c] !== solution[r][c]) return false;
      }
    }

    return true;
  }

  function finishGame() {
    if (completed) return;

    completed = true;
    stopTimer();
    render();

    const seconds = elapsedSeconds();
    const emptyCount = fixed.flat().filter(value => !value).length;

    // Faster completion and fewer hints/mistakes improve the score.
    const baseScore = difficulty === "easy"
      ? 500
      : difficulty === "medium"
        ? 800
        : 1200;

    const timePenalty = Math.min(400, Math.floor(seconds / 10));
    const mistakePenalty = mistakes * 20;
    const hintPenalty = hintsUsed * 60;

    const score = Math.max(
      100,
      baseScore + emptyCount * 5 - timePenalty -
        mistakePenalty - hintPenalty
    );

    showFeedback(
      `Puzzle solved! Time: ${formatTime(seconds)} · Score: ${score}`,
      "success"
    );

    if (typeof options.onComplete === "function") {
      options.onComplete({
        gameId: GAME_ID,
        score,
        time: seconds,
        mistakes,
        hintsUsed,
        difficulty
      });
    }
  }

  /* ---------- TIMER AND KEYBOARD ---------- */

  function updateTimer() {
    const timer = root && root.querySelector("#sudokuTimer");
    if (!timer) return;

    timer.textContent = formatTime(elapsedSeconds());
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
      if (!completed && root) updateTimer();
    }, 1000);
  }

  function onKeyDown(event) {
    if (!root || completed) return;

    const target = event.target;
    if (
      target &&
      ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
    ) {
      return;
    }

    if (/^[1-9]$/.test(event.key)) {
      event.preventDefault();
      enterNumber(Number(event.key));
      return;
    }

    if (event.key === "Backspace" || event.key === "Delete" || event.key === "0") {
      event.preventDefault();
      eraseSelected();
      return;
    }

    if (selected < 0) return;

    let row = Math.floor(selected / SIZE);
    let col = selected % SIZE;

    if (event.key === "ArrowUp") row = Math.max(0, row - 1);
    else if (event.key === "ArrowDown") row = Math.min(8, row + 1);
    else if (event.key === "ArrowLeft") col = Math.max(0, col - 1);
    else if (event.key === "ArrowRight") col = Math.min(8, col + 1);
    else return;

    event.preventDefault();
    selected = cellIndex(row, col);
    highlightBoard();
  }

  /* ---------- PUBLIC API ---------- */

  function start(level) {
    gameToken++;

    difficulty = LEVELS[level] ? level : "easy";

    generateFreshPuzzle();
    render();
    startTimer();

    showFeedback("New puzzle ready. Good luck!", "info");
  }

  function mount(container, suppliedOptions = {}) {
    destroy();

    root = container;
    options = suppliedOptions || {};

    difficulty = LEVELS[options.difficulty]
      ? options.difficulty
      : "easy";

    previousPuzzleKey = "";
    root.innerHTML = "";
    document.addEventListener("keydown", onKeyDown);
    start(difficulty);
  }
  function destroy() {
    gameToken++;
    stopTimer();
    document.removeEventListener("keydown", onKeyDown);
    if (root) root.innerHTML = "";
    root = null;
    options = {};
  }
  window.MindPlayGames.sudoku = {
    mount,
    start,
    destroy
  };
})();