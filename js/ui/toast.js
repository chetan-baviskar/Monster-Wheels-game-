/* ============================================================
   MW.ui — toast notifications, modal + confirm dialogs (game side).
   Modals trap focus, close on Escape, and restore focus.
   ============================================================ */
(function (global) {
  'use strict';
  var toastHost = null;

  function ensureToastHost() {
    if (toastHost && document.body.contains(toastHost)) return toastHost;
    toastHost = document.createElement('div');
    toastHost.id = 'mw_toasts';
    toastHost.setAttribute('role', 'status');
    toastHost.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastHost);
    return toastHost;
  }
  var ICONS = { success: '✅', error: '⚠️', info: 'ℹ️', warn: '⚠️' };

  function toast(opts) {
    opts = opts || {};
    var type = opts.type || 'info';
    var host = ensureToastHost();
    var el = document.createElement('div');
    el.className = 'mw-toast mw-toast--' + type;
    var ico = document.createElement('span'); ico.className = 'mw-toast__ico'; ico.textContent = ICONS[type] || ICONS.info;
    var body = document.createElement('div'); body.className = 'mw-toast__body';
    var t = document.createElement('div'); t.className = 'mw-toast__title'; t.textContent = opts.title || ''; body.appendChild(t);
    if (opts.msg) { var m = document.createElement('div'); m.className = 'mw-toast__msg'; m.textContent = opts.msg; body.appendChild(m); }
    var x = document.createElement('button'); x.className = 'mw-toast__x'; x.setAttribute('aria-label', 'Dismiss'); x.textContent = '×';
    x.addEventListener('click', remove);
    el.appendChild(ico); el.appendChild(body); el.appendChild(x);
    host.appendChild(el);
    var timer = null;
    var timeout = opts.timeout != null ? opts.timeout : (type === 'error' ? 6000 : 3800);
    if (timeout > 0) timer = setTimeout(remove, timeout);
    function remove() {
      if (timer) clearTimeout(timer);
      if (!el.parentNode) return;
      el.classList.add('out');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 200);
    }
    return { remove: remove };
  }

  var activeModal = null;

  function openModal(config) {
    closeModal();
    config = config || {};
    var previouslyFocused = document.activeElement;
    var overlay = document.createElement('div');
    overlay.className = 'mw-modal show';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', config.title || 'Dialog');
    var card = document.createElement('div'); card.className = 'mw-modal__card';
    var head = document.createElement('div'); head.className = 'mw-modal__head';
    var h = document.createElement('h2'); h.className = 'mw-modal__title'; h.textContent = config.title || '';
    var closeBtn = document.createElement('button'); closeBtn.className = 'mw-modal__x'; closeBtn.setAttribute('aria-label', 'Close'); closeBtn.textContent = '×';
    head.appendChild(h); head.appendChild(closeBtn);
    var body = document.createElement('div'); body.className = 'mw-modal__body';
    if (typeof config.body === 'string') body.innerHTML = config.body; else if (config.body) body.appendChild(config.body);
    card.appendChild(head); card.appendChild(body);

    var api = { el: card, body: body, close: closeModal };

    if (config.buttons && config.buttons.length) {
      var foot = document.createElement('div'); foot.className = 'mw-modal__foot';
      config.buttons.forEach(function (b) {
        var btn = document.createElement('button');
        btn.className = 'mw-btn ' + (b.cls || ''); btn.textContent = b.label; if (b.id) btn.id = b.id;
        btn.addEventListener('click', function () {
          if (b.onClick) { var keep = b.onClick(api); if (keep === false) return; }
          if (b.close !== false) closeModal();
        });
        foot.appendChild(btn);
      });
      card.appendChild(foot);
    }

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    function onKey(e) {
      if (e.key === 'Escape') { e.stopPropagation(); if (config.onClose) config.onClose(); closeModal(); return; }
      if (e.key === 'Tab') trapFocus(e, card);
    }
    overlay.addEventListener('keydown', onKey);
    overlay.addEventListener('mousedown', function (e) { if (e.target === overlay && config.dismissOnBackdrop !== false) closeModal(); });
    closeBtn.addEventListener('click', function () { if (config.onClose) config.onClose(); closeModal(); });

    activeModal = { overlay: overlay, previouslyFocused: previouslyFocused };
    var focusables = card.querySelector('input, select, textarea, button.mw-btn');
    (focusables || closeBtn).focus();
    return api;
  }

  function closeModal() {
    if (!activeModal) return;
    var m = activeModal; activeModal = null;
    if (m.overlay.parentNode) m.overlay.parentNode.removeChild(m.overlay);
    if (m.previouslyFocused && m.previouslyFocused.focus) { try { m.previouslyFocused.focus(); } catch (e) {} }
  }
  function isOpen() { return !!activeModal; }

  function trapFocus(e, container) {
    var nodes = container.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
    if (!nodes.length) return;
    var first = nodes[0], last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function confirm(opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var settled = false;
      function done(v) { if (!settled) { settled = true; resolve(v); } }
      openModal({
        title: opts.title || 'Are you sure?',
        body: '<p style="margin:0;line-height:1.6">' + (opts.msg || '') + '</p>',
        dismissOnBackdrop: false,
        onClose: function () { done(false); },
        buttons: [
          { label: opts.cancelLabel || 'Cancel', cls: 'mw-btn--ghost', onClick: function () { done(false); } },
          { label: opts.confirmLabel || 'Confirm', cls: opts.danger ? 'mw-btn--danger' : 'mw-btn--primary', onClick: function () { done(true); } }
        ]
      });
    });
  }

  global.MW = global.MW || {};
  global.MW.ui = { toast: toast, openModal: openModal, closeModal: closeModal, isOpen: isOpen, confirm: confirm };
})(window);
