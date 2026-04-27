// ========== USER ACCOUNTS ==========
const USERS = {
  admin: { password: "1234", role: "admin", allowedTabs: ["fight-tab", "parada-tab", "schedule-tab", "scoring-tab", "overall-tab", "settings-tab", "history-tab"] },
  register: { password: "1234", role: "register", allowedTabs: ["fight-tab"] },
  monton: { password: "1234", role: "monton", allowedTabs: ["parada-tab", "schedule-tab", "scoring-tab", "history-tab"] }
};

let currentUser = null;

function applyUserPermissions(username) {
  const user = USERS[username];
  if (!user) return false;
  
  currentUser = { username, role: user.role, allowedTabs: user.allowedTabs };
  
  const tabs = document.querySelectorAll(".nav-tab");
  tabs.forEach(tab => {
    const tabId = tab.getAttribute("data-tab");
    if (user.allowedTabs.includes(tabId)) {
      tab.classList.remove("disabled");
      tab.style.display = "";
    } else {
      tab.classList.add("disabled");
      tab.style.display = "none";
    }
  });
  
  const firstAllowedTab = user.allowedTabs[0];
  if (firstAllowedTab) {
    tabs.forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active-tab"));
    const activeTab = document.querySelector(`.nav-tab[data-tab="${firstAllowedTab}"]`);
    if (activeTab) activeTab.classList.add("active");
    document.getElementById(firstAllowedTab).classList.add("active-tab");
    if (firstAllowedTab === "fight-tab") renderFightTab();
    if (firstAllowedTab === "parada-tab") renderParadaTab();
    if (firstAllowedTab === "schedule-tab") renderScheduleTab();
    if (firstAllowedTab === "scoring-tab") renderScoringTab();
    if (firstAllowedTab === "overall-tab") renderOverallResults();
    if (firstAllowedTab === "settings-tab") renderSettingsTab();
    if (firstAllowedTab === "history-tab") renderPrintHistory();
  }
  
  return true;
}

// ========== LIVE SCHEDULE FUNCTION ==========
function renderLiveSchedule() {
  const records = loadRecords();
  const results = loadScoringResults();
  const container = document.getElementById("liveScheduleList");
  
  if (!records.length) {
    container.innerHTML = '<div class="live-empty">No fights scheduled yet</div>';
    return;
  }
  
  let html = '';
  records.slice(0, 15).forEach((rec, idx) => {
    const savedResult = results[rec.id];
    let statusText = 'PENDING';
    let statusClass = 'live-status-pending';
    
    if (savedResult) {
      if (savedResult.result === "CANCELED") {
        statusText = 'CANCELED';
        statusClass = 'live-status-cancel';
      } else if (savedResult.result === "NO_FIGHT") {
        statusText = 'NO FIGHT';
        statusClass = 'live-status-no-fight';
      } else if (savedResult.result === "DRAW") {
        statusText = 'DRAW';
        statusClass = 'live-status-draw';
      } else if (savedResult.result === "HIGHER_WIN") {
        statusText = 'MERON WINS';
        statusClass = 'live-status-meron';
      } else if (savedResult.result === "LOWER_WIN") {
        statusText = 'WALA WINS';
        statusClass = 'live-status-wala';
      }
    }
    
    html += `
      <div class="live-schedule-item">
        <span class="live-fight-number">#${idx+1}</span>
        <span class="live-entry-name">🐓 ${escapeHtml(rec.left.entryName)} vs 🐓 ${escapeHtml(rec.right.entryName)}</span>
        <span class="live-status"><span class="${statusClass}">${statusText}</span></span>
      </div>
    `;
  });
  
  container.innerHTML = html;
}

// ========== LOGIN SYSTEM ==========
function attemptLogin() {
  const username = document.getElementById("loginUsername").value.trim().toLowerCase();
  const password = document.getElementById("loginPassword").value;
  const errorDiv = document.getElementById("loginError");
  
  const user = USERS[username];
  if (user && user.password === password) {
    document.getElementById("loginOverlay").style.display = "none";
    document.getElementById("mainContent").style.display = "block";
    applyUserPermissions(username);
    initializeApp();
  } else {
    errorDiv.textContent = "❌ Invalid username or password. Please try again.";
    document.getElementById("loginPassword").value = "";
  }
}

function logout() {
  currentUser = null;
  document.getElementById("loginOverlay").style.display = "flex";
  document.getElementById("mainContent").style.display = "none";
  document.getElementById("loginUsername").value = "";
  document.getElementById("loginPassword").value = "";
  document.getElementById("loginError").textContent = "";
  renderLiveSchedule();
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("loginPassword")?.addEventListener("keypress", (e) => { if (e.key === "Enter") attemptLogin(); });
  document.getElementById("loginUsername")?.addEventListener("keypress", (e) => { if (e.key === "Enter") attemptLogin(); });
});

// ========== DATA STORAGE ==========
const STORAGE_KEY = "boljoon_fight_records";
const PRINT_HISTORY_KEY = "boljoon_print_history";
const THEME_KEY = "boljoon_theme";
const SCORING_KEY = "boljoon_scoring_results";
const ADMIN_PASSWORD = "admin123";
const EDIT_NAMES_PASSWORD = "amenic";

let paradaSearchTerm = "", scheduleSearchTerm = "", scoringSearchTerm = "", historySearchTerm = "", overallSearchTerm = "";

function loadRecords() { const stored = localStorage.getItem(STORAGE_KEY); return stored ? JSON.parse(stored) : []; }
function saveRecords(records) { localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); renderAllTabs(); renderLiveSchedule(); }

function loadScoringResults() { const stored = localStorage.getItem(SCORING_KEY); return stored ? JSON.parse(stored) : {}; }

function saveScoringResult(fightId, resultType) {
  const results = loadScoringResults();
  if (resultType === "CANCEL") results[fightId] = { result: "CANCELED", locked: true, canceledAt: new Date().toLocaleString() };
  else if (resultType === "NO_FIGHT") results[fightId] = { result: "NO_FIGHT", locked: true, noFightAt: new Date().toLocaleString() };
  else if (resultType === "REMOVE") delete results[fightId];
  else results[fightId] = { result: resultType, locked: true, scoredAt: new Date().toLocaleString() };
  localStorage.setItem(SCORING_KEY, JSON.stringify(results));
  renderScoringTab(); renderScheduleTab(); renderOverallResults(); renderParadaTab(); renderLiveSchedule();
}

function adminEditResult(fightId, newResult) {
  const results = loadScoringResults();
  if (newResult === "CANCEL") results[fightId] = { result: "CANCELED", locked: true, adminEdited: true, editedAt: new Date().toLocaleString() };
  else if (newResult === "NO_FIGHT") results[fightId] = { result: "NO_FIGHT", locked: true, adminEdited: true, editedAt: new Date().toLocaleString() };
  else if (newResult === "REMOVE") delete results[fightId];
  else if (newResult) results[fightId] = { result: newResult, locked: true, adminEdited: true, editedAt: new Date().toLocaleString() };
  else delete results[fightId];
  localStorage.setItem(SCORING_KEY, JSON.stringify(results));
  renderScoringTab(); renderScheduleTab(); renderOverallResults(); renderParadaTab(); renderLiveSchedule();
  alert("Result updated successfully!");
}

function loadPrintHistory() { const stored = localStorage.getItem(PRINT_HISTORY_KEY); return stored ? JSON.parse(stored) : []; }
function savePrintHistory(history) { localStorage.setItem(PRINT_HISTORY_KEY, JSON.stringify(history)); }
function addPrintRecord(title, preview) { 
  if (title.includes("SCORING") || title.includes("WIN") || title.includes("LOSS")) return;
  const h = loadPrintHistory(); 
  h.unshift({ id: Date.now(), title, preview: preview.substring(0,100), timestamp: new Date().toLocaleString() }); 
  if (h.length > 50) h.pop();
  savePrintHistory(h); renderPrintHistory(); 
}

function formatParada(amt) { return `₱ ${Number(amt).toLocaleString()}`; }
function escapeHtml(str) { if (!str) return ""; return str.replace(/[&<>]/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[m])); }

function renderAllTabs() { 
  if (currentUser) {
    if (currentUser.allowedTabs.includes("fight-tab")) renderFightTab();
    if (currentUser.allowedTabs.includes("parada-tab")) renderParadaTab();
    if (currentUser.allowedTabs.includes("schedule-tab")) renderScheduleTab();
    if (currentUser.allowedTabs.includes("scoring-tab")) renderScoringTab();
    if (currentUser.allowedTabs.includes("overall-tab")) renderOverallResults();
    if (currentUser.allowedTabs.includes("settings-tab")) renderSettingsTab();
    if (currentUser.allowedTabs.includes("history-tab")) renderPrintHistory();
  }
}

function getRankedEntries(rec) {
  const lp = Number(rec.left.parada), rp = Number(rec.right.parada);
  if (lp >= rp) return { higher: rec.left, lower: rec.right, higherParada: lp, lowerParada: rp, higherIsLeft: true, difference: Math.abs(lp - rp) };
  else return { higher: rec.right, lower: rec.left, higherParada: rp, lowerParada: lp, higherIsLeft: false, difference: Math.abs(lp - rp) };
}

function getAllEntryNames() {
  const records = loadRecords();
  const names = new Set();
  records.forEach(rec => { names.add(rec.left.entryName); names.add(rec.right.entryName); });
  return Array.from(names);
}

function setupSearchSuggestions(inputId, suggestionsId, onSelectCallback) {
  const input = document.getElementById(inputId);
  const suggDiv = document.getElementById(suggestionsId);
  if (!input || !suggDiv) return;
  
  function showSuggestions(val) {
    const allNames = getAllEntryNames();
    const matches = allNames.filter(name => name.toLowerCase().includes(val.toLowerCase()) && name.toLowerCase() !== val.toLowerCase());
    if (!matches.length || !val) { suggDiv.style.display = "none"; return; }
    suggDiv.innerHTML = matches.map(name => `<div class="suggestion-item" onclick="selectSearchSuggestion('${name.replace(/'/g, "\\'")}', '${inputId}', '${suggestionsId}', ${onSelectCallback ? 'true' : 'false'})">🐓 ${escapeHtml(name)}</div>`).join("");
    suggDiv.style.display = "block";
  }
  input.addEventListener("input", () => showSuggestions(input.value));
  document.addEventListener("click", (e) => {
    if (!input.contains(e.target) && !suggDiv.contains(e.target)) suggDiv.style.display = "none";
  });
}

window.selectSearchSuggestion = function(name, inputId, suggestionsId, triggerSearch) {
  document.getElementById(inputId).value = name;
  document.getElementById(suggestionsId).style.display = "none";
  if (triggerSearch === 'true') {
    const searchBtn = document.querySelector(`#${inputId.replace('SearchInput', 'SearchBtn')}`);
    if (searchBtn) searchBtn.click();
  }
};

// FIGHT TAB
function renderFightTab() {
  const container = document.getElementById("fight-tab");
  container.innerHTML = `<div class="arena-container"><div class="section-title">🔥 REGISTER FIGHT</div>
    <div class="fight-grid"><div class="fighter-card"><div class="entry-label">🐓 ENTRY NAME</div><input type="text" id="entryNameLeft" class="input-field" autocomplete="off"><div id="leftSuggestions" class="suggestions-list" style="display:none;"></div>
    <div class="entry-label">🎽 BAND #</div><input type="text" id="bandLeft" class="input-field"><div class="entry-label">💰 PARADA</div><input type="number" id="paradaLeft" class="input-field" value="0" min="0" step="100"></div>
    <div class="vs-divider">VS</div>
    <div class="fighter-card"><div class="entry-label">🐓 ENTRY NAME</div><input type="text" id="entryNameRight" class="input-field" autocomplete="off"><div id="rightSuggestions" class="suggestions-list" style="display:none;"></div>
    <div class="entry-label">🎽 BAND #</div><input type="text" id="bandRight" class="input-field"><div class="entry-label">💰 PARADA</div><input type="number" id="paradaRight" class="input-field" value="0" min="0" step="100"></div></div>
    <div style="display:flex; justify-content:center;"><button id="submitFightBtn" class="btn btn-primary">✔️ SUBMIT FIGHT</button></div>
    <div class="registered-entries"><div style="margin-bottom:10px; font-weight:bold;">📋 REGISTERED ENTRIES</div><div id="registeredEntriesList" class="entries-list"></div></div></div>`;
  setupFightSuggestions();
  document.getElementById("submitFightBtn")?.addEventListener("click", submitFight);
  renderRegisteredEntries();
}

function setupFightSuggestions() {
  const leftInput = document.getElementById("entryNameLeft");
  const rightInput = document.getElementById("entryNameRight");
  const leftSugg = document.getElementById("leftSuggestions");
  const rightSugg = document.getElementById("rightSuggestions");
  function show(input, suggDiv, val) {
    const names = getAllEntryNames().filter(n => n.toLowerCase().includes(val.toLowerCase()) && n !== val);
    if (!names.length || !val) { suggDiv.style.display = "none"; return; }
    suggDiv.innerHTML = names.map(n => `<div class="suggestion-item" onclick="selectSugg('${input.id}','${n.replace(/'/g, "\\'")}')">${escapeHtml(n)}</div>`).join("");
    suggDiv.style.display = "block";
  }
  leftInput?.addEventListener("input", () => show(leftInput, leftSugg, leftInput.value));
  rightInput?.addEventListener("input", () => show(rightInput, rightSugg, rightInput.value));
  document.addEventListener("click", (e) => { if (!leftInput?.contains(e.target)) leftSugg && (leftSugg.style.display = "none"); if (!rightInput?.contains(e.target)) rightSugg && (rightSugg.style.display = "none"); });
}
window.selectSugg = function(id, val) { document.getElementById(id).value = val; document.getElementById(id === "entryNameLeft" ? "leftSuggestions" : "rightSuggestions").style.display = "none"; };

function submitFight() {
  const leftName = document.getElementById("entryNameLeft")?.value.trim();
  const leftBand = document.getElementById("bandLeft")?.value.trim();
  let leftPar = parseFloat(document.getElementById("paradaLeft")?.value);
  const rightName = document.getElementById("entryNameRight")?.value.trim();
  const rightBand = document.getElementById("bandRight")?.value.trim();
  let rightPar = parseFloat(document.getElementById("paradaRight")?.value);
  if (!leftName || !rightName) return alert("Both entry names required!");
  if (leftName === rightName) return alert("Cannot register same entry!");
  if (isNaN(leftPar)) leftPar = 0;
  if (isNaN(rightPar)) rightPar = 0;
  const rec = { id: Date.now(), submittedAt: new Date().toLocaleString(), left: { entryName: leftName, bandNumber: leftBand || "—", parada: leftPar }, right: { entryName: rightName, bandNumber: rightBand || "—", parada: rightPar } };
  const records = loadRecords(); records.push(rec); saveRecords(records);
  ["entryNameLeft","bandLeft","paradaLeft","entryNameRight","bandRight","paradaRight"].forEach(id => { const el = document.getElementById(id); if (el) el.value = id.includes("parada") ? "0" : ""; });
  alert("Fight registered!");
}

function renderRegisteredEntries() {
  const records = loadRecords();
  const container = document.getElementById("registeredEntriesList");
  if (!container) return;
  if (!records.length) { container.innerHTML = "<div>No entries</div>"; return; }
  let html = "";
  records.slice(0, 20).forEach(rec => { html += `<div class="entry-tag">🐓 ${escapeHtml(rec.left.entryName)} | ${rec.left.bandNumber} | ${formatParada(rec.left.parada)}</div><div class="entry-tag">🐓 ${escapeHtml(rec.right.entryName)} | ${rec.right.bandNumber} | ${formatParada(rec.right.parada)}</div>`; });
  container.innerHTML = html;
}

// PARADA TAB
function renderParadaTab() {
  const records = loadRecords();
  const results = loadScoringResults();
  const container = document.getElementById("parada-tab");
  container.innerHTML = `<div class="arena-container"><div class="section-title">💰 PARADA MANAGEMENT</div><div class="search-bar" style="position:relative;"><input type="text" id="paradaSearchInput" class="search-input" placeholder="Search entry..." autocomplete="off"><div id="paradaSuggestions" class="suggestions-list" style="display:none;"></div><button id="paradaSearchBtn" class="btn">Search</button><button id="paradaClearBtn" class="btn">Clear</button></div><div class="table-wrapper"><table class="data-table"><thead><tr><th>ID</th><th>Entry</th><th>Band</th><th>Parada Amount</th><th>Parada Status</th><th>Fight Result</th><th>Print</th><th>Action</th><tr></thead><tbody id="paradaTableBody"></tbody>}</div></div></div>`;
  
  let filtered = records.filter(r => paradaSearchTerm === "" || r.left.entryName.toLowerCase().includes(paradaSearchTerm) || r.right.entryName.toLowerCase().includes(paradaSearchTerm));
  const tbody = document.getElementById("paradaTableBody");
  if (!filtered.length) { tbody.innerHTML = "<tr><td colspan='8'>No matches found</td></tr>"; } else {
    let rows = "";
    filtered.forEach((rec, idx) => {
      const savedResult = results[rec.id];
      const isCanceled = savedResult?.result === "CANCELED";
      const isNoFight = savedResult?.result === "NO_FIGHT";
      const isLocked = savedResult?.locked === true;
      const cancelClass = isCanceled ? "cancel-row" : (isNoFight ? "no-fight-row" : "");
      let fightResultDisplay = '<span class="status-undecided">⏳ PENDING</span>';
      if (savedResult) {
        if (savedResult.result === "CANCELED") fightResultDisplay = '<span class="cancel-badge">❌ CANCELED</span>';
        else if (savedResult.result === "NO_FIGHT") fightResultDisplay = '<span class="no-fight-badge">🚫 NO FIGHT</span>';
        else if (savedResult.result === "DRAW") fightResultDisplay = '<span class="result-draw">🤝 DRAW</span>';
        else if (savedResult.result === "HIGHER_WIN") fightResultDisplay = '<span class="result-meron">🏆 MERON WINS</span>';
        else if (savedResult.result === "LOWER_WIN") fightResultDisplay = '<span class="result-wala">🏆 WALA WINS</span>';
        if (isLocked) fightResultDisplay += '<span class="locked-icon"> 🔒</span>';
      }
      const leftParadaStatus = rec.left.parada > rec.right.parada ? 'MERON' : (rec.left.parada < rec.right.parada ? 'WALA' : 'DRAW');
      const rightParadaStatus = rec.right.parada > rec.left.parada ? 'MERON' : (rec.right.parada < rec.left.parada ? 'WALA' : 'DRAW');
      const isDisabled = isCanceled || isNoFight;
      rows += `<tr class="${cancelClass}"><td rowspan="2"><span class="fight-id-badge">#${idx+1}</span></td>
        <td>🐓 ${escapeHtml(rec.left.entryName)}${isDisabled ? ' <span class="cancel-text">(INACTIVE)</span>' : ''}</td>
        <td>${escapeHtml(rec.left.bandNumber)}</td>
        <td><input type="number" id="parada_left_${rec.id}" class="parada-edit-input" value="${rec.left.parada}" min="0" step="100" ${isDisabled ? 'disabled' : ''}></td>
        <td><span class="na-badge">${leftParadaStatus}</span></td>
        <td rowspan="2">${fightResultDisplay}</td>
        <td><button class="small-btn" onclick="printSingle('${rec.id}','left')" ${isDisabled ? 'disabled' : ''}>Print</button></td>
        <td><button class="small-btn btn-success" onclick="updateParadaAmount('${rec.id}','left')" ${isDisabled ? 'disabled' : ''}>💾 Save</button></td>
       </tr>
      <tr class="${cancelClass}">
        <td>🐓 ${escapeHtml(rec.right.entryName)}${isDisabled ? ' <span class="cancel-text">(INACTIVE)</span>' : ''}</td>
        <td>${escapeHtml(rec.right.bandNumber)}</td>
        <td><input type="number" id="parada_right_${rec.id}" class="parada-edit-input" value="${rec.right.parada}" min="0" step="100" ${isDisabled ? 'disabled' : ''}></td>
        <td><span class="na-badge">${rightParadaStatus}</span></td>
        <td><button class="small-btn" onclick="printSingle('${rec.id}','right')" ${isDisabled ? 'disabled' : ''}>Print</button></td>
        <td><button class="small-btn btn-success" onclick="updateParadaAmount('${rec.id}','right')" ${isDisabled ? 'disabled' : ''}>💾 Save</button></td>
       </tr>`;
    });
    tbody.innerHTML = rows;
  }
  
  document.getElementById("paradaSearchBtn")?.addEventListener("click", () => { paradaSearchTerm = document.getElementById("paradaSearchInput").value.toLowerCase().trim(); renderParadaTab(); });
  document.getElementById("paradaClearBtn")?.addEventListener("click", () => { paradaSearchTerm = ""; document.getElementById("paradaSearchInput").value = ""; renderParadaTab(); });
  setupSearchSuggestions("paradaSearchInput", "paradaSuggestions", true);
}

window.updateParadaAmount = function(id, side) {
  const records = loadRecords();
  const idx = records.findIndex(r => r.id == id);
  if (idx === -1) return;
  let val = parseFloat(document.getElementById(`parada_${side}_${id}`).value);
  if (isNaN(val)) val = 0;
  if (val < 0) val = 0;
  if (side === "left") records[idx].left.parada = val;
  else records[idx].right.parada = val;
  saveRecords(records);
  alert(`${side.toUpperCase()} parada updated to ${formatParada(val)}`);
};

window.printSingle = function(id, side) {
  const rec = loadRecords().find(r => r.id == id); if (!rec) return;
  const e = side === "left" ? rec.left : rec.right;
  const w = window.open("", "_blank", "width=300,height=400");
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Print Parada</title><style>body{font-family:'Courier New',monospace;width:58mm;margin:0 auto;padding:2mm;font-size:10px}.receipt{text-align:center}.header{border-bottom:1px dashed #000;margin-bottom:5px}.header h2{font-size:14px}.content{margin:5px 0;text-align:left}.entry{margin:3px 0}.label{font-weight:bold}.footer{border-top:1px dashed #000;margin-top:5px;padding-top:5px;font-size:8px}</style></head><body><div class="receipt"><div class="header"><h2>BOLJOON COCKPIT</h2><p>Parada Slip</p></div><div class="content"><div class="entry"><span class="label">Entry:</span> ${escapeHtml(e.entryName)}</div><div class="entry"><span class="label">Band:</span> ${e.bandNumber}</div><div class="entry"><span class="label">Parada:</span> ${formatParada(e.parada)}</div><div class="entry"><span class="label">Status:</span> PENDING</div></div><div class="footer"><hr><p>Printed: ${new Date().toLocaleString()}</p></div></div></body></html>`);
  w.document.close(); w.print(); addPrintRecord(`PARADA: ${e.entryName}`, `Parada ${formatParada(e.parada)}`);
};

// SCHEDULE TAB
function renderScheduleTab() {
  const records = loadRecords();
  const results = loadScoringResults();
  const container = document.getElementById("schedule-tab");
  container.innerHTML = `<div class="arena-container"><div class="section-title">📅 FIGHTING SCHEDULE (Ranked by Parada)</div><div class="search-bar" style="position:relative;"><input type="text" id="scheduleSearchInput" class="search-input" placeholder="Search entry..." autocomplete="off"><div id="scheduleSuggestions" class="suggestions-list" style="display:none;"></div><button id="scheduleSearchBtn" class="btn">Search</button><button id="scheduleClearBtn" class="btn">Clear</button></div><div class="table-wrapper"><table class="data-table"><thead><tr><th>ID</th><th>Date</th><th>Rank</th><th>Entry</th><th>Parada</th><th>Difference</th><th>Status</th><th>Print</th></tr></thead><tbody id="scheduleBody"></tbody>}</div></div></div>`;
  
  let filtered = records.filter(r => scheduleSearchTerm === "" || r.left.entryName.toLowerCase().includes(scheduleSearchTerm) || r.right.entryName.toLowerCase().includes(scheduleSearchTerm));
  const tbody = document.getElementById("scheduleBody");
  if (!filtered.length) { tbody.innerHTML = "<tr><td colspan='8'>No matches found</td></tr>"; } else {
    let html = "";
    filtered.forEach((rec, idx) => {
      const savedResult = results[rec.id];
      const isCanceled = savedResult?.result === "CANCELED";
      const isNoFight = savedResult?.result === "NO_FIGHT";
      const ranked = getRankedEntries(rec);
      let statusDisplay = '<span class="status-undecided">PENDING</span>';
      if (savedResult) {
        if (savedResult.result === "CANCELED") statusDisplay = '<span class="cancel-badge">CANCELED</span>';
        else if (savedResult.result === "NO_FIGHT") statusDisplay = '<span class="no-fight-badge">NO FIGHT</span>';
        else if (savedResult.result === "DRAW") statusDisplay = '<span class="draw-badge">DRAW</span>';
        else if (savedResult.result === "HIGHER_WIN") statusDisplay = '<span class="result-meron">MERON WINS</span>';
        else if (savedResult.result === "LOWER_WIN") statusDisplay = '<span class="result-wala">WALA WINS</span>';
        if (savedResult.locked) statusDisplay += ' 🔒';
      }
      const rowClass = isCanceled ? "cancel-row" : (isNoFight ? "no-fight-row" : "");
      html += `<tr class="${rowClass}"><td rowspan="2"><span class="fight-id-badge">#${idx+1}</span></td><td rowspan="2">${rec.submittedAt}</td>
        <td style="color:#dc3545; font-weight:bold;">🥇 HIGHER (MERON)</td>
        <td>🐓 ${escapeHtml(ranked.higher.entryName)}${isCanceled || isNoFight ? ' <span class="cancel-text">(INACTIVE)</span>' : ''}</td>
        <td>${formatParada(ranked.higherParada)}</td>
        <td rowspan="2">${formatParada(ranked.difference)}</td>
        <td rowspan="2">${statusDisplay}</td>
        <td rowspan="2"><button class="small-btn" onclick="printSchedule('${rec.id}')" ${isCanceled || isNoFight ? 'disabled' : ''}>Print</button></td>
       </tr>
      <tr class="${rowClass}">
        <td style="color:#0d6efd; font-weight:bold;">🥈 LOWER (WALA)</td>
        <td>🐓 ${escapeHtml(ranked.lower.entryName)}${isCanceled || isNoFight ? ' <span class="cancel-text">(INACTIVE)</span>' : ''}</td>
        <td>${formatParada(ranked.lowerParada)}</td>
       </tr>`;
    });
    tbody.innerHTML = html;
  }
  
  document.getElementById("scheduleSearchBtn")?.addEventListener("click", () => { scheduleSearchTerm = document.getElementById("scheduleSearchInput").value.toLowerCase().trim(); renderScheduleTab(); });
  document.getElementById("scheduleClearBtn")?.addEventListener("click", () => { scheduleSearchTerm = ""; document.getElementById("scheduleSearchInput").value = ""; renderScheduleTab(); });
  setupSearchSuggestions("scheduleSearchInput", "scheduleSuggestions", true);
}

window.printSchedule = function(id) {
  const rec = loadRecords().find(r => r.id == id); if (!rec) return;
  const ranked = getRankedEntries(rec);
  const savedResult = loadScoringResults()[id];
  let resultText = "PENDING";
  if (savedResult) {
    if (savedResult.result === "CANCELED") resultText = "CANCELED";
    else if (savedResult.result === "NO_FIGHT") resultText = "NO FIGHT";
    else if (savedResult.result === "DRAW") resultText = "DRAW";
    else if (savedResult.result === "HIGHER_WIN") resultText = "MERON WINS";
    else if (savedResult.result === "LOWER_WIN") resultText = "WALA WINS";
  }
  const w = window.open("", "_blank", "width=300,height=550");
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Schedule Print</title><style>body{font-family:'Courier New',monospace;width:58mm;margin:0 auto;padding:3mm 2mm;font-size:10px}.receipt{text-align:center}.header{border-bottom:1px dashed #000;margin-bottom:8px}.header h2{font-size:14px}.datetime{font-size:8px;margin:5px 0;border-bottom:1px dotted #000}.fight-number{font-size:13px;font-weight:bold;background:#eee;padding:3px;margin:5px 0}.difference{text-align:center;font-size:11px;font-weight:bold;background:#f0f0f0;padding:4px;margin:8px 0}.meron-section{margin:10px 0 15px 0;padding:5px;border-left:3px solid #dc3545;background:#fff5f5}.wala-section{margin:15px 0 10px 0;padding:5px;border-left:3px solid #0d6efd;background:#f0f8ff}.entry-name{font-size:12px;font-weight:bold;margin-bottom:5px}.parada-amount{font-size:11px;margin-top:3px}.vs-spacer{text-align:center;font-size:9px;margin:5px 0}.result{text-align:center;margin:12px 0;padding:5px;background:#e9ecef;font-weight:bold}.footer{border-top:1px dashed #000;margin-top:10px;padding-top:5px;font-size:7px}</style></head><body><div class="receipt"><div class="header"><h2>BOLJOON COCKPIT</h2><p>Fight Schedule Slip</p></div><div class="datetime">📅 ${new Date().toLocaleString()}</div><div class="fight-number">FIGHT #${loadRecords().findIndex(r=>r.id==id)+1}</div><div class="difference">💰 DIFFERENCE: ${formatParada(ranked.difference)}</div><div class="meron-section"><div class="entry-name">🥇 MERON (HIGHER)</div><div class="entry-name">🐓 ${escapeHtml(ranked.higher.entryName)}</div><div class="parada-amount">💰 ${formatParada(ranked.higherParada)}</div></div><div class="vs-spacer">⬇️ VS ⬇️</div><div class="wala-section"><div class="entry-name">🥈 WALA (LOWER)</div><div class="entry-name">🐓 ${escapeHtml(ranked.lower.entryName)}</div><div class="parada-amount">💰 ${formatParada(ranked.lowerParada)}</div></div><div class="result">📋 RESULT: ${resultText}</div><div class="footer"><hr><p>Printed: ${new Date().toLocaleString()}</p></div></div></body></html>`);
  w.document.close(); w.print(); addPrintRecord(`SCHEDULE: Fight #${loadRecords().findIndex(r=>r.id==id)+1}`, `Diff ${formatParada(ranked.difference)}`);
};

// SCORING TAB
function renderScoringTab() {
  const records = loadRecords(), results = loadScoringResults();
  let filtered = scoringSearchTerm ? records.filter(r => r.left.entryName.toLowerCase().includes(scoringSearchTerm) || r.right.entryName.toLowerCase().includes(scoringSearchTerm)) : records;
  const container = document.getElementById("scoring-tab");
  container.innerHTML = `<div class="arena-container"><div class="section-title">🏆 SCORING OFFICIAL</div>
    <div class="search-bar" style="position:relative;"><input type="text" id="scoringSearchInput" class="search-input" placeholder="Search entry..." autocomplete="off"><div id="scoringSuggestions" class="suggestions-list" style="display:none;"></div><button id="scoringSearchBtn" class="btn">Search</button><button id="scoringClearBtn" class="btn">Clear</button></div>
    <div class="info-note">📌 <strong>Scoring Rules:</strong> <span style="color:#dc3545; font-weight:bold;">MERON WINS</span> = The HIGHER parada entry wins. <span style="color:#0d6efd; font-weight:bold;">WALA WINS</span> = The LOWER parada entry wins. Once scored, results are <strong>LOCKED</strong>.</div>
    <div class="table-wrapper"><table class="data-table"><thead><tr><th>Fight</th><th>Date</th><th>Matchup (Ranked)</th><th>Result</th><th>Action</th></tr></thead><tbody id="scoringTableBody"></tbody>}</div></div>`;
  const tbody = document.getElementById("scoringTableBody");
  if (!filtered.length) { tbody.innerHTML = "<tr><td colspan='5'>No fights registered</td></tr>"; } else {
    let html = "";
    filtered.forEach((rec, idx) => {
      const ranked = getRankedEntries(rec);
      const saved = results[rec.id];
      const isLocked = saved && saved.locked === true;
      let display = '<span class="status-undecided">⏳ PENDING</span>';
      let rowClass = "";
      if (saved) {
        if (saved.result === "CANCELED") { display = '<span class="cancel-badge">❌ CANCELED</span>'; rowClass = "cancel-row"; }
        else if (saved.result === "NO_FIGHT") { display = '<span class="no-fight-badge">🚫 NO FIGHT</span>'; rowClass = "no-fight-row"; }
        else if (saved.result === "DRAW") { display = '<span class="draw-badge">🤝 DRAW</span>'; rowClass = "draw-highlight"; }
        else if (saved.result === "HIGHER_WIN") { display = '<span class="win-badge-meron">🏆 MERON WINS</span>'; rowClass = "higher-win-highlight"; }
        else if (saved.result === "LOWER_WIN") { display = '<span class="win-badge-wala">🏆 WALA WINS</span>'; rowClass = "lower-win-highlight"; }
      }
      const higherHighlight = saved?.result === "HIGHER_WIN" ? 'class="winner-name"' : '';
      const lowerHighlight = saved?.result === "LOWER_WIN" ? 'class="winner-name"' : '';
      const dropdownDisabled = isLocked ? 'disabled' : '';
      const selectedHigher = saved?.result === "HIGHER_WIN" ? 'selected' : '';
      const selectedLower = saved?.result === "LOWER_WIN" ? 'selected' : '';
      const selectedDraw = saved?.result === "DRAW" ? 'selected' : '';
      const selectedCancel = saved?.result === "CANCELED" ? 'selected' : '';
      const selectedNoFight = saved?.result === "NO_FIGHT" ? 'selected' : '';
      html += `<tr class="${rowClass}">
        <td><span class="fight-id-badge">#${idx+1}</span>${isLocked ? '<span class="locked-icon"> 🔒</span>' : ''}</td>
        <td>${rec.submittedAt}${isLocked ? '<br><small>🔒 LOCKED</small>' : ''}</td>
        <td><div><span class="rank-badge-higher">HIGHER</span> <span ${higherHighlight}>🐓 ${escapeHtml(ranked.higher.entryName)}</span> (${formatParada(ranked.higherParada)})</div>
        <div style="margin: 5px 0;">⬇️ VS (Diff: ${formatParada(ranked.difference)}) ⬇️</div>
        <div><span class="rank-badge-lower">LOWER</span> <span ${lowerHighlight}>🐓 ${escapeHtml(ranked.lower.entryName)}</span> (${formatParada(ranked.lowerParada)})</div></td>
        <td>${display}</td>
        <td><select class="win-loss-select" id="score_select_${rec.id}" onchange="updateScoringFromTab('${rec.id}', this.value)" ${dropdownDisabled}>
          <option value="">-- Select Result --</option>
          <option value="HIGHER_WIN" ${selectedHigher}>🏆 MERON WINS (Higher)</option>
          <option value="LOWER_WIN" ${selectedLower}>🏆 WALA WINS (Lower)</option>
          <option value="DRAW" ${selectedDraw}>🤝 DRAW</option>
          <option value="NO_FIGHT" ${selectedNoFight}>🚫 NO FIGHT</option>
          <option value="CANCEL" ${selectedCancel}>❌ CANCEL FIGHT</option>
        </select>
        ${isLocked ? '<div style="font-size:0.7rem;">🔒 Locked. Use Settings to edit.</div>' : '<div style="font-size:0.7rem;">✅ Pending</div>'}</td>
       </tr>`;
    });
    tbody.innerHTML = html;
  }
  
  document.getElementById("scoringSearchBtn")?.addEventListener("click", () => { scoringSearchTerm = document.getElementById("scoringSearchInput").value.toLowerCase().trim(); renderScoringTab(); });
  document.getElementById("scoringClearBtn")?.addEventListener("click", () => { scoringSearchTerm = ""; document.getElementById("scoringSearchInput").value = ""; renderScoringTab(); });
  setupSearchSuggestions("scoringSearchInput", "scoringSuggestions", true);
}

window.updateScoringFromTab = function(id, value) {
  const results = loadScoringResults();
  const existing = results[id];
  if (existing && existing.locked === true) {
    alert("❌ This result is LOCKED. Use Settings → Edit Scoring to modify.");
    renderScoringTab(); return;
  }
  if (value === "CANCEL") { if (confirm("Cancel this fight?")) saveScoringResult(id, "CANCEL"); }
  else if (value === "NO_FIGHT") { if (confirm("Mark as NO FIGHT?")) saveScoringResult(id, "NO_FIGHT"); }
  else if (value === "HIGHER_WIN") saveScoringResult(id, "HIGHER_WIN");
  else if (value === "LOWER_WIN") saveScoringResult(id, "LOWER_WIN");
  else if (value === "DRAW") saveScoringResult(id, "DRAW");
};

// OVERALL RESULTS
function renderOverallResults() {
  const records = loadRecords(), results = loadScoringResults();
  const stats = new Map();
  records.forEach(rec => {
    const ranked = getRankedEntries(rec);
    const saved = results[rec.id];
    [ranked.higher.entryName, ranked.lower.entryName].forEach(name => {
      if (!stats.has(name)) stats.set(name, { wins: 0, losses: 0, draws: 0, cancels: 0, noFights: 0 });
    });
    if (saved && saved.result === "CANCELED") {
      stats.get(ranked.higher.entryName).cancels++; stats.get(ranked.lower.entryName).cancels++;
    } else if (saved && saved.result === "NO_FIGHT") {
      stats.get(ranked.higher.entryName).noFights++; stats.get(ranked.lower.entryName).noFights++;
    } else if (saved && saved.result === "DRAW") {
      stats.get(ranked.higher.entryName).draws++; stats.get(ranked.lower.entryName).draws++;
    } else if (saved && saved.result === "HIGHER_WIN") {
      stats.get(ranked.higher.entryName).wins++; stats.get(ranked.lower.entryName).losses++;
    } else if (saved && saved.result === "LOWER_WIN") {
      stats.get(ranked.lower.entryName).wins++; stats.get(ranked.higher.entryName).losses++;
    }
  });
  let sorted = Array.from(stats.entries()).map(([name, data]) => ({ name, wins: data.wins, losses: data.losses, draws: data.draws, cancels: data.cancels, noFights: data.noFights, totalFights: data.wins + data.losses + data.draws + data.cancels + data.noFights })).sort((a,b) => b.wins - a.wins);
  if (overallSearchTerm) sorted = sorted.filter(entry => entry.name.toLowerCase().includes(overallSearchTerm));
  
  const container = document.getElementById("overall-tab");
  container.innerHTML = `<div class="arena-container"><div class="section-title">📊 OVERALL RESULTS</div><div class="search-bar" style="position:relative;"><input type="text" id="overallSearchInput" class="search-input" placeholder="Search entry name..." autocomplete="off"><div id="overallSuggestions" class="suggestions-list" style="display:none;"></div><button id="overallSearchBtn" class="btn">🔍 Search</button><button id="overallClearBtn" class="btn">🗑️ Clear</button></div><div class="info-note">🏆 MERON = Higher wins | 🏆 WALA = Lower wins | 🚫 NO FIGHT = Did not take place</div><div class="table-wrapper"><table class="data-table"><thead><tr><th>Rank</th><th>Entry Name</th><th>WINS</th><th>LOSSES</th><th>DRAWS</th><th>CANCELS</th><th>NO FIGHT</th><th>Total</th></tr></thead><tbody id="overallBody"></tbody>}</div></div></div>`;
  const tbody = document.getElementById("overallBody");
  if (!sorted.length) { tbody.innerHTML = "<tr><td colspan='8'>No entries found matching your search.</td></tr>"; } else {
    let html = "";
    sorted.forEach((e, i) => { html += `<tr><td><strong>${i+1}</strong></td><td>🐓 ${escapeHtml(e.name)}</td><td><span class="win-badge-meron">${e.wins}</span></td><td><span class="win-badge-wala">${e.losses}</span></td><td><span class="draw-badge">${e.draws}</span></td><td><span class="cancel-badge">${e.cancels}</span></td><td><span class="no-fight-badge">${e.noFights}</span></td><td>${e.totalFights}</td></tr>`; });
    tbody.innerHTML = html;
  }
  document.getElementById("overallSearchBtn")?.addEventListener("click", () => { overallSearchTerm = document.getElementById("overallSearchInput").value.toLowerCase().trim(); renderOverallResults(); });
  document.getElementById("overallClearBtn")?.addEventListener("click", () => { overallSearchTerm = ""; document.getElementById("overallSearchInput").value = ""; renderOverallResults(); });
  setupSearchSuggestions("overallSearchInput", "overallSuggestions", true);
}

// SETTINGS
function renderSettingsTab() {
  if (currentUser?.role !== "admin") return;
  
  const container = document.getElementById("settings-tab");
  container.innerHTML = `<div class="arena-container"><div class="section-title">⚙️ SYSTEM SETTINGS</div><div style="display:flex;flex-direction:column;gap:1rem;"><button id="deleteAllBtn" class="btn btn-danger">🗑️ DELETE ALL FIGHTS</button><button id="editScoringBtn" class="btn btn-primary">✏️ EDIT SCORING RESULTS (Admin)</button><button id="editEntryNamesBtn" class="btn btn-primary">📝 EDIT ENTRY NAMES (Password: amenic)</button><button id="toggleThemeBtn" class="btn">🌓 LIGHT/DARK MODE</button><div id="editArea" style="display:none; margin-top:1rem;"></div></div></div>`;
  document.getElementById("deleteAllBtn")?.addEventListener("click", () => { if (confirm("DELETE ALL FIGHTS?")) { localStorage.setItem(STORAGE_KEY, "[]"); localStorage.removeItem(SCORING_KEY); renderAllTabs(); renderLiveSchedule(); } });
  document.getElementById("editScoringBtn")?.addEventListener("click", () => { showPasswordPrompt(() => renderEditScoringModal(), ADMIN_PASSWORD); });
  document.getElementById("editEntryNamesBtn")?.addEventListener("click", () => { showPasswordPrompt(() => { renderEditNamesList(); document.getElementById("editArea").style.display = "block"; }, EDIT_NAMES_PASSWORD); });
  document.getElementById("toggleThemeBtn")?.addEventListener("click", () => { document.body.classList.toggle("light-theme"); localStorage.setItem(THEME_KEY, document.body.classList.contains("light-theme") ? "light" : "dark"); });
}

function renderEditScoringModal() {
  const records = loadRecords(), results = loadScoringResults();
  let html = `<div style="max-height:500px; overflow-y:auto;"><h3>✏️ Edit Fight Results</h3>`;
  records.forEach((rec, idx) => {
    const saved = results[rec.id];
    const currentResult = saved?.result || "";
    const ranked = getRankedEntries(rec);
    html += `<div class="edit-card"><strong>Fight #${idx+1}</strong><br><span class="rank-badge-higher">HIGHER</span> 🐓 ${escapeHtml(ranked.higher.entryName)} (${formatParada(ranked.higherParada)})<br><span class="rank-badge-lower">LOWER</span> 🐓 ${escapeHtml(ranked.lower.entryName)} (${formatParada(ranked.lowerParada)})<br><select class="edit-scoring-select" id="admin_edit_${rec.id}"><option value="">-- Pending --</option><option value="HIGHER_WIN" ${currentResult === "HIGHER_WIN" ? "selected" : ""}>🏆 MERON WINS</option><option value="LOWER_WIN" ${currentResult === "LOWER_WIN" ? "selected" : ""}>🏆 WALA WINS</option><option value="DRAW" ${currentResult === "DRAW" ? "selected" : ""}>🤝 DRAW</option><option value="NO_FIGHT" ${currentResult === "NO_FIGHT" ? "selected" : ""}>🚫 NO FIGHT</option><option value="CANCEL" ${currentResult === "CANCELED" ? "selected" : ""}>❌ CANCEL</option><option value="REMOVE" ${!currentResult ? "selected" : ""}>🗑️ Clear</option></select><button class="small-btn" onclick="applyAdminEdit('${rec.id}')">Apply</button>${saved?.locked ? '<span> 🔒 Locked</span>' : '<span> 📝 Pending</span>'}</div>`;
  });
  html += `<button class="btn" onclick="document.getElementById('editArea').style.display='none'">Close</button>`;
  document.getElementById("editArea").innerHTML = html;
  document.getElementById("editArea").style.display = "block";
}
window.applyAdminEdit = function(id) {
  const select = document.getElementById(`admin_edit_${id}`);
  const value = select.value;
  if (value === "HIGHER_WIN") adminEditResult(id, "HIGHER_WIN");
  else if (value === "LOWER_WIN") adminEditResult(id, "LOWER_WIN");
  else if (value === "DRAW") adminEditResult(id, "DRAW");
  else if (value === "NO_FIGHT") adminEditResult(id, "NO_FIGHT");
  else if (value === "CANCEL") adminEditResult(id, "CANCEL");
  else if (value === "REMOVE") adminEditResult(id, "REMOVE");
  renderEditScoringModal();
};

function renderEditNamesList() {
  const records = loadRecords();
  let list = "";
  records.forEach((rec, idx) => { list += `<div class="edit-card"><strong>Fight #${idx+1}</strong><br>Left: <input id="edit_name_left_${rec.id}" value="${escapeHtml(rec.left.entryName)}" class="edit-input"><br>Right: <input id="edit_name_right_${rec.id}" value="${escapeHtml(rec.right.entryName)}" class="edit-input"></div>`; });
  if (!document.getElementById("editListContainer")) {
    const area = document.getElementById("editArea");
    area.innerHTML = `<div id="editListContainer"></div><button class="btn btn-primary" onclick="saveNameEdits()">Save Names</button><button class="btn" onclick="document.getElementById('editArea').style.display='none'">Close</button>`;
  }
  document.getElementById("editListContainer").innerHTML = list || "<div>No fights</div>";
}
window.saveNameEdits = function() {
  const records = loadRecords();
  records.forEach(rec => { const ln = document.getElementById(`edit_name_left_${rec.id}`)?.value; const rn = document.getElementById(`edit_name_right_${rec.id}`)?.value; if (ln) rec.left.entryName = ln; if (rn) rec.right.entryName = rn; });
  saveRecords(records); document.getElementById("editArea").style.display = "none"; alert("Names updated!");
};

function showPasswordPrompt(cb, requiredPassword) {
  const ov = document.createElement("div"); ov.className = "modal-overlay";
  ov.innerHTML = `<div class="password-modal"><h3>🔒 Admin Access</h3><input type="password" id="adminPassInput" placeholder="Password" style="width:100%;padding:10px;margin:10px 0;"><div><button id="passConfirmBtn" class="btn btn-primary">Confirm</button><button id="passCancelBtn" class="btn">Cancel</button></div></div>`;
  document.body.appendChild(ov);
  document.getElementById("passConfirmBtn")?.addEventListener("click", () => { if (document.getElementById("adminPassInput").value === requiredPassword) { ov.remove(); cb(); } else { alert("Wrong password!"); ov.remove(); } });
  document.getElementById("passCancelBtn")?.addEventListener("click", () => ov.remove());
}

// PRINT HISTORY
function renderPrintHistory() {
  let history = loadPrintHistory();
  if (historySearchTerm) history = history.filter(h => h.title.toLowerCase().includes(historySearchTerm) || h.preview.toLowerCase().includes(historySearchTerm));
  const container = document.getElementById("history-tab");
  let historyHtml = history.length === 0 ? '<div class="print-item-empty">📭 No print history yet. Print a schedule or parada slip to see it here.</div>' : history.map(h => `<div class="print-item"><div class="print-title"><span class="print-title-icon">🖨️</span><span>${escapeHtml(h.title)}</span></div><div class="print-timestamp"><span>⏰</span><span>${escapeHtml(h.timestamp)}</span></div><div class="print-preview">${escapeHtml(h.preview)}...</div></div>`).join('');
  container.innerHTML = `<div class="arena-container"><div class="section-title">🖨️ PRINT HISTORY</div><div class="search-bar"><input type="text" id="historySearchInput" class="search-input" placeholder="Search print history..."><button id="historySearchBtn" class="btn">🔍 Search</button><button id="historyClearBtn" class="btn">🗑️ Clear Search</button></div><div id="printHistoryList" class="print-history-list">${historyHtml}</div></div>`;
  document.getElementById("historySearchBtn")?.addEventListener("click", () => { historySearchTerm = document.getElementById("historySearchInput").value.toLowerCase(); renderPrintHistory(); });
  document.getElementById("historyClearBtn")?.addEventListener("click", () => { historySearchTerm = ""; document.getElementById("historySearchInput").value = ""; renderPrintHistory(); });
}

function initializeApp() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme === "light") document.body.classList.add("light-theme");
  const tabs = document.querySelectorAll(".nav-tab");
  const contents = document.querySelectorAll(".tab-content");
  tabs.forEach(t => t.addEventListener("click", () => {
    const target = t.getAttribute("data-tab");
    if (currentUser && !currentUser.allowedTabs.includes(target)) {
      alert("You don't have permission to access this section.");
      return;
    }
    tabs.forEach(tab => tab.classList.remove("active"));
    t.classList.add("active");
    contents.forEach(c => c.classList.remove("active-tab"));
    document.getElementById(target).classList.add("active-tab");
    if (target === "fight-tab") renderFightTab();
    if (target === "parada-tab") renderParadaTab();
    if (target === "schedule-tab") renderScheduleTab();
    if (target === "scoring-tab") renderScoringTab();
    if (target === "overall-tab") renderOverallResults();
    if (target === "settings-tab") renderSettingsTab();
    if (target === "history-tab") renderPrintHistory();
  }));
  renderAllTabs();
}

renderLiveSchedule();
document.getElementById("mainContent").style.display = "none";
