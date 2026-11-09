/* ============================================================
   MW.main — bootstrap + state machine for the game page.
   States: boot -> menu -> playing
   ============================================================ */
(function (global) {
  'use strict';
  var state = 'boot', bootErrorShown = false;

  function boot() {
    global.MW.progressService.init();
    global.MW.settingsService.apply();
    global.MW.hud.init();
    global.MW.touchControls.init();
    global.MW.orientation.init();
    global.MW.menu.init({ onPlay: goPlaying });
    global.MW.playerService.onChange(function () { global.MW.menu.refreshStats(); });
    global.MW.achievementService.onChange(function () { global.MW.menu.refreshStats(); });
    bindShortcuts();
    bindErrorHandling();
    waitForEngine();
  }

  function waitForEngine() {
    var tries = 0;
    (function poll() {
      tries++;
      if (global.gameStarted && global.postRunDone) { onEngineReady(); return; }
      if (tries > 300) { showBootError('The 3D engine took too long to load. Check your connection and reload.'); return; }
      setTimeout(poll, 200);
    })();
  }

  function onEngineReady() {
    if (global.MW.bridge) global.MW.bridge.markReady();
    var bootEl = document.getElementById('play_content');
    if (bootEl) bootEl.classList.add('mw-hidden');
    goMenu();
    focusCanvas();
  }

  function focusCanvas() { var c = document.getElementById('canvas'); if (c && c.focus) { try { c.focus(); } catch (e) {} } }

  function goMenu() { state = 'menu'; global.MW.menu.show(); global.MW.hud.show(false); if (global.MW.bridge) global.MW.bridge.setFocus(false); }
  function goPlaying() { state = 'playing'; global.MW.menu.hide(); global.MW.hud.show(true); if (global.MW.bridge) global.MW.bridge.setFocus(true); focusCanvas(); }

  function bindShortcuts() {
    global.addEventListener('keydown', function (e) {
      var t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
      if (state === 'playing') {
        if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
          if (!global.MW.ui.isOpen()) { e.preventDefault(); var b = document.getElementById('hud_pause'); if (b) b.click(); }
        }
      } else if (state === 'menu') {
        if (e.key === 'Escape' && global.MW.ui.isOpen()) global.MW.ui.closeModal();
      }
    });
  }

  function bindErrorHandling() {
    function fail() {
      if (state === 'boot' && !bootErrorShown && !(global.gameStarted && global.postRunDone)) {
        showBootError('Something went wrong while loading the game. Try reloading the page.');
      }
    }
    global.addEventListener('error', fail);
    global.addEventListener('unhandledrejection', fail);
  }

  function showBootError(msg) {
    if (bootErrorShown) return;
    bootErrorShown = true;
    var box = document.getElementById('mw_loading_error');
    var label = document.getElementById('mw_loading_status');
    if (label) label.textContent = 'Failed to load';
    if (box) { box.classList.add('show'); box.style.display = 'block'; }
    console.error('[MW] boot error:', msg);
  }

  global.MW = global.MW || {};
  global.MW.main = { boot: boot, goMenu: goMenu, goPlaying: goPlaying, getState: function () { return state; } };
})(window);
