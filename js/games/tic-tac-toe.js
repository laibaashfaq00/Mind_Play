/* =====================================================
   MIND PLAY — TIC-TAC-TOE VS COMPUTER
   Difficulty: Easy / Medium / Hard
   Features:
   - Play against computer
   - Three difficulty levels
   - Smart computer strategy
   - Win, loss and draw tracking
   - Restart round and reset score
   - MindPlay progress callback
   ===================================================== */

(function () {
  "use strict";

  window.MindPlayGames = window.MindPlayGames || {};

  const GAME_ID = "tic-tac-toe";

  const WIN_LINES = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
  ];

  let root = null;
  let options = {};
  let difficulty = "medium";

  let board = Array(9).fill("");
  let playerTurn = true;
  let gameOver = false;
  let thinking = false;

  let round = 0;
  let playerWins = 0;
  let computerWins = 0;
  let draws = 0;
  let computerTimer = null;
  let gameToken = 0;

  function chooseDifficulty(level) {
    return ["easy", "medium", "hard"].includes(level)
      ? level
      : "medium";
  }

  function getWinner(state) {
    for (const line of WIN_LINES) {
      const [a, b, c] = line;

      if (
        state[a] &&
        state[a] === state[b] &&
        state[a] === state[c]
      ) {
        return {
          mark: state[a],
          line
        };
      }
    }

    return null;
  }

  function isDraw(state) {
    return !getWinner(state) && state.every(Boolean);
  }

  function availableMoves(state) {
    const moves = [];

    state.forEach((value, index) => {
      if (!value) moves.push(index);
    });

    return moves;
  }

  function randomMove(state) {
    const moves = availableMoves(state);

    if (!moves.length) return -1;

    return moves[Math.floor(Math.random() * moves.length)];
  }

  function findWinningMove(state, mark) {
    for (const index of availableMoves(state)) {
      const next = state.slice();
      next[index] = mark;

      if (getWinner(next)) {
        return index;
      }
    }

    return -1;
  }

  /* ---------- EASY COMPUTER ---------- */

  function easyMove() {
    // Easy mode sometimes chooses a random move.
    if (Math.random() < 0.30) {
      return randomMove(board);
    }

    const winningMove = findWinningMove(board, "O");

    if (winningMove !== -1) {
      return winningMove;
    }

    return randomMove(board);
  }

  /* ---------- MEDIUM COMPUTER ---------- */

  function mediumMove() {
    // Win immediately when possible.
    const winningMove = findWinningMove(board, "O");

    if (winningMove !== -1) {
      return winningMove;
    }

    // Block the player's immediate winning move.
    const blockingMove = findWinningMove(board, "X");

    if (blockingMove !== -1) {
      return blockingMove;
    }

    // Take the centre when available.
    if (!board[4]) {
      return 4;
    }

    // Prefer a corner.
    const corners = [0, 2, 6, 8].filter(
      index => !board[index]
    );

    if (corners.length) {
      return corners[
        Math.floor(Math.random() * corners.length)
      ];
    }

    return randomMove(board);
  }

  /* ---------- HARD COMPUTER ---------- */

  function minimax(state, maximizing, depth) {
    const winner = getWinner(state);

    if (winner && winner.mark === "O") {
      return 10 - depth;
    }

    if (winner && winner.mark === "X") {
      return depth - 10;
    }

    if (isDraw(state)) {
      return 0;
    }

    if (maximizing) {
      let bestScore = -Infinity;

      for (const index of availableMoves(state)) {
        state[index] = "O";

        const score = minimax(
          state,
          false,
          depth + 1
        );

        state[index] = "";
        bestScore = Math.max(bestScore, score);
      }

      return bestScore;
    }

    let bestScore = Infinity;

    for (const index of availableMoves(state)) {
      state[index] = "X";

      const score = minimax(
        state,
        true,
        depth + 1
      );

      state[index] = "";
      bestScore = Math.min(bestScore, score);
    }

    return bestScore;
  }

  function hardMove() {
    let bestScore = -Infinity;
    let bestMoves = [];

    for (const index of availableMoves(board)) {
      board[index] = "O";

      const score = minimax(board, false, 0);

      board[index] = "";

      if (score > bestScore) {
        bestScore = score;
        bestMoves = [index];
      } else if (score === bestScore) {
        bestMoves.push(index);
      }
    }

    if (!bestMoves.length) return -1;

    // Randomly select among equally good moves.
    return bestMoves[
      Math.floor(Math.random() * bestMoves.length)
    ];
  }

  function computerMove() {
    if (difficulty === "easy") {
      return easyMove();
    }

    if (difficulty === "hard") {
      return hardMove();
    }

    return mediumMove();
  }

  /* ---------- STATUS MESSAGES ---------- */

  function getStatusMessage() {
    const winner = getWinner(board);

    if (winner && winner.mark === "X") {
      return "You won this round!";
    }

    if (winner && winner.mark === "O") {
      return "The computer won this round.";
    }

    if (isDraw(board)) {
      return "It's a draw!";
    }

    if (thinking) {
      return "Computer is thinking...";
    }

    if (playerTurn) {
      return "Your turn — place X.";
    }

    return "Computer's turn — O.";
  }

  function showFeedback(message, type) {
    if (!root) return;

    const feedback = root.querySelector("#tttFeedback");

    if (feedback) {
      feedback.textContent = message;
      feedback.dataset.state = type || "info";
    }
  }

  /* ---------- RENDER BOARD ---------- */

  function render() {
    if (!root) return;

    const winner = getWinner(board);
    const winningCells = winner ? winner.line : [];

    root.innerHTML = `
      <section class="game-panel ttt-game">

        <div class="game-metrics">
          <div class="game-metric">
            <span class="game-metric-label">Your Wins</span>
            <strong>${playerWins}</strong>
          </div>

          <div class="game-metric">
            <span class="game-metric-label">Draws</span>
            <strong>${draws}</strong>
          </div>

          <div class="game-metric">
            <span class="game-metric-label">Computer Wins</span>
            <strong>${computerWins}</strong>
          </div>
        </div>

        <div class="ttt-heading">
          <span class="ttt-level">
            ${difficulty.toUpperCase()} MODE
          </span>

          <h3>Round ${round}</h3>

          <p id="tttStatus" aria-live="polite">
            ${getStatusMessage()}
          </p>
        </div>

        <div
          class="tic-tac-toe-board"
          role="grid"
          aria-label="Tic-Tac-Toe board"
        >
          ${board.map((mark, index) => `
            <button
              type="button"
              class="ttt-cell ${
                mark ? "has-mark mark-" + mark.toLowerCase() : ""
              } ${
                winningCells.includes(index) ? "is-winning" : ""
              }"
              data-cell="${index}"
              role="gridcell"
              aria-label="Cell ${index + 1}: ${mark || "empty"}"
              ${
                mark || gameOver || !playerTurn || thinking
                  ? "disabled"
                  : ""
              }
            >${mark}</button>
          `).join("")}
        </div>

        <div
          class="game-feedback"
          id="tttFeedback"
          aria-live="polite"
        >
          ${
            gameOver
              ? "Round complete."
              : "You are X. Computer is O."
          }
        </div>

        <div class="ttt-actions">
          <button
            type="button"
            class="sudoku-tool"
            data-action="restart"
          >
            Restart Round
          </button>

          <button
            type="button"
            class="sudoku-tool"
            data-action="reset-score"
          >
            Reset Score
          </button>
        </div>

        <p class="sudoku-footnote">
          Make a line of three marks horizontally,
          vertically or diagonally to win.
        </p>
      </section>
    `;

    root.querySelectorAll("[data-cell]").forEach(button => {
      button.addEventListener("click", () => {
        makePlayerMove(Number(button.dataset.cell));
      });
    });

    root.querySelector('[data-action="restart"]')
      .addEventListener("click", () => {
        start(difficulty);
      });

    root.querySelector('[data-action="reset-score"]')
      .addEventListener("click", resetScore);
  }
  /* ---------- PLAYER MOVE ---------- */

  function makePlayerMove(index) {
    if (
      !root ||
      gameOver ||
      thinking ||
      !playerTurn ||
      board[index]
    ) {
      return;
    }

    board[index] = "X";
    playerTurn = false;

    render();

    if (checkRoundEnd()) {
      return;
    }

    thinking = true;
    render();

    const thisGame = gameToken;

    computerTimer = window.setTimeout(() => {
      computerTimer = null;

      if (
        !root ||
        thisGame !== gameToken ||
        gameOver
      ) {
        return;
      }

      const move = computerMove();

      if (move !== -1 && move !== undefined) {
        board[move] = "O";
      }

      thinking = false;

      if (checkRoundEnd()) {
        return;
      }

      playerTurn = true;
      render();
    }, difficulty === "hard" ? 450 : 350);
  }

  /* ---------- END OF ROUND ---------- */

  function checkRoundEnd() {
    const winner = getWinner(board);

    if (winner) {
      gameOver = true;

      if (winner.mark === "X") {
        playerWins++;

        render();

        showFeedback(
          "Excellent! You outsmarted the computer.",
          "success"
        );
      } else {
        computerWins++;

        render();

        showFeedback(
          "The computer wins. Try a different strategy.",
          "error"
        );
      }

      if (typeof options.onComplete === "function") {
        options.onComplete({
          gameId: GAME_ID,
          score: winner.mark === "X" ? 100 : 10,
          result: winner.mark === "X" ? "win" : "loss",
          difficulty,
          round
        });
      }

      return true;
    }

    if (isDraw(board)) {
      gameOver = true;
      draws++;

      render();

      showFeedback(
        "It's a draw! Neither side found a winning line.",
        "info"
      );

      if (typeof options.onComplete === "function") {
        options.onComplete({
          gameId: GAME_ID,
          score: 50,
          result: "draw",
          difficulty,
          round
        });
      }

      return true;
    }

    return false;
  }

  /* ---------- START AND RESET ---------- */

  function start(level) {
    gameToken++;

    if (computerTimer !== null) {
      window.clearTimeout(computerTimer);
      computerTimer = null;
    }

    difficulty = chooseDifficulty(level);

    board = Array(9).fill("");
    playerTurn = true;
    gameOver = false;
    thinking = false;

    round++;

    render();

    showFeedback(
      "New round ready. You play as X!",
      "info"
    );
  }

  function resetScore() {
    playerWins = 0;
    computerWins = 0;
    draws = 0;
    round = 0;

    start(difficulty);
  }

  /* ---------- PUBLIC GAME API ---------- */

  function mount(container, suppliedOptions = {}) {
    destroy();

    root = container;
    options = suppliedOptions || {};

    difficulty = chooseDifficulty(options.difficulty);

    playerWins = 0;
    computerWins = 0;
    draws = 0;
    round = 0;

    start(difficulty);
  }

  function destroy() {
    gameToken++;

    if (computerTimer !== null) {
      window.clearTimeout(computerTimer);
      computerTimer = null;
    }

    if (root) {
      root.innerHTML = "";
    }

    root = null;
    options = {};
  }

  window.MindPlayGames.ticTacToe = {
    mount,
    start,
    destroy
  };

})();