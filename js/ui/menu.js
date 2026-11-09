/* ============================================================
   MW.menu — the Monster Wheels main-menu overlay.
   ============================================================ */
(function (global) {
  'use strict';
  var root = null, actions = {}, announceEl = null;
  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
  function esc(s) { return global.MW.validate.escapeHtml(s); }

  var TILES = [
    { id: 'play', cls: 'mw-tile--play', ico: '▶', label: 'Play', desc: 'Start driving' },
    { id: 'levels', ico: '🗺️', label: 'Levels', desc: 'Choose a track' },
    { id: 'garage', ico: '🚚', label: 'Garage', desc: 'Your monster truck' },
    { id: 'achievements', ico: '🏆', label: 'Achievements', desc: 'Milestones' },
    { id: 'leaderboard', ico: '📊', label: 'Leaderboard', desc: 'Local rankings' },
    { id: 'profile', ico: '👤', label: 'Profile', desc: 'Name & stats' },
    { id: 'howto', ico: '🎮', label: 'How to Play', desc: 'Controls & tips' },
    { id: 'settings', ico: '⚙️', label: 'Settings', desc: 'Audio & graphics' }
  ];

  function ensure() {
    if (root && document.body.contains(root)) return root;
    root = el('div'); root.id = 'mw_menu';

    var bar = el('div', 'mw-menu__bar');
    var brand = el('div', 'mw-brand');
    brand.innerHTML = '<img class="mw-brand__logo" src="favicon.svg" alt="" /><div><div class="mw-brand__name">Monster Wheels</div><div class="mw-brand__tag">The Ultimate Monster Truck Adventure</div></div>';
    var actionsBar = el('div', 'mw-menu__actions');
    var adminBtn = el('button', 'mw-btn mw-btn--sm mw-btn--ghost', '🛠️ Admin');
    adminBtn.type = 'button';
    adminBtn.title = 'Open the local Admin panel (development only)';
    adminBtn.addEventListener('click', function () { global.location.href = 'admin.html'; });
    actionsBar.appendChild(adminBtn);
    bar.appendChild(brand); bar.appendChild(actionsBar);

    var body = el('div', 'mw-menu__body');
    var grid = el('div', 'mw-menu__grid');
    grid.setAttribute('role', 'menu');
    TILES.forEach(function (t) {
      var tile = el('button', 'mw-tile ' + (t.cls || ''));
      tile.type = 'button'; tile.setAttribute('role', 'menuitem');
      tile.innerHTML = '<span class="mw-tile__ico" aria-hidden="true">' + t.ico + '</span><span class="mw-tile__label">' + t.label + '</span><span class="mw-tile__desc">' + t.desc + '</span>';
      tile.addEventListener('click', function () { activate(t.id); });
      grid.appendChild(tile);
    });
    body.appendChild(grid);

    var foot = el('div', 'mw-menu__foot');
    foot.innerHTML = '<span class="mw-chip">👤 <b id="mw_menu_name">Guest Driver</b></span>' +
      '<span class="mw-chip">🏁 <b id="mw_menu_races">0</b> races · <b id="mw_menu_ach">0</b> achievements</span>' +
      '<span>Drive Wild. Crush Obstacles. Conquer Every Track.</span>';

    root.appendChild(bar); root.appendChild(body); root.appendChild(foot);
    document.body.appendChild(root);

    announceEl = el('div'); announceEl.id = 'mw_announce';
    document.body.appendChild(announceEl);
    return root;
  }

  function activate(id) {
    if (global.MW.audio) global.MW.audio.click(560);
    if (id === 'play') { if (actions.onPlay) actions.onPlay(); return; }
    var panels = global.MW.panels;
    if (id === 'levels') panels.openLevels(function () { global.MW.ui.closeModal(); if (actions.onPlay) actions.onPlay(); });
    else if (id === 'garage') panels.openGarage();
    else if (id === 'achievements') panels.openAchievements();
    else if (id === 'leaderboard') panels.openLeaderboard();
    else if (id === 'profile') panels.openProfile();
    else if (id === 'howto') panels.openHowTo();
    else if (id === 'settings') panels.openSettings();
  }

  function refreshStats() {
    ensure();
    root.querySelector('#mw_menu_name').textContent = global.MW.playerService.get().displayName;
    root.querySelector('#mw_menu_races').textContent = global.MW.progressService.get().racesCompleted || 0;
    root.querySelector('#mw_menu_ach').textContent = global.MW.achievementService.unlockedCount();
  }

  function renderBanner() {
    ensure();
    var admin = global.MW.adminService;
    if (admin.maintenanceEnabled()) { showAnnounce('🛠️', 'Demo maintenance notice (local)', admin.maintenanceMessage() || 'This local demo is being updated. Your progress is saved on this device.'); return; }
    var an = admin.getActiveAnnouncement();
    if (an) { showAnnounce(an.priority === 'high' ? '📣' : an.priority === 'medium' ? 'ℹ️' : '💬', an.title, an.description); }
    else hideAnnounce();
  }
  function showAnnounce(ico, title, desc) {
    announceEl.innerHTML = '<span class="mw-ann__ico">' + ico + '</span><div class="mw-ann__body"><div class="mw-ann__title">' + esc(title) + '</div><div class="mw-ann__desc">' + esc(desc) + '</div></div><button class="mw-ann__close" aria-label="Dismiss announcement">×</button>';
    announceEl.querySelector('.mw-ann__close').addEventListener('click', hideAnnounce);
    announceEl.classList.add('show');
  }
  function hideAnnounce() { announceEl.classList.remove('show'); }

  function show() { ensure(); refreshStats(); renderBanner(); root.classList.remove('mw-hidden'); }
  function hide() { ensure(); root.classList.add('mw-hidden'); hideAnnounce(); }
  function isVisible() { return root && !root.classList.contains('mw-hidden'); }
  function init(a) { actions = a || {}; ensure(); refreshStats(); renderBanner(); }

  global.MW = global.MW || {};
  global.MW.menu = { init: init, show: show, hide: hide, isVisible: isVisible, refreshStats: refreshStats, renderBanner: renderBanner };
})(window);
