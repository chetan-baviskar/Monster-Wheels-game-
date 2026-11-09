/* ============================================================
   MW.utils.storage
   Safe, namespaced localStorage access. Every read is validated
   and falls back to a provided default if the data is missing or
   corrupted. This is the ONLY module that touches localStorage so
   a future backend swap happens in one place.

   FUTURE BACKEND: replace get/set/remove with Firestore/Auth calls.
   ============================================================ */
(function (global) {
  'use strict';
  var PREFIX = 'mw:';

  function available() {
    try {
      var k = PREFIX + '__t';
      global.localStorage.setItem(k, '1');
      global.localStorage.removeItem(k);
      return true;
    } catch (e) { return false; }
  }
  var hasStorage = available();

  function readRaw(key) {
    if (!hasStorage) return null;
    try { return global.localStorage.getItem(PREFIX + key); } catch (e) { return null; }
  }
  function writeRaw(key, value) {
    if (!hasStorage) return false;
    try { global.localStorage.setItem(PREFIX + key, value); return true; } catch (e) { return false; }
  }

  function get(key, fallback, validator) {
    var raw = readRaw(key);
    if (raw == null) return fallback;
    var parsed;
    try { parsed = JSON.parse(raw); } catch (e) { return fallback; }
    if (typeof validator === 'function') {
      try { if (!validator(parsed)) return fallback; } catch (e2) { return fallback; }
    }
    return parsed;
  }

  function set(key, value) {
    var str;
    try { str = JSON.stringify(value); } catch (e) { return false; }
    return writeRaw(key, str);
  }

  function remove(key) {
    if (!hasStorage) return;
    try { global.localStorage.removeItem(PREFIX + key); } catch (e) { /* ignore */ }
  }

  function clearAll() {
    if (!hasStorage) return;
    try {
      var doomed = [];
      for (var i = 0; i < global.localStorage.length; i++) {
        var k = global.localStorage.key(i);
        if (k && k.indexOf(PREFIX) === 0) doomed.push(k);
      }
      doomed.forEach(function (k) { global.localStorage.removeItem(k); });
    } catch (e) { /* ignore */ }
  }

  function keys() {
    var out = [];
    if (!hasStorage) return out;
    try {
      for (var i = 0; i < global.localStorage.length; i++) {
        var k = global.localStorage.key(i);
        if (k && k.indexOf(PREFIX) === 0) out.push(k.slice(PREFIX.length));
      }
    } catch (e) { /* ignore */ }
    return out;
  }

  global.MW = global.MW || {};
  global.MW.storage = { hasStorage: hasStorage, get: get, set: set, remove: remove, clearAll: clearAll, keys: keys };
})(window);
