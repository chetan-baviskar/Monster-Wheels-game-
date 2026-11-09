/* ============================================================
   MW.bridge — the ONLY module that talks to the WebAssembly game.
   - Engine events arrive via MW.onLevelStart/onGameplayStart/
     onGameplayStop (defined in early.js, patched into the engine's
     poki_* imports) and are forwarded to progressService + events.
   - Injects keyboard input for touch buttons by dispatching
     synthetic KeyboardEvents on window (both `keyCode` for GLFW and
     `key` for the keydown_browser bridge are set), reusing the
     engine's existing input path.
   - Pause/resume via app_pause/app_resume exports; focus + fullscreen.
   All Module.ccall calls are guarded for pre-ready / failed loads.
   ============================================================ */
(function (global) {
  'use strict';
  var ready = false;
  var listeners = { level: [], gstart: [], gstop: [], ready: [] };

  function on(evt, fn) { (listeners[evt] = listeners[evt] || []).push(fn); return function () { listeners[evt] = listeners[evt].filter(function (f) { return f !== fn; }); }; }
  function emit(evt, arg) {
    (listeners[evt] || []).forEach(function (f) { try { f(arg); } catch (e) { console.error(e); } });
    try { document.dispatchEvent(new CustomEvent('mw:' + evt, { detail: arg })); } catch (e) {}
  }

  function moduleReady() { return !!(global.Module && global.Module.ccall && global.postRunDone); }
  function ccallSafe(name, types, args) {
    if (!moduleReady()) return false;
    try { global.Module.ccall(name, 'v', types || [], args || []); return true; }
    catch (e) { console.warn('[MW.bridge] ccall ' + name + ' failed:', e); return false; }
  }

  function onLevelStart(li) { if (global.MW.progressService) global.MW.progressService._onLevelStart(li); emit('level', li); }
  function onGameplayStart() { if (global.MW.progressService) global.MW.progressService._onGameplayStart(); emit('gstart'); }
  function onGameplayStop() { if (global.MW.progressService) global.MW.progressService._onGameplayStop(); emit('gstop'); }

  var KEYMAP = {
    left: { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
    up: { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
    right: { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
    down: { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
    restart: { key: 'r', code: 'KeyR', keyCode: 82 }
  };

  function makeKeyEvent(type, map) {
    var ev;
    try { ev = new KeyboardEvent(type, { key: map.key, code: map.code, bubbles: true, cancelable: true, view: global }); }
    catch (e) { ev = document.createEvent('KeyboardEvent'); }
    try {
      Object.defineProperty(ev, 'keyCode', { get: function () { return map.keyCode; } });
      Object.defineProperty(ev, 'which', { get: function () { return map.keyCode; } });
    } catch (e2) {}
    return ev;
  }
  function injectKey(action, down) { var map = KEYMAP[action]; if (!map) return; global.dispatchEvent(makeKeyEvent(down ? 'keydown' : 'keyup', map)); }
  function restartLevel() { injectKey('restart', true); setTimeout(function () { injectKey('restart', false); }, 60); }

  function setFocus(f) { ccallSafe('set_game_focus', ['number'], [f ? 1 : 0]); }
  function pause() { ccallSafe('app_pause', ['number'], []); setFocus(false); }
  function resume() { ccallSafe('app_resume', ['number'], []); setFocus(true); }

  function isFullscreen() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
  function toggleFullscreen(el) {
    el = el || document.documentElement;
    try {
      if (!isFullscreen()) return (el.requestFullscreen && el.requestFullscreen()) || (el.webkitRequestFullscreen && el.webkitRequestFullscreen()) || Promise.resolve();
      return (document.exitFullscreen && document.exitFullscreen()) || (document.webkitExitFullscreen && document.webkitExitFullscreen()) || Promise.resolve();
    } catch (e) { return Promise.reject(e); }
  }

  function markReady() { if (ready) return; ready = true; emit('ready'); }
  function isReady() { return ready; }

  global.MW = global.MW || {};
  global.MW.bridge = {
    on: on, onLevelStart: onLevelStart, onGameplayStart: onGameplayStart, onGameplayStop: onGameplayStop,
    injectKey: injectKey, restartLevel: restartLevel, pause: pause, resume: resume, setFocus: setFocus,
    toggleFullscreen: toggleFullscreen, isFullscreen: isFullscreen, markReady: markReady, isReady: isReady, moduleReady: moduleReady
  };
})(window);
