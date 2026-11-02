(function () {
  "use strict";

  window.MindPlayGames = window.MindPlayGames || {};

  const GAME_ID = "snake";
  const COLS = 18;
  const ROWS = 18;

  let container = null;
  let options = {};
  let difficulty = "easy";
  let snake = [];
  let food = { x: 8, y: 8 };
  let direction = { x: 1, y: 0 };
  let nextDirection = { x: 1, y: 0 };
  let score = 0;
  let seconds = 0;
  let timer = null;
  let clock = null;
  let started = false;
  let finished = false;
  let keyHandler = null;
  let message = "";
  let tickMs = 170;

  const speeds = {
    easy: 190,
    medium: 140,
    hard: 95
  };

  function randomInt(max) {
    return Math.floor(Math.random() * max);
  }

  function samePosition(a, b) {
    return a.x === b.x && a.y === b.y;
  }

  function placeFood() {
    const empty = [];

    // Spawn food only in the central area of the board. This avoids
    // misleading edge/corner placement and leaves room to approach it.
    for (let y = 4; y <= 13; y++) {
      for (let x = 4; x <= 13; x++) {
        const occupied = snake.some(part => part.x === x && part.y === y);
        if (!occupied) empty.push({ x, y });
      }
    }

    if (empty.length === 0) {
      finishGame(true);
      return;
    }

    food = empty[randomInt(empty.length)];
  }

  function stopTimers() {
    if (timer) clearInterval(timer);
    if (clock) clearInterval(clock);
    timer = null;
    clock = null;
  }

  function formatTime(value) {
    const mins = Math.floor(value / 60);
    const secs = value % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  function showMessage(text, type = "info") {
    message = text;
    const el = container?.querySelector(".snake-feedback");

    if (el) {
      el.textContent = text;
      el.className = `snake-feedback ${type}`;
    }
  }

  function updateStats() {
    const scoreEl = container?.querySelector("[data-snake-score]");
    const timeEl = container?.querySelector("[data-snake-time]");
    const lengthEl = container?.querySelector("[data-snake-length]");

    if (scoreEl) scoreEl.textContent = score;
    if (timeEl) timeEl.textContent = formatTime(seconds);
    if (lengthEl) lengthEl.textContent = snake.length;
  }

  function renderBoard() {
    const board = container?.querySelector(".snake-board");
    if (!board) return;

    board.innerHTML = "";
    board.style.setProperty("--snake-cols", String(COLS));
    board.style.setProperty("--snake-rows", String(ROWS));
    board.setAttribute("data-cols", String(COLS));
    board.setAttribute("data-rows", String(ROWS));

    const fragment = document.createDocumentFragment();

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const cell = document.createElement("div");
        cell.className = "snake-cell";

        if (x === food.x && y === food.y) {
          cell.classList.add("snake-food");
          cell.textContent = "🍎";
          cell.setAttribute("aria-label", "Apple food");
        }

        const segmentIndex = snake.findIndex(
          part => part.x === x && part.y === y
        );

        if (segmentIndex === 0) {
          cell.classList.add("snake-head");
          cell.textContent = "●";
        } else if (segmentIndex > 0) {
          cell.classList.add("snake-body");
        }

        fragment.appendChild(cell);
      }
    }

    board.appendChild(fragment);
    updateStats();
  }

  function finishGame(won = false) {
    if (finished) return;

    finished = true;
    started = false;
    stopTimers();

    const finalScore = won ? score + 100 : score;

    showMessage(
      won
        ? `Amazing! You filled the board. Final score: ${finalScore}.`
        : `Game over! Final score: ${score}. Press Restart to try again.`,
      won ? "success" : "warning"
    );

    if (typeof options.onComplete === "function") {
      options.onComplete({
        gameId: GAME_ID,
        score: finalScore,
        foodEaten: score / 10,
        length: snake.length,
        time: seconds,
        difficulty
      });
    }
  }

  function tick() {
    if (!started || finished) return;

    direction = { ...nextDirection };

    const head = snake[0];
    const newHead = {
      x: head.x + direction.x,
      y: head.y + direction.y
    };

    // Snake cannot leave the board.
    if (
      newHead.x < 0 || newHead.x > COLS - 1 ||
      newHead.y < 0 || newHead.y > ROWS - 1
    ) {
      finishGame(false);
      return;
    }

    const eating = samePosition(newHead, food);
    const bodyToCheck = eating ? snake : snake.slice(0, -1);

    if (bodyToCheck.some(part => samePosition(part, newHead))) {
      finishGame(false);
      return;
    }

    snake.unshift(newHead);

    if (eating) {
      score += 10;
      placeFood();

      if (finished) {
        renderBoard();
        return;
      }

      showMessage("Nice! Food collected. Keep going!", "success");
    } else {
      snake.pop();
    }

    renderBoard();
  }

  function setDirection(dx, dy) {
    if (!started || finished) return;

    // Compare with the queued direction too, so quick button taps
    // cannot queue an immediate 180-degree turn between game ticks.
    if (
      (dx === -direction.x && dy === -direction.y) ||
      (dx === -nextDirection.x && dy === -nextDirection.y)
    ) return;

    nextDirection = { x: dx, y: dy };
  }

  function startTimers() {
    stopTimers();

    timer = setInterval(tick, tickMs);
    clock = setInterval(() => {
      if (!started || finished) return;
      seconds++;
      updateStats();
    }, 1000);
  }

  function newGame() {
    stopTimers();

    tickMs = speeds[difficulty] || speeds.easy;
    snake = [
      { x: 5, y: 9 },
      { x: 4, y: 9 },
      { x: 3, y: 9 }
    ];

    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    score = 0;
    seconds = 0;
    started = true;
    finished = false;

    placeFood();
    renderBoard();
    showMessage("Collect food and avoid the walls and your own tail!");
    startTimers();
  }

  function showUI() {
    container.innerHTML = `
      <section class="game-panel snake-game">
        <div class="game-metrics">
          <div class="game-metric">
            <span>Score</span>
            <strong data-snake-score>0</strong>
          </div>
          <div class="game-metric">
            <span>Time</span>
            <strong data-snake-time>00:00</strong>
          </div>
          <div class="game-metric">
            <span>Length</span>
            <strong data-snake-length>3</strong>
          </div>
        </div>

        <p class="snake-description">
          Collect the glowing food to grow. Avoid the walls and your own tail.
        </p>

        <div class="snake-board-wrap">
          <div class="snake-board" role="grid" aria-label="Snake game board"></div>
        </div>

        <p class="snake-feedback" aria-live="polite">
          Collect food and avoid the walls and your own tail!
        </p>

        <div class="snake-controls" aria-label="Snake movement controls">
          <button type="button" data-snake-dir="up" aria-label="Move up">▲</button>
          <div class="snake-horizontal-controls">
            <button type="button" data-snake-dir="left" aria-label="Move left">◀</button>
            <button type="button" data-snake-dir="down" aria-label="Move down">▼</button>
            <button type="button" data-snake-dir="right" aria-label="Move right">▶</button>
          </div>
        </div>

        <div class="game-actions">
          <button type="button" class="game-button" data-snake-restart>
            Restart Game
          </button>
        </div>
      </section>
    `;

    const directions = {
      up: [0, -1],
      down: [0, 1],
      left: [-1, 0],
      right: [1, 0]
    };

    container.querySelectorAll("[data-snake-dir]").forEach(button => {
      const handleDirection = event => {
        event.preventDefault();
        const vector = directions[button.dataset.snakeDir];
        if (!vector) return;
        setDirection(vector[0], vector[1]);
        button.blur();
      };

      // Pointer events cover mouse, touch and pen; click keeps keyboard
      // activation accessible without relying on a form submission.
      button.addEventListener("pointerdown", handleDirection);
      button.addEventListener("click", event => {
        if (event.detail === 0) handleDirection(event);
      });
    });

    container.querySelector("[data-snake-restart]")
      .addEventListener("click", newGame);
  }

  function handleKeydown(event) {
    if (!started || finished) return;

    const keys = {
      ArrowUp: [0, -1],
      w: [0, -1],
      ArrowDown: [0, 1],
      s: [0, 1],
      ArrowLeft: [-1, 0],
      a: [-1, 0],
      ArrowRight: [1, 0],
      d: [1, 0]
    };

    const directionValue = keys[event.key];

    if (directionValue) {
      event.preventDefault();
      setDirection(directionValue[0], directionValue[1]);
    }
  }

  function mount(target, gameOptions = {}) {
    destroy();

    container = target;
    options = gameOptions;
    difficulty = gameOptions.difficulty || "easy";

    if (!speeds[difficulty]) difficulty = "easy";

    showUI();

    keyHandler = handleKeydown;
    document.addEventListener("keydown", keyHandler);

    newGame();
  }

  function start(nextDifficulty = difficulty) {
    if (speeds[nextDifficulty]) difficulty = nextDifficulty;
    if (container) newGame();
  }

  function destroy() {
    stopTimers();

    if (keyHandler) {
      document.removeEventListener("keydown", keyHandler);
      keyHandler = null;
    }

    container = null;
    snake = [];
    started = false;
    finished = false;
  }

  window.MindPlayGames.snake = {
    mount,
    start,
    destroy
  };
})();