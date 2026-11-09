/* ============================================================
   MW.leaderboardService — LOCAL / DEMO leaderboard. No online play.
   - The local player's row is computed from REAL local progress.
   - A small set of clearly-labelled DEMO rows shows the layout;
     they are NOT real people (flagged demo:true).
   - Ranking uses a transparent local-points formula:
        points = completed*100 + levels*25 + minutes*5 + achievements*10
   FUTURE BACKEND: replace getEntries() with a Firestore query; keep
   the same row shape.
   ============================================================ */
(function (global) {
  'use strict';

  var DEMO = [
    { id: 'demo-1', name: 'RampRider', completed: 12, levels: 6, minutes: 74, achievements: 5, demo: true },
    { id: 'demo-2', name: 'CrushKing', completed: 9, levels: 5, minutes: 52, achievements: 4, demo: true },
    { id: 'demo-3', name: 'DirtDash', completed: 6, levels: 4, minutes: 31, achievements: 3, demo: true },
    { id: 'demo-4', name: 'MudMaster', completed: 3, levels: 2, minutes: 18, achievements: 2, demo: true },
    { id: 'demo-5', name: 'GearNewbie', completed: 1, levels: 1, minutes: 6, achievements: 1, demo: true }
  ];

  function pointsOf(e) { return (e.completed || 0) * 100 + (e.levels || 0) * 25 + (e.minutes || 0) * 5 + (e.achievements || 0) * 10; }

  function fmtTime(ms) {
    var s = Math.floor((ms || 0) / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60);
    m = m % 60;
    if (h > 0) return h + 'h ' + m + 'm';
    if (m > 0) return m + 'm ' + (s % 60) + 's';
    return s + 's';
  }

  function localRow() {
    var p = global.MW.playerService ? global.MW.playerService.get() : { displayName: 'Guest Driver', id: 'local' };
    var prog = global.MW.progressService ? global.MW.progressService.get() : {};
    var ach = global.MW.achievementService ? global.MW.achievementService.unlockedCount() : 0;
    var row = {
      id: p.id, name: p.displayName, completed: prog.racesCompleted || 0, levels: (prog.levelsPlayed || []).length,
      minutes: Math.floor((prog.playTimeMs || 0) / 60000), achievements: ach, demo: false, me: true, playTimeMs: prog.playTimeMs || 0
    };
    row.points = pointsOf(row);
    return row;
  }

  function getEntries() {
    var rows = DEMO.map(function (d) { var r = Object.assign({}, d); r.me = false; return r; });
    rows.push(localRow());
    rows.forEach(function (r) { r.points = pointsOf(r); });
    rows.sort(function (a, b) { if (b.points !== a.points) return b.points - a.points; return (b.completed || 0) - (a.completed || 0); });
    rows.forEach(function (r, i) { r.rank = i + 1; });
    return rows;
  }

  function myRank() { var rows = getEntries(); for (var i = 0; i < rows.length; i++) if (rows[i].me) return rows[i].rank; return rows.length; }

  global.MW = global.MW || {};
  global.MW.leaderboardService = { getEntries: getEntries, myRank: myRank, pointsOf: pointsOf, fmtTime: fmtTime, DEMO: DEMO };
})(window);
