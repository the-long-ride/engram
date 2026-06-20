'use strict';
var D = null;
var _toastTimer = null;

// ── Sections definition ──────────────────────────────────────────────────────
var SECTIONS = [
  {g:'Core',f:[
    {k:'enabled',l:'Enabled',t:'toggle',d:'Enable or disable Engram entirely'},
    {k:'scope',l:'Save Target',t:'select',o:['workspace','global','both'],d:'Default scope for save commands'},
    {k:'read',l:'Read Mode',t:'select',o:['auto','startup','always','manual','off'],d:'When agent hooks inject memory context'},
    {k:'proof',l:'Proof Mode',t:'select',o:['off','compact'],d:'Whether hooks append an Engram proof line'},
    {k:'global_path',l:'Global Memory Path',t:'text',d:'Filesystem path to the global memory folder'},
    {k:'default_profile',l:'Default Profile',t:'text',d:'Profile name used when none is explicitly set'},
    {k:'roles',l:'Active Roles',t:'roles',d:'Comma-separated role names for memory context routing'},
  ]},
  {g:'Load Routing',f:[
    {k:'load.limit',l:'Load Limit',t:'number',min:1,max:32,d:'Max memories returned by normal load (1–32)'},
  ]},
  {g:'Graph',f:[
    {k:'graph.enabled',l:'Enabled',t:'toggle'},
    {k:'graph.max_related',l:'Max Related',t:'number',min:1,max:20},
    {k:'graph.min_related_score',l:'Min Score',t:'number',step:0.01,min:0,max:1,d:'Minimum similarity score for graph edges'},
  ]},
  {g:'Vector Search',f:[
    {k:'vector.enabled',l:'Enabled',t:'toggle'},
    {k:'vector.auto_threshold',l:'Auto Threshold',t:'number',min:10,max:1000,d:'Memory count at which vector search activates'},
    {k:'vector.candidate_pool',l:'Candidate Pool',t:'number',min:8,max:100},
    {k:'vector.dimensions',l:'Dimensions',t:'number',min:16,max:512},
  ]},
  {g:'Rule Variants',f:[
    {k:'rule_variants.enabled',l:'Enabled',t:'toggle'},
    {k:'rule_variants.active',l:'Active Variant',t:'select',o:['light','balanced','strict']},
  ]},
  {g:'Live Sync',f:[
    {k:'live_sync.enabled',l:'Enabled',t:'toggle',d:'Sync generated agent context files on save'},
  ]},
  {g:'Global Git',f:[
    {k:'global_git.enabled',l:'Enabled',t:'toggle'},
    {k:'global_git.remote',l:'Remote',t:'text'},
    {k:'global_git.branch',l:'Branch',t:'text'},
    {k:'global_git.auto_sync',l:'Auto Sync',t:'toggle'},
    {k:'global_git.auto_resolve',l:'Auto Resolve',t:'toggle'},
  ]},
  {g:'Pattern Mining',f:[
    {k:'pattern_mining.enabled',l:'Enabled',t:'toggle'},
    {k:'pattern_mining.threshold',l:'Threshold',t:'number',min:1,max:20},
    {k:'pattern_mining.lookback_sessions',l:'Lookback Sessions',t:'number',min:1,max:100},
  ]},
  {g:'PR Workflow',f:[
    {k:'pr_workflow.enabled',l:'Enabled',t:'toggle'},
    {k:'pr_workflow.target_branch',l:'Target Branch',t:'text'},
  ]},
  {g:'Encryption',f:[
    {k:'encryption.enabled',l:'Enabled',t:'toggle'},
    {k:'encryption.scope',l:'Scope',t:'select',o:['workspace','global']},
    {k:'encryption.key_source',l:'Key Source',t:'text'},
  ]},
];

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
  await api('/api/config', {key: 'theme', value: nextTheme});
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

// ── Data ─────────────────────────────────────────────────────────────────────
async function load() {
  try {
    var r = await fetch('/api/data');
    var j = await r.json();
    if (!r.ok) { showErr('Server error (' + r.status + '): ' + (j.error || 'Unknown')); return; }
    D = j;
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
  var cfg = D.config;
  var html = '<div class="tab-hdr"><h1>Configuration</h1><p>User-level settings applied across all workspaces.</p></div>';
  if (!D.sqliteAvailable) {
    html += '<div class="banner banner-info">ℹ️ Running in JSON config mode. Settings are editable, but profiles and workspaces require SQLite.</div>';
  }
  
  var col1Html = '<div class="grid-col">';
  var col2Html = '<div class="grid-col">';
  
  SECTIONS.forEach(function(sec, idx) {
    var cardHtml = '<div class="card"><div class="card-hdr"><span class="card-title">' + esc(sec.g) + '</span></div><div>';
    sec.f.forEach(function(f) {
      var val = gv(cfg, f.k);
      cardHtml += renderCfgRow(f, val, true);
    });
    cardHtml += '</div></div>';
    
    if (idx % 2 === 0) {
      col1Html += cardHtml;
    } else {
      col2Html += cardHtml;
    }
  });
  
  col1Html += '</div>';
  col2Html += '</div>';
  
  html += '<div class="grid-2">' + col1Html + col2Html + '</div>';
  document.getElementById('tab-config').innerHTML = html;
}

function renderCfgRow(f, val, editable) {
  var v = val == null ? '' : val;
  var strV = Array.isArray(v) ? v.join(', ') : String(v);
  var ctl = '';
  if (!editable) {
    ctl = '<span class="badge badge-neutral">' + esc(strV || '—') + '</span>';
  } else if (f.t === 'toggle') {
    var on = v === true || v === 'true';
    ctl = '<div class="tgl' + (on ? ' on' : '') + '" data-key="' + esc(f.k) + '" onclick="tglCfg(this)" title="' + esc(f.k) + '"><div class="tgl-thumb"></div></div>';
  } else if (f.t === 'select') {
    var opts = (f.o || []).map(function(o) { return '<option' + (o === strV ? ' selected' : '') + ' value="' + esc(o) + '">' + esc(o) + '</option>'; }).join('');
    ctl = '<select class="cfg-select" data-key="' + esc(f.k) + '" onchange="saveCfg(this.dataset.key, this.value)">' + opts + '</select>';
  } else if (f.t === 'number') {
    ctl = '<input class="cfg-input" type="number" value="' + esc(strV) + '"' + (f.min!=null?' min="'+f.min+'"':'') + (f.max!=null?' max="'+f.max+'"':'') + (f.step!=null?' step="'+f.step+'"':'') + ' data-key="' + esc(f.k) + '" onchange="saveCfg(this.dataset.key, this.value)">';
  } else {
    var editId = 'e-' + f.k.replace(/\./g,'-');
    ctl = '<span class="edit-val" id="' + editId + '" data-key="' + esc(f.k) + '" data-type="' + esc(f.t||'text') + '" data-raw="' + esc(strV) + '" onclick="startEditEl(this)" title="Click to edit">' + esc(strV || '—') + '</span>';
  }
  var desc = f.d ? '<span style="font-size:11px;color:var(--g600);display:block;margin-top:1px">' + esc(f.d) + '</span>' : '';
  return '<div class="cfg-row"><div class="cfg-lbl">' + esc(f.l) + desc + '</div><div class="cfg-ctl">' + ctl + '</div></div>';
}

function tglCfg(el) {
  el.classList.toggle('on');
  var newVal = el.classList.contains('on');
  saveCfg(el.dataset.key, String(newVal));
}

async function saveCfg(key, val) {
  if (key === 'roles') {
    var arr = val.split(',').map(function(s) { return s.trim(); }).filter(Boolean);
    val = JSON.stringify(arr);
  }
  await api('/api/config', {key: key, value: val});
}

function startEditEl(el) {
  var key = el.dataset.key;
  var type = el.dataset.type;
  var raw = el.dataset.raw || '';
  startEdit(key, el.id, raw, type);
}

function startEdit(key, spanId, currentVal, type) {
  var span = document.getElementById(spanId);
  if (!span) return;
  var wrap = span.parentElement;
  wrap.innerHTML = '<div class="edit-row-form">' +
    '<input class="cfg-input wide" id="ei-' + spanId + '" type="' + (type === 'roles' ? 'text' : (type || 'text')) + '" placeholder="' + (key === 'roles' ? 'role1, role2' : '') + '">' +
    '<button class="btn-save" onclick="commitEdit(\'' + esc(escJs(key)) + '\',\'' + esc(escJs(spanId)) + '\')">Save</button>' +
    '<button class="btn-cancel" onclick="load()">Cancel</button>' +
    '</div>';
  var inp = document.getElementById('ei-' + spanId);
  if (inp) {
    inp.value = currentVal;
    inp.focus();
    inp.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') commitEdit(key, spanId);
      if (e.key === 'Escape') load();
    });
  }
}

async function commitEdit(key, spanId) {
  var inp = document.getElementById('ei-' + spanId);
  if (!inp) return;
  await saveCfg(key, inp.value);
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
