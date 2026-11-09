/* ============================================================
   MW.audio — tiny WebAudio layer for UI feedback.
   Procedural sounds (no asset downloads). Separate from the 3D
   engine's own SDL audio, which is controlled inside the WASM build.
   ============================================================ */
(function (global) {
  'use strict';
  var ctx = null, enabled = true, volume = 0.6, musicOn = false, padNodes = null;

  function ac() {
    if (ctx) return ctx;
    try { var AC = global.AudioContext || global.webkitAudioContext; ctx = AC ? new AC() : null; } catch (e) { ctx = null; }
    return ctx;
  }
  function resume() { var c = ac(); if (c && c.state === 'suspended') { try { c.resume(); } catch (e) {} } }

  function click(tone) {
    if (!enabled) return;
    var c = ac(); if (!c) return; resume();
    try {
      var osc = c.createOscillator(), gain = c.createGain();
      osc.type = 'triangle'; osc.frequency.value = tone || 520;
      var t = c.currentTime;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume * 0.25), t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      osc.connect(gain); gain.connect(c.destination);
      osc.start(t); osc.stop(t + 0.14);
    } catch (e) { /* ignore */ }
  }
  function success() { click(720); setTimeout(function () { click(960); }, 90); }
  function error() { click(220); }

  function setEnabled(v) { enabled = !!v; if (!enabled) stopPad(); }
  function setVolume(v) { volume = Math.max(0, Math.min(1, Number(v) || 0)); if (padNodes) padNodes.gain.gain.value = musicGain(); }
  function musicGain() { return musicOn ? volume * 0.05 : 0; }

  function startPad() {
    var c = ac(); if (!c) return; if (padNodes) { padNodes.gain.gain.value = musicGain(); return; } resume();
    try {
      var gain = c.createGain(); gain.gain.value = musicGain(); gain.connect(c.destination);
      var o1 = c.createOscillator(); o1.type = 'sine'; o1.frequency.value = 110;
      var o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = 164.81;
      var lfo = c.createOscillator(); lfo.frequency.value = 0.08;
      var lfoGain = c.createGain(); lfoGain.gain.value = 6;
      lfo.connect(lfoGain); lfoGain.connect(o2.frequency);
      o1.connect(gain); o2.connect(gain);
      o1.start(); o2.start(); lfo.start();
      padNodes = { gain: gain, stop: function () { try { o1.stop(); o2.stop(); lfo.stop(); } catch (e) {} } };
    } catch (e) { /* ignore */ }
  }
  function stopPad() { if (padNodes) { try { padNodes.stop(); } catch (e) {} padNodes = null; } }
  function setMusic(on) { musicOn = !!on; if (musicOn) startPad(); else stopPad(); }

  global.MW = global.MW || {};
  global.MW.audio = { resume: resume, click: click, success: success, error: error, setEnabled: setEnabled, setVolume: setVolume, setMusic: setMusic };
})(window);
