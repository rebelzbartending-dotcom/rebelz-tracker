/* Rebelz Admin / Store app — install button + offline helper.
   Used by admin.html and store.html only. */
(function () {
  var APP = (document.currentScript && document.currentScript.getAttribute('data-app')) || 'admin';
  var NAME = APP === 'store' ? 'Rebelz Store' : 'Rebelz Admin';
  var DISMISS_KEY = 'rbz_install_dismissed_' + APP;

  // 1) Register the service worker (keeps the page saved on the phone)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function () {});
    });
  }

  var standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (standalone) return; // already opened as the app: no button

  function dismissedRecently() {
    try { var t = +localStorage.getItem(DISMISS_KEY); return t && (Date.now() - t) < 7 * 864e5; } catch (e) { return false; }
  }
  function remember() { try { localStorage.setItem(DISMISS_KEY, Date.now()); } catch (e) {} }

  var ua = navigator.userAgent || '';
  var isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var deferred = null;

  var css = document.createElement('style');
  css.textContent =
    '#rbz-inst{position:fixed;right:14px;bottom:calc(16px + env(safe-area-inset-bottom));z-index:10000;display:none;align-items:center;gap:8px;' +
    'background:#ffc447;color:#1b1328;font-family:"Unbounded",sans-serif;font-weight:700;font-size:11px;letter-spacing:.06em;' +
    'padding:10px 10px 10px 14px;border-radius:30px;box-shadow:0 10px 30px #00000080,0 0 0 2px #150f1f;cursor:pointer;border:0}' +
    '#rbz-inst img{width:22px;height:22px;border-radius:6px}' +
    '#rbz-inst .x{background:#1b132822;border-radius:50%;width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;font-size:13px;margin-left:2px}' +
    '#rbz-ios{position:fixed;inset:0;z-index:10001;background:#000a;display:none;align-items:flex-end;justify-content:center}' +
    '#rbz-ios .sh{background:#1e1630;color:#fff4e2;border:1.5px solid #3a2e58;border-radius:24px 24px 0 0;padding:22px 20px calc(26px + env(safe-area-inset-bottom));width:100%;max-width:460px;font-family:"Plus Jakarta Sans",sans-serif}' +
    '#rbz-ios h3{font-family:"Fraunces",serif;font-style:italic;font-size:24px;margin:0 0 14px}' +
    '#rbz-ios ol{margin:0 0 18px 18px;padding:0;font-size:14px;line-height:1.9;color:#d9cdef}' +
    '#rbz-ios b{color:#ffc447}' +
    '#rbz-ios button{width:100%;background:#3de0d2;color:#1b1328;border:0;border-radius:14px;padding:13px;font-family:"Unbounded",sans-serif;font-weight:700;font-size:12px}';
  document.head.appendChild(css);

  function build() {
    var chip = document.createElement('button');
    chip.id = 'rbz-inst';
    chip.innerHTML = '<img src="icons/' + APP + '-192.png" alt=""/>INSTALL APP<span class="x" aria-label="Close">✕</span>';
    document.body.appendChild(chip);

    var sheet = document.createElement('div');
    sheet.id = 'rbz-ios';
    sheet.innerHTML = '<div class="sh"><h3>Install ' + NAME + '</h3><ol>' +
      '<li>Open this page in <b>Safari</b></li>' +
      '<li>Tap the <b>Share</b> button (square with arrow ↑)</li>' +
      '<li>Scroll and tap <b>Add to Home Screen</b></li>' +
      '<li>Tap <b>Add</b>: the ' + NAME + ' icon appears on your phone</li>' +
      '</ol><button type="button">Got it</button></div>';
    document.body.appendChild(sheet);

    chip.addEventListener('click', function (e) {
      if (e.target.classList.contains('x')) { chip.style.display = 'none'; remember(); return; }
      if (deferred) {
        deferred.prompt();
        deferred.userChoice.then(function (r) { if (r.outcome === 'accepted') chip.style.display = 'none'; deferred = null; });
      } else if (isIOS) {
        sheet.style.display = 'flex';
      }
    });
    sheet.addEventListener('click', function (e) {
      if (e.target === sheet || e.target.tagName === 'BUTTON') sheet.style.display = 'none';
    });
    return chip;
  }

  var chip = null;
  function show() {
    if (dismissedRecently()) return;
    if (!chip) chip = build();
    chip.style.display = 'inline-flex';
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferred = e;
    if (document.body) show(); else document.addEventListener('DOMContentLoaded', show);
  });
  window.addEventListener('appinstalled', function () { if (chip) chip.style.display = 'none'; });

  if (isIOS) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show); else show();
  }
})();
