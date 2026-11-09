/* ============================================================
   MW early bootstrap — MUST load before the WebAssembly engine.
   (index.html includes this in <head>, before the deckard scripts.)

   Provides:
   - The `window.MW` namespace root.
   - `MW.dprCap` — max devicePixelRatio, driven by graphics quality.
   - Safe stubs for engine-imported JS functions that the original
     build referenced but never defined (they would otherwise throw
     ReferenceErrors at runtime):
       getUrlLevelIndex, downloadFileInBrowser, showShareFileModal,
       showStoreLinkModal, firebaseSignout, setDeepLinkLoadingFraction,
       dailyRewardPossible
     These are inert local stubs — no backend, no Firebase.
   - `MW.onLevelStart / onGameplayStart / onGameplayStop` — the three
     global hooks the engine's poki_* imports call. They forward to
     MW.bridge (loaded later) so real engine events drive local
     progress + achievements.
   ============================================================ */
(function (global) {
  'use strict';

  global.MW = global.MW || {};
  global.MW.dprCap = 2;

  /* ---- Engine-imported function stubs (inert, local only) ---- */
  // Level index from the URL (?level=N). 0 = engine default.
  global.getUrlLevelIndex = function () {
    try {
      var m = /[?&]level=(\d+)/.exec(global.location.search);
      return m ? Math.max(0, parseInt(m[1], 10) || 0) : 0;
    } catch (e) { return 0; }
  };

  // Daily-reward flow is not used in this local build.
  global.dailyRewardPossible = false;
  global.is_daily_reward_possible = function () { return false; };

  global.downloadFileInBrowser = function () { /* no-op */ };
  global.showShareFileModal = function () { /* no-op */ };
  global.showStoreLinkModal = function () { /* no-op */ };
  global.setDeepLinkLoadingFraction = function () { /* no-op */ };
  // Named after an engine import; there is no Firebase in this phase.
  global.firebaseSignout = function () { /* no-op */ };

  /* ---- Engine gameplay-event hooks -> bridge ---- */
  global.MW.onLevelStart = function (li) {
    if (global.MW.bridge) global.MW.bridge.onLevelStart(li);
  };
  global.MW.onGameplayStart = function () {
    if (global.MW.bridge) global.MW.bridge.onGameplayStart();
  };
  global.MW.onGameplayStop = function () {
    if (global.MW.bridge) global.MW.bridge.onGameplayStop();
  };
})(window);
