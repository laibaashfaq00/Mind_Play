(function () {
  "use strict";

  // ==========================================
  // MIND PLAY - MAIN APPLICATION
  // ==========================================

  const games = [
    {
      id: "image-matcher",
      engine: "imageMatcher",
      title: "Image Matcher",
      category: "memory",
      icon: "🧠",
      description: "Train your visual memory by matching hidden image pairs.",
      difficulty: "Easy to Hard",
      benefits: "Visual memory, attention and concentration"
    },
    {
      id: "sequence-master",
      engine: "sequenceMaster",
      title: "Sequence Master",
      category: "logic",
      icon: "🔢",
      description: "Discover number patterns and predict what comes next.",
      difficulty: "Easy to Hard",
      benefits: "Pattern recognition and logical reasoning"
    },
    {
      id: "sudoku",
      engine: "sudoku",
      title: "Sudoku",
      category: "puzzle",
      icon: "🔲",
      description: "Complete the number grid without repeating digits.",
      difficulty: "Easy to Hard",
      benefits: "Logical thinking and problem solving"
    },
    {
      id: "tic-tac-toe",
      engine: "ticTacToe",
      title: "Tic-Tac-Toe",
      category: "logic",
      icon: "❎",
      description: "Plan your moves and challenge the computer.",
      difficulty: "Easy to Hard",
      benefits: "Strategy, planning and decision making"
    },
    {
      id: "number-slider",
      engine: "numberSlider",
      title: "Number Slider",
      category: "numbers",
      icon: "🧩",
      description: "Slide numbered tiles into the correct order.",
      difficulty: "Easy to Hard",
      benefits: "Spatial reasoning and planning"
    },
    {
      id: "maze-escape",
      engine: "mazeEscape",
      title: "Maze Escape",
      category: "puzzle",
      icon: "🌀",
      description: "Navigate a maze and find your way to the exit.",
      difficulty: "Easy to Hard",
      benefits: "Spatial awareness and route planning"
    },
    {
      id: "snake",
      engine: "snake",
      title: "Snake",
      category: "logic",
      icon: "🐍",
      description: "Collect food, grow longer and avoid collisions.",
      difficulty: "Easy to Hard",
      benefits: "Reaction time and forward planning"
    },
    {
      id: "lights-out",
      engine: "lightsOut",
      title: "Lights Out",
      category: "puzzle",
      icon: "💡",
      description: "Switch off every light using logical combinations.",
      difficulty: "Easy to Hard",
      benefits: "Problem solving and logical reasoning"
    }
  ];

  const $ = (selector, parent = document) =>
    parent.querySelector(selector);

  const $$ = (selector, parent = document) =>
    Array.from(parent.querySelectorAll(selector));

  let currentGame = null;
  let currentEngine = null;
  let currentDifficulty = "easy";
  let selectedFilter = "all";
  let sessionScore = 0;

  const modal = $("#modal");
  const modalBackdrop = $("#modalBackdrop");
  const modalTitle = $("#modalTitle");
  const stage = $("#stage");
  const difficultySelect = $("#difficulty");
  const scoreDisplay = $("#gameScore");
  const messageDisplay = $("#message");

  // ==========================================
  // GAME CARDS
  // ==========================================

  function renderGames(filter = selectedFilter) {
    const grid = $("#gameGrid");
    if (!grid) return;

    selectedFilter = filter;
    grid.innerHTML = "";

    const filteredGames = games.filter(game =>
      filter === "all" || game.category === filter
    );

    if (filteredGames.length === 0) {
      grid.innerHTML = `
        <p class="empty-games">
          No games found in this category.
        </p>
      `;
      return;
    }

    filteredGames.forEach(game => {
      const card = document.createElement("article");
      card.className = "game-card";
      card.dataset.game = game.id;
      card.dataset.category = game.category;

      card.innerHTML = `
        <div class="game-card-top">
          <span class="game-card-icon" aria-hidden="true">
            ${game.icon}
          </span>
          <span class="game-card-category">
            ${game.category}
          </span>
        </div>

        <h3>${game.title}</h3>

        <p class="game-card-description">
          ${game.description}
        </p>

        <div class="game-card-benefit">
          <span>Trains</span>
          <p>${game.benefits}</p>
        </div>

        <div class="game-card-bottom">
          <span class="game-card-level">${game.difficulty}</span>
          <button
            type="button"
            class="game-card-play"
            data-play-game="${game.id}"
          >
            Play Now <span aria-hidden="true">→</span>
          </button>
        </div>
      `;

      grid.appendChild(card);
    });
  }

  function setupFilters() {
    const filters = $$("[data-filter]");

    filters.forEach(button => {
      button.addEventListener("click", () => {
        const filter = button.dataset.filter || "all";

        filters.forEach(item => {
          const active = item === button;
          item.classList.toggle("active", active);
          item.setAttribute("aria-pressed", String(active));
        });

        renderGames(filter);
      });
    });

    const allButton = filters.find(
      button => button.dataset.filter === "all"
    );

    if (allButton) {
      allButton.classList.add("active");
      allButton.setAttribute("aria-pressed", "true");
    }
  }

  // ==========================================
  // PROGRESS
  // ==========================================

  function getProgress() {
    if (!window.MindPlayProgress) return null;

    try {
      return window.MindPlayProgress.getSummary();
    } catch (error) {
      console.error("Could not read progress:", error);
      return null;
    }
  }

  function updateProgress() {
  const progress = getProgress();

  const playedEl = $("#played");
  const totalEl = $("#total");
  const bestEl = $("#best");
  const recentEl = $("#recent");
  const heroCount = $("#heroPlayedCount");

  if (!progress) {
    if (playedEl) playedEl.textContent = "0";
    if (totalEl) totalEl.textContent = "0";
    if (bestEl) bestEl.textContent = "0";
    if (heroCount) heroCount.textContent = "0";
    return;
  }

  const played = Number(progress.played || 0);
  const totalScore = Number(progress.totalScore || 0);
  const best = Number(progress.bestScore || 0);

  if (playedEl) playedEl.textContent = String(played);
  if (totalEl) totalEl.textContent = String(totalScore);
  if (bestEl) bestEl.textContent = String(best);
  if (heroCount) heroCount.textContent = String(played);

  if (recentEl) {
    const recent = window.MindPlayProgress.getRecent(5);

    if (recent.length > 0) {
      recentEl.innerHTML = recent.map(item => {
        const matchingGame = games.find(game => game.id === item.gameId);
        const title = matchingGame ? matchingGame.title : (item.gameId || "Game played");
        const date = item.date ? new Date(item.date) : null;
        const dateLabel = date && !Number.isNaN(date.getTime())
          ? date.toLocaleDateString(undefined, { day: "numeric", month: "short" })
          : "Recently completed";
        return `<div class="recent-activity-item">
          <span class="recent-activity-game">${title}</span>
          <span class="recent-activity-meta">Score: ${Number(item.score || 0)} · ${dateLabel}</span>
        </div>`;
      }).join("");
    } else {
      recentEl.innerHTML = `<div class="empty-state">
        <div class="empty-state-icon">✦</div>
        <h4>Your journey starts here</h4>
        <p>Complete a game and your recent activity will appear here.</p>
        <a href="#games" class="text-link">Choose a game →</a>
      </div>`;
    }
  }
}

  function setupProgressListener() {
    window.addEventListener(
      "mindplay:progress-updated",
      updateProgress
    );
  }

  // ==========================================
  // GAME MODAL
  // ==========================================

  function setModalVisible(visible) {
  if (!modal) return;

  modal.classList.toggle("is-open", visible);
  modal.hidden = !visible;
  modal.setAttribute("aria-hidden", String(!visible));

  if (modalBackdrop) {
    modalBackdrop.hidden = !visible;
  }

  document.body.classList.toggle("modal-open", visible);
}

  function showGameMessage(text) {
    if (messageDisplay) {
      messageDisplay.textContent = text || "";
    }
  }

  function showScore(score) {
    sessionScore = Number(score) || 0;

    if (scoreDisplay) {
      scoreDisplay.textContent = String(sessionScore);
    }
  }

  function closeGame() {
    modal?.classList.remove("is-playing");
    if (currentEngine && typeof currentEngine.destroy === "function") {
      currentEngine.destroy();
    }

    currentEngine = null;
    currentGame = null;

    if (stage) stage.innerHTML = "";

    setModalVisible(false);
  }

  // Return from the active game to its difficulty-selection screen.
  function backToDifficulty() {
    modal?.classList.remove("is-playing");
    if (currentEngine && typeof currentEngine.destroy === "function") {
      currentEngine.destroy();
    }

    if (stage) {
      stage.dataset.started = "false";
      stage.innerHTML = `
        <div class="stage-placeholder">
          <div class="stage-placeholder-icon">✦</div>
          <p>Select your difficulty and press Start Game.</p>
        </div>
      `;
    }

    showScore(0);
    showGameMessage("Choose a difficulty, then press Start Game.");

    const startButton = $("#restart");
    if (startButton) {
      startButton.innerHTML = 'Start Game <span aria-hidden="true">↻</span>';
    }

    const gamesBackButton = $("#back");
    const difficultyBackButton = $("#backToDifficulty");
    if (gamesBackButton) gamesBackButton.hidden = false;
    if (difficultyBackButton) difficultyBackButton.hidden = true;
  }

  function openGame(gameId) {
  const game = games.find(item => item.id === gameId);

  if (!game) {
    console.error("Unknown game:", gameId);
    return;
  }

  const engine = window.MindPlayGames?.[game.engine];

  if (!engine || typeof engine.mount !== "function") {
    console.error(`Game engine is missing: ${game.engine}`);
    alert(`${game.title} could not start. Check the console.`);
    return;
  }

  if (currentEngine && typeof currentEngine.destroy === "function") {
    currentEngine.destroy();
  }

  currentGame = game;
  currentEngine = engine;
  currentDifficulty = difficultySelect?.value || "medium";

  if (!["easy", "medium", "hard"].includes(currentDifficulty)) {
    currentDifficulty = "medium";
  }

  if (modalTitle) modalTitle.textContent = game.title;

  showScore(0);
  showGameMessage("Choose a difficulty, then press Start Game.");

  if (stage) {
    stage.dataset.started = "false";
    stage.innerHTML = `
      <div class="stage-placeholder">
        <div class="stage-placeholder-icon">✦</div>
        <p>Select your difficulty and press Start Game.</p>
      </div>
    `;
  }

  const startButton = $("#restart");
  if (startButton) startButton.innerHTML =
    'Start Game <span aria-hidden="true">↻</span>';

  modal?.classList.remove("is-playing");
  const gamesBackButton = $("#back");
  const difficultyBackButton = $("#backToDifficulty");
  if (gamesBackButton) gamesBackButton.hidden = false;
  if (difficultyBackButton) difficultyBackButton.hidden = true;

  setModalVisible(true);
}

  function setupModal() {
  $("#back")?.addEventListener("click", closeGame);
  $("#backToDifficulty")?.addEventListener("click", backToDifficulty);
  modalBackdrop?.addEventListener("click", closeGame);

  $("#restart")?.addEventListener("click", () => {
    if (!currentEngine || !currentGame || !stage) return;

    currentDifficulty = difficultySelect?.value || "medium";

    if (!["easy", "medium", "hard"].includes(currentDifficulty)) {
      currentDifficulty = "medium";
    }

    showScore(0);
    showGameMessage("");

    // First click starts the selected game.
    if (stage.dataset.started !== "true") {
      try {
        currentEngine.mount(stage, {
          difficulty: currentDifficulty,

          onComplete(result) {
            if (!result) return;

               showScore(result.score);
              showGameMessage(`Game completed! Score: ${result.score}`);

            if (window.MindPlayProgress && currentGame) {
               window.MindPlayProgress.recordGame(
                currentGame.id,
                 result.score
                 );
           }

             updateProgress();
          }
        });

        stage.dataset.started = "true";
        modal?.classList.add("is-playing");

        const gamesBackButton = $("#back");
        const difficultyBackButton = $("#backToDifficulty");
        if (gamesBackButton) gamesBackButton.hidden = true;
        if (difficultyBackButton) difficultyBackButton.hidden = false;

        const startButton = $("#restart");
        if (startButton) {
          startButton.innerHTML =
            'Next Level <span aria-hidden="true">↻</span>';
        }
      } catch (error) {
        console.error("Could not start game:", error);
        showGameMessage("Game could not start. Check the console.");
      }

      return;
    }

    // After the game has started, this button restarts it.
    try {
      currentEngine.start(currentDifficulty);
    } catch (error) {
      console.error("Could not restart game:", error);
    }
  });

  // Before starting, changing difficulty only saves the selection.
  // During a game, changing it restarts the game at the new level.
  difficultySelect?.addEventListener("change", () => {
    const nextDifficulty = difficultySelect.value;

    if (!["easy", "medium", "hard"].includes(nextDifficulty)) return;

    currentDifficulty = nextDifficulty;

    if (stage?.dataset.started === "true" && currentEngine) {
      showScore(0);
      showGameMessage("");

      try {
        currentEngine.start(currentDifficulty);
      } catch (error) {
        console.error("Could not change difficulty:", error);
      }
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && currentGame) {
      closeGame();
    }
  });
}

  // ==========================================
  // GAME CLICK HANDLING
  // ==========================================

  function setupGameClicks() {
    const grid = $("#gameGrid");
    if (!grid) return;

    grid.addEventListener("click", event => {
      const button = event.target.closest("[data-play-game]");
      const card = event.target.closest("[data-game]");

      const gameId = button?.dataset.playGame ||
        card?.dataset.game;

      if (gameId) openGame(gameId);
    });
  }

  // ==========================================
  // NAVIGATION
  // ==========================================

  function setupMobileMenu() {
    const button = $("#mobileMenuButton");
    const nav = $(".main-nav") ||
      $("nav");

    if (!button || !nav) return;

    button.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("is-open");

      button.setAttribute("aria-expanded", String(isOpen));
      button.setAttribute(
        "aria-label",
        isOpen ? "Close navigation menu" : "Open navigation menu"
      );
    });

    $$("a", nav).forEach(link => {
      link.addEventListener("click", () => {
        nav.classList.remove("is-open");
        button.setAttribute("aria-expanded", "false");
      });
    });
  }

  function setupSmoothNavigation() {
    $$('a[href^="#"]').forEach(link => {
      link.addEventListener("click", event => {
        const href = link.getAttribute("href");

        if (!href || href === "#") return;

        const target = $(href);
        if (!target) return;

        event.preventDefault();

        target.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });

        // Keep the URL's section in sync with navigation.
        if (history.replaceState) {
          history.replaceState(null, "", href);
        }
      });
    });
  }

  // ==========================================
  // GENERAL BUTTONS
  // ==========================================

  function setupPlayButtons() {
    $$("[data-play-now], #playNow, #heroPlayButton").forEach(button => {
      button.addEventListener("click", () => {
        const gamesSection = $("#games");

        if (gamesSection) {
          gamesSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        } else {
          openGame(games[0].id);
        }
      });
    });
  }

  // ==========================================
  // INITIALIZE APP
  // ==========================================

  function init() {
    renderGames("all");
    setupFilters();
    setupGameClicks();
    setupModal();
    setupMobileMenu();
    setupSmoothNavigation();
    setupPlayButtons();
    setupProgressListener();
    updateProgress();

    console.log("Mind Play is ready!");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();