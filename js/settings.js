document.addEventListener('DOMContentLoaded', function () {
  fetch('content/settings.json')
    .then(function (r) { return r.json(); })
    .then(applySettings)
    .catch(function () { /* fall back silently to hardcoded HTML defaults */ });
});

function applySettings(data) {
  // plain text / textarea-sourced fields
  document.querySelectorAll('[data-setting]').forEach(function (el) {
    var key = el.getAttribute('data-setting');
    if (data[key] === undefined || data[key] === '') return;
    el.textContent = data[key];
  });

  // phone / email / instagram need both visible text AND a working link href
  var phoneEl = document.querySelector('[data-setting-phone]');
  if (phoneEl && data.contact_phone) {
    phoneEl.textContent = data.contact_phone;
    var telDigits = data.contact_phone.replace(/[^\d+]/g, '');
    if (phoneEl.tagName === 'A') phoneEl.href = 'tel:' + telDigits;
  }
  var emailEl = document.querySelector('[data-setting-email]');
  if (emailEl && data.contact_email) {
    emailEl.textContent = data.contact_email;
    if (emailEl.tagName === 'A') emailEl.href = 'mailto:' + data.contact_email;
  }
  var igEl = document.querySelector('[data-setting-instagram]');
  if (igEl && data.contact_instagram) {
    igEl.textContent = data.contact_instagram;
    if (igEl.tagName === 'A') igEl.href = 'https://instagram.com/' + data.contact_instagram.replace('@', '');
  }

  // catalog card shape (stamp vs plain) — read by portfolio.html / index.html too
  if (data.catalog_style === 'plain') {
    document.documentElement.classList.add('catalog-plain');
  }
  window.EKAM_SETTINGS = data; // so portfolio.html's own render logic can read catalog_style
}
