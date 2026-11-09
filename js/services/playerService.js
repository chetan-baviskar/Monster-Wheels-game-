/* ============================================================
   MW.playerService — local, frontend-only profile. NOT auth.
   FUTURE BACKEND: wrapper over Firebase Auth + players/{uid} doc.
   ============================================================ */
(function (global) {
  'use strict';
  var KEY = 'player';
  var V = global.MW.validate;
  var listeners = [];

  function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }
  function uid() { return 'local-' + Math.random().toString(36).slice(2, 10); }

  function defaultPlayer() { return { id: uid(), displayName: 'Guest Driver', isGuest: true, createdAt: Date.now() }; }

  function sanitize(raw) {
    if (!isObj(raw) || typeof raw.id !== 'string' || typeof raw.displayName !== 'string') return defaultPlayer();
    var p = {
      id: raw.id, displayName: raw.displayName.slice(0, 20),
      isGuest: raw.isGuest !== false, createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now()
    };
    if (V.isBlank(p.displayName)) p.displayName = 'Guest Driver';
    return p;
  }

  var current = sanitize(global.MW.storage.get(KEY, null));
  function persist() { global.MW.storage.set(KEY, current); }
  function get() { return Object.assign({}, current); }

  function setDisplayName(name) {
    var err = V.displayName(name);
    if (err) return { ok: false, error: err };
    current.displayName = String(name).trim();
    current.isGuest = current.displayName === 'Guest Driver';
    persist(); emit();
    return { ok: true, player: get() };
  }

  function summary() {
    var prog = global.MW.progressService ? global.MW.progressService.get() : {};
    return {
      id: current.id, displayName: current.displayName, isGuest: current.isGuest,
      racesStarted: prog.racesStarted || 0, racesCompleted: prog.racesCompleted || 0,
      levelsPlayed: (prog.levelsPlayed || []).length, playTimeMs: prog.playTimeMs || 0,
      achievementsUnlocked: global.MW.achievementService ? global.MW.achievementService.unlockedCount() : 0
    };
  }

  function resetProfile() { current = defaultPlayer(); persist(); emit(); }
  function onChange(fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; }
  function emit() { listeners.forEach(function (f) { try { f(get()); } catch (e) { console.error(e); } }); }

  global.MW = global.MW || {};
  global.MW.playerService = { get: get, setDisplayName: setDisplayName, summary: summary, resetProfile: resetProfile, onChange: onChange };
})(window);
