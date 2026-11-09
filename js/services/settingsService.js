/* ============================================================
   MW.settingsService — local game settings + admin-driven banners.
   FUTURE BACKEND: swap MW.storage.get/set for Firestore; apply()
   is the engine-integration boundary.
   ============================================================ */
(function (global) {
  'use strict';
  var KEY = 'settings';
  var V = global.MW.validate;
  var listeners = [];

  var DEFAULTS = {
    graphics: 'high', sfx: true, music: false, volume: 60,
    controlScheme: 'auto', showTouch: 'auto', reduceMotion: 'auto', showStatsHud: true
  };

  function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }

  function sanitize(raw) {
    var out = Object.assign({}, DEFAULTS);
    if (!isObj(raw)) return out;
    if (['low', 'medium', 'high'].indexOf(raw.graphics) !== -1) out.graphics = raw.graphics;
    if (typeof raw.sfx === 'boolean') out.sfx = raw.sfx;
    if (typeof raw.music === 'boolean') out.music = raw.music;
    var vol = Number(raw.volume);
    if (isFinite(vol)) out.volume = Math.max(0, Math.min(100, Math.round(vol)));
    if (['auto', 'touch', 'keys'].indexOf(raw.controlScheme) !== -1) out.controlScheme = raw.controlScheme;
    if (['auto', 'on', 'off'].indexOf(raw.showTouch) !== -1) out.showTouch = raw.showTouch;
    if (['auto', 'on'].indexOf(raw.reduceMotion) !== -1) out.reduceMotion = raw.reduceMotion;
    if (typeof raw.showStatsHud === 'boolean') out.showStatsHud = raw.showStatsHud;
    return out;
  }

  var current = sanitize(global.MW.storage.get(KEY, null));
  function get() { return Object.assign({}, current); }

  function set(patch) {
    if (!isObj(patch)) return current;
    current = sanitize(Object.assign({}, current, patch));
    global.MW.storage.set(KEY, current);
    apply(); emit();
    return current;
  }
  function reset() { current = Object.assign({}, DEFAULTS); global.MW.storage.set(KEY, current); apply(); emit(); }

  function onChange(fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; }
  function emit() { listeners.forEach(function (f) { try { f(get()); } catch (e) { console.error(e); } }); }

  function apply() {
    var g = get();
    // Graphics quality -> effective DPR cap read by the patched resizeCanvas.
    global.MW.dprCap = g.graphics === 'low' ? 1 : g.graphics === 'medium' ? 1.5 : 2;
    if (global.MW.audio) {
      global.MW.audio.setEnabled(g.sfx);
      global.MW.audio.setVolume(g.volume / 100);
      global.MW.audio.setMusic(g.music);
    }
    document.body.classList.toggle('mw-reduce-motion', g.reduceMotion === 'on');
    if (global.MW.hud && global.MW.hud.refreshControls) global.MW.hud.refreshControls();
  }

  function setGraphics(v) { if (['low', 'medium', 'high'].indexOf(v) !== -1) return set({ graphics: v }); return current; }
  function setVolume(v) { if (V.numRange(v, 0, 100)) return current; return set({ volume: Number(v) }); }

  global.MW = global.MW || {};
  global.MW.settingsService = { DEFAULTS: DEFAULTS, get: get, set: set, setGraphics: setGraphics, setVolume: setVolume, reset: reset, onChange: onChange, apply: apply };
})(window);
