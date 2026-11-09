/* ============================================================
   MW.touchControls — on-screen driving controls for phones/tablets.
   Buttons map to the engine's arrow-key input by injecting synthetic
   KeyboardEvents via MW.bridge (no separate physics). Multi-touch,
   hold, pressed-state feedback, and guaranteed release on
   pointerup / pointercancel / lost capture / window blur.
   ============================================================ */
(function (global) {
  'use strict';
  var root = null, visible = false;
  var pressed = {}; // action -> { el, count }

  var BUTTONS = [
    { action: 'left', cluster: 'left', label: 'Left', ico: '◀', cls: '' },
    { action: 'right', cluster: 'left', label: 'Right', ico: '▶', cls: '' },
    { action: 'up', cluster: 'right', label: 'Gas', ico: '▲', cls: 'mw-tbtn--gas' },
    { action: 'down', cluster: 'right', label: 'Brake', ico: '▼', cls: 'mw-tbtn--brake' }
  ];

  function ensure() {
    if (root && document.body.contains(root)) return root;
    root = document.createElement('div');
    root.id = 'mw_touch';
    var left = document.createElement('div'); left.className = 'mw-touch__cluster mw-touch__cluster--left';
    var right = document.createElement('div'); right.className = 'mw-touch__cluster mw-touch__cluster--right';
    BUTTONS.forEach(function (b) {
      var btn = document.createElement('button');
      btn.className = 'mw-tbtn ' + (b.cls || '');
      btn.type = 'button';
      btn.setAttribute('aria-label', b.label);
      btn.setAttribute('aria-pressed', 'false');
      btn.innerHTML = '<span aria-hidden="true">' + b.ico + '</span><small>' + b.label + '</small>';
      bindButton(btn, b.action);
      (b.cluster === 'left' ? left : right).appendChild(btn);
      pressed[b.action] = { el: btn, count: 0 };
    });
    root.appendChild(left); root.appendChild(right);
    document.body.appendChild(root);
    return root;
  }

  function setPressed(action, on) { var p = pressed[action]; if (!p) return; p.el.classList.toggle('is-pressed', on); p.el.setAttribute('aria-pressed', on ? 'true' : 'false'); }

  function press(action) {
    var p = pressed[action]; if (!p) return;
    if (p.count === 0) { global.MW.bridge.injectKey(action, true); if (global.MW.audio) global.MW.audio.click(440); }
    p.count++; setPressed(action, true);
  }
  function release(action) {
    var p = pressed[action]; if (!p) return;
    if (p.count > 0) p.count--;
    if (p.count === 0) { global.MW.bridge.injectKey(action, false); setPressed(action, false); }
  }
  function releaseAll() {
    Object.keys(pressed).forEach(function (action) {
      var p = pressed[action];
      if (p.count !== 0) { p.count = 0; global.MW.bridge.injectKey(action, false); setPressed(action, false); }
    });
  }

  function bindButton(btn, action) {
    btn.addEventListener('pointerdown', function (e) { e.preventDefault(); try { btn.setPointerCapture(e.pointerId); } catch (err) {} press(action); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (evt) { btn.addEventListener(evt, function (e) { e.preventDefault(); release(action); }); });
    btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    btn.addEventListener('keydown', function (e) { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); press(action); } });
    btn.addEventListener('keyup', function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); release(action); } });
    btn.addEventListener('blur', function () { release(action); });
  }

  function bindGlobal() {
    global.addEventListener('blur', releaseAll);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') releaseAll(); });
    global.addEventListener('pagehide', releaseAll);
  }

  function shouldUseTouch() {
    var s = global.MW.settingsService ? global.MW.settingsService.get() : {};
    var coarse = global.matchMedia('(pointer: coarse)').matches;
    if (s.showTouch === 'on') return true;
    if (s.showTouch === 'off') return false;
    if (s.controlScheme === 'keys') return false;
    if (s.controlScheme === 'touch') return true;
    return coarse;
  }

  function refresh(showGame) {
    ensure();
    var show = showGame && shouldUseTouch();
    visible = show;
    root.classList.toggle('show', show);
    if (!show) releaseAll();
    root.setAttribute('aria-hidden', show ? 'false' : 'true');
  }
  function init() { ensure(); bindGlobal(); }

  global.MW = global.MW || {};
  global.MW.touchControls = { init: init, refresh: refresh, releaseAll: releaseAll, isVisible: function () { return visible; } };
})(window);
