/* ============================================================
   MW.progressService — records REAL engine events via MW.bridge:
   level start (race begins), gameplay start/stop (driving session).
   Play time accumulates only while a level is active + tab visible.
   Saved at checkpoints (never per frame).
   FUTURE BACKEND: mirror this snapshot to Firestore per player.
   ============================================================ */
(function (global) {
  'use strict';
  var KEY = 'progress';
  var listeners = [];

  function DEFAULTS() { return { racesStarted: 0, racesCompleted: 0, levelsPlayed: [], playTimeMs: 0, customized: false, lastPlayedAt: null }; }
  function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }

  function sanitize(raw) {
    var out = DEFAULTS();
    if (!isObj(raw)) return out;
    if (Number.isFinite(raw.racesStarted)) out.racesStarted = Math.max(0, Math.floor(raw.racesStarted));
    if (Number.isFinite(raw.racesCompleted)) out.racesCompleted = Math.max(0, Math.floor(raw.racesCompleted));
    if (Array.isArray(raw.levelsPlayed)) out.levelsPlayed = raw.levelsPlayed.filter(Number.isFinite);
    if (Number.isFinite(raw.playTimeMs)) out.playTimeMs = Math.max(0, Math.floor(raw.playTimeMs));
    if (typeof raw.customized === 'boolean') out.customized = raw.customized;
    if (Number.isFinite(raw.lastPlayedAt)) out.lastPlayedAt = raw.lastPlayedAt;
    if (out.racesCompleted > out.racesStarted) out.racesCompleted = out.racesStarted;
    return out;
  }

  var state = sanitize(global.MW.storage.get(KEY, null));
  var inLevel = false, inGameplay = false, currentLevel = null;
  var saveTimer = null, playTimer = null, sinceSave = 0;

  function get() { return Object.assign({}, state, { levelsPlayed: state.levelsPlayed.slice() }); }
  function save() { state.lastPlayedAt = Date.now(); global.MW.storage.set(KEY, state); emit(); }
  function saveSoon() { if (saveTimer) return; saveTimer = setTimeout(function () { saveTimer = null; save(); }, 600); }
  function emit() { listeners.forEach(function (f) { try { f(get()); } catch (e) { console.error(e); } }); }
  function onChange(fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; }

  function onLevelStart(levelIndex) {
    currentLevel = Number.isFinite(levelIndex) ? levelIndex : currentLevel;
    state.racesStarted += 1;
    if (currentLevel != null && state.levelsPlayed.indexOf(currentLevel) === -1) state.levelsPlayed.push(currentLevel);
    inLevel = true; inGameplay = false;
    evaluateAchievements(); saveSoon();
  }
  function onGameplayStart() { inGameplay = true; }
  function onGameplayStop() {
    if (inLevel && inGameplay) { state.racesCompleted += 1; inLevel = false; inGameplay = false; evaluateAchievements(); save(); }
    else { inLevel = false; inGameplay = false; }
  }
  function markCustomized() { if (!state.customized) { state.customized = true; evaluateAchievements(); saveSoon(); } }

  function evaluateAchievements() {
    if (!global.MW.achievementService) return;
    var news = global.MW.achievementService.evaluate(get());
    news.forEach(function (d) {
      if (global.MW.ui) global.MW.ui.toast({ type: 'success', title: 'Achievement unlocked!', msg: d.icon + ' ' + d.title, timeout: 5200 });
    });
  }

  function startPlayTimer() {
    if (playTimer) return;
    playTimer = setInterval(function () {
      if (!inLevel || document.visibilityState !== 'visible') return;
      state.playTimeMs += 1000; sinceSave += 1000;
      if (sinceSave >= 20000) { sinceSave = 0; saveSoon(); }
    }, 1000);
  }
  function stopPlayTimer() { if (playTimer) { clearInterval(playTimer); playTimer = null; } }

  function init() {
    startPlayTimer();
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') { stopPlayTimer(); if (inLevel || state.playTimeMs) save(); } else startPlayTimer();
    });
    global.addEventListener('pagehide', save);
    global.addEventListener('beforeunload', save);
  }

  function reset() { state = DEFAULTS(); inLevel = inGameplay = false; currentLevel = null; global.MW.storage.set(KEY, state); emit(); }

  global.MW = global.MW || {};
  global.MW.progressService = {
    init: init, get: get, reset: reset, onChange: onChange, isInLevel: function () { return inLevel; },
    _onLevelStart: onLevelStart, _onGameplayStart: onGameplayStart, _onGameplayStop: onGameplayStop, _markCustomized: markCustomized
  };
})(window);
