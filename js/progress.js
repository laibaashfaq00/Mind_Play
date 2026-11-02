/* =========================================
   MIND PLAY — PROGRESS MANAGER
   File: js/progress.js
   ========================================= */

(function () {
  "use strict";

  const STORAGE_KEY = "mindplay_progress_v1";

  const defaultData = {
    played: 0,
    totalScore: 0,
    bestScore: 0,
    games: {},
    recent: []
  };

  function readData() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (!saved) {
        return structuredClone(defaultData);
      }

      const parsed = JSON.parse(saved);

      return {
        ...defaultData,
        ...parsed,
        games: parsed.games || {},
        recent: Array.isArray(parsed.recent)
          ? parsed.recent
          : []
      };
    } catch (error) {
      console.warn("Could not load Mind Play progress.", error);
      return JSON.parse(JSON.stringify(defaultData));
    }
  }

  let data = readData();

  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (error) {
      console.warn("Could not save Mind Play progress.", error);
      return false;
    }
  }

  function cleanNumber(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return 0;
    }

    return Math.max(0, Math.round(number));
  }

  function getGameData(gameId) {
    if (!data.games[gameId]) {
      data.games[gameId] = {
        plays: 0,
        bestScore: 0,
        lastScore: 0,
        lastPlayed: null
      };
    }

    return data.games[gameId];
  }

  function recordGame(gameId, score) {
    if (!gameId || typeof gameId !== "string") {
      console.warn("A valid game ID is required.");
      return null;
    }

    const finalScore = cleanNumber(score);
    const game = getGameData(gameId);
    const now = new Date().toISOString();

    game.plays += 1;
    game.lastScore = finalScore;
    game.bestScore = Math.max(
      game.bestScore,
      finalScore
    );
    game.lastPlayed = now;

    data.played += 1;
    data.totalScore += finalScore;
    data.bestScore = Math.max(
      data.bestScore,
      finalScore
    );

    data.recent.unshift({
      gameId: gameId,
      score: finalScore,
      date: now
    });

    data.recent = data.recent.slice(0, 10);

    saveData();

    window.dispatchEvent(
      new CustomEvent("mindplay:progress-updated", {
        detail: getSummary()
      })
    );

    return { ...game };
  }

  function getSummary() {
    const games = Object.values(data.games);

    return {
      played: data.played,
      totalScore: data.totalScore,
      bestScore: data.bestScore,
      uniqueGames: games.filter(
        (game) => game.plays > 0
      ).length,
      games: JSON.parse(JSON.stringify(data.games)),
      recent: JSON.parse(JSON.stringify(data.recent))
    };
  }

  function getGame(gameId) {
    const game = data.games[gameId];

    if (!game) {
      return {
        plays: 0,
        bestScore: 0,
        lastScore: 0,
        lastPlayed: null
      };
    }

    return { ...game };
  }

  function getRecent(limit = 5) {
    const count = Math.max(0, cleanNumber(limit));

    return data.recent
      .slice(0, count)
      .map((item) => ({ ...item }));
  }

  function getAverageScore() {
    if (data.played === 0) {
      return 0;
    }

    return Math.round(data.totalScore / data.played);
  }

  function resetProgress() {
    data = JSON.parse(JSON.stringify(defaultData));
    saveData();

    window.dispatchEvent(
      new CustomEvent("mindplay:progress-updated", {
        detail: getSummary()
      })
    );
  }

  window.MindPlayProgress = {
    recordGame,
    getSummary,
    getGame: getGame,
    getRecent,
    getAverageScore,
    resetProgress
  };

  console.log("Mind Play progress manager is ready!");
})();