/* ============================================================
   Monster Wheels — Admin Control Panel (local demo, frontend-only)
   Hash-routed SPA over MW.adminService (localStorage). No auth,
   no backend — every mutation is this browser only. All dynamic
   text is escaped through MW.validate.escapeHtml.
   ============================================================ */
(function (global) {
  'use strict';

  var V = global.MW.validate;
  var ADM = global.MW.adminService;
  var esc = V.escapeHtml;

  var NAV = [
    { id: 'dashboard', label: 'Dashboard', ico: '📊' },
    { id: 'players', label: 'Players', ico: '👥' },
    { id: 'levels', label: 'Levels', ico: '🗺️' },
    { id: 'vehicles', label: 'Vehicles', ico: '🚚' },
    { id: 'settings', label: 'Settings', ico: '⚙️' },
    { id: 'announcements', label: 'Announcements', ico: '📣' },
    { id: 'achievements', label: 'Achievements', ico: '🏆' },
    { id: 'analytics', label: 'Analytics', ico: '📈' },
    { id: 'activity', label: 'Activity Log', ico: '🧾' }
  ];

  /* ---------------- helpers ---------------- */
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function fmtTime(ms) {
    if (global.MW.leaderboardService && global.MW.leaderboardService.fmtTime) return global.MW.leaderboardService.fmtTime(ms || 0);
    var s = Math.floor((ms || 0) / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return (h ? h + 'h ' : '') + m + 'm';
  }
  function fmtDate(ts) { return ts ? new Date(ts).toLocaleString() : '—'; }
  function toast(opts) { global.MW.ui.toast(opts); }
  function confirmDanger(title, msg, label) {
    return global.MW.ui.confirm({ title: title, msg: msg, confirmLabel: label || 'Delete', danger: true });
  }

  function field(label, inner, hint) {
    return '<div class="adm-f"><label>' + label + '</label>' + inner + (hint ? '<div class="hint">' + hint + '</div>' : '') + '</div>';
  }

  function table(cols, rowsHtml) {
    return '<div class="adm-table-wrap"><table class="adm-table"><thead><tr>' +
      cols.map(function (c) { return '<th>' + c + '</th>'; }).join('') +
      '</tr></thead><tbody>' + rowsHtml + '</tbody></table></div>';
  }
  function emptyRow(cols, msg) {
    return '<tr><td colspan="' + cols + '"><div class="adm-empty">' + esc(msg) + '</div></td></tr>';
  }

  function warnBox(text) {
    return '<div class="adm-warn"><span aria-hidden="true">⚠️</span><div>' + text + '</div></div>';
  }
  var WARN = warnBox('<b>Local demo panel.</b> Everything here is stored in this browser\'s localStorage. There is no login, no server, and no effect on any deployed game. Data does not sync between devices or browsers.');

  function statCards(pairs) {
    return '<div class="adm-stats">' + pairs.map(function (p) {
      return '<div class="adm-stat"><div class="adm-stat__num">' + p[0] + '</div><div class="adm-stat__lbl">' + p[1] + '</div></div>';
    }).join('') + '</div>';
  }
  function feed(items) {
    if (!items.length) return '<div class="adm-empty">No activity recorded yet.</div>';
    return '<ul class="adm-feed">' + items.map(function (a) {
      return '<li><span class="when">' + fmtDate(a.ts) + '</span><span class="what">' + esc(a.action) + '</span><span>' + esc(a.detail) + '</span></li>';
    }).join('') + '</ul>';
  }
  function bars(rows) {
    if (!rows.length) return '<div class="adm-empty">Nothing to chart yet.</div>';
    var max = Math.max.apply(null, rows.map(function (r) { return r.value; }).concat([1]));
    return '<div class="adm-bars">' + rows.map(function (r) {
      var pct = Math.round((r.value / max) * 100);
      return '<div class="adm-bar"><span>' + esc(r.label) + '</span>' +
        '<span class="adm-bar__track"><span class="adm-bar__fill" style="width:' + pct + '%"></span></span>' +
        '<span class="adm-bar__val">' + r.value + '</span></div>';
    }).join('') + '</div>';
  }

  /* ============================================================
     Views
     ============================================================ */
  var VIEWS = {};

  VIEWS.dashboard = function (root) {
    var s = ADM.dashboardStats();
    root.innerHTML = WARN +
      statCards([
        [s.demoPlayers, 'Demo players'],
        [s.totalRacesCompleted, 'Races completed (all local data)'],
        [s.levels, 'Level metadata entries'],
        [s.vehicles, 'Vehicle metadata entries'],
        [s.achievementsUnlockedLocal + ' / ' + s.achievementsTotal, 'Achievements unlocked (this device)'],
        [s.publishedAnnouncements + ' / ' + s.announcements, 'Published announcements']
      ]);
    var card = el('div', 'adm-card');
    card.innerHTML = '<div class="adm-card__head"><h2 class="adm-card__title">Local player snapshot</h2><span class="tag">This device</span></div>' +
      '<div class="adm-card__body">' +
      table(['Player', 'Races', 'Completed', 'Levels', 'Play time', 'Achievements'],
        '<tr class="local-row"><td><b>' + esc(s.localPlayer.name) + '</b> <span class="tag">You</span></td><td>' + s.localPlayer.racesStarted +
        '</td><td>' + s.localPlayer.racesCompleted + '</td><td>' + s.localPlayer.levelsPlayed + '</td><td>' + fmtTime(s.localPlayer.playTimeMs) +
        '</td><td>' + s.localPlayer.achievements + '</td></tr>') +
      '</div>';
    root.appendChild(card);

    var act = el('div', 'adm-card');
    act.innerHTML = '<div class="adm-card__head"><h2 class="adm-card__title">Recent activity</h2></div>' +
      '<div class="adm-card__body">' + feed(ADM.recentActivity(8)) + '</div>';
    root.appendChild(act);
  };

  /* ---------------- Players ---------------- */
  function playerFormModal(rec) {
    rec = rec || {};
    var body = el('div');
    body.innerHTML = '<div class="adm-form adm-form--2">' +
      field('Display name', '<input type="text" id="pf_name" maxlength="20" value="' + esc(rec.name || '') + '" />') +
      field('Races started', '<input type="number" id="pf_started" min="0" max="99999" value="' + (rec.racesStarted || 0) + '" />') +
      field('Races completed', '<input type="number" id="pf_done" min="0" max="99999" value="' + (rec.racesCompleted || 0) + '" />') +
      field('Distinct levels played', '<input type="number" id="pf_levels" min="0" max="999" value="' + (rec.levelsPlayed || 0) + '" />') +
      field('Play time (minutes)', '<input type="number" id="pf_minutes" min="0" max="999999" value="' + Math.round((rec.playTimeMs || 0) / 60000) + '" />') +
      field('Achievements', '<input type="number" id="pf_ach" min="0" max="99" value="' + (rec.achievements || 0) + '" />') +
      '</div><div class="err" id="pf_err"></div>';
    global.MW.ui.openModal({
      title: rec.id ? 'Edit demo player' : 'Add demo player',
      body: body,
      buttons: [
        { label: 'Cancel', cls: 'mw-btn--ghost' },
        { label: 'Save', cls: 'mw-btn--primary', onClick: function () {
            var name = $('#pf_name', body).value.trim();
            var started = Number($('#pf_started', body).value);
            var done = Number($('#pf_done', body).value);
            var levels = Number($('#pf_levels', body).value);
            var minutes = Number($('#pf_minutes', body).value);
            var ach = Number($('#pf_ach', body).value);
            var err = $('#pf_err', body);
            var e = V.displayName(name) || V.intRange(started, 0, 99999) || V.intRange(done, 0, 99999) ||
              V.intRange(levels, 0, 999) || V.intRange(minutes, 0, 999999) || V.intRange(ach, 0, 99);
            if (!e && done > started) e = 'Completed cannot exceed races started.';
            if (!e && levels > started) e = 'Levels played cannot exceed races started.';
            if (e) { err.textContent = e; return false; }
            var patch = { name: name, racesStarted: started, racesCompleted: done, levelsPlayed: levels, playTimeMs: minutes * 60000, achievements: ach };
            if (rec.id) ADM.updatePlayer(rec.id, patch); else ADM.addPlayer(patch);
            toast({ type: 'success', title: rec.id ? 'Player updated' : 'Demo player added' });
            render();
            return true;
          } }
      ]
    });
  }

  VIEWS.players = function (root) {
    var demo = ADM.getPlayers();
    var local = ADM.getLocalPlayerRow();
    var rows = '';
    rows += '<tr class="local-row"><td><b>' + esc(local.name) + '</b></td><td><span class="tag">You · this device</span></td><td>' +
      local.racesStarted + '</td><td>' + local.racesCompleted + '</td><td>' + local.levelsPlayed + '</td><td>' + fmtTime(local.playTimeMs) +
      '</td><td>' + local.achievements + '</td><td>' + fmtDate(local.createdAt) + '</td><td></td></tr>';
    if (demo.length) {
      rows += demo.map(function (p) {
        return '<tr><td>' + esc(p.name) + '</td><td><span class="tag tag--demo">Demo</span></td><td>' + (p.racesStarted || 0) +
          '</td><td>' + (p.racesCompleted || 0) + '</td><td>' + (p.levelsPlayed || 0) + '</td><td>' + fmtTime(p.playTimeMs) +
          '</td><td>' + (p.achievements || 0) + '</td><td>' + fmtDate(p.createdAt) + '</td>' +
          '<td><div class="row-actions">' +
          '<button class="mw-btn mw-btn--sm mw-btn--ghost" data-act="edit" data-id="' + esc(p.id) + '">Edit</button>' +
          '<button class="mw-btn mw-btn--sm mw-btn--danger" data-act="del" data-id="' + esc(p.id) + '">Delete</button>' +
          '</div></td></tr>';
      }).join('');
    } else {
      rows += emptyRow(9, 'No demo players. Add one to preview the roster.');
    }

    root.innerHTML = WARN +
      '<div class="adm-card"><div class="adm-card__head"><h2 class="adm-card__title">Players</h2>' +
      '<button class="mw-btn mw-btn--sm mw-btn--primary" id="add_player">＋ Add demo player</button></div>' +
      '<div class="adm-card__body">' +
      '<p class="hint" style="margin:0 0 10px;color:var(--mw-muted);font-size:12.5px">The <b>You</b> row is the real local profile from this browser — it cannot be edited here. Demo rows are illustrative placeholders, not real accounts.</p>' +
      table(['Name', 'Type', 'Races', 'Completed', 'Levels', 'Play time', 'Ach.', 'Created', ''], rows) +
      '</div></div>';

    $('#add_player', root).addEventListener('click', function () { playerFormModal(); });
    root.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button[data-act]') : null;
      if (!b) return;
      var id = b.getAttribute('data-id');
      var rec = ADM.getPlayers().find(function (p) { return p.id === id; });
      if (!rec) return;
      if (b.getAttribute('data-act') === 'edit') playerFormModal(rec);
      else confirmDanger('Delete demo player?', 'Remove "' + esc(rec.name) + '" from the local demo roster. This does not touch the real local profile.', 'Delete').then(function (ok) {
        if (ok) { ADM.removePlayer(id); toast({ type: 'info', title: 'Demo player removed' }); render(); }
      });
    });
  };

  /* ---------------- Levels (display metadata only) ---------------- */
  function levelFormModal(rec) {
    rec = rec || {};
    var body = el('div');
    body.innerHTML = '<div class="adm-form adm-form--2">' +
      field('Name', '<input type="text" id="lf_name" maxlength="40" value="' + esc(rec.name || '') + '" />') +
      field('Order', '<input type="number" id="lf_order" min="0" max="999" value="' + (rec.order || 1) + '" />') +
      '</div>' +
      field('Description', '<textarea id="lf_desc" maxlength="240">' + esc(rec.description || '') + '</textarea>') +
      '<div class="adm-form adm-form--2">' +
      field('Engine level index', '<input type="number" id="lf_index" min="0" max="99" value="' + (rec.index || 0) + '" />', 'Which built-in engine level this metadata row describes (?level=N).') +
      field('Availability', '<select id="lf_avail"><option value="1">Available</option><option value="0">Hidden</option></select>') +
      '</div><div class="err" id="lf_err"></div>';
    $('#lf_avail', body).value = rec.available === false ? '0' : '1';
    global.MW.ui.openModal({
      title: rec.id ? 'Edit level metadata' : 'Add level metadata',
      body: body,
      buttons: [
        { label: 'Cancel', cls: 'mw-btn--ghost' },
        { label: 'Save', cls: 'mw-btn--primary', onClick: function () {
            var name = $('#lf_name', body).value.trim();
            var desc = $('#lf_desc', body).value.trim();
            var order = Number($('#lf_order', body).value);
            var index = Number($('#lf_index', body).value);
            var avail = $('#lf_avail', body).value === '1';
            var e = V.title(name, 2, 40) || V.description(desc) || V.intRange(order, 0, 999) || V.intRange(index, 0, 99);
            if (e) { $('#lf_err', body).textContent = e; return false; }
            var patch = { name: name, description: desc, order: order, index: index, available: avail };
            if (rec.id) ADM.updateLevel(rec.id, patch); else ADM.addLevel(patch);
            toast({ type: 'success', title: rec.id ? 'Level metadata updated' : 'Level metadata added' });
            render();
            return true;
          } }
      ]
    });
  }

  VIEWS.levels = function (root) {
    var levels = ADM.getLevels();
    var rows = levels.length ? levels.map(function (l) {
      return '<tr><td><b>' + esc(l.name) + '</b></td><td>' + esc(l.description || '') + '</td><td>' + (l.index != null ? l.index : '—') +
        '</td><td>' + (l.order || 0) + '</td><td>' + (l.available ? '<span class="tag tag--on">Available</span>' : '<span class="tag tag--off">Hidden</span>') +
        (l.builtin ? ' <span class="tag">Bundled</span>' : '') + '</td>' +
        '<td><div class="row-actions"><button class="mw-btn mw-btn--sm mw-btn--ghost" data-act="edit" data-id="' + esc(l.id) + '">Edit</button>' +
        '<button class="mw-btn mw-btn--sm mw-btn--danger" data-act="del" data-id="' + esc(l.id) + '">Delete</button></div></td></tr>';
    }).join('') : emptyRow(6, 'No level metadata yet.');

    root.innerHTML = WARN +
      '<div class="adm-card"><div class="adm-card__head"><h2 class="adm-card__title">Level metadata</h2>' +
      '<div class="adm-actions"><button class="mw-btn mw-btn--sm mw-btn--ghost" id="reset_levels">Reset to defaults</button>' +
      '<button class="mw-btn mw-btn--sm mw-btn--primary" id="add_level">＋ Add metadata</button></div></div>' +
      '<div class="adm-card__body">' +
      '<p class="hint" style="margin:0 0 10px;color:var(--mw-muted);font-size:12.5px"><b>Display metadata only.</b> This project bundles the engine\'s own tracks. Renaming or adding rows here does not create or modify 3D tracks — it only changes what players see in the in-game panels.</p>' +
      table(['Name', 'Description', 'Index', 'Order', 'Status', ''], rows) + '</div></div>';

    $('#add_level', root).addEventListener('click', function () { levelFormModal(); });
    $('#reset_levels', root).addEventListener('click', function () {
      confirmDanger('Reset level metadata?', 'Restore the default bundled metadata row. No gameplay data is affected.', 'Reset').then(function (ok) {
        if (ok) { ADM.resetLevels(); toast({ type: 'info', title: 'Level metadata reset' }); render(); }
      });
    });
    root.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button[data-act]') : null;
      if (!b) return;
      var id = b.getAttribute('data-id');
      var rec = ADM.getLevels().find(function (x) { return x.id === id; });
      if (!rec) return;
      if (b.getAttribute('data-act') === 'edit') levelFormModal(rec);
      else confirmDanger('Delete level metadata?', 'Remove the metadata row "' + esc(rec.name) + '". Gameplay tracks are unchanged.', 'Delete').then(function (ok) {
        if (ok) { ADM.removeLevel(id); toast({ type: 'info', title: 'Level metadata removed' }); render(); }
      });
    });
  };

  /* ---------------- Vehicles (display metadata only) ---------------- */
  function vehicleFormModal(rec) {
    rec = rec || {};
    var body = el('div');
    body.innerHTML = '<div class="adm-form">' +
      field('Name', '<input type="text" id="vf_name" maxlength="40" value="' + esc(rec.name || '') + '" />') +
      field('Description', '<textarea id="vf_desc" maxlength="240">' + esc(rec.description || '') + '</textarea>') +
      field('Unlock requirement (text)', '<input type="text" id="vf_unlock" maxlength="60" value="' + esc(rec.unlockReq || 'None') + '" />', 'Shown to players. Metadata only — no unlock logic is attached.') +
      field('Availability', '<select id="vf_avail"><option value="1">Available</option><option value="0">Locked</option></select>') +
      '</div><div class="err" id="vf_err"></div>';
    $('#vf_avail', body).value = rec.available === false ? '0' : '1';
    global.MW.ui.openModal({
      title: rec.id ? 'Edit vehicle' : 'Add vehicle metadata',
      body: body,
      buttons: [
        { label: 'Cancel', cls: 'mw-btn--ghost' },
        { label: 'Save', cls: 'mw-btn--primary', onClick: function () {
            var name = $('#vf_name', body).value.trim();
            var desc = $('#vf_desc', body).value.trim();
            var unlock = $('#vf_unlock', body).value.trim() || 'None';
            var avail = $('#vf_avail', body).value === '1';
            var e = V.title(name, 2, 40) || V.description(desc) || V.description(unlock, 60);
            if (e) { $('#vf_err', body).textContent = e; return false; }
            var patch = { name: name, description: desc, unlockReq: unlock, available: avail };
            if (rec.id) ADM.updateVehicle(rec.id, patch); else ADM.addVehicle(patch);
            toast({ type: 'success', title: rec.id ? 'Vehicle updated' : 'Vehicle metadata added' });
            render();
            return true;
          } }
      ]
    });
  }

  VIEWS.vehicles = function (root) {
    var vehicles = ADM.getVehicles();
    var rows = vehicles.length ? vehicles.map(function (v) {
      return '<tr><td><b>' + esc(v.name) + '</b></td><td>' + esc(v.description || '') + '</td><td>' + esc(v.unlockReq || 'None') +
        '</td><td>' + (v.available ? '<span class="tag tag--on">Available</span>' : '<span class="tag tag--off">Locked</span>') +
        (v.builtin ? ' <span class="tag">Bundled</span>' : '') + '</td>' +
        '<td><div class="row-actions"><button class="mw-btn mw-btn--sm mw-btn--ghost" data-act="edit" data-id="' + esc(v.id) + '">Edit</button>' +
        '<button class="mw-btn mw-btn--sm mw-btn--danger" data-act="del" data-id="' + esc(v.id) + '">Delete</button></div></td></tr>';
    }).join('') : emptyRow(5, 'No vehicle metadata yet.');

    root.innerHTML = WARN +
      '<div class="adm-card"><div class="adm-card__head"><h2 class="adm-card__title">Vehicle metadata</h2>' +
      '<div class="adm-actions"><button class="mw-btn mw-btn--sm mw-btn--ghost" id="reset_vehicles">Reset to defaults</button>' +
      '<button class="mw-btn mw-btn--sm mw-btn--primary" id="add_vehicle">＋ Add metadata</button></div></div>' +
      '<div class="adm-card__body">' +
      '<p class="hint" style="margin:0 0 10px;color:var(--mw-muted);font-size:12.5px"><b>Display metadata only.</b> This project ships with a single physics-driven monster truck. These rows change the garage listing text — they do not upload or create 3D models.</p>' +
      table(['Name', 'Description', 'Unlock', 'Status', ''], rows) + '</div></div>';

    $('#add_vehicle', root).addEventListener('click', function () { vehicleFormModal(); });
    $('#reset_vehicles', root).addEventListener('click', function () {
      confirmDanger('Reset vehicle metadata?', 'Restore the default bundled vehicle row.', 'Reset').then(function (ok) {
        if (ok) { ADM.resetVehicles(); toast({ type: 'info', title: 'Vehicle metadata reset' }); render(); }
      });
    });
    root.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button[data-act]') : null;
      if (!b) return;
      var id = b.getAttribute('data-id');
      var rec = ADM.getVehicles().find(function (x) { return x.id === id; });
      if (!rec) return;
      if (b.getAttribute('data-act') === 'edit') vehicleFormModal(rec);
      else confirmDanger('Delete vehicle metadata?', 'Remove "' + esc(rec.name) + '" from the garage listing.', 'Delete').then(function (ok) {
        if (ok) { ADM.removeVehicle(id); toast({ type: 'info', title: 'Vehicle metadata removed' }); render(); }
      });
    });
  };

  /* ---------------- Settings ---------------- */
  function exportData() {
    var out = {};
    global.MW.storage.keys().forEach(function (k) {
      if (k.indexOf('admin:') === 0 || k === 'settings' || k === 'progress' || k === 'player' || k === 'achievements') out[k] = global.MW.storage.get(k, null);
    });
    var blob = new Blob([JSON.stringify({ app: 'monster-wheels', version: 1, exportedAt: new Date().toISOString(), data: out }, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'monster-wheels-local-data.json';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    ADM.log('data.export', 'Exported local data as JSON');
    toast({ type: 'success', title: 'Export downloaded' });
  }

  function importData() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.addEventListener('change', function () {
      var f = input.files && input.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var parsed = JSON.parse(String(reader.result));
          var data = parsed && parsed.data;
          if (!data || typeof data !== 'object') throw new Error('Missing data object');
          var count = 0;
          Object.keys(data).forEach(function (k) {
            if (k.indexOf('admin:') !== 0 && ['settings', 'progress', 'player', 'achievements'].indexOf(k) === -1) return;
            if (global.MW.storage.set(k, data[k])) count++;
          });
          ADM.log('data.import', 'Imported ' + count + ' keys from JSON');
          toast({ type: 'success', title: 'Import complete', msg: count + ' keys restored.' });
          render();
        } catch (e) {
          toast({ type: 'error', title: 'Import failed', msg: 'That file is not a valid Monster Wheels export.' });
        }
      };
      reader.readAsText(f);
    });
    input.click();
  }

  VIEWS.settings = function (root) {
    var cfg = ADM.getConfig();
    var anns = ADM.getAnnouncements();
    var activeSel = '<select id="st_active"><option value="">Auto (highest priority published)</option>' +
      anns.filter(function (a) { return a.published; }).map(function (a) {
        return '<option value="' + esc(a.id) + '">' + esc(a.title) + '</option>';
      }).join('') + '</select>';

    root.innerHTML = WARN +
      '<div class="adm-card"><div class="adm-card__head"><h2 class="adm-card__title">Game-wide (local) flags</h2></div><div class="adm-card__body">' +
      '<div class="adm-form">' +
      '<label class="adm-check"><input type="checkbox" id="st_maint"' + (cfg.maintenance.enabled ? ' checked' : '') + '> Show the demo maintenance banner in the game menu</label>' +
      field('Maintenance message', '<textarea id="st_maint_msg" maxlength="240" placeholder="Shown while maintenance is enabled">' + esc(cfg.maintenance.message || '') + '</textarea>') +
      field('Active announcement', activeSel, 'Leave on auto to show the highest-priority published announcement.') +
      '</div>' +
      '<div class="adm-actions" style="margin-top:12px"><button class="mw-btn mw-btn--primary" id="st_save">Save flags</button></div>' +
      '</div></div>' +

      '<div class="adm-card"><div class="adm-card__head"><h2 class="adm-card__title">Local data tools</h2></div><div class="adm-card__body">' +
      '<p style="margin:0 0 12px;color:var(--mw-muted);font-size:13px">Export everything this browser stores for Monster Wheels (admin demo data, settings, progress, profile, achievements) as JSON, or restore from a previous export.</p>' +
      '<div class="adm-actions">' +
      '<button class="mw-btn" id="st_export">⬇ Export JSON</button>' +
      '<button class="mw-btn" id="st_import">⬆ Import JSON</button>' +
      '<button class="mw-btn mw-btn--danger" id="st_reset">Reset all admin demo data</button>' +
      '<button class="mw-btn mw-btn--danger" id="st_wipe">Erase ALL local game data</button>' +
      '</div></div></div>';

    $('#st_save', root).addEventListener('click', function () {
      ADM.setMaintenance($('#st_maint', root).checked, $('#st_maint_msg', root).value.trim());
      ADM.setActiveAnnouncement($('#st_active', root).value || null);
      toast({ type: 'success', title: 'Flags saved', msg: 'Open the game menu to see the banner.' });
      render();
    });
    $('#st_export', root).addEventListener('click', exportData);
    $('#st_import', root).addEventListener('click', importData);
    $('#st_reset', root).addEventListener('click', function () {
      confirmDanger('Reset admin demo data?', 'Demo players, level/vehicle metadata, announcements and flags return to their defaults. Real local progress is kept.', 'Reset').then(function (ok) {
        if (ok) { ADM.resetAllAdminData(); toast({ type: 'info', title: 'Admin data reset' }); render(); }
      });
    });
    $('#st_wipe', root).addEventListener('click', function () {
      confirmDanger('Erase everything?', 'This deletes the local profile, progress, achievements, settings AND all admin demo data from this browser. It cannot be undone.', 'Erase all').then(function (ok) {
        if (!ok) return;
        global.MW.storage.clearAll();
        toast({ type: 'info', title: 'All local data erased' });
        render();
      });
    });
  };

  /* ---------------- Announcements ---------------- */
  function announcementFormModal(rec) {
    rec = rec || {};
    var body = el('div');
    body.innerHTML = '<div class="adm-form">' +
      field('Title', '<input type="text" id="af_title" maxlength="60" value="' + esc(rec.title || '') + '" />') +
      field('Description', '<textarea id="af_desc" maxlength="240">' + esc(rec.description || '') + '</textarea>') +
      field('Priority', '<select id="af_prio"><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>') +
      '<label class="adm-check"><input type="checkbox" id="af_pub"' + (rec.published ? ' checked' : '') + '> Published (visible in game)</label>' +
      '</div><div class="err" id="af_err"></div>';
    $('#af_prio', body).value = rec.priority || 'medium';
    global.MW.ui.openModal({
      title: rec.id ? 'Edit announcement' : 'New announcement',
      body: body,
      buttons: [
        { label: 'Cancel', cls: 'mw-btn--ghost' },
        { label: 'Save', cls: 'mw-btn--primary', onClick: function () {
            var title = $('#af_title', body).value.trim();
            var desc = $('#af_desc', body).value.trim();
            var prio = $('#af_prio', body).value;
            var pub = $('#af_pub', body).checked;
            var e = V.title(title, 3, 60) || V.description(desc) || V.oneOf(prio, ['high', 'medium', 'low']);
            if (e) { $('#af_err', body).textContent = e; return false; }
            var patch = { title: title, description: desc, priority: prio, published: pub };
            if (rec.id) { ADM.updateAnnouncement(rec.id, patch); if (!pub) ADM.setActiveAnnouncement(null); }
            else ADM.addAnnouncement(patch);
            toast({ type: 'success', title: rec.id ? 'Announcement updated' : 'Announcement created' });
            render();
            return true;
          } }
      ]
    });
  }

  VIEWS.announcements = function (root) {
    var anns = ADM.getAnnouncements();
    var activeId = ADM.getActiveAnnouncement() ? ADM.getActiveAnnouncement().id : null;
    var rows = anns.length ? anns.map(function (a) {
      return '<tr><td><b>' + esc(a.title) + '</b>' + (a.id === activeId ? ' <span class="tag tag--on">Active</span>' : '') +
        '</td><td>' + esc(a.description || '') + '</td><td>' + esc(a.priority) + '</td><td>' + fmtDate(a.createdAt) +
        '</td><td>' + (a.published ? '<span class="tag tag--on">Published</span>' : '<span class="tag tag--off">Draft</span>') + '</td>' +
        '<td><div class="row-actions">' +
        '<button class="mw-btn mw-btn--sm mw-btn--ghost" data-act="pub" data-id="' + esc(a.id) + '">' + (a.published ? 'Unpublish' : 'Publish') + '</button>' +
        '<button class="mw-btn mw-btn--sm mw-btn--ghost" data-act="edit" data-id="' + esc(a.id) + '">Edit</button>' +
        '<button class="mw-btn mw-btn--sm mw-btn--danger" data-act="del" data-id="' + esc(a.id) + '">Delete</button>' +
        '</div></td></tr>';
    }).join('') : emptyRow(6, 'No announcements yet. Create one to see it in the game menu.');

    root.innerHTML = WARN +
      '<div class="adm-card"><div class="adm-card__head"><h2 class="adm-card__title">Announcements</h2>' +
      '<button class="mw-btn mw-btn--sm mw-btn--primary" id="add_ann">＋ New announcement</button></div>' +
      '<div class="adm-card__body">' +
      '<p class="hint" style="margin:0 0 10px;color:var(--mw-muted);font-size:12.5px">Published announcements appear as a dismissible banner on the game\'s main menu. The maintenance flag in Settings overrides them.</p>' +
      table(['Title', 'Description', 'Priority', 'Created', 'Status', ''], rows) + '</div></div>';

    $('#add_ann', root).addEventListener('click', function () { announcementFormModal(); });
    root.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button[data-act]') : null;
      if (!b) return;
      var id = b.getAttribute('data-id');
      var rec = ADM.getAnnouncements().find(function (x) { return x.id === id; });
      if (!rec) return;
      var act = b.getAttribute('data-act');
      if (act === 'edit') { announcementFormModal(rec); return; }
      if (act === 'pub') {
        ADM.updateAnnouncement(id, { published: !rec.published });
        if (!rec.published) ADM.setActiveAnnouncement(id); else if (ADM.getConfig().activeAnnouncementId === id) ADM.setActiveAnnouncement(null);
        toast({ type: 'info', title: rec.published ? 'Announcement unpublished' : 'Announcement published' });
        render();
      } else if (act === 'del') {
        confirmDanger('Delete announcement?', 'Remove "' + esc(rec.title) + '" permanently.', 'Delete').then(function (ok) {
          if (ok) {
            ADM.removeAnnouncement(id);
            if (ADM.getConfig().activeAnnouncementId === id) ADM.setActiveAnnouncement(null);
            toast({ type: 'info', title: 'Announcement deleted' });
            render();
          }
        });
      }
    });
  };

  /* ---------------- Achievements (display overrides only) ---------------- */
  VIEWS.achievements = function (root) {
    var defs = global.MW.achievementService.defs();
    var overrides = ADM.getAchOverrides();
    var rows = defs.map(function (d) {
      var o = overrides[d.id] || {};
      return '<tr><td>' + d.icon + '</td><td><b>' + esc(o.title || d.title) + '</b>' + (o.title || o.desc ? ' <span class="tag tag--demo">Edited</span>' : '') +
        '</td><td>' + esc(o.desc || d.desc) + '</td><td>' + esc(d.cond) + '</td>' +
        '<td>' + (d.unlockedAt ? '<span class="tag tag--on">Unlocked ' + new Date(d.unlockedAt).toLocaleDateString() + '</span>' : '<span class="tag">Locked</span>') + '</td>' +
        '<td><button class="mw-btn mw-btn--sm mw-btn--ghost" data-act="edit" data-id="' + esc(d.id) + '">Edit display</button></td></tr>';
    }).join('');

    root.innerHTML = WARN +
      '<div class="adm-card"><div class="adm-card__head"><h2 class="adm-card__title">Achievements</h2>' +
      '<button class="mw-btn mw-btn--sm mw-btn--ghost" id="reset_ach">Reset display edits</button></div>' +
      '<div class="adm-card__body">' +
      '<p class="hint" style="margin:0 0 10px;color:var(--mw-muted);font-size:12.5px"><b>Display overrides only.</b> You can rename achievement titles/descriptions here, but unlocking is driven strictly by real local gameplay events — this panel cannot grant achievements. "Unlocked" reflects this browser only.</p>' +
      table(['', 'Title', 'Description', 'Condition', 'Status (this device)', ''], rows) + '</div></div>';

    $('#reset_ach', root).addEventListener('click', function () {
      ADM.resetAchOverrides();
      toast({ type: 'info', title: 'Display overrides reset' });
      render();
    });
    root.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button[data-act="edit"]') : null;
      if (!b) return;
      var id = b.getAttribute('data-id');
      var d = defs.find(function (x) { return x.id === id; });
      if (!d) return;
      var o = overrides[id] || {};
      var body = el('div');
      body.innerHTML = '<div class="adm-form">' +
        field('Title', '<input type="text" id="ch_title" maxlength="60" value="' + esc(o.title || d.title) + '" />') +
        field('Description', '<textarea id="ch_desc" maxlength="240">' + esc(o.desc || d.desc) + '</textarea>') +
        '</div><div class="err" id="ch_err"></div>';
      global.MW.ui.openModal({
        title: 'Edit achievement display',
        body: body,
        buttons: [
          { label: 'Cancel', cls: 'mw-btn--ghost' },
          { label: 'Save', cls: 'mw-btn--primary', onClick: function () {
              var title = $('#ch_title', body).value.trim();
              var desc = $('#ch_desc', body).value.trim();
              var e2 = V.title(title, 2, 60) || V.description(desc);
              if (e2) { $('#ch_err', body).textContent = e2; return false; }
              ADM.setAchOverride(id, { title: title, desc: desc });
              toast({ type: 'success', title: 'Achievement display updated' });
              render();
              return true;
            } }
        ]
      });
    });
  };

  /* ---------------- Analytics (local/demo numbers only) ---------------- */
  VIEWS.analytics = function (root) {
    var demo = ADM.getPlayers();
    var local = ADM.getLocalPlayerRow();
    var all = demo.concat([local]);
    var totalStarted = all.reduce(function (s, p) { return s + (p.racesStarted || 0); }, 0);
    var totalDone = all.reduce(function (s, p) { return s + (p.racesCompleted || 0); }, 0);
    var totalMs = all.reduce(function (s, p) { return s + (p.playTimeMs || 0); }, 0);
    var rate = totalStarted ? Math.round((totalDone / totalStarted) * 100) : 0;

    root.innerHTML = WARN +
      '<p style="margin:0 0 14px;color:var(--mw-muted);font-size:13px">These numbers combine the real local player on this device with the illustrative demo rows. There is no server, no analytics service, and no tracking — everything is computed from localStorage in your browser.</p>' +
      statCards([
        [totalStarted, 'Races started (local + demo)'],
        [totalDone, 'Races completed (local + demo)'],
        [rate + '%', 'Completion rate'],
        [fmtTime(totalMs), 'Total play time (local + demo)'],
        [local.levelsPlayed, 'Distinct levels played (you)'],
        [local.achievements, 'Achievements unlocked (you)']
      ]) +
      '<div class="adm-card"><div class="adm-card__head"><h2 class="adm-card__title">Races completed by player</h2></div>' +
      '<div class="adm-card__body">' + bars(all.map(function (p) {
        return { label: p.name + (p.local ? ' (you)' : ''), value: p.racesCompleted || 0 };
      })) + '</div></div>' +
      '<div class="adm-card"><div class="adm-card__head"><h2 class="adm-card__title">Play time by player</h2></div>' +
      '<div class="adm-card__body">' + bars(all.map(function (p) {
        return { label: p.name + (p.local ? ' (you)' : ''), value: Math.round((p.playTimeMs || 0) / 60000) };
      }).map(function (r) { r.label = r.label + ' (min)'; return r; })) + '</div></div>';
  };

  /* ---------------- Activity log ---------------- */
  VIEWS.activity = function (root) {
    var items = ADM.getActivity();
    root.innerHTML = WARN +
      '<div class="adm-card"><div class="adm-card__head"><h2 class="adm-card__title">Activity log</h2>' +
      '<button class="mw-btn mw-btn--sm mw-btn--danger" id="clear_log">Clear log</button></div>' +
      '<div class="adm-card__body">' +
      (items.length ? table(['Time', 'Action', 'Detail'], items.map(function (a) {
        return '<tr><td>' + fmtDate(a.ts) + '</td><td><span class="what" style="font-weight:700;color:#ffcf9e">' + esc(a.action) + '</span></td><td>' + esc(a.detail) + '</td></tr>';
      }).join('')) : '<div class="adm-empty">No activity recorded yet.</div>') +
      '</div></div>';

    $('#clear_log', root).addEventListener('click', function () {
      confirmDanger('Clear activity log?', 'All logged admin actions are removed (a new entry is added for the clear itself).', 'Clear').then(function (ok) {
        if (ok) { ADM.clearActivity(); toast({ type: 'info', title: 'Activity log cleared' }); render(); }
      });
    });
  };

  /* ---------------- Router / shell ---------------- */
  function currentView() {
    var id = (global.location.hash || '').replace(/^#\/?/, '');
    return VIEWS[id] ? id : 'dashboard';
  }

  function render() {
    var id = currentView();
    var view = VIEWS[id];
    var meta = NAV.find(function (n) { return n.id === id; }) || NAV[0];
    document.title = meta.label + ' · Monster Wheels Admin';
    var titleEl = $('#adm_title');
    if (titleEl) titleEl.textContent = meta.label;
    document.querySelectorAll('.adm-nav a').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-view') === id);
    });
    var root = $('#adm_content');
    root.innerHTML = '';
    try { view(root); } catch (e) {
      console.error(e);
      root.innerHTML = '<div class="adm-warn"><span>⚠️</span><div><b>Something went wrong rendering this panel.</b><br>' + esc(e && e.message || e) + '</div></div>';
    }
  }

  function buildNav() {
    var nav = $('.adm-nav');
    nav.innerHTML = NAV.map(function (n) {
      return '<a href="#/' + n.id + '" data-view="' + n.id + '"><span class="ico" aria-hidden="true">' + n.ico + '</span>' + n.label + '</a>';
    }).join('');
  }

  function init() {
    if (!global.MW.storage.hasStorage) {
      $('#adm_content').innerHTML = '<div class="adm-warn"><span>⚠️</span><div><b>localStorage is unavailable</b> (private browsing?). The admin demo cannot store data in this browser.</div></div>';
      return;
    }
    buildNav();
    $('#adm_export_top').addEventListener('click', exportData);
    global.addEventListener('hashchange', render);
    render();
  }

  global.MW = global.MW || {};
  global.MW.adminApp = { init: init, render: render };
})(window);
