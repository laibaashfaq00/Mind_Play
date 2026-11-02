/* =========================================
   MIND PLAY — SEQUENCE MASTER
   File: js/games/sequence-master.js
   ========================================= */

(function () {
  "use strict";

  window.MindPlayGames = window.MindPlayGames || {};

  const questionBank = {
    easy: [
      { sequence: [2, 4, 6, 8, null], answer: 10, hint: "Add 2 each time." },
      { sequence: [5, 10, 15, 20, null], answer: 25, hint: "Add 5 each time." },
      { sequence: [3, 6, 9, 12, null], answer: 15, hint: "Multiples of 3." },
      { sequence: [1, 3, 5, 7, null], answer: 9, hint: "Odd numbers." },
      { sequence: [10, 20, 30, 40, null], answer: 50, hint: "Add 10 each time." },
      { sequence: [2, 4, 8, 16, null], answer: 32, hint: "Double the previous number." },
      { sequence: [20, 18, 16, 14, null], answer: 12, hint: "Subtract 2 each time." },
      { sequence: [1, 4, 7, 10, null], answer: 13, hint: "Add 3 each time." },
      { sequence: [100, 90, 80, 70, null], answer: 60, hint: "Subtract 10 each time." },
      { sequence: [1, 2, 4, 7, null], answer: 11, hint: "The added amount increases by 1." },
      { sequence: [4, 8, 12, 16, null], answer: 20, hint: "Add 4 each time." },
      { sequence: [50, 45, 40, 35, null], answer: 30, hint: "Subtract 5 each time." }
    ],

    medium: [
      { sequence: [2, 6, 12, 20, null], answer: 30, hint: "Think about multiplying consecutive numbers." },
      { sequence: [1, 4, 9, 16, null], answer: 25, hint: "These are perfect squares." },
      { sequence: [3, 6, 12, 24, null], answer: 48, hint: "Multiply by the same number each time." },
      { sequence: [2, 5, 10, 17, null], answer: 26, hint: "Add consecutive odd numbers." },
      { sequence: [1, 1, 2, 3, 5, null], answer: 8, hint: "Add the previous two numbers." },
      { sequence: [81, 27, 9, 3, null], answer: 1, hint: "Divide by 3 each time." },
      { sequence: [4, 9, 16, 25, null], answer: 36, hint: "Square numbers starting from 2." },
      { sequence: [7, 14, 28, 56, null], answer: 112, hint: "Each term is twice the previous term." },
      { sequence: [2, 3, 5, 8, 12, null], answer: 17, hint: "The difference grows by 1." },
      { sequence: [64, 32, 16, 8, null], answer: 4, hint: "Each number is half the previous one." },
      { sequence: [1, 8, 27, 64, null], answer: 125, hint: "Cube numbers." },
      { sequence: [11, 22, 21, 42, 41, null], answer: 82, hint: "Multiply by 2, then subtract 1; repeat." }
    ],

    hard: [
      { sequence: [2, 3, 5, 9, 17, null], answer: 33, hint: "Look at the differences between terms." },
      { sequence: [1, 2, 6, 24, 120, null], answer: 720, hint: "Multiply by the next counting number." },
      { sequence: [3, 8, 15, 24, 35, null], answer: 48, hint: "The differences are consecutive odd numbers." },
      { sequence: [2, 6, 18, 54, null], answer: 162, hint: "Multiply by 3 each time." },
      { sequence: [1, 5, 14, 30, 55, null], answer: 91, hint: "The differences are 4, 9, 16, 25..." },
      { sequence: [4, 7, 13, 25, 49, null], answer: 97, hint: "Look at the differences." },
      { sequence: [2, 10, 30, 68, 130, null], answer: 222, hint: "Use cubes: add consecutive odd cube differences." },
      { sequence: [1, 3, 7, 15, 31, null], answer: 63, hint: "Multiply by 2 and add 1." },
      { sequence: [5, 11, 23, 47, 95, null], answer: 191, hint: "Double the number and add 1." },
      { sequence: [100, 96, 88, 76, 60, null], answer: 40, hint: "Subtract 4, then 8, then 12..." },
      { sequence: [2, 12, 36, 80, 150, null], answer: 252, hint: "Consider n² multiplied by n+1." },
      { sequence: [1, 4, 13, 40, 121, null], answer: 364, hint: "Multiply by 3 and add 1." }
    ]
  };

  let root = null;
  let callbacks = {};
  let state = null;

  function shuffle(items) {
    const result = [...items];

    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function setMessage(message, type = "") {
    const element = root?.querySelector("#smMessage");

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

    const score = root.querySelector("#smScore");
    const round = root.querySelector("#smRound");
    const difficulty = root.querySelector("#smDifficulty");

    if (score) score.textContent = state.score;
    if (round) {
      round.textContent = `${Math.min(state.index + 1, state.questions.length)}/${state.questions.length}`;
    }
    if (difficulty) difficulty.textContent = state.difficulty;
  }

  function currentQuestion() {
    return state.questions[state.index];
  }

  function renderQuestion() {
    if (!root || !state) return;

    if (state.index >= state.questions.length) {
      finishGame();
      return;
    }

    const question = currentQuestion();

    root.innerHTML = `
      <section class="game-panel">
        <div class="game-panel-header">
          <div>
            <div class="game-panel-title">Crack the number pattern</div>
            <div class="game-panel-caption">
              Find the rule and complete the sequence.
            </div>
          </div>
          <span class="game-pill" id="smDifficulty">
            ${escapeHTML(state.difficulty)}
          </span>
        </div>

        <div class="game-metrics">
          <div class="game-metric">
            <span class="game-metric-value" id="smScore">${state.score}</span>
            <span class="game-metric-label">Score</span>
          </div>
          <div class="game-metric">
            <span class="game-metric-value" id="smRound">
              ${state.index + 1}/${state.questions.length}
            </span>
            <span class="game-metric-label">Question</span>
          </div>
          <div class="game-metric">
            <span class="game-metric-value">${state.streak}</span>
            <span class="game-metric-label">Streak</span>
          </div>
        </div>

        <div class="sequence-display" aria-label="Number sequence">
          ${question.sequence.map((number) => `
            <span class="sequence-number ${number === null ? "is-missing" : ""}">
              ${number === null ? "?" : number}
            </span>
          `).join("")}
        </div>

        <p class="game-subtitle">
          What number should replace the question mark?
        </p>

        <form id="smForm" class="sequence-answer-row">
          <input
            id="smAnswer"
            class="sequence-answer-input"
            type="number"
            inputmode="numeric"
            autocomplete="off"
            placeholder="Your answer"
            aria-label="Your answer"
            required
          >
          <button type="submit" class="game-primary-button">
            Check answer
          </button>
        </form>

        <div class="game-feedback" id="smMessage" aria-live="polite">
          Each correct answer earns 100 points.
        </div>

        <div class="game-button-row">
          <button type="button" class="game-secondary-button" id="smHint">
            Show hint
          </button>
          <button type="button" class="game-secondary-button" id="smRestart">
            Restart
          </button>
        </div>
      </section>
    `;

    root.querySelector("#smForm")?.addEventListener("submit", (event) => {
      event.preventDefault();
      checkAnswer();
    });

    root.querySelector("#smHint")?.addEventListener("click", showHint);

    root.querySelector("#smRestart")?.addEventListener("click", () => {
      start(state.difficulty);
    });

    updateMetrics();
    root.querySelector("#smAnswer")?.focus();
  }

  function checkAnswer() {
    if (!state || state.answered) return;

    const input = root.querySelector("#smAnswer");

    if (!input || input.value.trim() === "") {
      setMessage("Enter a number first.", "error");
      return;
    }

    const answer = Number(input.value);
    const question = currentQuestion();

    state.answered = true;

    if (answer === question.answer) {
      state.score += 100;
      state.streak += 1;
      state.correct += 1;

      setMessage("Correct! Great pattern recognition.", "success");
    } else {
      state.streak = 0;

      setMessage(
        `Not quite. The correct answer is ${question.answer}.`,
        "error"
      );
    }

    input.disabled = true;

    const submitButton = root.querySelector(
      '#smForm button[type="submit"]'
    );

    if (submitButton) submitButton.disabled = true;

    const hintButton = root.querySelector("#smHint");

    if (hintButton) hintButton.disabled = true;

    updateMetrics();

    const nextButton = document.createElement("button");

    nextButton.type = "button";
    nextButton.className = "game-primary-button";
    nextButton.textContent =
      state.index === state.questions.length - 1
        ? "See results"
        : "Next question";

    nextButton.addEventListener("click", () => {
      state.index += 1;
      state.answered = false;
      renderQuestion();
    });

    root.querySelector(".game-button-row")?.appendChild(nextButton);
  }

  function showHint() {
    if (!state || state.answered) return;

    const question = currentQuestion();

    setMessage(`Hint: ${question.hint}`);

    state.hintsUsed += 1;

    const button = root.querySelector("#smHint");

    if (button) {
      button.disabled = true;
      button.textContent = "Hint used";
    }
  }

  function finishGame() {
    if (!state || state.finished) return;

    state.finished = true;

    const total = state.questions.length;
    const score = state.score;

    root.innerHTML = `
      <section class="game-panel">
        <div class="game-overlay-message">
          <div class="game-overlay-icon">🧠</div>
          <div class="game-overlay-title">Sequence complete!</div>
          <p class="game-overlay-description">
            You answered ${state.correct} out of ${total} questions correctly.
          </p>

          <div class="game-metrics">
            <div class="game-metric">
              <span class="game-metric-value">${score}</span>
              <span class="game-metric-label">Final score</span>
            </div>
            <div class="game-metric">
              <span class="game-metric-value">${state.correct}/${total}</span>
              <span class="game-metric-label">Correct answers</span>
            </div>
            <div class="game-metric">
              <span class="game-metric-value">${Math.round(
                (state.correct / total) * 100
              )}%</span>
              <span class="game-metric-label">Accuracy</span>
            </div>
          </div>

          <div class="game-button-row">
            <button type="button" class="game-primary-button" id="smPlayAgain">
              Play again
            </button>
          </div>
        </div>
      </section>
    `;

    root.querySelector("#smPlayAgain")?.addEventListener("click", () => {
      start(state.difficulty);
    });

    if (typeof callbacks.onComplete === "function") {
      callbacks.onComplete({
        gameId: "sequence-master",
        score,
        correct: state.correct,
        total,
        difficulty: state.difficulty,
        hintsUsed: state.hintsUsed
      });
    }
  }

  function start(difficulty = "easy") {
    const key = String(difficulty).toLowerCase();
    const selectedDifficulty =
      Object.prototype.hasOwnProperty.call(questionBank, key)
        ? key
        : "easy";

    state = {
      difficulty: selectedDifficulty,
      questions: shuffle(questionBank[selectedDifficulty]).slice(0, 8),
      index: 0,
      score: 0,
      streak: 0,
      correct: 0,
      hintsUsed: 0,
      answered: false,
      finished: false
    };

    renderQuestion();
  }

  function mount(container, options = {}) {
    if (!container) {
      console.error("Sequence Master needs a container element.");
      return;
    }

    root = container;
    callbacks = options;

    start(options.difficulty || "easy");
  }

  function destroy() {
    if (root) root.innerHTML = "";

    root = null;
    callbacks = {};
    state = null;
  }

  window.MindPlayGames.sequenceMaster = {
    mount,
    start,
    destroy
  };

  console.log("Sequence Master is ready!");
})();