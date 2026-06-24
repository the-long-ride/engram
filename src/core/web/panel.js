// Engram WebUI control panel logic.
'use strict';
var D = null;
var _toastTimer = null;
window._coreData = null;
window._coreLoading = false;
window._coreOptions = { scopes: ['profile', 'global', 'workspace'], types: ['rule', 'skill', 'workflow', 'knowledge'], semantic: false, limit: 50 };
window._memoriesOptions = { scopes: ['profile', 'global', 'workspace'], types: ['rule', 'skill', 'workflow', 'knowledge'], semantic: true, limit: 100 };
window._memoriesData = null;
window._memoriesSelectedId = '';
window._memoriesLoading = false;
window._memoriesViewport = { panX: 0, panY: 0, zoom: 1.0, isFullscreen: false };

var Draft = {};
var Dirty = {};
var RowErrors = {};
var _pendingPatch = null;
var _cfgValidationSeq = 0;
var ec = encodeURIComponent;
function cpM(){navigator.clipboard.writeText(window._modalCopyContent||'').then(function(){toast('Copied content');}).catch(function(){toast('Copy failed',false);});}

// Utilities
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
function relTime(s){if(!s)return'—';try{var d=Date.now()-new Date(s);if(d<6e4)return'just now';if(d<36e5)return Math.floor(d/6e4)+'m ago';if(d<864e5)return Math.floor(d/36e5)+'h ago';return Math.floor(d/864e5)+'d ago';}catch(e){return s;}}

// Nav
document.querySelectorAll('[data-tab]').forEach(function(el) {
  el.addEventListener('click', function() { switchTab(el.getAttribute('data-tab')); });
});
document.addEventListener('click', function(event) {
  var close = event.target.closest('[data-confirm-close]');
  if (close) { closeModal(); return; }
  var actionEl = event.target.closest('[data-action]');
  if (!actionEl) {
    var path = event.target.closest('.memories-svg path');
    if (path) {
      hi('path', path);
      return;
    }
    if (event.target.closest('.memories-canvas')) {
      hi('clear');
    }
    return;
  }
  var action = actionEl.getAttribute('data-action');
  if (action === 'select-memory-node') {
    if (_dragged) { _dragged = false; return; }
    var nodeId = actionEl.getAttribute('data-node-id') || '';
    selNode(nodeId);
    hi('node', nodeId);
    return;
  }
  if (action === 'delete-memory') {
    archiveMemoryFromGraph(actionEl);
    return;
  }
  if (action === 'edit-memory') {
    editMemoryFromGraph(actionEl);
    return;
  }
  if (action === 'view-memory') {
    viewMemory(
      actionEl.getAttribute('data-profile') || '',
      actionEl.getAttribute('data-scope') || '',
      actionEl.getAttribute('data-file') || '',
      actionEl.getAttribute('data-id') || ''
    );
    return;
  }
  if (action === 'copy-resolve-pair') {
    copyResolvePairPrompt(
      actionEl.getAttribute('data-id-a') || '',
      actionEl.getAttribute('data-id-b') || ''
    );
  }
});
var _dragged = false;
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    var vp = window._memoriesViewport;
    if (vp && vp.isFullscreen) {
      toggleMemoriesFullscreen();
    }
  }
});
document.addEventListener('mousedown', function(e) {
  var el = e.target.closest('.memory-node');
  if (!el) return;
  _dragged = false;
  var sx = e.clientX, sy = e.clientY, ix = el.offsetLeft, iy = el.offsetTop;
  var zoom = window._memoriesViewport.zoom || 1.0;
  function move(ev) {
    var dx = (ev.clientX - sx) / zoom, dy = (ev.clientY - sy) / zoom;
    if (Math.abs(dx * zoom) > 3 || Math.abs(dy * zoom) > 3) _dragged = true;
    el.style.left = (ix + dx) + 'px';
    el.style.top = (iy + dy) + 'px';
    updateEdges();
  }
  function up() {
    document.removeEventListener('mousemove', move);
    document.removeEventListener('mouseup', up);
  }
  document.addEventListener('mousemove', move);
  document.addEventListener('mouseup', up);
});
function updateEdges() {
  document.querySelectorAll('.memories-svg path').forEach(function(path) {
    var a = document.getElementById(path.getAttribute('data-from'));
    var b = document.getElementById(path.getAttribute('data-to'));
    if (!a || !b) return;
    if (path.getAttribute('data-kind') === 'dependency') {
      var tmp = a; a = b; b = tmp;
    }
    var x1 = a.offsetLeft + a.offsetWidth, y1 = a.offsetTop + 38;
    var x2 = b.offsetLeft, y2 = b.offsetTop + 38;
    if (a.offsetLeft > b.offsetLeft) {
      x1 = a.offsetLeft;
      x2 = b.offsetLeft + b.offsetWidth;
    }
    if (x1 < x2) {
      x1 += 4; x2 -= 10;
    } else {
      x1 -= 4; x2 += 10;
    }
    path.setAttribute('d', 'M ' + x1 + ' ' + y1 + ' C ' + (x1 + x2) / 2 + ' ' + y1 + ', ' + (x1 + x2) / 2 + ' ' + y2 + ', ' + x2 + ' ' + y2);
  });
}
function updateMemoriesViewport() {
  var canvas = document.querySelector('.memories-canvas');
  if (canvas) {
    var vp = window._memoriesViewport;
    canvas.style.transform = 'translate(' + vp.panX + 'px, ' + vp.panY + 'px) scale(' + vp.zoom + ')';
  }
  var fsBtn = document.getElementById('memories-fullscreen-btn');
  if (fsBtn) {
    fsBtn.textContent = window._memoriesViewport.isFullscreen ? '✕' : '⛶';
  }
}
function zoomMemories(direction, clientX, clientY) {
  var vp = window._memoriesViewport;
  var graph = document.querySelector('.memories-graph');
  if (!graph) return;
  var rect = graph.getBoundingClientRect();
  
  var mouseX, mouseY;
  if (clientX !== undefined && clientY !== undefined) {
    mouseX = clientX - rect.left;
    mouseY = clientY - rect.top;
  } else {
    mouseX = rect.width / 2;
    mouseY = rect.height / 2;
  }
  
  var oldZoom = vp.zoom;
  var factor = direction > 0 ? 1.2 : 1 / 1.2;
  var newZoom = oldZoom * factor;
  if (newZoom < 0.2) newZoom = 0.2;
  if (newZoom > 3.0) newZoom = 3.0;
  
  if (newZoom !== oldZoom) {
    vp.panX = mouseX - (mouseX - vp.panX) * (newZoom / oldZoom);
    vp.panY = mouseY - (mouseY - vp.panY) * (newZoom / oldZoom);
    vp.zoom = newZoom;
    updateMemoriesViewport();
  }
}
function resetMemories() {
  var vp = window._memoriesViewport;
  vp.panX = 0;
  vp.panY = 0;
  vp.zoom = 1.0;
  updateMemoriesViewport();
}
function toggleMemoriesFullscreen() {
  var vp = window._memoriesViewport;
  var graph = document.querySelector('.memories-graph');
  if (!graph) return;
  vp.isFullscreen = !vp.isFullscreen;
  if (vp.isFullscreen) {
    graph.classList.add('fullscreen');
  } else {
    graph.classList.remove('fullscreen');
  }
  updateMemoriesViewport();
}
function hi(mode, target) {
  var c = document.querySelector('.memories-canvas');
  if (!c) return;
  var btn = document.getElementById('memories-clear-hi-btn');
  if (mode === 'clear') {
    c.classList.remove('highlight-active');
    c.querySelectorAll('.highlighted').forEach(function(el) { el.classList.remove('highlighted'); });
    if (btn) btn.style.display = 'none';
    return;
  }
  c.classList.add('highlight-active');
  c.querySelectorAll('.highlighted').forEach(function(el) { el.classList.remove('highlighted'); });
  if (btn) btn.style.display = 'inline-flex';
  if (mode === 'node') {
    var n = document.getElementById(target);
    if (n) n.classList.add('highlighted');
    c.querySelectorAll('.memories-svg path').forEach(function(p) {
      var f = p.getAttribute('data-from'), t = p.getAttribute('data-to');
      if (f === target || t === target) {
        p.classList.add('highlighted');
        var o = document.getElementById(f === target ? t : f);
        if (o) o.classList.add('highlighted');
      }
    });
  } else if (mode === 'path') {
    target.classList.add('highlighted');
    var f = document.getElementById(target.getAttribute('data-from'));
    var t = document.getElementById(target.getAttribute('data-to'));
    if (f) f.classList.add('highlighted');
    if (t) t.classList.add('highlighted');
  }
}
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
  if (name === 'memories') {
    loadMemories(false);
  }
}

function toggleSidebar() {
  var app = document.querySelector('.app');
  if (app) app.classList.toggle('sb-open');
}

// Theme
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

// Version & Upgrade
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

async function checkLatestVersion(){if(window._checkedLatest)return;try{var res=await fetch('https://registry.npmjs.org/@the-long-ride/engram/latest');if(!res.ok)return;var j=await res.json();if(j.version&&D.version&&isNewer(j.version,D.version)){var el=document.getElementById('sb-upgrade');if(el)el.style.display='flex';}window._checkedLatest=true;}catch(e){}}

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

// Data
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

// API call
async function api(url, body) {
  var j = await postJson(url, body);
  if (!j) return false;
  toast(j.message || 'Saved');
  await load();
  return j;
}

// Toast
function toast(msg, ok) {
  var el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'show ' + (ok !== false ? 'ok' : 'err');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(function() { el.className = ''; }, 3200);
}

// Config tab
function renderConfig() {
  if (!D) return;
  var html = '<div class="tab-hdr"><h1>Construct</h1><p>Settings applied across all workspaces.</p></div>';
  if (!D.sqliteAvailable) {
    html += '<div class="banner banner-info">Running in JSON mode. Profiles/workspaces require SQLite.</div>';
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

  if (key !== 'global_path') {
    renderConfig();
    return;
  }

  _cfgValidationSeq += 1;
  var validationSeq = _cfgValidationSeq;
  if (!RowErrors[key] && value) {
    var res = await postJson('/api/config/validate', { patch: { global_path: value } });
    if (validationSeq !== _cfgValidationSeq || Draft[key] !== value) return;
    if (res) {
      if (res.ok === false) {
        var issue = (res.issues || []).find(function(i) { return i.key === 'global_path'; });
        RowErrors.global_path = issue ? issue.message : 'Global path validation failed';
      } else {
        RowErrors.global_path = '';
      }
    }
  }

  renderConfig();
}

function resetCfgField(key) {
  var field = fieldByKey(key);
  if (!field) return;
  _cfgValidationSeq += 1;
  Draft[key] = uiValue(field, gv(D.config, key));
  Dirty[key] = false;
  delete RowErrors[key];
  renderConfig();
}

function discardCfgDraft() {
  _cfgValidationSeq += 1;
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
    var raw = String(value || '').trim();
    if (raw) {
      var roles = raw.split(',').map(function(r) { return r.trim(); });
      if (roles.some(function(r) { return !r; })) return 'roles cannot contain empty role names';
      var bad = roles.find(function(r) { return !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/.test(r); });
      if (bad) return 'Invalid role: ' + bad;
    }
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
    toast('Fix config values before saving', false);
    return;
  }
  var patch = buildPatch(), keys = Object.keys(patch);
  if (!keys.length) return;
  _pendingPatch = patch;

  var risky = keys.filter(function(k) { return (fieldByKey(k)||{}).risk === 'risky'; });
  var rows = keys.map(function(k) {
    var f = fieldByKey(k);
    return '<tr><td class="mono">' + esc(k) + '</td><td>' + esc(uiValue(f, gv(D.config, k)) || '-') + '</td><td>' + esc(patch[k] || '-') + '</td></tr>';
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
  var risky = Object.keys(_pendingPatch).some(function(k) { return (fieldByKey(k)||{}).risk === 'risky'; });
  var riskOk = document.getElementById('cfg-risk-ok');
  if (risky && (!riskOk || !riskOk.checked)) {
    toast('Confirm risky changes first', false);
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
    if (r.ok) return j;
    toast(j.error || 'Request failed', false);
  } catch(e) {
    toast(e.message, false);
  }
  return null;
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
    var title = (opts && opts.title) || 'Confirm action';
    var body = (opts && (opts.message || opts.body)) || 'Continue?';
    var confirmText = (opts && opts.confirmText) || 'Confirm';
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
    var root = document.getElementById('modal-root');
    if (root) {
      root.onclick = function(e) {
        if (e.target.closest('[data-confirm-confirm]')) finish(true);
        else if (e.target.closest('[data-confirm-cancel],[data-confirm-close]')) finish(false);
      };
      var cancel = root.querySelector('[data-confirm-cancel]');
      if (cancel) cancel.focus();
    }
  });
}


// Profiles tab
function renderProfiles() {
  if (!D) return;
  var html = '<div class="tab-hdr"><h1>Profiles</h1><p>Isolated global memory roots for different contexts.</p></div>';
  if (!D.sqliteAvailable) {
    html += '<div class="banner banner-warn">⚠️ SQLite unavailable — profile management requires it.</div>';
  }
  if (D.sqliteAvailable) {
    html += '<div class="tab-actions"><button class="btn btn-primary" onclick="toggleAddProfile()">+ Add Profile</button></div>';
    html += '<div class="add-form-row" id="pf-form">' +
      '<div class="form-group"><label class="form-label">Name</label><input class="form-input" id="pf-name" style="width:160px"></div>' +
      '<div class="form-group"><label class="form-label">Global Path</label><div class="input-with-btn"><input class="form-input" id="pf-path" style="width:320px"><button class="btn btn-outline" onclick="browseFolder(\'pf-path\')">Browse</button></div></div>' +
      '<div class="form-group"><label class="form-label">Scope</label><select class="form-select" id="pf-scope"><option>global</option><option>workspace</option><option>both</option></select></div>' +
      '<div class="form-group" style="align-items:flex-end"><div style="display:flex;gap:6px"><button class="btn btn-primary" onclick="saveProfile()">Save</button><button class="btn btn-outline" onclick="toggleAddProfile()">Cancel</button></div></div>' +
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
        html += '<td class="actions" style="display:flex;justify-content:flex-end;align-items:center;gap:6px">' +
          (!isActive ? '<button class="btn btn-outline" style="height:24px;font-size:11px;padding:0 8px;" onclick="activateProfile(\'' + esc(escJs(p.name)) + '\')">Activate</button>' : '') +
          '<button class="btn btn-outline" style="height:24px;font-size:11px;padding:0 8px;" onclick="editProfile(\'' + esc(escJs(p.name)) + '\',\'' + esc(escJs(p.global_path)) + '\',\'' + esc(escJs(p.scope)) + '\')">Edit</button>' +
          '<button class="btn btn-outline-danger" style="height:24px;font-size:11px;padding:0 8px;" onclick="removeProfile(\'' + esc(escJs(p.name)) + '\')">Remove</button>' +
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

// Workspaces tab
function renderWorkspaces() {
  if (!D) return;
  var html = '<div class="tab-hdr"><h1>Workspaces</h1><p>Projects tracked for memory routing.</p></div>';
  if (!D.sqliteAvailable) {
    html += '<div class="banner banner-warn">⚠️ SQLite unavailable — workspace management requires it.</div>';
  }
  if (D.sqliteAvailable) {
    html += '<div class="tab-actions"><button class="btn btn-primary" onclick="toggleAddWs()">+ Register Workspace</button></div>';
    html += '<div class="add-form-row" id="ws-form">' +
      '<div class="form-group"><label class="form-label">Path</label><div class="input-with-btn"><input class="form-input" id="ws-path" style="width:360px"><button class="btn btn-outline" onclick="browseFolder(\'ws-path\')">Browse</button></div></div>' +
      '<div class="form-group"><label class="form-label">Name (optional)</label><input class="form-input" id="ws-name" style="width:200px"></div>' +
      '<div class="form-group" style="align-items:flex-end"><div style="display:flex;gap:6px"><button class="btn btn-primary" onclick="saveWs()">Register</button><button class="btn btn-outline" onclick="toggleAddWs()">Cancel</button></div></div>' +
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
        html += '<td class="actions" style="display:flex;justify-content:flex-end;align-items:center;gap:6px">' +
          '<button class="btn ' + (linked ? 'btn-outline-danger' : 'btn-outline') + '" style="height:24px;font-size:11px;padding:0 8px;" onclick="toggleLink(\'' + esc(escJs(ws.path)) + '\',' + (!linked) + ')">' + (linked ? 'Unlink' : 'Link') + '</button>' +
          '<button class="btn btn-outline-danger" style="height:24px;font-size:11px;padding:0 8px;" onclick="removeWs(\'' + esc(escJs(ws.path)) + '\')">Remove</button>' +
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

// Runtime tab
function renderRuntime() {
  if (!D) return;
  var html = '<div class="tab-hdr"><h1>Runtime</h1><p>Configuration snapshot. Click any row to copy.</p></div><div class="rt-grid">';
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

// Shutdown
function doShutdown() {
  fetch('/shutdown').catch(function(){});
  setTimeout(function() { window.close(); }, 400);
}


// Workspace Init
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
      toast('Workspace initialized!');
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

// Connection Tab
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

  function agBtn(id, linked, isGlobal, detected) {
    if (!detected) return '<span style="color:var(--g500);font-size:11px;">Not Available</span>';
    if (linked) {
      return '<span style="display:flex;align-items:center;gap:6px;color:var(--green);font-weight:500;">✓ Linked<button class="btn btn-outline-danger" style="height:24px;font-size:11px;padding:0 8px;" onclick="unlinkAgent(\'' + escJs(id) + '\',' + isGlobal + ')">Unlink</button></span>';
    }
    return '<button class="btn btn-outline" style="height:24px;font-size:11px;padding:0 8px;" onclick="linkAgent(\'' + escJs(id) + '\',' + isGlobal + ')">Link</button>';
  }

  window._agentsData.sort(function(a, b) {
    return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
  });

  var html = '<div class="tab-hdr" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px">' +
    '<div>' +
      '<h1>AI Agent Connections</h1>' +
      '<p>Link Engram memory skillsets and hooks to local AI agents.</p>' +
    '</div>' +
    '<button class="btn btn-outline" onclick="scanAgents()">' +
      'Refresh' +
    '</button>' +
  '</div>';

  html += '<div class="conn-grid">';

  window._agentsData.forEach(function(agent) {
    var detectedLabel = agent.detected
      ? '<span class="conn-status detected">Detected</span>'
      : '<span class="conn-status missing">Not Detected</span>';

    var cardClass = 'conn-card' + (agent.detected ? '' : ' disabled');
    var wsBtn = agBtn(agent.id, agent.workspaceLinked, false, agent.detected);
    var glBtn = agBtn(agent.id, agent.globalLinked, true, agent.detected);
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
      toast('Connected!', true);
    }
    await scanAgents();
  }
}

async function unlinkAgent(agentId, isGlobal) {
  var ok = await confirmAction({
    title: 'Unlink AI agent',
    body: 'Unlink ' + agentId + ' from Engram (' + (isGlobal ? 'global' : 'workspace') + ')?',
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
      toast('Disconnected!', true);
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
        scopes: window._coreOptions.scopes || ['profile', 'global', 'workspace'],
        types: window._coreOptions.types || ['rule', 'skill', 'workflow', 'knowledge'],
        limit: window._coreOptions.limit
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

function ga(el,n){return el.getAttribute(n)||"";}
async function loadMemories(reb){if(window._memoriesLoading)return;window._memoriesLoading=true;var p=document.getElementById('tab-memories'),o=window._memoriesOptions;if(p&&!window._memoriesData)p.innerHTML='<div class="loading"><div class="spinner"></div>&nbsp;&nbsp;Loading memories graph&hellip;</div>';try{var res=await fetch('/api/memories',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rebuild:reb===true,semantic:o.semantic===true,scopes:o.scopes,limit:o.limit})}),j=await res.json();if(!res.ok||!j.ok)throw new Error(j.error||'Failed to load Memories data');window._memoriesData=j.data;if(!window._memoriesSelectedId&&j.data.nodes.length)window._memoriesSelectedId=j.data.nodes[0].id;renderMemories();}catch(e){if(p)p.innerHTML='<div class="loading" style="color:var(--red);flex-direction:column;gap:12px"><span>'+esc(e.message)+'</span><button class="btn btn-outline" onclick="refreshMemories()">Retry</button></div>';}finally{window._memoriesLoading=false;}}
function refreshMemories(){return loadMemories(true);}
function tglScope(s){var o=window._memoriesOptions,a=o.scopes.slice(),i=a.indexOf(s);if(i>=0&&a.length>1)a.splice(i,1);else if(i<0)a.push(s);o.scopes=a;return loadMemories(false);}
function tglSem(){window._memoriesOptions.semantic=!window._memoriesOptions.semantic;return loadMemories(false);}
function getMemoryType(n){
  var type = n.type || '';
  if (type === 'skill') {
    var isWorkflow = (n.file || '').toLowerCase().indexOf('workflow') >= 0 ||
                     (n.id || '').toLowerCase().indexOf('workflow') >= 0 ||
                     (n.memoryId || '').toLowerCase().indexOf('workflow') >= 0 ||
                     (n.summary || '').toLowerCase().indexOf('workflow') >= 0 ||
                     (n.tags && n.tags.some(function(t){ return t.toLowerCase().indexOf('workflow') >= 0; }));
    return isWorkflow ? 'workflow' : 'skill';
  }
  return type;
}

function selNode(id){window._memoriesSelectedId=id;renderMemories();}
function renderMemories(){
  var p=document.getElementById('tab-memories');
  if(!p||!window._memoriesData)return;
  var d=window._memoriesData;
  var enabledTypes = window._memoriesOptions.types || ['rule', 'skill', 'workflow', 'knowledge'];
  var filteredNodes = d.nodes.filter(function(n){
    return enabledTypes.indexOf(getMemoryType(n)) >= 0;
  });
  var nodeIds = new Set(filteredNodes.map(function(n){ return n.id; }));
  var filteredLinks = d.links.filter(function(l){
    return nodeIds.has(l.from) && nodeIds.has(l.to);
  });
  var filteredData = {
    nodes: filteredNodes,
    links: filteredLinks,
    stats: d.stats
  };
  var s=filteredNodes.find(function(n){return n.id===window._memoriesSelectedId;})||filteredNodes[0];
  p.innerHTML='<div class="tab-hdr memories-hdr"><div><h1>Memories</h1><p>Dependency map across profile, global, and workspace memory.</p></div><button class="btn btn-outline" onclick="refreshMemories()">Refresh</button></div>'+rToolbar(d)+'<div class="memories-shell">'+renderMemoriesGraph(filteredData,s?s.id:'')+rDetail(s)+'</div>';
  
  updateMemoriesViewport();
  
  var graph = p.querySelector('.memories-graph');
  if (graph) {
    if (window._memoriesViewport.isFullscreen) {
      graph.classList.add('fullscreen');
      updateMemoriesViewport();
    }
    graph.addEventListener('wheel', function(e) {
      e.preventDefault();
      var direction = e.deltaY < 0 ? 1 : -1;
      zoomMemories(direction, e.clientX, e.clientY);
    }, { passive: false });

    graph.addEventListener('mousedown', function(e) {
      if (e.target.closest('.memory-node') || e.target.closest('.memories-controls')) return;
      e.preventDefault();
      
      var vp = window._memoriesViewport;
      var startX = e.clientX;
      var startY = e.clientY;
      var startPanX = vp.panX;
      var startPanY = vp.panY;
      
      function onMouseMove(ev) {
        var dx = ev.clientX - startX;
        var dy = ev.clientY - startY;
        vp.panX = startPanX + dx;
        vp.panY = startPanY + dy;
        updateMemoriesViewport();
      }
      
      function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      }
      
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }
}

function rToolbar(d){
  var o=window._memoriesOptions;
  var sem=o.semantic===true;
  var scopesBtn=function(s,l){return '<button class="scope-chip'+(o.scopes.indexOf(s)>=0?' active':'')+'" onclick="tglScope(\''+s+'\')">'+l+'</button>';};
  var types = o.types || ['rule', 'skill', 'workflow', 'knowledge'];
  var typesBtn=function(t,l){return '<button class="scope-chip'+(types.indexOf(t)>=0?' active':'')+'" onclick="tglMemoriesType(\''+t+'\')">'+l+'</button>';};
  
  var enabledTypes = o.types || ['rule', 'skill', 'workflow', 'knowledge'];
  var filteredNodes = d.nodes.filter(function(n){
    return enabledTypes.indexOf(getMemoryType(n)) >= 0;
  });

  return '<div class="memories-toolbar">'+
    '<div class="memories-scope-controls">'+scopesBtn('profile','Profile')+scopesBtn('global','Global')+scopesBtn('workspace','Workspace')+'</div>'+
    '<div class="memories-scope-controls">'+typesBtn('rule','Rule')+typesBtn('skill','Skills')+typesBtn('workflow','Workflow')+typesBtn('knowledge','Knowledge')+'</div>'+
    '<div class="core-check" onclick="tglSem()"><span>Thin semantic lines</span><div class="tgl'+(sem?' on':'')+'"><div class="tgl-thumb"></div></div></div>'+
    '<span class="badge badge-neutral">'+filteredNodes.length+' / '+d.stats.total+' memories</span>'+
    '<span class="badge badge-blue">'+d.stats.dependencies+' dependencies</span>'+
    '<span class="badge badge-amber">'+d.stats.thinLinks+' thin links</span>'+
  '</div>';
}

function tglMemoriesType(t){
  var o=window._memoriesOptions;
  if(!o.types){
    o.types = ['rule', 'skill', 'workflow', 'knowledge'];
  }
  var a = o.types.slice();
  var i = a.indexOf(t);
  if(i>=0&&a.length>1){
    a.splice(i,1);
  }else if(i<0){
    a.push(t);
  }
  o.types = a;
  renderMemories();
}
function memLayout(d){var nodes=d.nodes.slice();nodes.sort(function(a,b){var hA=0,hB=0;for(var i=0;i<a.id.length;i++)hA=(hA*31+a.id.charCodeAt(i))&0xfffffff;for(var i=0;i<b.id.length;i++)hB=(hB*31+b.id.charCodeAt(i))&0xfffffff;return hA-hB;});var cols=4,cellW=320,cellH=140,w=cols*cellW+40,rows=Math.max(3,Math.ceil(nodes.length/cols)),h=rows*cellH+60,pos={};nodes.forEach(function(n,idx){var row=Math.floor(idx/cols),col=idx%cols,hash=0;for(var i=0;i<n.id.length;i++)hash=(hash*31+n.id.charCodeAt(i))&0xfffffff;var offsetX=hash%50,offsetY=(hash>>5)%30,x=col*cellW+20+offsetX,y=row*cellH+40+offsetY;pos[n.id]={x:x,y:y,w:252,h:86};});return{positions:pos,width:w,height:h};}
function renderMemoriesGraph(d,selId){if(!d.nodes.length)return '<div class="memories-graph empty">No memories found for selected scopes.</div>';var lay=memLayout(d),pos=lay.positions,svg=d.links.map(function(l){var a=pos[l.from],b=pos[l.to];if(!a||!b)return '';if(l.kind==='dependency'){a=pos[l.to];b=pos[l.from];}var x1=a.x+a.w,y1=a.y+38,x2=b.x,y2=b.y+38;if(a.x>b.x){x1=a.x;x2=b.x+b.w;}if(x1<x2){x1+=4;x2-=10;}else{x1-=4;x2+=10;}var cls=l.thin?'memory-edge memory-edge-thin':'memory-edge memory-edge-dependency',m=l.kind==='dependency'?' marker-end="url(#mem-arrow)"':'';return '<path class="'+cls+'" data-from="'+esc(l.from)+'" data-to="'+esc(l.to)+'" data-kind="'+esc(l.kind)+'" d="M '+x1+' '+y1+' C '+(x1+x2)/2+' '+y1+', '+(x1+x2)/2+' '+y2+', '+x2+' '+y2+'"'+m+'><title>'+esc(l.label)+'</title></path>';}).join(''),nodes=d.nodes.map(function(n){var p=pos[n.id];var kicker=n.sourceScope==='workspace'?esc(n.profile)+'/'+esc(n.workspaceName||'workspace'):esc(n.profile)+' / '+esc(n.sourceScope);return '<button type="button" id="'+esc(n.id)+'" class="memory-node memory-node-'+esc(n.sourceScope)+(n.id===selId?' active':'')+'" style="left:'+p.x+'px;top:'+p.y+'px;width:'+p.w+'px;height:'+p.h+'px" data-action="select-memory-node" data-node-id="'+esc(n.id)+'">'+'<span class="memory-node-kicker">'+kicker+'</span>'+'<strong>'+esc(n.memoryId)+'</strong>'+'<span>'+esc(n.summary||n.file)+'</span>'+'</button>';}).join('');return '<div class="memories-graph"><div class="memories-controls"><button type="button" id="memories-clear-hi-btn" onclick="hi(\'clear\')" title="Clear Highlight" style="display: none;">Clear</button><button type="button" onclick="zoomMemories(1)" title="Zoom In">+</button><button type="button" onclick="zoomMemories(-1)" title="Zoom Out">-</button><button type="button" onclick="resetMemories()" title="Reset View">⟲</button><button type="button" id="memories-fullscreen-btn" onclick="toggleMemoriesFullscreen()" title="Toggle Fullscreen">⛶</button></div><div class="memories-canvas" style="width:'+lay.width+'px;height:'+lay.height+'px"><svg class="memories-svg" style="width:'+lay.width+'px;height:'+lay.height+'px" viewBox="0 0 '+lay.width+' '+lay.height+'" aria-hidden="true"><defs><marker id="mem-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M1,1 L7,4 L1,7" /></marker></defs>'+svg+'</svg>'+nodes+'</div></div>';}
function actAttrs(n){return ' data-profile="'+esc(n.profile)+'" data-scope="'+esc(n.scope)+'" data-file="'+esc(n.file)+'" data-id="'+esc(n.memoryId)+'"';}
function rDetail(n){
  if(!n)return '<aside class="memory-detail"><div class="core-empty">Select a memory.</div></aside>';
  var badges = '<span class="badge badge-neutral">'+esc(n.profile)+'</span><span class="badge badge-neutral">'+esc(n.scope)+'</span>';
  if(n.workspaceName){
    badges += '<span class="badge badge-blue">'+esc(n.workspaceName)+'</span>';
  }
  return '<aside class="memory-detail"><div class="memory-detail-hdr">'+badges+'</div><h2>'+esc(n.memoryId)+'</h2><p>'+esc(n.summary||'')+'</p><div class="mono memory-file">'+esc(n.file)+'</div><div class="memory-detail-actions"><button class="btn btn-outline" data-action="view-memory"'+actAttrs(n)+'>View</button><button class="btn btn-outline" data-action="edit-memory"'+actAttrs(n)+(n.canEdit?'':' disabled')+'>Edit</button><button class="btn btn-danger" data-action="delete-memory"'+actAttrs(n)+(n.canDelete?'':' disabled')+'>Delete</button></div></aside>';
}
async function editMemoryFromGraph(el){var p=ga(el,'data-profile'),s=ga(el,'data-scope')||'global',f=ga(el,'data-file');try{var res=await fetch('/api/memory/file?profile='+ec(p)+'&scope='+ec(s)+'&file='+ec(f)),j=await res.json();if(!res.ok||!j.ok)throw new Error(j.error||'Failed to resolve memory file');window._modalCopyContent=j.data.path;window.open(j.data.editorUrl,'_blank','noopener,noreferrer');toast('Opening editor. Path copied.');navigator.clipboard.writeText(j.data.path).catch(function(){});}catch(e){toast(e.message,false);}}
async function archiveMemoryFromGraph(el){var p=ga(el,'data-profile'),s=ga(el,'data-scope')||'global',f=ga(el,'data-file'),id=ga(el,'data-id')||f;if(!await confirmAction({title:'Delete memory',message:'Remove '+id+' from active routing? Preserved under archive.',confirmText:'Delete',danger:true}))return;try{var res=await postJson('/api/memory/archive',{profile:p,scope:s,file:f,id:id,reason:'Deleted from Memories graph view'});if(!res)return;toast(res.data&&res.data.message?res.data.message:'Memory archived');window._memoriesData=null;window._memoriesSelectedId='';await loadMemories(true);}catch(e){toast(e.message,false);}}


function renderCore() {
  var pane = document.getElementById('tab-core');
  if (!pane || !window._coreData) return;
  var data = window._coreData;
  // Note: data.warning may contain: consume more tokens
  pane.innerHTML =
    '<div class="tab-hdr core-hdr">' +
      '<div><h1>Core</h1><p>Duplicate memory candidates and relationships across profile, global, and workspace scopes.</p></div>' +
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
  var scopes = window._coreOptions.scopes || ['profile', 'global', 'workspace'];
  var types = window._coreOptions.types || ['rule', 'skill', 'workflow', 'knowledge'];
  var semantic = window._coreOptions.semantic === true;
  var profilesCount = data.scope.profiles ? data.scope.profiles.length : 1;
  
  var scopeBtn = function(s, l) {
    return '<button class="scope-chip' + (scopes.indexOf(s) >= 0 ? ' active' : '') + '" onclick="tglCoreScope(\'' + s + '\')">' + l + '</button>';
  };
  var typeBtn = function(t, l) {
    return '<button class="scope-chip' + (types.indexOf(t) >= 0 ? ' active' : '') + '" onclick="tglCoreType(\'' + t + '\')">' + l + '</button>';
  };

  return '<div class="core-toolbar">' +
    '<div class="core-scope-controls">' +
      scopeBtn('profile', 'Profile') +
      scopeBtn('global', 'Global') +
      scopeBtn('workspace', 'Workspace') +
    '</div>' +
    '<div class="core-scope-controls">' +
      typeBtn('rule', 'Rule') +
      typeBtn('skill', 'Skills') +
      typeBtn('workflow', 'Workflow') +
      typeBtn('knowledge', 'Knowledge') +
    '</div>' +
    '<div class="core-check" onclick="toggleCoreSemantic()">' +
      '<span>Include semantic candidates</span>' +
      '<div class="tgl' + (semantic ? ' on' : '') + '"><div class="tgl-thumb"></div></div>' +
    '</div>' +
    '<span class="badge badge-neutral">Active profile: ' + esc(data.scope.activeProfile || '<none>') + '</span>' +
    '<span class="badge badge-neutral">Profiles scanned: ' + profilesCount + '</span>' +
  '</div>';
}

function tglCoreScope(s) {
  var o = window._coreOptions;
  if (!o.scopes) {
    o.scopes = ['profile', 'global', 'workspace'];
  }
  var a = o.scopes.slice();
  var i = a.indexOf(s);
  if (i >= 0 && a.length > 1) {
    a.splice(i, 1);
  } else if (i < 0) {
    a.push(s);
  }
  o.scopes = a;
  loadCore(false);
}

function tglCoreType(t) {
  var o = window._coreOptions;
  if (!o.types) {
    o.types = ['rule', 'skill', 'workflow', 'knowledge'];
  }
  var a = o.types.slice();
  var i = a.indexOf(t);
  if (i >= 0 && a.length > 1) {
    a.splice(i, 1);
  } else if (i < 0) {
    a.push(t);
  }
  o.types = a;
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
    return '<div class="core-dup">' +
      '<div class="core-dup-score">' +
        Math.round(pair.score * 100) + '%<span>' + esc(pair.method) + '</span>' +
        '<button class="btn btn-outline" data-action="copy-resolve-pair" data-id-a="' + esc(pair.a.id) + '" data-id-b="' + esc(pair.b.id) + '" style="margin-top:12px;font-size:10px;padding:4px 6px;height:auto;line-height:1.2;width:100%;white-space:normal;">Copy prompt</button>' +
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
  return '<button type="button" class="core-memory-ref" data-action="view-memory" data-profile="' + esc(ref.profile) + '" data-scope="' + esc(ref.scope) + '" data-file="' + esc(ref.file) + '" data-id="' + esc(ref.id) + '">' +
    '<div>' +
      '<span class="badge badge-neutral">' + esc(ref.profile) + '</span> ' +
      '<span class="badge badge-neutral">' + esc(ref.scope) + '</span> ' +
      '<span class="mono">' + esc(ref.file) + '</span>' +
    '</div>' +
    '<strong>' + esc(ref.id) + '</strong>' +
    '<p>' + esc(ref.summary || '') + '</p>' +
  '</button>';
}

async function viewMemory(profile, scope, file, id) {
  window._modalCopyContent = '';
  showModal(
    '<div class="modal-panel confirm-panel" role="dialog" aria-modal="true" aria-labelledby="confirm-title">' +
      '<div class="modal-hdr">' +
        '<h2 id="confirm-title">' + esc(id) + '</h2>' +
        '<div style="display:flex;align-items:center;gap:8px">' +
          '<button class="btn btn-outline" style="height:24px;padding:0 6px" onclick="cpM()"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" style="width:12px;height:12px"><rect x="4" y="4" width="8" height="8"/><path d="M2 10V2h8"/></svg></button>' +
          '<button data-confirm-close>&times;</button>' +
        '</div>' +
      '</div>' +
      '<div class="modal-body"><div class="loading"><div class="spinner"></div>&nbsp;Loading memory&hellip;</div></div>' +
      '<div class="modal-actions confirm-actions">' +
        '<button class="btn btn-primary" data-confirm-close>Close</button>' +
      '</div>' +
    '</div>',
    function(ev) { if (ev.key === 'Escape' || ev.key === 'Enter') { ev.preventDefault(); closeModal(); } }
  );

  try {
    var res = await fetch('/api/memory?profile=' + ec(profile) + '&scope=' + ec(scope) + '&file=' + ec(file));
    var j = await res.json();
    if (!res.ok || !j.ok) throw new Error(j.error || 'Failed to load memory content');
    var bodyDiv = document.querySelector('#modal-root .modal-body');
    if (bodyDiv) {
      window._modalCopyContent = j.content;
      bodyDiv.innerHTML = '<pre class="mono" style="white-space:pre-wrap;margin:0;font-size:12px;user-select:text;background:var(--g100);padding:12px;border-radius:var(--r6);border:1px solid var(--g200);color:var(--g1000);text-align:left">' + esc(j.content) + '</pre>';
    }
  } catch (e) {
    var bodyDiv = document.querySelector('#modal-root .modal-body');
    if (bodyDiv) bodyDiv.innerHTML = '<div style="color:var(--red)">⚠️ ' + esc(e.message) + '</div>';
  }
}

function copyResolvePairPrompt(idA, idB) {
  var pair = window._coreData && window._coreData.duplicates && window._coreData.duplicates.find(function(p){return p.a.id===idA&&p.b.id===idB;});
  var refs = pair ? [pair.a, pair.b] : [];
  var refLines = refs.map(function(ref) {
    return '- id=' + ref.id + ' profile=' + ref.profile + ' scope=' + ref.scope + ' file=' + ref.file;
  }).join('\n');
  var prompt = [
    'Resolve these duplicate memories:',
    refLines || '- id=' + idA,
    'Decide whether to merge, archive, or keep both. Use TYPE, TEXT, CONTEXT, and UPDATE: memory-id. Preserve stronger, newer, and more specific guidance.'
  ].join('\n');

  var val = '/engram ' + prompt;
  navigator.clipboard.writeText(val).then(function() {
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
  var text = gv(window, '_coreData.prompts.' + key);
  if (!text) return;
  var val = '/engram ' + text;
  navigator.clipboard.writeText(val).then(function() { toast('Copied prompt'); }).catch(function() { toast('Copy failed', false); });
}

function viewCorePrompt(key, title) {
  var text = gv(window, '_coreData.prompts.' + key);
  if (!text) return;
  window._modalCopyContent = '/engram ' + text;
  showModal(
    '<div class="modal-panel confirm-panel" role="dialog" aria-modal="true" aria-labelledby="confirm-title" style="width:min(640px,100%)">' +
      '<div class="modal-hdr"><h2 id="confirm-title">' + esc(title) + '</h2><div style="display:flex;align-items:center;gap:8px"><button class="btn btn-outline" style="height:24px;padding:0 6px" onclick="cpM()"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" style="width:12px;height:12px"><rect x="4" y="4" width="8" height="8"/><path d="M2 10V2h8"/></svg></button><button data-confirm-close>&times;</button></div></div>' +
      '<div class="modal-body"><pre class="core-prompt-preview" style="margin:0;user-select:all">' + esc(text) + '</pre></div>' +
      '<div class="modal-actions confirm-actions"><button class="btn btn-primary" data-confirm-close>Close</button></div>' +
    '</div>',
    function(ev) { if (ev.key === 'Escape' || ev.key === 'Enter') { ev.preventDefault(); closeModal(); } }
  );
}

async function browseFolder(inputId) {
  var el = document.getElementById(inputId);
  var cv = el ? (el.value || '').trim() : '';
  var res = await postJson('/api/browse', { path: cv });
  if (!res) return;

  function renderBrowserContent(data) {
    var currentPath = data.currentPath || cv || '';
    var errorHtml = data.ok === false
      ? '<div class="dir-browser-error">' + esc(data.error || 'Cannot access directory') + '</div>'
      : '';
    var parent = data.parentPath
      ? '<button class="dir-item parent-dir" data-dir-path="' + esc(data.parentPath) + '">' +
          '<span class="dir-icon">📁</span>' +
          '<span class="dir-name">..</span>' +
        '</button>'
      : '';
    var dirs = (data.directories || []).map(function(entry) {
      return '<button class="dir-item" data-dir-path="' + esc(entry.path) + '">' +
        '<span class="dir-icon">📁</span>' +
        '<span class="dir-name">' + esc(entry.name) + '</span>' +
      '</button>';
    }).join('');
    var drives = (data.drives || []).map(function(drive) {
      var isCurrentDrive = currentPath.toLowerCase().startsWith(String(drive).toLowerCase());
      return '<button class="btn btn-ghost drive-btn' + (isCurrentDrive ? ' active' : '') + '" data-dir-path="' + esc(drive) + '">' + esc(drive) + '</button>';
    }).join('');

    return '<div class="modal-panel dir-browser-modal">' +
      '<div class="modal-hdr">' +
        '<h2 id="browser-title">Browse Directory</h2>' +
        '<button data-confirm-close>&times;</button>' +
      '</div>' +
      '<div class="modal-body dir-browser-body">' +
        '<div class="dir-browser-nav-bar">' +
          '<input class="form-input dir-browser-path" id="db-path-input" value="' + esc(currentPath) + '">' +
          '<button class="btn btn-primary" data-dir-go>Go</button>' +
        '</div>' +
        errorHtml +
        (drives ? '<div class="dir-browser-drives-title">Drives:</div><div class="dir-browser-drives">' + drives + '</div>' : '') +
        '<div class="dir-browser-list">' + parent + (dirs || '<div class="dir-browser-empty">Empty</div>') + '</div>' +
      '</div>' +
      '<div class="modal-actions">' +
        '<button class="btn btn-outline" data-confirm-close>Cancel</button>' +
        '<button class="btn btn-primary" data-dir-select>Select Folder</button>' +
      '</div>' +
    '</div>';
  }

  async function go(nextPath) {
    var nextRes = await postJson('/api/browse', { path: nextPath });
    if (!nextRes) return;
    var root = document.getElementById('modal-root');
    if (!root) return;
    root.innerHTML = renderBrowserContent(nextRes);
    wireDirBrowser(root, nextRes);
  }

  function selectPath(value) {
    if (el) {
      el.value = value || '';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
    closeModal();
  }

  function wireDirBrowser(root, data) {
    root.onclick = function(event) {
      var item = event.target.closest('[data-dir-path]');
      if (item) {
        go(item.getAttribute('data-dir-path') || '');
        return;
      }
      if (event.target.closest('[data-dir-go]')) {
        var pathInput = document.getElementById('db-path-input');
        go(pathInput ? pathInput.value : '');
        return;
      }
      if (event.target.closest('[data-dir-select]')) {
        selectPath(data.currentPath || '');
      }
    };

    var pathInput = document.getElementById('db-path-input');
    if (pathInput) {
      pathInput.onkeydown = function(event) {
        if (event.key === 'Enter') {
          event.preventDefault();
          go(pathInput.value);
        }
      };
    }
  }

  showModal(
    renderBrowserContent(res),
    function(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeModal();
      }
    }
  );

  var root = document.getElementById('modal-root');
  if (root) wireDirBrowser(root, res);
}

// Init
load();
