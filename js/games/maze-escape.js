(function () {
  "use strict";

  window.MindPlayGames = window.MindPlayGames || {};

  const GAME_ID = "maze-escape";
  let container = null;
  let options = {};
  let difficulty = "easy";
  let maze = [];
  let player = { r: 0, c: 0 };
  let exit = { r: 0, c: 0 };
  let moves = 0;
  let seconds = 0;
  let timer = null;
  let started = false;
  let finished = false;
  let hintPath = [];
  let message = "";
  let messageType = "info";
  let bestMoves = null;
  let size = 9;
  let keyHandler = null;

  const settings = {
    easy: { size: 9, label: "Easy" },
    medium: { size: 13, label: "Medium" },
    hard: { size: 17, label: "Hard" }
  };

  function randomInt(max) {
    return Math.floor(Math.random() * max);
  }

  function makeMaze(n) {
    const grid = Array.from({ length: n }, () =>
      Array.from({ length: n }, () => 1)
    );

    function carve(r, c) {
      grid[r][c] = 0;

      const directions = [
        [-2, 0], [2, 0], [0, -2], [0, 2]
      ];

      for (let i = directions.length - 1; i > 0; i--) {
        const j = randomInt(i + 1);
        [directions[i], directions[j]] =
          [directions[j], directions[i]];
      }

      for (const [dr, dc] of directions) {
        const nr = r + dr;
        const nc = c + dc;

        if (
          nr > 0 && nr < n - 1 &&
          nc > 0 && nc < n - 1 &&
          grid[nr][nc] === 1
        ) {
          grid[r + dr / 2][c + dc / 2] = 0;
          carve(nr, nc);
        }
      }
    }

    carve(1, 1);

    // Open entrance, starting area and exit.
    grid[0][1] = 0;
    grid[1][1] = 0;
    grid[1][2] = 0;
    grid[n - 1][n - 2] = 0; 

    return grid;
  }

  function getPath() {
    const queue = [{ r: player.r, c: player.c }];
    const previous = new Map();
    const key = (r, c) => `${r},${c}`;
    const startKey = key(player.r, player.c);
    previous.set(startKey, null);

    const directions = [
      [-1, 0], [1, 0], [0, -1], [0, 1]
    ];

    while (queue.length) {
      const current = queue.shift();

      if (current.r === exit.r && current.c === exit.c) {
        const path = [];
        let currentKey = key(current.r, current.c);

        while (currentKey !== null) {
          const [r, c] = currentKey.split(",").map(Number);
          path.push({ r, c });
          currentKey = previous.get(currentKey);
        }

        return path.reverse();
      }

      for (const [dr, dc] of directions) {
        const nr = current.r + dr;
        const nc = current.c + dc;
        const nextKey = key(nr, nc);

        if (
          nr >= 0 && nr < size &&
          nc >= 0 && nc < size &&
          maze[nr][nc] === 0 &&
          !previous.has(nextKey)
        ) {
          previous.set(nextKey, key(current.r, current.c));
          queue.push({ r: nr, c: nc });
        }
      }
    }

    return [];
  }

  function showMessage(text, type = "info") {
    message = text;
    messageType = type;

    const el = container?.querySelector(".maze-feedback");
    if (el) {
      el.textContent = text;
      el.className = `maze-feedback ${type}`;
    }
  }

  function stopTimer() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function startTimer() {
    stopTimer();
    timer = setInterval(() => {
      if (!started || finished) return;
      seconds++;
      updateStats();
    }, 1000);
  }

  function formatTime(value) {
    const mins = Math.floor(value / 60);
    const secs = value % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  function updateStats() {
    const movesEl = container?.querySelector("[data-maze-moves]");
    const timeEl = container?.querySelector("[data-maze-time]");

    if (movesEl) movesEl.textContent = moves;
    if (timeEl) timeEl.textContent = formatTime(seconds);
  }

  function renderBoard() {
    const board = container.querySelector(".maze-board");
    if (!board) return;

    board.innerHTML = "";
    board.style.setProperty("--maze-size", size);

    maze.forEach((row, r) => {
      row.forEach((cell, c) => {
        const tile = document.createElement("div");
        tile.className = "maze-cell";

        if (cell === 1) tile.classList.add("wall");
        else tile.classList.add("path");

        if (r === player.r && c === player.c) {
          tile.classList.add("player");
          tile.textContent = "●";
          tile.setAttribute("aria-label", "Player");
        } else if (r === exit.r && c === exit.c) {
          tile.classList.add("exit");
          tile.textContent = "★";
          tile.setAttribute("aria-label", "Exit");
        } else if (
          hintPath.some(point => point.r === r && point.c === c)
        ) {
          tile.classList.add("hint");
          tile.textContent = "·";
        }

        board.appendChild(tile);
      });
    });
  }

  function updateBoard() {
    renderBoard();
    updateStats();
  }

  function finishGame() {
    if (finished) return;

    finished = true;
    started = false;
    stopTimer();

    const path = getPath();
    const base = difficulty === "easy" ? 100 :
      difficulty === "medium" ? 180 : 280;
    const score = Math.max(
      10,
      base - moves * 2 - seconds
    );

    showMessage(
      `Exit reached! Score: ${score}. Moves: ${moves}. Time: ${formatTime(seconds)}.`,
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

  function movePlayer(dr, dc) {
    if (!started || finished) return;

    const nr = player.r + dr;
    const nc = player.c + dc;

    if (
      nr < 0 || nr >= size ||
      nc < 0 || nc >= size ||
      maze[nr][nc] === 1
    ) {
      showMessage("Wall ahead! Try another direction.", "warning");
      return;
    }

    player = { r: nr, c: nc };
    moves++;
    hintPath = [];
    updateBoard();

    if (player.r === exit.r && player.c === exit.c) {
      finishGame();
    }
  }

  function showHint() {
    if (!started || finished) return;

    const path = getPath();
    hintPath = path.slice(1, Math.min(path.length, 5));
    renderBoard();
    showMessage("Follow the highlighted path for a few steps.", "info");
  }

  function newGame() {
    stopTimer();

    const config = settings[difficulty] || settings.easy;
    size = config.size;
    maze = makeMaze(size);
    player = { r: 0, c: 1 };
    exit = { r: size - 1, c: size - 2 };
    moves = 0;
    seconds = 0;
    started = true;
    finished = false;
    hintPath = [];
    message = "Find the star to escape the maze!";
    messageType = "info";

    renderBoard();
    updateStats();
    showMessage(message, messageType);
    startTimer();
  }

  function buildUI() {
    container.innerHTML = `
      <section class="game-panel maze-game">
        <div class="game-metrics">
          <div class="game-metric">
            <span>Moves</span>
            <strong data-maze-moves>0</strong>
          </div>
          <div class="game-metric">
            <span>Time</span>
            <strong data-maze-time>00:00</strong>
          </div>
          <div class="game-metric">
            <span>Level</span>
            <strong class="maze-level">${settings[difficulty].label}</strong>
          </div>
        </div>

        <p class="maze-description">
          Guide the dot through the maze and reach the star.
          Walls block your path, so plan your route carefully.
        </p>

        <div class="maze-board-wrap">
          <div class="maze-board" role="grid" aria-label="Maze"></div>
        </div>

        <p class="maze-feedback" aria-live="polite">
          Find the star to escape the maze!
        </p>

        <div class="maze-controls" aria-label="Movement controls">
          <button type="button" data-move="up" aria-label="Move up">▲</button>
          <div class="maze-horizontal-controls">
            <button type="button" data-move="left" aria-label="Move left">◀</button>
            <button type="button" data-move="down" aria-label="Move down">▼</button>
            <button type="button" data-move="right" aria-label="Move right">▶</button>
          </div>
        </div>

        <div class="game-actions">
          <button type="button" class="game-button secondary" data-maze-hint>
            Show Hint
          </button>
          <button type="button" class="game-button" data-maze-restart>
            New Maze
          </button>
        </div>
      </section>
    `;

    container.querySelectorAll("[data-move]").forEach(button => {
      const move = event => {
        event.preventDefault();
        const delta = {
          up: [-1, 0],
          down: [1, 0],
          left: [0, -1],
          right: [0, 1]
        }[button.dataset.move];
        if (!delta) return;
        movePlayer(delta[0], delta[1]);
        button.blur();
      };

      button.addEventListener("pointerdown", move);
      button.addEventListener("click", event => {
        if (event.detail === 0) move(event);
      });
    });

    container.querySelector("[data-maze-hint]")
      .addEventListener("click", showHint);

    container.querySelector("[data-maze-restart]")
      .addEventListener("click", newGame);
  }

  function handleKeydown(event) {
    if (!started || finished) return;

    const key = event.key.toLowerCase();
    const directions = {
      arrowup: [-1, 0],
      w: [-1, 0],
      arrowdown: [1, 0],
      s: [1, 0],
      arrowleft: [0, -1],
      a: [0, -1],
      arrowright: [0, 1],
      d: [0, 1]
    };

    if (directions[key]) {
      event.preventDefault();
      movePlayer(directions[key][0], directions[key][1]);
    }
  }

  function mount(target, gameOptions = {}) {
    destroy();

    container = target;
    options = gameOptions;
    difficulty = gameOptions.difficulty || "easy";

    if (!settings[difficulty]) difficulty = "easy";

    buildUI();
    keyHandler = handleKeydown;
    document.addEventListener("keydown", keyHandler);
    newGame();
  }

  function start(nextDifficulty = difficulty) {
    if (settings[nextDifficulty]) difficulty = nextDifficulty;
    if (container) newGame();
  }

  function destroy() {
    stopTimer();

    if (keyHandler) {
      document.removeEventListener("keydown", keyHandler);
      keyHandler = null;
    }

    container = null;
    maze = [];
    started = false;
    finished = false;
  }

  window.MindPlayGames.mazeEscape = {
    mount,
    start,
    destroy
  };
})();