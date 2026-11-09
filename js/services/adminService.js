/* ============================================================
   MW.adminService — frontend-only demo data + operations for the
   Admin panel. NOT secure, NOT synced, does NOT affect a deployed
   game. No passwords, no accounts.
   FUTURE BACKEND: each getter/mutator maps 1:1 to a Firestore
   read/write; keep the returned object shapes identical.
   ============================================================ */
(function (global) {
  'use strict';
  var S = global.MW.storage;

  var K = {
    players: 'admin:players', levels: 'admin:levels', vehicles: 'admin:vehicles',
    announcements: 'admin:announcements', achMeta: 'admin:achMeta', activity: 'admin:activity',
    config: 'admin:config', seeded: 'admin:seeded'
  };

  function uid(p) { return (p || 'id') + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function isArr(v) { return Array.isArray(v); }
  function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }

  function seedPlayers() {
    return [
      { id: uid('p'), name: 'RampRider', racesStarted: 15, racesCompleted: 12, levelsPlayed: 6, playTimeMs: 4440000, achievements: 5, createdAt: Date.now() - 86400000 * 12, demo: true },
      { id: uid('p'), name: 'CrushKing', racesStarted: 11, racesCompleted: 9, levelsPlayed: 5, playTimeMs: 3120000, achievements: 4, createdAt: Date.now() - 86400000 * 8, demo: true },
      { id: uid('p'), name: 'DirtDash', racesStarted: 8, racesCompleted: 6, levelsPlayed: 4, playTimeMs: 1860000, achievements: 3, createdAt: Date.now() - 86400000 * 4, demo: true }
    ];
  }
  // The project bundles one playable track; metadata here is display-only
  // and does NOT create or modify 3D tracks.
  function seedLevels() { return [{ id: 'lvl-0', index: 0, name: 'Monster Truck', description: 'The bundled Monster Wheels track.', available: true, order: 1, thumbnail: null, builtin: true }]; }
  function seedVehicles() { return [{ id: 'veh-0', name: 'Monster Truck', description: 'The primary physics-driven monster truck.', available: true, unlockReq: 'None', thumbnail: null, builtin: true }]; }
  function seedAnnouncements() {
    return [
      { id: uid('an'), title: 'Welcome to Monster Wheels!', description: 'Drive wild, crush obstacles, and conquer every track.', priority: 'high', published: true, createdAt: Date.now() },
      { id: uid('an'), title: 'Local demo build', description: 'This frontend phase stores everything on your device only.', priority: 'medium', published: false, createdAt: Date.now() }
    ];
  }

  function ensureSeed() {
    if (S.get(K.seeded, false)) return;
    S.set(K.players, seedPlayers());
    S.set(K.levels, seedLevels());
    S.set(K.vehicles, seedVehicles());
    S.set(K.announcements, seedAnnouncements());
    S.set(K.activity, []);
    S.set(K.config, { maintenance: { enabled: false, message: '' }, activeAnnouncementId: null });
    S.set(K.seeded, true);
    log('system', 'Seeded initial local demo data');
  }

  function log(action, detail) {
    var arr = S.get(K.activity, []); if (!isArr(arr)) arr = [];
    arr.unshift({ id: uid('log'), ts: Date.now(), action: action, detail: detail });
    if (arr.length > 300) arr = arr.slice(0, 300);
    S.set(K.activity, arr);
  }
  function getActivity() { var a = S.get(K.activity, []); return isArr(a) ? a : []; }
  function clearActivity() { S.set(K.activity, []); log('system', 'Cleared activity log'); }

  function list(key) { var v = S.get(key, []); return isArr(v) ? v : []; }
  function saveList(key, arr) { S.set(key, arr); }

  /* Players */
  function getPlayers() { return list(K.players); }
  function getLocalPlayerRow() {
    var p = global.MW.playerService ? global.MW.playerService.get() : { id: 'local', displayName: 'Guest Driver', createdAt: Date.now() };
    var prog = global.MW.progressService ? global.MW.progressService.get() : {};
    return {
      id: p.id, name: p.displayName, racesStarted: prog.racesStarted || 0, racesCompleted: prog.racesCompleted || 0,
      levelsPlayed: (prog.levelsPlayed || []).length, playTimeMs: prog.playTimeMs || 0,
      achievements: global.MW.achievementService ? global.MW.achievementService.unlockedCount() : 0,
      createdAt: p.createdAt || Date.now(), demo: false, local: true
    };
  }
  function addPlayer(rec) { var arr = getPlayers(); rec.id = uid('p'); rec.demo = true; rec.createdAt = Date.now(); arr.unshift(rec); saveList(K.players, arr); log('player.add', 'Added demo player "' + rec.name + '"'); return rec; }
  function updatePlayer(id, patch) { var arr = getPlayers(); var i = arr.findIndex(function (x) { return x.id === id; }); if (i === -1) return null; arr[i] = Object.assign({}, arr[i], patch, { id: id }); saveList(K.players, arr); log('player.edit', 'Edited demo player "' + arr[i].name + '"'); return arr[i]; }
  function removePlayer(id) { var arr = getPlayers(); var i = arr.findIndex(function (x) { return x.id === id; }); if (i === -1) return false; var n = arr[i].name; arr.splice(i, 1); saveList(K.players, arr); log('player.delete', 'Removed demo player "' + n + '"'); return true; }

  /* Levels */
  function getLevels() { return list(K.levels).slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); }); }
  function updateLevel(id, patch) { var arr = list(K.levels); var i = arr.findIndex(function (x) { return x.id === id; }); if (i === -1) return null; arr[i] = Object.assign({}, arr[i], patch, { id: id }); saveList(K.levels, arr); log('level.edit', 'Edited level metadata "' + arr[i].name + '"'); return arr[i]; }
  function addLevel(rec) { var arr = list(K.levels); rec.id = uid('lvl'); rec.thumbnail = rec.thumbnail || null; arr.push(rec); saveList(K.levels, arr); log('level.add', 'Added level metadata "' + rec.name + '"'); return rec; }
  function removeLevel(id) { var arr = list(K.levels); var i = arr.findIndex(function (x) { return x.id === id; }); if (i === -1) return false; var n = arr[i].name; arr.splice(i, 1); saveList(K.levels, arr); log('level.delete', 'Removed level metadata "' + n + '"'); return true; }
  function resetLevels() { saveList(K.levels, seedLevels()); log('level.reset', 'Reset level metadata to defaults'); }

  /* Vehicles */
  function getVehicles() { return list(K.vehicles); }
  function updateVehicle(id, patch) { var arr = list(K.vehicles); var i = arr.findIndex(function (x) { return x.id === id; }); if (i === -1) return null; arr[i] = Object.assign({}, arr[i], patch, { id: id }); saveList(K.vehicles, arr); log('vehicle.edit', 'Edited vehicle "' + arr[i].name + '"'); return arr[i]; }
  function addVehicle(rec) { var arr = list(K.vehicles); rec.id = uid('veh'); rec.thumbnail = rec.thumbnail || null; arr.push(rec); saveList(K.vehicles, arr); log('vehicle.add', 'Added vehicle "' + rec.name + '"'); return rec; }
  function removeVehicle(id) { var arr = list(K.vehicles); var i = arr.findIndex(function (x) { return x.id === id; }); if (i === -1) return false; var n = arr[i].name; arr.splice(i, 1); saveList(K.vehicles, arr); log('vehicle.delete', 'Removed vehicle "' + n + '"'); return true; }
  function resetVehicles() { saveList(K.vehicles, seedVehicles()); log('vehicle.reset', 'Reset vehicle metadata to defaults'); }

  /* Announcements */
  function getAnnouncements() { return list(K.announcements); }
  function addAnnouncement(rec) { var arr = getAnnouncements(); rec.id = uid('an'); rec.createdAt = Date.now(); arr.unshift(rec); saveList(K.announcements, arr); log('announce.add', 'Created announcement "' + rec.title + '"'); return rec; }
  function updateAnnouncement(id, patch) { var arr = getAnnouncements(); var i = arr.findIndex(function (x) { return x.id === id; }); if (i === -1) return null; arr[i] = Object.assign({}, arr[i], patch, { id: id }); saveList(K.announcements, arr); log('announce.edit', 'Edited announcement "' + arr[i].title + '"'); return arr[i]; }
  function removeAnnouncement(id) { var arr = getAnnouncements(); var i = arr.findIndex(function (x) { return x.id === id; }); if (i === -1) return false; var t = arr[i].title; arr.splice(i, 1); saveList(K.announcements, arr); log('announce.delete', 'Deleted announcement "' + t + '"'); return true; }

  /* Achievement display overrides (never affects unlocking) */
  function getAchOverrides() { var v = S.get(K.achMeta, {}); return isObj(v) ? v : {}; }
  function setAchOverride(id, patch) { var all = getAchOverrides(); all[id] = Object.assign({}, all[id] || {}, patch); S.set(K.achMeta, all); log('ach.edit', 'Edited achievement display "' + id + '"'); }
  function resetAchOverrides() { S.set(K.achMeta, {}); log('ach.reset', 'Reset achievement display overrides'); }

  /* Config */
  function getConfig() {
    var c = S.get(K.config, null);
    if (!isObj(c)) c = { maintenance: { enabled: false, message: '' }, activeAnnouncementId: null };
    if (!isObj(c.maintenance)) c.maintenance = { enabled: false, message: '' };
    return c;
  }
  function setConfig(patch) { var c = Object.assign({}, getConfig(), patch); S.set(K.config, c); return c; }
  function setMaintenance(enabled, message) { setConfig({ maintenance: { enabled: !!enabled, message: String(message || '') } }); log('settings.change', (enabled ? 'Enabled' : 'Disabled') + ' demo maintenance banner'); }
  function setActiveAnnouncement(id) { setConfig({ activeAnnouncementId: id || null }); log('announce.publish', id ? 'Set active announcement' : 'Cleared active announcement'); }
  function getActiveAnnouncement() {
    var id = getConfig().activeAnnouncementId;
    var pub = getAnnouncements().filter(function (a) { return a.published; });
    if (!id) {
      if (!pub.length) return null;
      var order = { high: 3, medium: 2, low: 1 };
      pub.sort(function (a, b) { return (order[b.priority] || 0) - (order[a.priority] || 0); });
      return pub[0];
    }
    return pub.find(function (a) { return a.id === id; }) || null;
  }

  /* Stats */
  function dashboardStats() {
    var demoPlayers = getPlayers();
    var local = getLocalPlayerRow();
    var totalCompleted = demoPlayers.reduce(function (s, p) { return s + (p.racesCompleted || 0); }, 0) + (local.racesCompleted || 0);
    return {
      demoPlayers: demoPlayers.length, localPlayer: local, totalRacesCompleted: totalCompleted,
      levels: getLevels().length, vehicles: getVehicles().length,
      achievementsTotal: global.MW.achievementService ? global.MW.achievementService.total() : 0,
      achievementsUnlockedLocal: global.MW.achievementService ? global.MW.achievementService.unlockedCount() : 0,
      announcements: getAnnouncements().length, publishedAnnouncements: getAnnouncements().filter(function (a) { return a.published; }).length
    };
  }
  function recentActivity(n) { return getActivity().slice(0, n || 8); }

  function resetAllAdminData() {
    S.set(K.players, seedPlayers());
    S.set(K.levels, seedLevels());
    S.set(K.vehicles, seedVehicles());
    S.set(K.announcements, seedAnnouncements());
    S.set(K.achMeta, {});
    S.set(K.config, { maintenance: { enabled: false, message: '' }, activeAnnouncementId: null });
    log('system', 'Reset all admin demo data');
  }

  function maintenanceEnabled() { return !!getConfig().maintenance.enabled; }
  function maintenanceMessage() { return getConfig().maintenance.message || ''; }

  ensureSeed();

  global.MW = global.MW || {};
  global.MW.adminService = {
    getPlayers: getPlayers, getLocalPlayerRow: getLocalPlayerRow, addPlayer: addPlayer, updatePlayer: updatePlayer, removePlayer: removePlayer,
    getLevels: getLevels, updateLevel: updateLevel, addLevel: addLevel, removeLevel: removeLevel, resetLevels: resetLevels,
    getVehicles: getVehicles, updateVehicle: updateVehicle, addVehicle: addVehicle, removeVehicle: removeVehicle, resetVehicles: resetVehicles,
    getAnnouncements: getAnnouncements, addAnnouncement: addAnnouncement, updateAnnouncement: updateAnnouncement, removeAnnouncement: removeAnnouncement,
    getAchOverrides: getAchOverrides, setAchOverride: setAchOverride, resetAchOverrides: resetAchOverrides,
    getConfig: getConfig, setConfig: setConfig, setMaintenance: setMaintenance, setActiveAnnouncement: setActiveAnnouncement,
    getActiveAnnouncement: getActiveAnnouncement, maintenanceEnabled: maintenanceEnabled, maintenanceMessage: maintenanceMessage,
    dashboardStats: dashboardStats, getActivity: getActivity, recentActivity: recentActivity, clearActivity: clearActivity,
    log: log, resetAllAdminData: resetAllAdminData
  };
})(window);
