var SETTINGS_KEY = 'prusa_settings';
var POLL_MS = 10000;
var pollTimer = null;

// ↓↓↓ HIER deine GitHub-Pages-URL eintragen ↓↓↓
var CONFIG_URL = 'https://DEIN-NAME.github.io/DEIN-REPO/config.html';
// ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑

function getSettings() {
  try {
    var s = localStorage.getItem(SETTINGS_KEY);
    return s ? JSON.parse(s) : { ip: '', apiKey: '' };
  } catch (e) {
    return { ip: '', apiKey: '' };
  }
}

function fetchAndSend() {
  var cfg = getSettings();
  if (!cfg.ip || !cfg.apiKey) {
    console.log('Keine Einstellungen vorhanden');
    return;
  }
  var xhr = new XMLHttpRequest();
  xhr.open('GET', 'http://' + cfg.ip + '/api/v1/status', true);
  xhr.setRequestHeader('X-Api-Key', cfg.apiKey);
  xhr.timeout = 8000;
  xhr.onload = function () {
    if (xhr.status !== 200) return;
    try {
      var d = JSON.parse(xhr.responseText);
      var printer = d.printer || {};
      var job = d.job || {};
      Pebble.sendAppMessage({
        'NOZZLE_TEMP': Math.round(printer.temp_nozzle || 0),
        'BED_TEMP':    Math.round(printer.temp_bed    || 0),
        'PROGRESS':    Math.round(job.progress        || 0)
      },
      function()  { console.log('Gesendet'); },
      function(e) { console.log('Sendefehler: ' + JSON.stringify(e)); });
    } catch (e) { console.log('Parse-Fehler: ' + e); }
  };
  xhr.onerror   = function () { console.log('Verbindungsfehler'); };
  xhr.ontimeout = function () { console.log('Timeout'); };
  xhr.send();
}

Pebble.addEventListener('ready', function () {
  console.log('PebbleKit bereit');
  fetchAndSend();
  pollTimer = setInterval(fetchAndSend, POLL_MS);
});

Pebble.addEventListener('showConfiguration', function () {
  // Aktuelle Einstellungen als Hash mitgeben, damit die Seite sie vorausfüllt
  var cfg = getSettings();
  var hash = encodeURIComponent(JSON.stringify(cfg));
  Pebble.openURL(CONFIG_URL + '#' + hash);
});

Pebble.addEventListener('webviewclosed', function (e) {
  if (!e.response || e.response === 'CANCELLED' || e.response === '') return;
  try {
    var cfg = JSON.parse(decodeURIComponent(e.response));
    if (!cfg.ip || !cfg.apiKey) return;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(cfg));
    console.log('Gespeichert: ' + cfg.ip);
    if (pollTimer) clearInterval(pollTimer);
    fetchAndSend();
    pollTimer = setInterval(fetchAndSend, POLL_MS);
  } catch (err) {
    console.log('Fehler: ' + err);
  }
});
