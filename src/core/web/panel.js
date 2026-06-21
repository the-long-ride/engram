// Engram WebUI control panel logic.
'use strict';
var D = null;
var _toastTimer = null;

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
  navigator.clipboard.writeText('npm i -g @the-long-ride/engram@latest').catch(function(){});
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
}

// ── API call ─────────────────────────────────────────────────────────────────
async function api(url, body) {
  try {
    var r = await fetch(url, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    var j = await r.json();
    if (!r.ok) { toast(j.error || 'Request failed', false); return false; }
    toast(j.message || 'Saved');
    await load();
    return true;
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
  var html = '<div class="tab-hdr"><h1>Configuration</h1><p>User-level settings applied across all workspaces.</p></div>';
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
    var opts = (f.options || []).map(function(o) { return '<option' + (o === strV ? ' selected' : '') + ' value="' + esc(o) + '">' + esc(o) + '</option>'; }).join('');
    ctl = '<select class="cfg-select" data-key="' + esc(f.key) + '" onchange="changeCfg(this.dataset.key, this.value)">' + opts + '</select>';
  } else if (f.input === 'number') {
    ctl = '<input class="cfg-input" type="number" value="' + esc(strV) + '"' + (f.min!=null?' min="'+f.min+'"':'') + (f.max!=null?' max="'+f.max+'"':'') + (f.step!=null?' step="'+f.step+'"':'') + ' data-key="' + esc(f.key) + '" onchange="changeCfg(this.dataset.key, this.value)">';
  } else {
    var placeholder = f.input === 'roles' ? 'agent, reviewer' : '';
    ctl = '<input class="cfg-input wide" type="text" value="' + esc(strV) + '" placeholder="' + esc(placeholder) + '" data-key="' + esc(f.key) + '" onchange="changeCfg(this.dataset.key, this.value)">';
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

function changeCfg(key, value) {
  var field = fieldByKey(key);
  if (!field) return;
  Draft[key] = value;
  RowErrors[key] = clientValidationError(field, value);
  Dirty[key] = value !== uiValue(field, gv(D.config, key));
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
    var roles = String(value || '').split(',').map(function(role) { return role.trim(); }).filter(Boolean);
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

function showModal(html) {
  closeModal();
  var wrap = document.createElement('div');
  wrap.id = 'modal-root';
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = html;
  document.body.appendChild(wrap);
}

function closeModal() {
  var existing = document.getElementById('modal-root');
  if (existing) existing.remove();
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
      '<div class="form-group"><label class="form-label">Name</label><input class="form-input" id="pf-name" placeholder="e.g. personal"></div>' +
      '<div class="form-group"><label class="form-label">Global Path</label><input class="form-input" id="pf-path" placeholder="~/Documents/engram" style="width:240px"></div>' +
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
  if (!confirm('Remove profile "' + name + '"?')) return;
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
      '<div class="form-group"><label class="form-label">Path</label><input class="form-input" id="ws-path" placeholder="/path/to/project" style="width:280px"></div>' +
      '<div class="form-group"><label class="form-label">Name (optional)</label><input class="form-input" id="ws-name" placeholder="my-project"></div>' +
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
  await api('/api/workspace/link', {path: path, linked: linked});
}
async function removeWs(path) {
  if (!confirm('Remove workspace "' + path + '"?')) return;
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

// ── Init ─────────────────────────────────────────────────────────────────────
load();
