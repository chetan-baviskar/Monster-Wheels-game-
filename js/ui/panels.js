/* ============================================================
   MW.panels — player-facing modal panels: Profile, Settings,
   How to Play, Achievements, Leaderboard, Levels, Garage.
   ============================================================ */
(function (global) {
  'use strict';
  var esc = function (s) { return global.MW.validate.escapeHtml(s); };
  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }

  function openProfile() {
    var body = el('div');
    var ps = global.MW.playerService, p = ps.get(), sum = ps.summary();
    body.appendChild(el('div', 'mw-note', 'This is a <b>local profile</b> stored only in this browser. It is not an online account, has no password, and does not sync between devices.'));
    var field = el('div', 'mw-field');
    field.style.marginTop = '14px';
    field.innerHTML = '<label for="pf_name">Display name</label><input id="pf_name" class="mw-input" maxlength="20" autocomplete="off" /><div class="mw-field__hint">3–20 characters. Letters, numbers, spaces, _ - .</div><div class="mw-field__err" id="pf_err"></div>';
    body.appendChild(field);
    var input = field.querySelector('#pf_name'), errEl = field.querySelector('#pf_err');
    input.value = p.displayName;

    var stats = el('div', 'mw-stats'); stats.style.marginTop = '6px';
    function stat(n, l) { return '<div class="mw-stat"><div class="mw-stat__num">' + n + '</div><div class="mw-stat__lbl">' + l + '</div></div>'; }
    stats.innerHTML = stat(sum.racesStarted, 'Races') + stat(sum.racesCompleted, 'Completed') + stat(sum.levelsPlayed, 'Levels') +
      stat(sum.achievementsUnlocked + '/' + global.MW.achievementService.total(), 'Achievements') +
      '<div class="mw-stat"><div class="mw-stat__num">' + global.MW.leaderboardService.fmtTime(sum.playTimeMs) + '</div><div class="mw-stat__lbl">Play time</div></div>';
    body.appendChild(stats);
    body.appendChild(el('p', 'mw-field__hint', 'Local rank on this device: <b>#' + global.MW.leaderboardService.myRank() + '</b>'));

    global.MW.ui.openModal({
      title: 'Player Profile', body: body,
      buttons: [
        { label: 'Reset Profile', cls: 'mw-btn--ghost', onClick: function () {
            global.MW.ui.confirm({ title: 'Reset profile?', msg: 'This clears your display name and resets it to Guest Driver. Progress is kept.', confirmLabel: 'Reset', danger: true })
              .then(function (ok) { if (ok) { ps.resetProfile(); global.MW.ui.toast({ type: 'info', title: 'Profile reset' }); openProfile(); } });
            return false;
          } },
        { label: 'Save Name', cls: 'mw-btn--primary', onClick: function () {
            var res = ps.setDisplayName(input.value);
            if (!res.ok) { errEl.textContent = res.error; return false; }
            errEl.textContent = '';
            if (global.MW.audio) global.MW.audio.success();
            global.MW.ui.toast({ type: 'success', title: 'Name saved', msg: 'You are now ' + res.player.displayName });
            return true;
          } }
      ]
    });
    input.addEventListener('input', function () { errEl.textContent = ''; });
  }

  function openSettings() {
    var ss = global.MW.settingsService, s = ss.get(), body = el('div');
    function field(label, inner, hint) { var f = el('div', 'mw-field'); f.innerHTML = '<label>' + label + '</label>' + inner + (hint ? '<div class="mw-field__hint">' + hint + '</div>' : ''); body.appendChild(f); return f; }
    function switchInput(id, on) { return '<label class="mw-switch"><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + '><span class="mw-switch__track"></span><span></span></label>'; }

    field('Graphics quality', '<select id="st_gfx" class="mw-select"><option value="low">Low (best performance)</option><option value="medium">Medium</option><option value="high">High</option></select>', 'Lower quality renders at a smaller resolution for smoother frame rates on mobile.');
    field('Sound effects', switchInput('st_sfx', s.sfx), 'Controls in-app UI feedback sounds.');
    field('Music', switchInput('st_music', s.music), 'Optional ambient pad (UI layer). The 3D game has its own audio.');
    field('Volume', '<input type="range" id="st_vol" min="0" max="100" value="' + s.volume + '" />', 'Volume for the UI audio layer.');
    field('Control scheme', '<select id="st_ctrl" class="mw-select"><option value="auto">Auto-detect</option><option value="touch">Always show touch controls</option><option value="keys">Keyboard only</option></select>');
    field('On-screen controls', '<select id="st_touch" class="mw-select"><option value="auto">Auto</option><option value="on">Always on</option><option value="off">Always off</option></select>');
    field('Reduce motion', switchInput('st_motion', s.reduceMotion === 'on'), 'Minimize UI animations.');
    field('Show in-game stats', switchInput('st_hud', s.showStatsHud), 'Display the races/completed chip while driving.');
    body.appendChild(el('div', 'mw-note', 'Keyboard controls: <b>↑</b> accelerate · <b>↓</b> brake/reverse · <b>← →</b> rotate · <b>R</b> restart level. Graphics changes apply on the next canvas resize.'));

    global.MW.ui.openModal({ title: 'Settings', body: body, buttons: [{ label: 'Done', cls: 'mw-btn--primary' }] });

    var gfx = body.querySelector('#st_gfx'); gfx.value = s.graphics;
    var ctrl = body.querySelector('#st_ctrl'); ctrl.value = s.controlScheme;
    var touch = body.querySelector('#st_touch'); touch.value = s.showTouch;

    function changed(patch) { ss.set(patch); global.MW.progressService._markCustomized(); if (global.MW.audio) global.MW.audio.click(600); }
    gfx.addEventListener('change', function () { changed({ graphics: gfx.value }); global.MW.ui.toast({ type: 'info', title: 'Graphics: ' + gfx.value }); });
    ctrl.addEventListener('change', function () { changed({ controlScheme: ctrl.value }); global.MW.hud.refreshControls(); });
    touch.addEventListener('change', function () { changed({ showTouch: touch.value }); global.MW.hud.refreshControls(); });
    body.querySelector('#st_sfx').addEventListener('change', function (e) { changed({ sfx: e.target.checked }); });
    body.querySelector('#st_music').addEventListener('change', function (e) { changed({ music: e.target.checked }); });
    body.querySelector('#st_vol').addEventListener('input', function (e) { ss.setVolume(Number(e.target.value)); global.MW.progressService._markCustomized(); });
    body.querySelector('#st_motion').addEventListener('change', function (e) { changed({ reduceMotion: e.target.checked ? 'on' : 'auto' }); });
    body.querySelector('#st_hud').addEventListener('change', function (e) { changed({ showStatsHud: e.target.checked }); global.MW.hud.refreshControls(); });
  }

  function openHowTo() {
    var body = el('div');
    body.appendChild(el('div', 'mw-keys', '<div class="mw-key"><b>↑ / Gas</b>Accelerate forward</div><div class="mw-key"><b>↓ / Brake</b>Brake and reverse</div><div class="mw-key"><b>← →</b>Rotate / steer the truck</div><div class="mw-key"><b>R</b>Restart the current level</div>'));
    body.appendChild(el('p', null, 'Reach the goal at the end of each track while crushing obstacles along the way. On phones and tablets, on-screen buttons appear automatically — hold Gas while steering to pull off jumps and flips.'));
    body.appendChild(el('div', 'mw-note', 'Tip: use ← → in mid-air to level the truck before landing. If you get stuck, hit the ↻ restart button or press R.'));
    global.MW.ui.openModal({ title: 'How to Play', body: body, buttons: [{ label: 'Got it', cls: 'mw-btn--primary' }] });
  }

  function openAchievements() {
    var body = el('div');
    var as = global.MW.achievementService, overrides = global.MW.adminService.getAchOverrides();
    as.defs().forEach(function (d) {
      var o = overrides[d.id] || {};
      var node = el('div', 'mw-ach' + (d.unlockedAt ? '' : ' locked'));
      node.innerHTML = '<div class="mw-ach__ico">' + d.icon + '</div><div class="mw-ach__body">' +
        '<div class="mw-ach__title">' + esc(o.title || d.title) + '</div>' +
        '<div class="mw-ach__desc">' + esc(o.desc || d.desc) + '</div>' +
        '<div class="mw-ach__prog">' + (d.unlockedAt ? 'Unlocked ' + new Date(d.unlockedAt).toLocaleDateString() : 'Locked · ' + d.cond) + '</div></div>';
      body.appendChild(node);
    });
    body.appendChild(el('p', 'mw-field__hint', as.unlockedCount() + ' of ' + as.total() + ' unlocked. Achievements only unlock from real gameplay events.'));
    global.MW.ui.openModal({ title: 'Achievements', body: body, buttons: [{ label: 'Close', cls: 'mw-btn--ghost' }] });
  }

  function openLeaderboard() {
    var body = el('div'), lb = global.MW.leaderboardService, entries = lb.getEntries();
    body.appendChild(el('div', 'mw-note', '<b>Local / demo leaderboard.</b> Ranked by a transparent local-points formula (completed×100 + levels×25 + minutes×5 + achievements×10). Demo rows are illustrative and not real people. Scores are stored on this device only and do not sync online.'));
    if (!entries.length) { body.appendChild(el('div', 'mw-empty', 'No entries yet. Finish a race to appear here.')); }
    else {
      var table = el('table', 'mw-lb');
      table.innerHTML = '<thead><tr><th>#</th><th>Player</th><th>Points</th><th>Completed</th><th>Time</th></tr></thead>';
      var tb = el('tbody');
      entries.forEach(function (e) {
        var tr = el('tr', e.me ? 'me' : '');
        tr.innerHTML = '<td class="rank">' + e.rank + '</td><td>' + esc(e.name) +
          (e.me ? ' <span class="mw-chip" style="padding:2px 8px">You</span>' : '') +
          (e.demo ? ' <span class="mw-chip" style="padding:2px 8px">Demo</span>' : '') +
          '</td><td>' + e.points + '</td><td>' + e.completed + '</td><td>' + lb.fmtTime(e.playTimeMs || e.minutes * 60000) + '</td>';
        tb.appendChild(tr);
      });
      table.appendChild(tb);
      var wrap = el('div'); wrap.style.overflowX = 'auto'; wrap.appendChild(table); body.appendChild(wrap);
    }
    global.MW.ui.openModal({ title: 'Leaderboard', body: body, buttons: [{ label: 'Close', cls: 'mw-btn--ghost' }] });
  }

  function openLevels(onPlay) {
    var body = el('div');
    body.appendChild(el('div', 'mw-note', 'Level selection happens inside the game itself. The list below is <b>display metadata</b> only — renaming a level here does not create or modify a 3D track.'));
    var grid = el('div'); grid.style.display = 'grid'; grid.style.gap = '10px'; grid.style.marginTop = '12px';
    global.MW.adminService.getLevels().forEach(function (l) {
      var row = el('div', 'mw-ach');
      row.innerHTML = '<div class="mw-ach__ico">🗺️</div><div class="mw-ach__body"><div class="mw-ach__title">' + esc(l.name) + '</div><div class="mw-ach__desc">' + esc(l.description || '') + '</div></div><span class="mw-chip">' + (l.available ? 'Available' : 'Hidden') + '</span>';
      grid.appendChild(row);
    });
    body.appendChild(grid);
    global.MW.ui.openModal({ title: 'Levels', body: body, buttons: [{ label: 'Close', cls: 'mw-btn--ghost' }, { label: 'Open Level Select', cls: 'mw-btn--primary', onClick: function () { if (onPlay) onPlay(); } }] });
  }

  function openGarage() {
    var body = el('div');
    body.appendChild(el('div', 'mw-note', 'This project ships with a single physics-driven monster truck. Vehicle tiles below are <b>display metadata</b> — they do not upload or create 3D models.'));
    var grid = el('div'); grid.style.display = 'grid'; grid.style.gap = '10px'; grid.style.marginTop = '12px';
    global.MW.adminService.getVehicles().forEach(function (v) {
      var row = el('div', 'mw-ach');
      row.innerHTML = '<div class="mw-ach__ico">🚚</div><div class="mw-ach__body"><div class="mw-ach__title">' + esc(v.name) + '</div><div class="mw-ach__desc">' + esc(v.description || '') + '</div><div class="mw-ach__prog">Unlock: ' + esc(v.unlockReq || 'None') + '</div></div><span class="mw-chip">' + (v.available ? 'Available' : 'Locked') + '</span>';
      grid.appendChild(row);
    });
    body.appendChild(grid);
    global.MW.ui.openModal({ title: 'Garage', body: body, buttons: [{ label: 'Close', cls: 'mw-btn--ghost' }] });
  }

  global.MW = global.MW || {};
  global.MW.panels = { openProfile: openProfile, openSettings: openSettings, openHowTo: openHowTo, openAchievements: openAchievements, openLeaderboard: openLeaderboard, openLevels: openLevels, openGarage: openGarage };
})(window);
