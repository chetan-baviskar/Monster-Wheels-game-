/* ============================================================
   MW.achievementService — definitions + unlocking tied strictly to
   real, locally recorded events. Nothing unlocks without a match.
   FUTURE BACKEND: persist unlocks to Firestore; keep this contract.
   ============================================================ */
(function (global) {
  'use strict';
  var KEY = 'achievements';
  var listeners = [];

  var DEFS = [
    { id: 'first_race', icon: '🏁', title: 'First Race', desc: 'Start your very first race.', cond: 'Start 1 race', check: function (p) { return p.racesStarted >= 1; } },
    { id: 'five_races', icon: '🔥', title: 'Five Races', desc: 'Start five races. Keep the wheels spinning!', cond: 'Start 5 races', check: function (p) { return p.racesStarted >= 5; } },
    { id: 'ten_races', icon: '🏆', title: 'Ten Races', desc: 'Start ten races and prove your stamina.', cond: 'Start 10 races', check: function (p) { return p.racesStarted >= 10; } },
    { id: 'finisher', icon: '✅', title: 'Race Finisher', desc: 'Complete a race by reaching the end.', cond: 'Complete 1 race', check: function (p) { return p.racesCompleted >= 1; } },
    { id: 'explorer', icon: '🧭', title: 'Explorer', desc: 'Play on three different levels.', cond: 'Play 3 distinct levels', check: function (p) { return (p.levelsPlayed || []).length >= 3; } },
    { id: 'monster_driver', icon: '👾', title: 'Monster Driver', desc: 'Drive for a total of 10 minutes.', cond: 'Reach 10 minutes of play time', check: function (p) { return p.playTimeMs >= 10 * 60 * 1000; } },
    { id: 'tinkerer', icon: '⚙️', title: 'Tinkerer', desc: 'Customize at least one game setting.', cond: 'Change a setting', check: function (p) { return !!p.customized; } }
  ];

  function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }
  function sanitize(raw) {
    var out = {};
    if (!isObj(raw)) return out;
    DEFS.forEach(function (d) { if (raw[d.id] && typeof raw[d.id] === 'number') out[d.id] = raw[d.id]; });
    return out;
  }

  var unlocked = sanitize(global.MW.storage.get(KEY, null));

  function defs() {
    return DEFS.map(function (d) {
      return { id: d.id, icon: d.icon, title: d.title, desc: d.desc, cond: d.cond, unlockedAt: unlocked[d.id] || null };
    });
  }
  function unlockedCount() { return Object.keys(unlocked).length; }
  function total() { return DEFS.length; }

  function evaluate(progress) {
    var news = [];
    DEFS.forEach(function (d) {
      if (unlocked[d.id]) return;
      var ok = false;
      try { ok = !!d.check(progress || {}); } catch (e) { ok = false; }
      if (ok) { unlocked[d.id] = Date.now(); news.push(d); }
    });
    if (news.length) { global.MW.storage.set(KEY, unlocked); emit(); }
    return news;
  }

  function reset() { unlocked = {}; global.MW.storage.set(KEY, unlocked); emit(); }
  function onChange(fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; }
  function emit() { listeners.forEach(function (f) { try { f(); } catch (e) { console.error(e); } }); }

  global.MW = global.MW || {};
  global.MW.achievementService = { defs: defs, evaluate: evaluate, unlockedCount: unlockedCount, total: total, reset: reset, onChange: onChange, DEFS: DEFS };
})(window);
