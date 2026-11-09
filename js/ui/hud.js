/* ============================================================
   MW.hud — in-game overlay shown while driving.
   ============================================================ */
(function (global) {
  'use strict';
  var root = null, statChip = null, playing = false;
  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }

  function ensure() {
    if (root && document.body.contains(root)) return root;
    root = el('div'); root.id = 'mw_hud';
    var top = el('div', 'mw-hud__top');
    statChip = el('div', 'mw-hud__stat');
    statChip.innerHTML = '🏁 <b id="hud_races">0</b> · ✅ <b id="hud_done">0</b>';
    var btns = el('div', 'mw-hud__btns');
    btns.appendChild(mkBtn('hud_pause', '⏸', 'Pause', openPause));
    btns.appendChild(mkBtn('hud_restart', '↻', 'Restart level', function () { global.MW.bridge.restartLevel(); if (global.MW.audio) global.MW.audio.click(360); global.MW.ui.toast({ type: 'info', title: 'Restarting level…' }); }));
    btns.appendChild(mkBtn('hud_full', '⛶', 'Toggle fullscreen', function () { global.MW.bridge.toggleFullscreen(document.documentElement); }));
    top.appendChild(statChip); top.appendChild(btns);
    root.appendChild(top);
    document.body.appendChild(root);
    return root;
  }

  function mkBtn(id, ico, label, onClick) {
    var b = el('button', 'mw-hud__btn', ico);
    b.id = id; b.type = 'button'; b.setAttribute('aria-label', label); b.title = label;
    b.addEventListener('click', function () { if (global.MW.audio) global.MW.audio.click(500); onClick(); });
    return b;
  }

  function refreshStats() {
    ensure();
    var prog = global.MW.progressService.get();
    root.querySelector('#hud_races').textContent = prog.racesStarted || 0;
    root.querySelector('#hud_done').textContent = prog.racesCompleted || 0;
  }

  function openPause() {
    global.MW.bridge.pause();
    global.MW.touchControls.releaseAll();
    var body = el('div');
    body.appendChild(el('div', 'mw-note', 'Game paused. Your progress is saved locally on this device.'));
    var stack = el('div'); stack.style.display = 'grid'; stack.style.gap = '10px'; stack.style.marginTop = '14px';
    stack.appendChild(bigBtn('▶ Resume', 'mw-btn--primary', function () { global.MW.ui.closeModal(); resume(); }));
    stack.appendChild(bigBtn('↻ Restart Level', '', function () { global.MW.ui.closeModal(); global.MW.bridge.restartLevel(); resume(); }));
    stack.appendChild(bigBtn('⚙ Settings', '', function () { global.MW.panels.openSettings(); }));
    stack.appendChild(bigBtn('🎮 How to Play', '', function () { global.MW.panels.openHowTo(); }));
    stack.appendChild(bigBtn('🏠 Main Menu', 'mw-btn--danger', function () { global.MW.ui.closeModal(); if (global.MW.main) global.MW.main.goMenu(); }));
    body.appendChild(stack);
    global.MW.ui.openModal({ title: 'Paused', body: body });
  }

  function bigBtn(label, cls, onClick) { var b = el('button', 'mw-btn mw-btn--block ' + (cls || ''), label); b.type = 'button'; b.addEventListener('click', onClick); return b; }

  function resume() {
    global.MW.bridge.resume();
    var c = document.getElementById('canvas');
    if (c && c.focus) { try { c.focus(); } catch (e) {} }
  }

  function show(v) { playing = !!v; ensure(); refreshStats(); root.classList.toggle('show', playing); refreshControls(); }

  function refreshControls() {
    ensure();
    var s = global.MW.settingsService.get();
    statChip.style.display = s.showStatsHud ? '' : 'none';
    if (playing) refreshStats();
    global.MW.touchControls.refresh(playing);
    global.MW.orientation.setActive(playing);
  }

  function init() { ensure(); global.MW.progressService.onChange(refreshStats); global.MW.settingsService.onChange(refreshControls); }

  global.MW = global.MW || {};
  global.MW.hud = { init: init, show: show, refreshControls: refreshControls, refreshStats: refreshStats, resume: resume, isPlaying: function () { return playing; } };
})(window);
