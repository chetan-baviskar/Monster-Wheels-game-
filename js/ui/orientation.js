/* ============================================================
   MW.orientation — encourages landscape on narrow phones while
   playing. Never blocks tablets/laptops/desktops.
   ============================================================ */
(function (global) {
  'use strict';
  var el = null, active = false;

  function ensure() {
    if (el && document.body.contains(el)) return el;
    el = document.createElement('div');
    el.id = 'mw_rotate';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-live', 'polite');
    el.innerHTML =
      '<div class="mw-rotate__inner">' +
      '  <div class="mw-rotate__ico">📱</div>' +
      '  <div class="mw-rotate__title">Rotate your device</div>' +
      '  <p class="mw-rotate__desc">Monster Wheels plays best in landscape. Turn your phone sideways to drive.</p>' +
      '</div>';
    document.body.appendChild(el);
    return el;
  }
  function evaluate() {
    if (!active) { hide(); return; }
    var portrait = global.matchMedia('(orientation: portrait)').matches;
    var narrow = global.matchMedia('(max-width: 720px)').matches;
    var coarse = global.matchMedia('(pointer: coarse)').matches;
    if (portrait && narrow && coarse) show(); else hide();
  }
  function show() { ensure(); el.classList.add('show'); }
  function hide() { if (el) el.classList.remove('show'); }
  function setActive(v) { active = !!v; evaluate(); }
  function init() {
    global.addEventListener('resize', evaluate, { passive: true });
    global.addEventListener('orientationchange', function () { setTimeout(evaluate, 120); });
    evaluate();
  }

  global.MW = global.MW || {};
  global.MW.orientation = { init: init, setActive: setActive, evaluate: evaluate };
})(window);
