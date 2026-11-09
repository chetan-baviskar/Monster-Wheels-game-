/* ============================================================
   MW.utils.validation — shared validators (game UI + admin).
   Each returns an error string, or '' when valid.
   ============================================================ */
(function (global) {
  'use strict';

  function isBlank(s) { return String(s == null ? '' : s).trim() === ''; }

  function displayName(v) {
    var s = String(v == null ? '' : v).trim();
    if (s.length < 3) return 'Name must be at least 3 characters.';
    if (s.length > 20) return 'Name must be 20 characters or fewer.';
    if (!/^[A-Za-z0-9 _\-.]+$/.test(s)) return 'Use only letters, numbers, spaces, and _ - .';
    return '';
  }

  function title(v, min, max) {
    var s = String(v == null ? '' : v).trim();
    min = min || 1; max = max || 60;
    if (s.length < min) return 'Title must be at least ' + min + ' characters.';
    if (s.length > max) return 'Title must be ' + max + ' characters or fewer.';
    return '';
  }

  function description(v, max) {
    var s = String(v == null ? '' : v).trim();
    max = max || 240;
    if (s.length > max) return 'Description must be ' + max + ' characters or fewer.';
    return '';
  }

  function intRange(v, min, max) {
    var n = Number(v);
    if (!isFinite(n) || Math.floor(n) !== n) return 'Enter a whole number.';
    if (n < min || n > max) return 'Enter a number between ' + min + ' and ' + max + '.';
    return '';
  }

  function numRange(v, min, max) {
    var n = Number(v);
    if (!isFinite(n)) return 'Enter a valid number.';
    if (n < min || n > max) return 'Enter a number between ' + min + ' and ' + max + '.';
    return '';
  }

  function oneOf(v, allowed) { return allowed.indexOf(v) === -1 ? 'Choose one of: ' + allowed.join(', ') + '.' : ''; }

  function imageFile(file, maxMB) {
    maxMB = maxMB || 2;
    if (!file) return 'Choose an image file.';
    if (file.type && file.type.indexOf('image/') !== 0) return 'File must be an image (PNG, JPG, GIF, SVG or WebP).';
    if (file.size > maxMB * 1024 * 1024) return 'Image must be ' + maxMB + 'MB or smaller.';
    return '';
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  global.MW = global.MW || {};
  global.MW.validate = {
    isBlank: isBlank, displayName: displayName, title: title, description: description,
    intRange: intRange, numRange: numRange, oneOf: oneOf, imageFile: imageFile, escapeHtml: escapeHtml
  };
})(window);
