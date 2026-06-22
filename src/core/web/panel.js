// Engram WebUI control panel logic.
'use strict';
var D = null;
var _toastTimer = null;
window._coreData = null;
window._coreLoading = false;
window._coreOptions = { scope: 'all', semantic: true };

var Draft = {};
var Dirty = {};
var RowErrors = {};
var _pendingPatch = null;

// ── Utilities ────────────────────────────────────────────────────────────────
function gv(obj, key) {
  return key.split('.').reduce(function(o, p) { return o == null ? o : o[p]; }, obj);
}
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escJs(s) {
  return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}
function fmtDate(s) {
  if (!s) return '—';
  try { var d = new Date(s); return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}); } catch(e) { return s; }
}
function relTime(s) {
  if (!s) return '—';
  try {
    var diff = Date.now() - new Date(s).getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return Math.floor(diff/60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff/3600000) + 'h ago';
    return Math.floor(diff/86400000) + 'd ago';
  } catch(e) { return s; }
}

// ── Nav ──────────────────────────────────────────────────────────────────────
document.querySelectorAll('[data-tab]').forEach(function(el) {
  el.addEventListener('click', function() { switchTab(el.getAttribute('data-tab')); });
});
function switchTab(name) {
  document.querySelectorAll('[data-tab]').forEach(function(el) {
    el.classList.toggle('active', el.getAttribute('data-tab') === name);
  });
  document.querySelectorAll('.tab-pane').forEach(function(el) {
    el.classList.toggle('active', el.id === 'tab-' + name);
  });
  var app = document.querySelector('.app');
  if (app) app.classList.remove('sb-open');

  if (name === 'connection') {
    scanAgents();
  }
  if (name === 'core') {
    loadCore(false);
  }
}

function toggleSidebar() {
  var app = document.querySelector('.app');
  if (app) app.classList.toggle('sb-open');
}

// ── Theme ────────────────────────────────────────────────────────────────────
function applyTheme() {
  if (!D || !D.config) return;
  var isDark = D.config.theme !== 'light';
  document.documentElement.classList.toggle('light', !isDark);
  var tgl = document.getElementById('theme-toggle');
  if (tgl) {
    tgl.classList.toggle('on', isDark);
  }
}

async function toggleTheme() {
  if (!D || !D.config) return;
  var isDark = D.config.theme !== 'light';
  var nextTheme = isDark ? 'light' : 'dark';
  D.config.theme = nextTheme;
  applyTheme();
  await api('/api/config', {patch: {theme: nextTheme}});
}

// ── Version & Upgrade ────────────────────────────────────────────────────────
function cpVersion() {
  var el = document.getElementById('sb-version');
  if (!el || !el.textContent) return;
  navigator.clipboard.writeText(el.textContent).catch(function(){});
  toast('Copied version ' + el.textContent);
}

function cpUpgradeCmd() {
  navigator.clipboard.writeText('npm i -g @the-long-ride/engram@latest\nengram upgrade --latest').catch(function(){});
  toast('Copied upgrade command');
}

function isNewer(latest, current) {
  var lParts = latest.split('.').map(Number);
  var cParts = current.split('.').map(Number);
  for (var i = 0; i < Math.max(lParts.length, cParts.length); i++) {
    var l = lParts[i] || 0;
    var c = cParts[i] || 0;
    if (l > c) return true;
    if (l < c) return false;
  }
  return false;
}

async function checkLatestVersion() {
  if (window._checkedLatest) return;
  try {
    var res = await fetch('https://registry.npmjs.org/@the-long-ride/engram/latest');
    if (!res.ok) return;
    var data = await res.json();
    var latest = data.version;
    var current = D.version;
    if (latest && current && isNewer(latest, current)) {
      var alertEl = document.getElementById('sb-upgrade');
      if (alertEl) alertEl.style.display = 'flex';
    }
    window._checkedLatest = true;
  } catch(e) {}
}

function resetDraft() {
  Draft = {};
  Dirty = {};
  RowErrors = {};
  (D.configFields || []).forEach(function(field) {
    Draft[field.key] = uiValue(field, gv(D.config, field.key));
  });
}

function uiValue(field, value) {
  if (field.input === 'roles') return Array.isArray(value) ? value.join(', ') : String(value || '');
  if (field.input === 'toggle') return String(value === true || value === 'true');
  return value == null ? '' : String(value);
}

function fieldByKey(key) {
  return (D.configFields || []).find(function(field) { return field.key === key; });
}

function groupFields(fields) {
  return fields.reduce(function(groups, field) {
    if (!groups[field.group]) groups[field.group] = [];
    groups[field.group].push(field);
    return groups;
  }, {});
}

function dirtyCount() {
  return Object.keys(Dirty).filter(function(key) { return Dirty[key]; }).length;
}

// ── Data ─────────────────────────────────────────────────────────────────────
async function load() {
  try {
    var r = await fetch('/api/data');
    var j = await r.json();
    if (!r.ok) { showErr('Server error (' + r.status + '): ' + (j.error || 'Unknown')); return; }
    D = j;
    resetDraft();
    document.getElementById('sb-cwd').textContent = D.cwd || '';
    document.getElementById('sb-cwd').title = D.cwd || '';
    var verEl = document.getElementById('sb-version');
    if (verEl) verEl.textContent = D.version || '';
    renderAll();
    checkLatestVersion();
  } catch(e) { showErr('Load failed: ' + e.message); }
}

function showErr(msg) {
  document.querySelectorAll('.tab-pane').forEach(function(p) {
    p.innerHTML = '<div class="loading" style="color:var(--red);flex-direction:column;gap:12px">' +
      '<span>⚠️ ' + esc(msg) + '</span>' +
      '<button class="btn btn-outline" onclick="load()">Retry</button>' +
      '</div>';
  });
  toast(msg, false);
}

function renderAll() {
  applyTheme();
  renderInitBanner();
  renderConfig();
  renderProfiles();
  renderWorkspaces();
  renderRuntime();
  if (window._agentsData) {
    renderConnection();
  }
}

// ── API call ─────────────────────────────────────────────────────────────────
async function api(url, body) {
  try {
    var r = await fetch(url, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    var j = await r.json();
    if (!r.ok) { toast(j.error || 'Request failed', false); return false; }
    toast(j.message || 'Saved');
    await load();
    return j;
  } catch(e) { toast(e.message, false); return false; }
}

// ── Toast ────────────────────────────────────────────────────────────────────
function toast(msg, ok) {
  if (ok === undefined) ok = true;
  var el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'show ' + (ok ? 'ok' : 'err');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(function() { el.className = ''; }, 3200);
}

// ── Config tab ───────────────────────────────────────────────────────────────
function renderConfig() {
  if (!D) return;
  var html = '<div class="tab-hdr"><h1>Construct</h1><p>User-level settings applied across all workspaces.</p></div>';
  if (!D.sqliteAvailable) {
    html += '<div class="banner banner-info">Running in JSON config mode. Settings are editable, but profiles and workspaces require SQLite.</div>';
  }

  html += renderConfigActions();

  var groups = groupFields(D.configFields || []);
  var groupNames = Object.keys(groups);
  var col1Html = '<div class="grid-col">';
  var col2Html = '<div class="grid-col">';

  groupNames.forEach(function(group, idx) {
    var cardHtml = '<div class="card"><div class="card-hdr"><span class="card-title">' + esc(group) + '</span></div><div>';
    groups[group].forEach(function(field) {
      cardHtml += renderCfgRow(field, Draft[field.key], true);
    });
    cardHtml += '</div></div>';
    if (idx % 2 === 0) col1Html += cardHtml;
    else col2Html += cardHtml;
  });

  col1Html += '</div>';
  col2Html += '</div>';
  html += '<div class="grid-2">' + col1Html + col2Html + '</div>';
  document.getElementById('tab-config').innerHTML = html;
}

function renderConfigActions() {
  var count = dirtyCount();
  if (!count) return '';
  return '<div class="config-actions">' +
    '<span><strong>' + count + '</strong> unsaved ' + (count === 1 ? 'change' : 'changes') + '</span>' +
    '<div class="config-actions-btns">' +
      '<button class="btn btn-outline" onclick="discardCfgDraft()">Reset</button>' +
      '<button class="btn btn-primary" onclick="openCfgReview()">Save changes</button>' +
    '</div>' +
    '</div>';
}

function renderCfgRow(f, val, editable) {
  var strV = val == null ? '' : String(val);
  var ctl = '';
  var dirty = Dirty[f.key] ? ' dirty' : '';
  var err = RowErrors[f.key] ? '<span class="cfg-error">' + esc(RowErrors[f.key]) + '</span>' : '';

  if (!editable) {
    ctl = '<span class="badge badge-neutral">' + esc(strV || '-') + '</span>';
  } else if (f.input === 'toggle') {
    var on = strV === 'true';
    ctl = '<div class="tgl' + (on ? ' on' : '') + '" data-key="' + esc(f.key) + '" onclick="tglCfg(this)" title="' + esc(f.key) + '"><div class="tgl-thumb"></div></div>';
  } else if (f.input === 'select') {
    var optionsList = f.options || [];
    if (f.key === 'default_profile') {
      optionsList = [''];
      if (D && D.profiles) {
        D.profiles.forEach(function(p) {
          if (p.name && optionsList.indexOf(p.name) === -1) {
            optionsList.push(p.name);
          }
        });
      }
      if (strV && optionsList.indexOf(strV) === -1) {
        optionsList.push(strV);
      }
    }
    var opts = optionsList.map(function(o) {
      var display = o === '' ? '<none>' : o;
      return '<option' + (o === strV ? ' selected' : '') + ' value="' + esc(o) + '">' + esc(display) + '</option>';
    }).join('');
    ctl = '<select class="cfg-select" data-key="' + esc(f.key) + '" onchange="changeCfg(this.dataset.key, this.value)">' + opts + '</select>';
  } else if (f.input === 'number') {
    ctl = '<input class="cfg-input" type="number" value="' + esc(strV) + '"' + (f.min!=null?' min="'+f.min+'"':'') + (f.max!=null?' max="'+f.max+'"':'') + (f.step!=null?' step="'+f.step+'"':'') + ' data-key="' + esc(f.key) + '" onblur="changeCfg(this.dataset.key, this.value)">';
  } else {
    var placeholder = f.input === 'roles' ? 'agent, reviewer' : '';
    ctl = '<input class="cfg-input wide" type="text" value="' + esc(strV) + '" placeholder="' + esc(placeholder) + '" data-key="' + esc(f.key) + '" onblur="changeCfg(this.dataset.key, this.value)">';
  }

  var desc = f.description ? '<span class="cfg-desc">' + esc(f.description) + '</span>' : '';
  var reset = Dirty[f.key] ? '<button class="cfg-reset" onclick="resetCfgField(\'' + esc(escJs(f.key)) + '\')">Reset</button>' : '';
  return '<div class="cfg-row' + dirty + '" data-key="' + esc(f.key) + '">' +
    '<div class="cfg-lbl">' + esc(f.label) + desc + err + '</div>' +
    '<div class="cfg-ctl">' + ctl + reset + '</div>' +
    '</div>';
}

function tglCfg(el) {
  el.classList.toggle('on');
  changeCfg(el.dataset.key, String(el.classList.contains('on')));
}

async function changeCfg(key, value) {
  var field = fieldByKey(key);
  if (!field) return;
  Draft[key] = value;
  RowErrors[key] = clientValidationError(field, value);
  Dirty[key] = value !== uiValue(field, gv(D.config, key));

  if (key === 'global_path' && !RowErrors[key] && value) {
    var res = await postJson('/api/config/validate', { patch: { global_path: value } });
    if (res) {
      if (res.ok === false) {
        var issue = (res.issues || []).find(function(i) { return i.key === 'global_path'; });
        if (issue) {
          RowErrors['global_path'] = issue.message;
        }
      } else {
        RowErrors['global_path'] = '';
      }
    }
  }

  renderConfig();
}

function resetCfgField(key) {
  var field = fieldByKey(key);
  if (!field) return;
  Draft[key] = uiValue(field, gv(D.config, key));
  Dirty[key] = false;
  delete RowErrors[key];
  renderConfig();
}

function discardCfgDraft() {
  resetDraft();
  renderConfig();
}

function clientValidationError(field, value) {
  if (field.input === 'number') {
    var n = Number(value);
    if (!Number.isFinite(n)) return field.label + ' must be a number';
    if ((field.step || 1) >= 1 && Math.floor(n) !== n) return field.label + ' must be an integer';
    if (field.min != null && n < field.min) return field.label + ' must be at least ' + field.min;
    if (field.max != null && n > field.max) return field.label + ' must be at most ' + field.max;
  }
  if (field.input === 'roles') {
    var rawRoles = String(value || '').trim() === '' ? [] : String(value || '').split(',');
    var roles = rawRoles.map(function(role) { return role.trim(); });
    if (roles.some(function(role) { return !role; })) {
      return 'roles cannot contain empty role names';
    }
    var bad = roles.find(function(role) { return !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/.test(role); });
    if (bad) return 'Invalid role: ' + bad;
  }
  if ((field.key === 'global_git.remote' || field.key.indexOf('.branch') > -1) && /\s/.test(String(value || ''))) {
    return field.label + ' cannot contain whitespace';
  }
  return '';
}

function buildPatch() {
  var patch = {};
  Object.keys(Dirty).forEach(function(key) {
    if (Dirty[key]) patch[key] = Draft[key];
  });
  return patch;
}

function hasClientErrors() {
  return Object.keys(RowErrors).some(function(key) { return RowErrors[key]; });
}

function openCfgReview() {
  if (hasClientErrors()) {
    toast('Fix highlighted config values before saving', false);
    return;
  }
  var patch = buildPatch();
  var keys = Object.keys(patch);
  if (!keys.length) return;
  _pendingPatch = patch;

  var risky = keys.filter(function(key) {
    var field = fieldByKey(key);
    return field && field.risk === 'risky';
  });
  var rows = keys.map(function(key) {
    var field = fieldByKey(key);
    return '<tr><td class="mono">' + esc(key) + '</td><td>' + esc(uiValue(field, gv(D.config, key)) || '-') + '</td><td>' + esc(String(patch[key]) || '-') + '</td></tr>';
  }).join('');

  var riskHtml = risky.length ? '<label class="confirm-line"><input type="checkbox" id="cfg-risk-ok"> I reviewed risky changes: ' + esc(risky.join(', ')) + '</label>' : '';
  showModal(
    '<div class="modal-panel">' +
      '<div class="modal-hdr"><h2>Review config changes</h2><button onclick="closeModal()">&times;</button></div>' +
      '<div class="modal-body"><table class="review-table"><thead><tr><th>Key</th><th>Current</th><th>New</th></tr></thead><tbody>' + rows + '</tbody></table>' + riskHtml + '</div>' +
      '<div class="modal-actions"><button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="confirmCfgSave()">Save</button></div>' +
    '</div>'
  );
}

async function confirmCfgSave() {
  if (!_pendingPatch) return;
  var risky = Object.keys(_pendingPatch).some(function(key) {
    var field = fieldByKey(key);
    return field && field.risk === 'risky';
  });
  var riskOk = document.getElementById('cfg-risk-ok');
  if (risky && (!riskOk || !riskOk.checked)) {
    toast('Confirm risky config changes first', false);
    return;
  }

  var validation = await postJson('/api/config/validate', { patch: _pendingPatch });
  if (!validation || validation.ok === false) {
    markServerIssues(validation && validation.issues ? validation.issues : []);
    closeModal();
    renderConfig();
    toast('Config validation failed', false);
    return;
  }

  var saved = await api('/api/config', { patch: _pendingPatch });
  if (saved) {
    _pendingPatch = null;
    closeModal();
  }
}

async function postJson(url, body) {
  try {
    var r = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
    var j = await r.json();
    if (!r.ok) {
      toast(j.error || 'Request failed', false);
      return null;
    }
    return j;
  } catch(e) {
    toast(e.message, false);
    return null;
  }
}

function markServerIssues(issues) {
  RowErrors = {};
  (issues || []).forEach(function(issue) {
    if (issue.key) RowErrors[issue.key] = issue.message;
  });
}

var _modalKeyHandler = null;

function showModal(html, onKeyDown) {
  closeModal();
  var wrap = document.createElement('div');
  wrap.id = 'modal-root';
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = html;
  document.body.appendChild(wrap);
  if (onKeyDown) {
    _modalKeyHandler = onKeyDown;
    document.addEventListener('keydown', _modalKeyHandler);
  }
}

function closeModal() {
  if (_modalKeyHandler) {
    document.removeEventListener('keydown', _modalKeyHandler);
    _modalKeyHandler = null;
  }
  var existing = document.getElementById('modal-root');
  if (existing) existing.remove();
}

function confirmAction(opts) {
  return new Promise(function(resolve) {
    var resolved = false;
    var title = opts && opts.title ? opts.title : 'Confirm action';
    var body = opts && opts.body ? opts.body : 'Continue?';
    var confirmText = opts && opts.confirmText ? opts.confirmText : 'Confirm';
    var danger = opts && opts.danger === true;
    function finish(value) {
      if (resolved) return;
      resolved = true;
      closeModal();
      resolve(value);
    }
    function onKey(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        finish(false);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        finish(true);
      }
    }
    // <button class="btn btn-outline" data-confirm-cancel
    // <button class="btn btn-primary" data-confirm-confirm
    showModal(
      '<div class="modal-panel confirm-panel" role="dialog" aria-modal="true" aria-labelledby="confirm-title">' +
        '<div class="modal-hdr"><h2 id="confirm-title">' + esc(title) + '</h2><button data-confirm-close aria-label="Close">&times;</button></div>' +
        '<div class="modal-body"><p class="confirm-copy">' + esc(body) + '</p></div>' +
        '<div class="modal-actions confirm-actions">' +
          '<button class="btn btn-outline" data-confirm-cancel>Cancel</button>' +
          '<button class="' + (danger ? 'btn btn-danger-solid' : 'btn btn-primary') + '" data-confirm-confirm>' + esc(confirmText) + '</button>' +
        '</div>' +
      '</div>',
      onKey
    );
    var cancel = document.querySelector('[data-confirm-cancel]');
    var confirm = document.querySelector('[data-confirm-confirm]');
    var close = document.querySelector('[data-confirm-close]');
    if (cancel) cancel.addEventListener('click', function() { finish(false); }, { once: true });
    if (close) close.addEventListener('click', function() { finish(false); }, { once: true });
    if (confirm) confirm.addEventListener('click', function() { finish(true); }, { once: true });
    if (cancel) cancel.focus();
  });
}


// ── Profiles tab ─────────────────────────────────────────────────────────────
function renderProfiles() {
  if (!D) return;
  var html = '<div class="tab-hdr"><h1>Profiles</h1><p>Isolated global memory roots for different contexts (personal, company, team).</p></div>';
  if (!D.sqliteAvailable) {
    html += '<div class="banner banner-warn">⚠️ SQLite unavailable — profile management requires SQLite.</div>';
  }
  if (D.sqliteAvailable) {
    html += '<div class="tab-actions"><button class="btn btn-primary" onclick="toggleAddProfile()">+ Add Profile</button></div>';
    html += '<div class="add-form-row" id="pf-form">' +
      '<div class="form-group"><label class="form-label">Name</label><input class="form-input" id="pf-name" placeholder="e.g. personal" style="width:160px"></div>' +
      '<div class="form-group"><label class="form-label">Global Path</label><div class="input-with-btn"><input class="form-input" id="pf-path" placeholder="~/Documents/engram" style="width:320px"><button class="btn btn-outline" onclick="browseFolder(\'pf-path\')">Browse</button></div></div>' +
      '<div class="form-group"><label class="form-label">Scope</label><select class="form-select" id="pf-scope"><option>global</option><option>workspace</option><option>both</option></select></div>' +
      '<div class="form-group" style="justify-content:flex-end"><label class="form-label">&nbsp;</label><div style="display:flex;gap:6px"><button class="btn btn-primary" onclick="saveProfile()">Save</button><button class="btn btn-outline" onclick="toggleAddProfile()">Cancel</button></div></div>' +
      '</div>';
  }
  html += '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Name</th><th>Global Path</th><th>Scope</th><th>Status</th>' + (D.sqliteAvailable ? '<th></th>' : '') + '</tr></thead><tbody>';
  if (!D.profiles.length) {
    html += '<tr><td colspan="5" style="text-align:center;color:var(--g600);padding:24px">No profiles registered</td></tr>';
  } else {
    D.profiles.forEach(function(p) {
      var isActive = p.is_active;
      html += '<tr>' +
        '<td><span style="font-weight:' + (isActive ? '600' : '500') + '">' + esc(p.name) + '</span></td>' +
        '<td class="mono">' + esc(p.global_path) + '</td>' +
        '<td><span class="badge badge-neutral">' + esc(p.scope || 'global') + '</span></td>' +
        '<td>' + (isActive ? '<span class="badge badge-pos">✓ Active</span>' : '<span style="color:var(--g600)">—</span>') + '</td>';
      if (D.sqliteAvailable) {
        html += '<td class="actions">' +
          (!isActive ? '<button class="btn btn-ghost" onclick="activateProfile(\'' + esc(escJs(p.name)) + '\')">Activate</button>' : '') +
          '<button class="btn btn-ghost" onclick="editProfile(\'' + esc(escJs(p.name)) + '\',\'' + esc(escJs(p.global_path)) + '\',\'' + esc(escJs(p.scope)) + '\')">Edit</button>' +
          '<button class="btn btn-danger" onclick="removeProfile(\'' + esc(escJs(p.name)) + '\')">Remove</button>' +
          '</td>';
      }
      html += '</tr>';
    });
  }
  html += '</tbody></table></div>';
  document.getElementById('tab-profiles').innerHTML = html;
}

function toggleAddProfile() {
  var f = document.getElementById('pf-form');
  if (f) f.classList.toggle('open');
}
async function saveProfile() {
  var name = (document.getElementById('pf-name').value || '').trim();
  var path = (document.getElementById('pf-path').value || '').trim();
  var scope = document.getElementById('pf-scope').value;
  if (!name) { toast('Profile name is required', false); return; }
  if (!path) { toast('Global path is required', false); return; }
  await api('/api/profile/add', {name: name, globalPath: path, scope: scope});
}
async function activateProfile(name) {
  await api('/api/profile/activate', {name: name});
}
async function removeProfile(name) {
  var ok = await confirmAction({
    title: 'Remove profile',
    body: 'Remove profile "' + name + '" from Engram configuration?',
    confirmText: 'Confirm',
    danger: true
  });
  if (!ok) return;
  await api('/api/profile/remove', {name: name});
}
function editProfile(name, path, scope) {
  var f = document.getElementById('pf-form');
  if (!f) return;
  f.classList.add('open');
  document.getElementById('pf-name').value = name;
  document.getElementById('pf-path').value = path;
  document.getElementById('pf-scope').value = scope || 'global';
  f.scrollIntoView({behavior:'smooth'});
}

// ── Workspaces tab ───────────────────────────────────────────────────────────
function renderWorkspaces() {
  if (!D) return;
  var html = '<div class="tab-hdr"><h1>Workspaces</h1><p>Registered projects that Engram tracks for memory routing.</p></div>';
  if (!D.sqliteAvailable) {
    html += '<div class="banner banner-warn">⚠️ SQLite unavailable — workspace management requires SQLite.</div>';
  }
  if (D.sqliteAvailable) {
    html += '<div class="tab-actions"><button class="btn btn-primary" onclick="toggleAddWs()">+ Register Workspace</button></div>';
    html += '<div class="add-form-row" id="ws-form">' +
      '<div class="form-group"><label class="form-label">Path</label><div class="input-with-btn"><input class="form-input" id="ws-path" placeholder="/path/to/project" style="width:360px"><button class="btn btn-outline" onclick="browseFolder(\'ws-path\')">Browse</button></div></div>' +
      '<div class="form-group"><label class="form-label">Name (optional)</label><input class="form-input" id="ws-name" placeholder="my-project" style="width:200px"></div>' +
      '<div class="form-group" style="justify-content:flex-end"><label class="form-label">&nbsp;</label><div style="display:flex;gap:6px"><button class="btn btn-primary" onclick="saveWs()">Register</button><button class="btn btn-outline" onclick="toggleAddWs()">Cancel</button></div></div>' +
      '</div>';
  }
  html += '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Name</th><th>Path</th><th>Linked</th><th>Last Seen</th>' + (D.sqliteAvailable ? '<th></th>' : '') + '</tr></thead><tbody>';
  if (!D.workspaces.length) {
    html += '<tr><td colspan="5" style="text-align:center;color:var(--g600);padding:24px">No workspaces registered</td></tr>';
  } else {
    D.workspaces.forEach(function(ws) {
      var linked = ws.is_linked !== false && ws.is_linked !== 0;
      var name = ws.name || ws.path.split('/').pop() || ws.path.split('\\').pop() || ws.path;
      html += '<tr>' +
        '<td><span style="font-weight:500">' + esc(name) + '</span></td>' +
        '<td class="mono">' + esc(ws.path) + '</td>' +
        '<td>' + (linked ? '<span class="badge badge-pos">✓ Linked</span>' : '<span class="badge badge-neg">× Unlinked</span>') + '</td>' +
        '<td style="color:var(--g600);font-size:12px">' + relTime(ws.last_seen) + '</td>';
      if (D.sqliteAvailable) {
        html += '<td class="actions">' +
          '<button class="btn btn-ghost" onclick="toggleLink(\'' + esc(escJs(ws.path)) + '\',' + (!linked) + ')">' + (linked ? 'Unlink' : 'Link') + '</button>' +
          '<button class="btn btn-danger" onclick="removeWs(\'' + esc(escJs(ws.path)) + '\')">Remove</button>' +
          '</td>';
      }
      html += '</tr>';
    });
  }
  html += '</tbody></table></div>';
  document.getElementById('tab-workspaces').innerHTML = html;
}

function toggleAddWs() {
  var f = document.getElementById('ws-form');
  if (f) f.classList.toggle('open');
}
async function saveWs() {
  var path = (document.getElementById('ws-path').value || '').trim();
  var name = (document.getElementById('ws-name').value || '').trim();
  if (!path) { toast('Path is required', false); return; }
  await api('/api/workspace/add', {path: path, name: name});
}
async function toggleLink(path, linked) {
  if (!linked) {
    var ok = await confirmAction({
      title: 'Unlink workspace',
      body: 'Unlink workspace "' + path + '" from Engram routing?',
      confirmText: 'Confirm',
      danger: true
    });
    if (!ok) return;
  }
  await api('/api/workspace/link', {path: path, linked: linked});
}
async function removeWs(path) {
  var ok = await confirmAction({
    title: 'Remove workspace',
    body: 'Remove workspace "' + path + '" from the registry?',
    confirmText: 'Confirm',
    danger: true
  });
  if (!ok) return;
  await api('/api/workspace/remove', {path: path});
}

// ── Runtime tab ──────────────────────────────────────────────────────────────
function renderRuntime() {
  if (!D) return;
  var html = '<div class="tab-hdr"><h1>Runtime</h1><p>Resolved configuration snapshot. Click any row to copy its value.</p></div><div class="rt-grid">';
  (D.entry || []).forEach(function(sec) {
    html += '<div class="card"><div class="card-hdr"><span class="card-title">' + esc(sec.group) + '</span></div><div>';
    (sec.rows || []).forEach(function(row) {
      var key = row[0], val = row[1];
      var cls = valClass(val);
      var short = key.includes('.') ? key.split('.').slice(1).join('.') : key;
      var pre = key.includes('.') ? key.split('.')[0] + '.' : '';
      html += '<div class="rt-row" onclick="cpRow(this,\'' + esc(escJs(val)) + '\')">' +
        '<span class="rt-key"><span class="rt-key-pre">' + esc(pre) + '</span>' + esc(short) + '</span>' +
        '<span class="rt-val ' + cls + '">' + esc(val) + '</span>' +
        '<span class="copied">Copied!</span>' +
        '</div>';
    });
    html += '</div></div>';
  });
  html += '</div>';
  document.getElementById('tab-runtime').innerHTML = html;
}

function valClass(val) {
  var v = val.toLowerCase().trim();
  if (v === 'true' || v === 'enabled' || v === 'active') return 'val-pos';
  if (v === 'false' || v === 'disabled' || v === '<none>') return 'val-neg';
  if (/^\d+\.\d+\.\d+/.test(val)) return 'val-ver';
  if (val.startsWith('/') || val.startsWith('~') || /^[A-Za-z]:[/\\]/.test(val)) return 'val-path';
  if (v === 'off' || v === 'manual') return 'val-muted';
  return 'val-neutral';
}

function cpRow(el, val) {
  navigator.clipboard.writeText(val).catch(function(){});
  el.classList.add('cp');
  setTimeout(function() { el.classList.remove('cp'); }, 1400);
}

// ── Shutdown ─────────────────────────────────────────────────────────────────
function doShutdown() {
  fetch('/shutdown').catch(function(){});
  setTimeout(function() { window.close(); }, 400);
}


// ── Workspace Init ───────────────────────────────────────────────────────────
function renderInitBanner() {
  var container = document.getElementById('init-banner-container');
  if (!container) return;
  if (D && D.isInitialized === false) {
    container.style.display = 'block';
  } else {
    container.style.display = 'none';
  }
}

async function initWorkspace() {
  var btn = document.getElementById('init-btn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Initializing...';
  }
  try {
    var ok = await api('/api/init', {});
    if (ok) {
      toast('Workspace initialized successfully!');
    }
  } catch(e) {
    toast(e.message, false);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Initialize Workspace';
    }
  }
}

// ── Connection Tab ───────────────────────────────────────────────────────────
window._agentsData = null;
window._scanning = false;

async function scanAgents() {
  if (window._scanning) return;
  window._scanning = true;

  var pane = document.getElementById('tab-connection');
  if (pane) {
    pane.innerHTML = '<div class="loading"><div class="spinner"></div>&nbsp;&nbsp;Scanning local AI agents&hellip;</div>';
  }

  try {
    var res = await fetch('/api/agents/scan');
    var j = await res.json();
    if (res.ok && j.ok) {
      window._agentsData = j.data;
      renderConnection();
    } else {
      if (pane) {
        pane.innerHTML = '<div class="loading" style="color:var(--red);flex-direction:column;gap:12px">' +
          '<span>⚠️ ' + esc(j.error || 'Failed to scan agents') + '</span>' +
          '<button class="btn btn-outline" onclick="scanAgents()">Retry</button>' +
          '</div>';
      }
    }
  } catch (e) {
    if (pane) {
      pane.innerHTML = '<div class="loading" style="color:var(--red);flex-direction:column;gap:12px">' +
        '<span>⚠️ ' + esc(e.message) + '</span>' +
        '<button class="btn btn-outline" onclick="scanAgents()">Retry</button>' +
        '</div>';
    }
  } finally {
    window._scanning = false;
  }
}

function renderConnection() {
  if (!window._agentsData) return;

  window._agentsData.sort(function(a, b) {
    return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
  });

  var html = '<div class="tab-hdr" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:16px;">' +
    '<div>' +
      '<h1>AI Agent Connections</h1>' +
      '<p>Link Engram memory skillset instructions and hooks to your local AI agents.</p>' +
    '</div>' +
    '<button class="btn btn-outline" onclick="scanAgents()">' +
      '<svg class="nav-icon" style="width:14px;height:14px;margin-right:4px;" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">' +
        '<path d="M1.5 8a6.5 6.5 0 0 1 11-4.7l2 2.2M14.5 8a6.5 6.5 0 0 1-11 4.7l-2-2.2"/>' +
        '<path d="M14.5 2v4.5H10M1.5 14v-4.5H6"/>' +
      '</svg>Refresh' +
    '</button>' +
  '</div>';

  html += '<div class="conn-grid">';

  window._agentsData.forEach(function(agent) {
    var detectedLabel = agent.detected
      ? '<span class="conn-status detected">Detected</span>'
      : '<span class="conn-status missing">Not Detected</span>';

    var cardClass = 'conn-card' + (agent.detected ? '' : ' disabled');

    var wsBtn = '';
    if (agent.detected) {
      if (agent.workspaceLinked) {
        wsBtn = '<span style="display:flex;align-items:center;gap:6px;color:var(--green);font-weight:500;">' +
          '<span>✓ Linked</span>' +
          '<button class="btn btn-ghost btn-danger" style="padding:0;height:auto;font-size:11px;" onclick="unlinkAgent(\'' + escJs(agent.id) + '\', false)" title="Unlink from workspace">Unlink</button>' +
          '</span>';
      } else {
        wsBtn = '<button class="btn btn-outline" style="height:24px;font-size:11px;padding:0 8px;" onclick="linkAgent(\'' + escJs(agent.id) + '\', false)">Link</button>';
      }
    } else {
      wsBtn = '<span style="color:var(--g500);font-size:11px;">Not Available</span>';
    }

    var glBtn = '';
    if (agent.detected) {
      if (agent.globalLinked) {
        glBtn = '<span style="display:flex;align-items:center;gap:6px;color:var(--green);font-weight:500;">' +
          '<span>✓ Linked</span>' +
          '<button class="btn btn-ghost btn-danger" style="padding:0;height:auto;font-size:11px;" onclick="unlinkAgent(\'' + escJs(agent.id) + '\', true)" title="Unlink from global">Unlink</button>' +
          '</span>';
      } else {
        glBtn = '<button class="btn btn-outline" style="height:24px;font-size:11px;padding:0 8px;" onclick="linkAgent(\'' + escJs(agent.id) + '\', true)">Link</button>';
      }
    } else {
      glBtn = '<span style="color:var(--g500);font-size:11px;">Not Available</span>';
    }

    var targetsDesc = agent.targets ? agent.targets.join(', ') : agent.id;
    var details = 'Skillset targets: ' + esc(targetsDesc);

    html += '<div class="' + cardClass + '">' +
      '<div>' +
        '<div class="conn-header">' +
          '<span class="conn-name">' + esc(agent.name) + '</span>' +
          detectedLabel +
        '</div>' +
        '<div class="conn-desc">' + details + '</div>' +
      '</div>' +
      '<div class="conn-actions">' +
        '<div class="conn-row"><span>Workspace Link</span>' + wsBtn + '</div>' +
        '<div class="conn-row"><span>Global Link</span>' + glBtn + '</div>' +
      '</div>' +
    '</div>';
  });

  html += '</div>';
  var pane = document.getElementById('tab-connection');
  if (pane) {
    pane.innerHTML = html;
  }
}

async function linkAgent(agentId, isGlobal) {
  toast('Connecting ' + agentId + '...', true);
  var res = await api('/api/agents/link', { agentId: agentId, global: isGlobal });
  if (res) {
    if (res.message && res.message.indexOf('Skipped') !== -1) {
      toast(res.message, false);
    } else {
      toast('Connected successfully!', true);
    }
    await scanAgents();
  }
}

async function unlinkAgent(agentId, isGlobal) {
  var mode = isGlobal ? 'global mode' : 'workspace mode';
  var ok = await confirmAction({
    title: 'Unlink AI agent',
    body: 'Unlink ' + agentId + ' from Engram ' + mode + '?',
    confirmText: 'Confirm',
    danger: true
  });
  if (!ok) return;
  toast('Disconnecting ' + agentId + '...', true);
  var res = await api('/api/agents/unlink', { agentId: agentId, global: isGlobal });
  if (res) {
    if (res.message && res.message.indexOf('Skipped') !== -1) {
      toast(res.message, false);
    } else {
      toast('Disconnected successfully!', true);
    }
    window._agentsData = null;
    await scanAgents();
  }
}

async function loadCore(rebuild) {
  if (window._coreLoading) return;
  window._coreLoading = true;
  var pane = document.getElementById('tab-core');
  if (pane && !window._coreData) {
    pane.innerHTML = '<div class="loading"><div class="spinner"></div>&nbsp;&nbsp;Calculating duplicate memories&hellip;</div>';
  }
  try {
    var res = await fetch('/api/core', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rebuild: rebuild === true,
        semantic: window._coreOptions.semantic === true,
        scope: window._coreOptions.scope || 'all'
      })
    });
    var j = await res.json();
    if (!res.ok || !j.ok) throw new Error(j.error || 'Failed to load Core data');
    window._coreData = j.data;
    renderCore();
  } catch (e) {
    if (pane) {
      pane.innerHTML = '<div class="loading" style="color:var(--red);flex-direction:column;gap:12px">' +
        '<span>⚠️ ' + esc(e.message) + '</span>' +
        '<button class="btn btn-outline" onclick="refreshCore()">Retry</button>' +
        '</div>';
    }
  } finally {
    window._coreLoading = false;
  }
}

function refreshCore() {
  return loadCore(true);
}

function renderCore() {
  var pane = document.getElementById('tab-core');
  if (!pane || !window._coreData) return;
  var data = window._coreData;
  // Note: data.warning may contain: consume more tokens
  pane.innerHTML =
    '<div class="tab-hdr core-hdr">' +
      '<div><h1>Core</h1><p>Duplicate memory candidates and memory relationships scoped by active profile, global memory, and workspace memory.</p></div>' +
      '<button class="btn btn-outline" onclick="refreshCore()">Refresh</button>' +
    '</div>' +
    '<div class="banner banner-warn">' + esc(data.warning) + '</div>' +
    renderCoreToolbar(data) +
    renderCoreRelationship(data.relationship) +
    '<div class="core-grid">' +
      '<div>' + renderCoreDuplicates(data.duplicates) + '</div>' +
      '<div>' + renderCorePrompts(data.prompts) + '</div>' +
    '</div>';
}

function renderCoreToolbar(data) {
  var scope = data.scope && data.scope.filter ? data.scope.filter : 'all';
  var semantic = window._coreOptions.semantic === true;
  var profilesCount = data.scope.profiles ? data.scope.profiles.length : 1;
  return '<div class="core-toolbar">' +
    '<div class="core-scope">' +
      '<span class="form-label">Scope</span>' +
      '<select class="form-select" onchange="setCoreScope(this.value)">' +
        '<option value="all"' + (scope === 'all' ? ' selected' : '') + '>Profile + global + workspace</option>' +
        '<option value="global"' + (scope === 'global' ? ' selected' : '') + '>Global</option>' +
        '<option value="workspace"' + (scope === 'workspace' ? ' selected' : '') + '>Workspace</option>' +
      '</select>' +
    '</div>' +
    '<div class="core-check" onclick="toggleCoreSemantic()">' +
      '<span>Include semantic candidates</span>' +
      '<div class="tgl' + (semantic ? ' on' : '') + '"><div class="tgl-thumb"></div></div>' +
    '</div>' +
    '<span class="badge badge-neutral">Active profile: ' + esc(data.scope.activeProfile || '<none>') + '</span>' +
    '<span class="badge badge-neutral">Profiles scanned: ' + profilesCount + '</span>' +
  '</div>';
}

function setCoreScope(value) {
  window._coreOptions.scope = value === 'workspace' || value === 'global' ? value : 'all';
  loadCore(false);
}

function toggleCoreSemantic() {
  window._coreOptions.semantic = !window._coreOptions.semantic;
  loadCore(false);
}

function renderCoreDuplicates(duplicates) {
  if (!duplicates || !duplicates.length) {
    return '<div class="card"><div class="card-hdr"><span class="card-title">Duplicate candidates</span></div><div class="core-empty">No duplicate candidates found for this scope.</div></div>';
  }
  var rows = duplicates.map(function(pair) {
    var aId = escJs(pair.a.id);
    var bId = escJs(pair.b.id);
    return '<div class="core-dup">' +
      '<div class="core-dup-score">' +
        Math.round(pair.score * 100) + '%<span>' + esc(pair.method) + '</span>' +
        '<button class="btn btn-outline" style="margin-top:12px;font-size:10px;padding:4px 6px;height:auto;line-height:1.2;width:100%;white-space:normal;" onclick="copyResolvePairPrompt(\'' + aId + '\',\'' + bId + '\')">Copy prompt</button>' +
      '</div>' +
      '<div class="core-dup-body">' +
        renderCoreMemoryRef(pair.a) +
        '<div class="core-link-line">profile &lt;-&gt; global &lt;-&gt; workspace</div>' +
        renderCoreMemoryRef(pair.b) +
      '</div>' +
    '</div>';
  }).join('');
  return '<div class="card"><div class="card-hdr"><span class="card-title">Duplicate candidates</span><span class="badge badge-amber">' + duplicates.length + '</span></div><div>' + rows + '</div></div>';
}

function renderCoreMemoryRef(ref) {
  var profileJs = escJs(ref.profile);
  var scopeJs = escJs(ref.scope);
  var fileJs = escJs(ref.file);
  var idJs = escJs(ref.id);
  return '<div class="core-memory-ref" style="cursor:pointer;" onclick="viewMemory(\'' + profileJs + '\',\'' + scopeJs + '\',\'' + fileJs + '\',\'' + idJs + '\')">' +
    '<div>' +
      '<span class="badge badge-neutral">' + esc(ref.profile) + '</span> ' +
      '<span class="badge badge-neutral">' + esc(ref.scope) + '</span> ' +
      '<span class="mono">' + esc(ref.file) + '</span>' +
    '</div>' +
    '<strong>' + esc(ref.id) + '</strong>' +
    '<p>' + esc(ref.summary || '') + '</p>' +
  '</div>';
}

async function viewMemory(profile, scope, file, id) {
  window._modalCopyContent = '';
  showModal(
    '<div class="modal-panel confirm-panel" role="dialog" aria-modal="true" aria-labelledby="confirm-title">' +
      '<div class="modal-hdr">' +
        '<h2 id="confirm-title">' + esc(id) + '</h2>' +
        '<div style="display:flex;align-items:center;gap:8px;">' +
          '<button class="btn btn-outline" style="height:24px;padding:0 6px;" title="Copy content" onclick="navigator.clipboard.writeText(window._modalCopyContent || \'\').then(function(){toast(\'Copied content\');}).catch(function(){toast(\'Copy failed\',false);})"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" style="width:12px;height:12px;"><rect x="5.5" y="5.5" width="8.5" height="8.5" rx="1.5"/><path d="M3.5 10.5h-1a1 1 0 0 1-1-1v-6.5a1 1 0 0 1 1-1h6.5a1 1 0 0 1 1 1v1"/></svg></button>' +
          '<button data-confirm-close aria-label="Close">&times;</button>' +
        '</div>' +
      '</div>' +
      '<div class="modal-body"><div class="loading"><div class="spinner"></div>&nbsp;&nbsp;Loading memory content&hellip;</div></div>' +
      '<div class="modal-actions confirm-actions">' +
        '<button class="btn btn-primary" data-confirm-close>Close</button>' +
      '</div>' +
    '</div>',
    function(event) {
      if (event.key === 'Escape' || event.key === 'Enter') {
        event.preventDefault();
        closeModal();
      }
    }
  );
  
  var closeBtns = document.querySelectorAll('[data-confirm-close]');
  closeBtns.forEach(function(btn) {
    btn.addEventListener('click', closeModal, { once: true });
  });

  try {
    var qs = '?profile=' + encodeURIComponent(profile) + '&scope=' + encodeURIComponent(scope) + '&file=' + encodeURIComponent(file);
    var res = await fetch('/api/memory' + qs);
    var j = await res.json();
    if (!res.ok || !j.ok) throw new Error(j.error || 'Failed to load memory content');
    
    var bodyDiv = document.querySelector('#modal-root .modal-body');
    if (bodyDiv) {
      window._modalCopyContent = j.content;
      bodyDiv.innerHTML = '<pre class="mono" style="white-space:pre-wrap;margin:0;font-size:12px;user-select:text;background:var(--g100);padding:12px;border-radius:var(--r6);border:1px solid var(--g200);color:var(--g1000);text-align:left;">' + esc(j.content) + '</pre>';
    }
  } catch (e) {
    var bodyDiv = document.querySelector('#modal-root .modal-body');
    if (bodyDiv) {
      bodyDiv.innerHTML = '<div style="color:var(--red)">⚠️ ' + esc(e.message) + '</div>';
    }
  }
}

function copyResolvePairPrompt(idA, idB) {
  var prompt = [
    'Resolve these duplicate memories:',
    'engram load --id ' + idA + ',' + idB,
    '',
    'Review these duplicate candidates. Decide whether to merge, archive, or keep both.',
    'When proposing saved memories, use TYPE, TEXT, CONTEXT, and UPDATE: memory-id for duplicates.',
    'Do not invent facts. Preserve stronger, newer, and more specific guidance.'
  ].join('\n');
  
  navigator.clipboard.writeText(prompt).then(function() {
    toast('Copied resolve prompt');
  }).catch(function() {
    toast('Copy failed', false);
  });
}

function renderCorePrompts(prompts) {
  return '<div class="core-prompts">' +
    '<div class="card">' +
      '<div class="card-hdr" style="display:flex;justify-content:space-between;align-items:center;width:100%;">' +
        '<span class="card-title">Resolve duplicate memories</span>' +
        '<button class="btn btn-outline" style="height:24px;font-size:11px;padding:0 8px;" onclick="viewCorePrompt(\'resolveDuplicates\', \'Resolve duplicate memories\')">Preview</button>' +
      '</div>' +
      '<div class="core-prompt-body"><p>Copy prompt for an AI agent to resolve duplicate memories.</p><button class="btn btn-primary" onclick="copyCorePrompt(\'resolveDuplicates\')">Copy prompt</button></div>' +
    '</div>' +
    '<div class="card">' +
      '<div class="card-hdr" style="display:flex;justify-content:space-between;align-items:center;width:100%;">' +
        '<span class="card-title">Metacognize memory</span>' +
        '<button class="btn btn-outline" style="height:24px;font-size:11px;padding:0 8px;" onclick="viewCorePrompt(\'metacognize\', \'Metacognize memory\')">Preview</button>' +
      '</div>' +
      '<div class="core-prompt-body"><p>Copy prompt for a stronger model to restructure memory with metacognition.</p><button class="btn btn-primary" onclick="copyCorePrompt(\'metacognize\')">Copy prompt</button></div>' +
    '</div>' +
  '</div>';
}

function renderCoreRelationship(relationship) {
  var links = relationship && relationship.links ? relationship.links : [];
  var duplicateCount = links.filter(function(link) { return link.kind === 'duplicate'; }).length;
  var relatedCount = links.filter(function(link) { return link.kind === 'related_to' || link.kind === 'depends_on' || link.kind === 'contradicts'; }).length;
  return '<div class="core-relationship">' +
    '<div class="core-lane"><span>Profile</span><i></i><span>Global</span><i></i><span>Workspace</span></div>' +
    '<div class="core-rel-stats">' +
      '<span class="badge badge-amber">' + duplicateCount + ' duplicate links</span>' +
      '<span class="badge badge-blue">' + relatedCount + ' graph links</span>' +
    '</div>' +
  '</div>';
}

function copyCorePrompt(key) {
  if (!window._coreData || !window._coreData.prompts) return;
  var text = window._coreData.prompts[key] || '';
  if (!text) return;
  navigator.clipboard.writeText(text).then(function() {
    toast('Copied prompt');
  }).catch(function() {
    toast('Copy failed', false);
  });
}

function viewCorePrompt(key, title) {
  if (!window._coreData || !window._coreData.prompts) return;
  var text = window._coreData.prompts[key] || '';
  if (!text) return;
  
  window._modalCopyContent = text;
  showModal(
    '<div class="modal-panel confirm-panel" role="dialog" aria-modal="true" aria-labelledby="confirm-title" style="width:min(640px, 100%)">' +
      '<div class="modal-hdr">' +
        '<h2 id="confirm-title">' + esc(title) + '</h2>' +
        '<div style="display:flex;align-items:center;gap:8px;">' +
          '<button class="btn btn-outline" style="height:24px;padding:0 6px;" title="Copy content" onclick="navigator.clipboard.writeText(window._modalCopyContent || \'\').then(function(){toast(\'Copied content\');}).catch(function(){toast(\'Copy failed\',false);})"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" style="width:12px;height:12px;"><rect x="5.5" y="5.5" width="8.5" height="8.5" rx="1.5"/><path d="M3.5 10.5h-1a1 1 0 0 1-1-1v-6.5a1 1 0 0 1 1-1h6.5a1 1 0 0 1 1 1v1"/></svg></button>' +
          '<button data-confirm-close aria-label="Close">&times;</button>' +
        '</div>' +
      '</div>' +
      '<div class="modal-body"><pre class="core-prompt-preview" style="margin:0;user-select:all;">' + esc(text) + '</pre></div>' +
      '<div class="modal-actions confirm-actions">' +
        '<button class="btn btn-primary" data-confirm-close>Close</button>' +
      '</div>' +
    '</div>',
    function(event) {
      if (event.key === 'Escape' || event.key === 'Enter') {
        event.preventDefault();
        closeModal();
      }
    }
  );
  
  var closeBtns = document.querySelectorAll('[data-confirm-close]');
  closeBtns.forEach(function(btn) {
    btn.addEventListener('click', closeModal, { once: true });
  });
}

async function browseFolder(inputId) {
  var inputEl = document.getElementById(inputId);
  var currentVal = inputEl ? (inputEl.value || '').trim() : '';
  
  var res = await postJson('/api/browse', { path: currentVal });
  if (!res || !res.ok) return;

  var currentPath = res.currentPath;
  
  function renderBrowserContent(data) {
    var html = '<div class="modal-panel dir-browser-modal" role="dialog" aria-modal="true" aria-labelledby="browser-title">' +
      '<div class="modal-hdr">' +
        '<h2 id="browser-title">Browse Directory</h2>' +
        '<button data-confirm-close aria-label="Close" onclick="closeModal()">&times;</button>' +
      '</div>' +
      '<div class="modal-body dir-browser-body">';
      
    html += '<div class="dir-browser-nav-bar">' +
      '<input class="form-input dir-browser-path" id="db-path-input" value="' + esc(data.currentPath) + '">' +
      '<button class="btn btn-primary" onclick="window.dirBrowserGo(document.getElementById(\'db-path-input\').value)">Go</button>' +
    '</div>';
    
    if (data.drives && data.drives.length > 0) {
      html += '<div class="dir-browser-drives-title">Drives:</div>';
      html += '<div class="dir-browser-drives">';
      data.drives.forEach(function(d) {
        var isCurrentDrive = data.currentPath.toLowerCase().startsWith(d.toLowerCase());
        html += '<button class="btn btn-ghost drive-btn' + (isCurrentDrive ? ' active' : '') + '" onclick="window.dirBrowserGo(\'' + esc(escJs(d)) + '\')">' + esc(d) + '</button>';
      });
      html += '</div>';
    }
    
    html += '<div class="dir-browser-list">';
    
    if (data.parentPath) {
      html += '<div class="dir-item parent-dir" onclick="window.dirBrowserGo(\'' + esc(escJs(data.parentPath)) + '\')">' +
        '<svg class="dir-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 4.5v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1H7L5.5 3h-3.5a1 1 0 0 0-1 1z"/></svg>' +
        '<span class="dir-name">..</span>' +
      '</div>';
    }
    
    if (data.directories && data.directories.length > 0) {
      data.directories.forEach(function(dName) {
        var separator = data.currentPath.endsWith('\\') || data.currentPath.endsWith('/') ? '' : '/';
        var nextPath = data.currentPath + separator + dName;
        html += '<div class="dir-item" onclick="window.dirBrowserGo(\'' + esc(escJs(nextPath)) + '\')">' +
          '<svg class="dir-icon" viewBox="0 0 16 16" fill="currentColor"><path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h2.764c.32 0 .625.13.843.361l1.196 1.277c.109.117.262.182.421.182h5.776A1.5 1.5 0 0 1 15 5.322v7.178a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 12.5v-9z"/></svg>' +
          '<span class="dir-name">' + esc(dName) + '</span>' +
        '</div>';
      });
    } else {
      html += '<div class="dir-browser-empty">No subdirectories found or access denied</div>';
    }
    
    html += '</div></div>';
    
    html += '<div class="modal-actions">' +
      '<button class="btn btn-outline" onclick="closeModal()">Cancel</button>' +
      '<button class="btn btn-primary" onclick="window.dirBrowserSelect(\'' + esc(escJs(data.currentPath)) + '\')">Select Folder</button>' +
    '</div>';
    
    html += '</div>';
    return html;
  }

  window.dirBrowserGo = async function(nextPath) {
    var nextRes = await postJson('/api/browse', { path: nextPath });
    if (nextRes && nextRes.ok) {
      currentPath = nextRes.currentPath;
      var el = document.getElementById('modal-root');
      if (el) {
        el.innerHTML = renderBrowserContent(nextRes);
        var closeBtn = el.querySelector('[data-confirm-close]');
        if (closeBtn) closeBtn.addEventListener('click', closeModal, { once: true });
        
        var pathInput = document.getElementById('db-path-input');
        if (pathInput) {
          pathInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
              e.preventDefault();
              window.dirBrowserGo(pathInput.value);
            }
          });
        }
      }
    }
  };

  window.dirBrowserSelect = function(selectedPath) {
    if (inputEl) {
      inputEl.value = selectedPath;
      var event = new Event('input', { bubbles: true });
      inputEl.dispatchEvent(event);
      var event2 = new Event('change', { bubbles: true });
      inputEl.dispatchEvent(event2);
    }
    closeModal();
  };

  showModal(
    renderBrowserContent(res),
    function(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeModal();
      }
    }
  );

  var mRoot = document.getElementById('modal-root');
  if (mRoot) {
    var closeBtn = mRoot.querySelector('[data-confirm-close]');
    if (closeBtn) closeBtn.addEventListener('click', closeModal, { once: true });
    
    var pathInput = document.getElementById('db-path-input');
    if (pathInput) {
      pathInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          window.dirBrowserGo(pathInput.value);
        }
      });
    }
  }
}

// ── Init ─────────────────────────────────────────────────────────────────────
load();
