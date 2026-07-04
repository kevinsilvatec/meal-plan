// ===== DATA =====
const PROTEIN_LABELS = {
  frango_grelhar: "Peito de frango (grelhar)",
  frango_desfiar: "Peito de frango (cozinhar e desfiar)",
  peixe: "Filé de tilápia (grelhar)",
  patinho_tiras: "Patinho em tiras (grelhar ou refogar)",
};
const CARB_LABELS = {
  batata_doce: "Batata doce",
  mandioca: "Mandioca",
  mandioquinha: "Mandioquinha",
  inhame: "Inhame",
  arroz: "Arroz branco cozido",
};

const ALMOCO_OPTIONS = [
  { id: 1, name: "Frango Grelhado + Batata-Doce + Legumes",
    protein: { type: "frango_grelhar", qty: 200 },
    carb: { type: "batata_doce", qty: 300, arrozQty: 250 },
    veggies: [{ name: "Brócolis e couve-flor", qty: 200 }, { name: "Cenoura", qty: 100 }] },
  { id: 2, name: "Tilápia Grelhada + Couve + Batata-Doce",
    protein: { type: "peixe", qty: 180 },
    carb: { type: "batata_doce", qty: 250, arrozQty: 250 },
    veggies: [{ name: "Couve refogada", qty: 150 }] },
  { id: 3, name: "Patinho em Tiras + Abóbora",
    protein: { type: "patinho_tiras", qty: 180 },
    carb: { type: "mandioca", qty: 250, arrozQty: 250 },
    veggies: [{ name: "Abóbora cabotiá", qty: 300 }, { name: "Agrião", qty: 50 }, { name: "Rabanete", qty: 50 }] },
  { id: 4, name: "Frango + Mandioca + Legumes",
    protein: { type: "frango_grelhar", qty: 190 },
    carb: { type: "mandioca", qty: 200, arrozQty: 250 },
    veggies: [{ name: "Brócolis", qty: 150 }, { name: "Cenoura", qty: 100 }] },
  { id: 5, name: "Tilápia Grelhada + Couve + Mandioquinha",
    protein: { type: "peixe", qty: 180 },
    carb: { type: "mandioquinha", qty: 250, arrozQty: 250 },
    veggies: [{ name: "Couve refogada", qty: 150 }] },
  { id: 6, name: "Frango c/ Cúrcuma + Inhame",
    protein: { type: "frango_grelhar", qty: 180 },
    carb: { type: "inhame", qty: 250, arrozQty: 250 },
    veggies: [{ name: "Couve refogada", qty: 150 }, { name: "Cenoura", qty: 100 }] },
];

const JANTAR_OPTIONS = [
  { id: 1, name: "Crepioca com Frango e Espinafre",
    chefProtein: { type: "frango_desfiar", qty: 150 },
    chefExtra: [{ name: "Espinafre refogado", qty: 60 }, { name: "Alho", qty: 3 }],
    emCasa: "Bater ovos + massa de tapioca e montar a crepioca com o recheio pronto" },
  { id: 2, name: "Wrap Integral de Frango com Ricota",
    chefProtein: { type: "frango_desfiar", qty: 150 },
    chefExtra: [{ name: "Ricota fresca (porcionar, sem cozinhar)", qty: 50 }],
    emCasa: "Montar o wrap com pão integral, recheio e salada fresca (alface, tomate-cereja, pepino)" },
  { id: 3, name: "Patinho em Tiras com Salada",
    chefProtein: { type: "patinho_tiras", qty: 150 },
    chefCarb: { type: "batata_doce", qty: 150, arrozQty: 120 },
    emCasa: "Montar salada fresca (alface, rúcula, tomate-cereja, pepino) e servir com azeite extravirgem" },
  { id: 4, name: "Frango Grelhado + Salada + Raiz",
    chefProtein: { type: "frango_grelhar", qty: 180 },
    chefCarb: { type: "inhame", qty: 150, arrozQty: 120 },
    carbNote: "Pode variar entre inhame cozido, batata-doce cozida (150g) ou arroz branco (120g), conforme o insumo do dia",
    emCasa: "Montar salada fresca (alface, rúcula, tomate, pepino) com azeite extravirgem e limão" },
];

const DAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];

const PRESETS = {
  variada: { almoco: [1, 2, 3, 4, 5], jantar: [1, 2, 3, 4, 1], arroz: [false, false, false, false, false] },
  peixe:   { almoco: [2, 5, 2, 5, 2], jantar: [2, 1, 2, 1, 3], arroz: [false, false, false, false, false] },
  frango:  { almoco: [1, 4, 6, 1, 4], jantar: [1, 4, 2, 1, 4], arroz: [true, false, true, false, true] },
  patinho: { almoco: [3, 1, 3, 2, 4], jantar: [3, 1, 3, 2, 1], arroz: [false, false, false, false, false] },
};

// ===== Persistência local + sincronização via GitHub =====
const STATE_KEY = 'preparo-chef-jk-state';
const TOKEN_KEY = 'lista-compras-jk-github-token'; // mesmo token usado na lista de compras
const GITHUB_OWNER = 'kevinsilvatec';
const GITHUB_REPO = 'meal-plan';
const GITHUB_BRANCH = 'main';
const DATA_PATH = 'data/chef-prep-state.json';
const API_URL = 'https://api.github.com/repos/' + GITHUB_OWNER + '/' + GITHUB_REPO + '/contents/' + DATA_PATH;

let currentSha = null;

function getToken() { return localStorage.getItem(TOKEN_KEY) || ''; }
function setToken(t) { if (t) localStorage.setItem(TOKEN_KEY, t.trim()); else localStorage.removeItem(TOKEN_KEY); }
function b64EncodeUnicode(str) { return btoa(unescape(encodeURIComponent(str))); }
function b64DecodeUnicode(str) { return decodeURIComponent(escape(atob(str))); }

function setSyncStatus(text, kind) {
  const el = document.getElementById('chef-sync-status');
  if (!el) return;
  el.textContent = text;
  el.className = 'sync-status ' + (kind || '');
}

function saveStateLocal() {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}
function loadStateLocal() {
  try {
    const raw = JSON.parse(localStorage.getItem(STATE_KEY));
    if (raw && Array.isArray(raw.almoco) && Array.isArray(raw.jantar) && Array.isArray(raw.arroz)) return raw;
  } catch (e) {}
  return null;
}

function persistAndSync() {
  saveStateLocal();
  setSyncStatus('🔄 Salvando...', 'info');
  pushRemoteState(state);
}

async function fetchRemoteState() {
  const headers = { 'Accept': 'application/vnd.github+json' };
  const token = getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;
  try {
    const res = await fetch(API_URL + '?ref=' + GITHUB_BRANCH, { headers, cache: 'no-store' });
    if (res.status === 404) { currentSha = null; return null; }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    currentSha = data.sha;
    const parsed = JSON.parse(b64DecodeUnicode(data.content.replace(/\n/g, '')));
    if (parsed && Array.isArray(parsed.almoco) && Array.isArray(parsed.jantar) && Array.isArray(parsed.arroz)) return parsed;
    return null;
  } catch (err) {
    console.warn('Falha ao buscar escolhas compartilhadas:', err);
    return undefined; // undefined = erro de rede/leitura, diferente de null (arquivo inexistente)
  }
}

async function pushRemoteState(newState) {
  const token = getToken();
  if (!token) { setSyncStatus('⚠️ Sem token — mudança salva só neste aparelho', 'warn'); return false; }
  const body = {
    message: 'Atualiza escolhas da calculadora de preparo',
    content: b64EncodeUnicode(JSON.stringify(newState, null, 2)),
    branch: GITHUB_BRANCH,
  };
  if (currentSha) body.sha = currentSha;
  try {
    const res = await fetch(API_URL, {
      method: 'PUT',
      headers: { 'Accept': 'application/vnd.github+json', 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.status === 409 || res.status === 422) {
      const remote = await fetchRemoteState();
      if (remote !== undefined) {
        // conflito: a última escolha feita neste aparelho prevalece, só reaproveitamos o sha mais novo
        return pushRemoteState(newState);
      }
      setSyncStatus('⚠️ Conflito ao sincronizar, tente novamente', 'warn');
      return false;
    }
    if (!res.ok) {
      console.warn('Falha ao salvar no GitHub:', res.status, await res.text());
      setSyncStatus('⚠️ Falha ao sincronizar (token válido?)', 'warn');
      return false;
    }
    const data = await res.json();
    currentSha = data.content.sha;
    setSyncStatus('✅ Sincronizado com o GitHub', 'ok');
    return true;
  } catch (err) {
    console.warn('Erro de rede ao salvar no GitHub:', err);
    setSyncStatus('⚠️ Sem conexão — salvo só neste aparelho', 'warn');
    return false;
  }
}

async function syncFromRemote() {
  const remote = await fetchRemoteState();
  if (remote === undefined) {
    setSyncStatus(getToken() ? '⚠️ Não foi possível buscar as escolhas compartilhadas' : '⚠️ Sem token configurado — clique em "Configurar token"', 'warn');
    return;
  }
  if (remote !== null && JSON.stringify(remote) !== JSON.stringify(state)) {
    state = remote;
    saveStateLocal();
    renderDaySelectors();
    renderResults();
    renderDailyPlan();
  }
  setSyncStatus(getToken() ? '✅ Sincronizado com o GitHub' : 'ℹ️ Lendo escolhas compartilhadas (configure um token para editar)', getToken() ? 'ok' : 'info');
}

window.configurarTokenChef = function() {
  const current = getToken();
  const value = prompt('Cole aqui o token do GitHub (fine-grained, permissão "Contents: Read and write", restrito ao repositório ' + GITHUB_REPO + '). É o mesmo token usado na lista de compras — fica salvo só neste navegador.', current);
  if (value === null) return;
  setToken(value.trim());
  setSyncStatus('🔄 Verificando token...', 'info');
  syncFromRemote();
};

let state = loadStateLocal() || JSON.parse(JSON.stringify(PRESETS.variada));

// ===== RENDER STATIC FICHAS =====
function fmtCarb(opt) {
  let s = `<span class="chip carb">${CARB_LABELS[opt.carb.type]}: ${opt.carb.qty}g</span>`;
  if (opt.carb.arrozQty) s += `<span class="chip arroz">ou Arroz: ${opt.carb.arrozQty}g</span>`;
  if (opt.extraCarb) s += `<span class="chip carb">${CARB_LABELS[opt.extraCarb.type]}: ${opt.extraCarb.qty}g</span>`;
  return s;
}

function renderFichaAlmoco() {
  const tbody = document.querySelector("#tbl-almoco tbody");
  tbody.innerHTML = ALMOCO_OPTIONS.map(o => `
    <tr>
      <td class="opt-name">Opção ${o.id}<br><small>${o.name}</small></td>
      <td><span class="chip">${PROTEIN_LABELS[o.protein.type]}: ${o.protein.qty}g</span></td>
      <td>${fmtCarb(o)}</td>
      <td>${o.veggies.map(v => `<span class="chip veg">${v.name}: ${v.qty}g</span>`).join(" ")}</td>
    </tr>`).join("");
}

function renderFichaJantar() {
  const tbody = document.querySelector("#tbl-jantar tbody");
  tbody.innerHTML = JANTAR_OPTIONS.map(o => {
    let chefParts = [`<span class="chip">${PROTEIN_LABELS[o.chefProtein.type]}: ${o.chefProtein.qty}g</span>`];
    if (o.chefCarb) {
      chefParts.push(`<span class="chip carb">${CARB_LABELS[o.chefCarb.type]}: ${o.chefCarb.qty}g</span>`);
      if (o.chefCarb.arrozQty) chefParts.push(`<span class="chip arroz">ou Arroz: ${o.chefCarb.arrozQty}g</span>`);
    }
    if (o.chefExtra) o.chefExtra.forEach(e => chefParts.push(`<span class="chip veg">${e.name}: ${e.qty}g</span>`));
    const noteHtml = o.carbNote ? `<br><small>${o.carbNote}</small>` : "";
    return `
    <tr>
      <td class="opt-name">Opção ${o.id}<br><small>${o.name}</small></td>
      <td>${chefParts.join(" ")}${noteHtml}</td>
      <td>${o.emCasa}</td>
    </tr>`;
  }).join("");
}

// ===== CALCULATOR =====
function renderDaySelectors() {
  const container = document.getElementById("day-selectors");
  container.innerHTML = DAYS.map((day, i) => `
    <div class="day-grid">
      <div class="day-label">${day}</div>
      <div>
        <select data-day="${i}" data-meal="almoco" onchange="onSelectChange(event)">
          ${ALMOCO_OPTIONS.map(o => `<option value="${o.id}" ${state.almoco[i] === o.id ? "selected" : ""}>Opção ${o.id} — ${o.name}</option>`).join("")}
        </select>
        <label class="arroz-toggle">
          <input type="checkbox" data-day="${i}" ${state.arroz[i] ? "checked" : ""} onchange="onArrozChange(event)"> Usar arroz no lugar da raiz
        </label>
      </div>
      <div>
        <select data-day="${i}" data-meal="jantar" onchange="onSelectChange(event)">
          ${JANTAR_OPTIONS.map(o => `<option value="${o.id}" ${state.jantar[i] === o.id ? "selected" : ""}>Opção ${o.id} — ${o.name}</option>`).join("")}
        </select>
      </div>
    </div>`).join("");
}

function onSelectChange(e) {
  const day = parseInt(e.target.dataset.day, 10);
  const meal = e.target.dataset.meal;
  state[meal][day] = parseInt(e.target.value, 10);
  renderResults();
  renderDailyPlan();
  persistAndSync();
}
function onArrozChange(e) {
  const day = parseInt(e.target.dataset.day, 10);
  state.arroz[day] = e.target.checked;
  renderResults();
  renderDailyPlan();
  persistAndSync();
}

function applyPreset(name) {
  state = JSON.parse(JSON.stringify(PRESETS[name]));
  renderDaySelectors();
  renderResults();
  renderDailyPlan();
  persistAndSync();
}

function computeTotals() {
  const proteinTotals = {};
  const carbTotals = {};
  const veggieTotals = {};
  const PEOPLE = 2;

  DAYS.forEach((_, i) => {
    const almocoOpt = ALMOCO_OPTIONS.find(o => o.id === state.almoco[i]);
    const jantarOpt = JANTAR_OPTIONS.find(o => o.id === state.jantar[i]);
    const useArroz = state.arroz[i];

    // Almoço protein
    proteinTotals[almocoOpt.protein.type] = (proteinTotals[almocoOpt.protein.type] || 0) + almocoOpt.protein.qty * PEOPLE;
    // Almoço carb
    if (useArroz && almocoOpt.carb.arrozQty) {
      carbTotals["arroz"] = (carbTotals["arroz"] || 0) + almocoOpt.carb.arrozQty * PEOPLE;
    } else {
      carbTotals[almocoOpt.carb.type] = (carbTotals[almocoOpt.carb.type] || 0) + almocoOpt.carb.qty * PEOPLE;
    }
    if (almocoOpt.extraCarb) {
      carbTotals[almocoOpt.extraCarb.type] = (carbTotals[almocoOpt.extraCarb.type] || 0) + almocoOpt.extraCarb.qty * PEOPLE;
    }
    // Almoço veggies
    almocoOpt.veggies.forEach(v => {
      veggieTotals[v.name] = (veggieTotals[v.name] || 0) + v.qty * PEOPLE;
    });

    // Jantar protein
    proteinTotals[jantarOpt.chefProtein.type] = (proteinTotals[jantarOpt.chefProtein.type] || 0) + jantarOpt.chefProtein.qty * PEOPLE;
    // Jantar carb
    if (jantarOpt.chefCarb) {
      if (useArroz && jantarOpt.chefCarb.arrozQty) {
        carbTotals["arroz"] = (carbTotals["arroz"] || 0) + jantarOpt.chefCarb.arrozQty * PEOPLE;
      } else {
        carbTotals[jantarOpt.chefCarb.type] = (carbTotals[jantarOpt.chefCarb.type] || 0) + jantarOpt.chefCarb.qty * PEOPLE;
      }
    }
    // Jantar extras (treated as veggie/extra bucket)
    if (jantarOpt.chefExtra) {
      jantarOpt.chefExtra.forEach(e => {
        veggieTotals[e.name] = (veggieTotals[e.name] || 0) + e.qty * PEOPLE;
      });
    }
  });

  return { proteinTotals, carbTotals, veggieTotals };
}

function fmtQty(grams) {
  if (grams >= 1000) return (grams / 1000).toFixed(2).replace(/\.00$/, "").replace(".", ",") + " kg";
  return Math.round(grams) + " g";
}

function renderResults() {
  const { proteinTotals, carbTotals, veggieTotals } = computeTotals();
  const grid = document.getElementById("results-grid");

  const proteinRows = Object.keys(PROTEIN_LABELS).map(key => {
    const val = proteinTotals[key] || 0;
    if (!val) return "";
    return `<div class="result-row"><span>${PROTEIN_LABELS[key]}</span><span class="qty">${fmtQty(val)}</span></div>`;
  }).join("") || `<div class="result-row empty">Nenhuma proteína selecionada</div>`;

  const carbRows = Object.keys(CARB_LABELS).map(key => {
    const val = carbTotals[key] || 0;
    if (!val) return "";
    return `<div class="result-row"><span>${CARB_LABELS[key]}</span><span class="qty">${fmtQty(val)}</span></div>`;
  }).join("") || `<div class="result-row empty">Nenhum carboidrato selecionado</div>`;

  const veggieRows = Object.keys(veggieTotals).map(key => {
    return `<div class="result-row"><span>${key}</span><span class="qty">${fmtQty(veggieTotals[key])}</span></div>`;
  }).join("") || `<div class="result-row empty">—</div>`;

  grid.innerHTML = `
    <div class="result-card">
      <h4>🥩 Proteínas a cozinhar (semana)</h4>
      ${proteinRows}
    </div>
    <div class="result-card" style="border-top-color:#e76f51;">
      <h4>🍠 Carboidratos a cozinhar (semana)</h4>
      ${carbRows}
    </div>
    <div class="result-card" style="border-top-color:#3b82f6;">
      <h4>🥦 Vegetais e outros itens a preparar (semana)</h4>
      ${veggieRows}
    </div>
  `;
}

function renderDailyPlan() {
  const grid = document.getElementById("daily-plan-grid");
  grid.innerHTML = DAYS.map((day, i) => {
    const almocoOpt = ALMOCO_OPTIONS.find(o => o.id === state.almoco[i]);
    const jantarOpt = JANTAR_OPTIONS.find(o => o.id === state.jantar[i]);
    const useArroz = state.arroz[i];
    const carbLabel = useArroz && almocoOpt.carb.arrozQty
      ? `Arroz branco: ${almocoOpt.carb.arrozQty * 2}g`
      : `${CARB_LABELS[almocoOpt.carb.type]}: ${almocoOpt.carb.qty * 2}g`;
    const extraCarbLabel = almocoOpt.extraCarb ? ` + ${CARB_LABELS[almocoOpt.extraCarb.type]}: ${almocoOpt.extraCarb.qty * 2}g` : "";
    const veggieLabel = almocoOpt.veggies.map(v => `${v.name} ${v.qty * 2}g`).join(", ");

    let jantarChef = `${PROTEIN_LABELS[jantarOpt.chefProtein.type]}: ${jantarOpt.chefProtein.qty * 2}g`;
    if (jantarOpt.chefCarb) {
      const jantarCarbLabel = useArroz && jantarOpt.chefCarb.arrozQty
        ? `Arroz branco: ${jantarOpt.chefCarb.arrozQty * 2}g`
        : `${CARB_LABELS[jantarOpt.chefCarb.type]}: ${jantarOpt.chefCarb.qty * 2}g`;
      jantarChef += ` + ${jantarCarbLabel}`;
    }
    if (jantarOpt.chefExtra) jantarChef += " + " + jantarOpt.chefExtra.map(e => `${e.name} ${e.qty * 2}g`).join(" + ");

    return `
    <div class="day-card">
      <h5>${day}</h5>
      <div class="meal-block">
        <div class="meal-label">🍽️ Almoço — pronto</div>
        <div class="meal-content">${PROTEIN_LABELS[almocoOpt.protein.type]}: ${almocoOpt.protein.qty * 2}g<br>${carbLabel}${extraCarbLabel}<br>${veggieLabel}</div>
      </div>
      <div class="meal-block">
        <div class="meal-label">🌙 Jantar — insumo entregue</div>
        <div class="meal-content">${jantarChef}<span class="em-casa">Em casa: ${jantarOpt.emCasa}</span></div>
      </div>
    </div>`;
  }).join("");
}

// ===== INIT =====
renderFichaAlmoco();
renderFichaJantar();
renderDaySelectors();
renderResults();
renderDailyPlan();
syncFromRemote();
setInterval(syncFromRemote, 15000);
document.addEventListener('visibilitychange', function() {
  if (!document.hidden) syncFromRemote();
});
