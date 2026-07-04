(function() {
  const STORAGE_KEY = 'lista-compras-jk-checked';
  const CHANNEL_KEY = 'lista-compras-jk-channel-overrides';
  const REMOVED_KEY = 'lista-compras-jk-removed-ids';
  const CUSTOM_KEY = 'lista-compras-jk-custom-items';
  const TAB_KEY = 'lista-compras-jk-active-tab';

  // Categoria padrão de cada item: itens mensais (não perecíveis) vão por
  // padrão para 'internet'; itens semanais (frescos/perecíveis) vão por
  // padrão para 'presencial'. Pode ser sobrescrito item a item pelos
  // botões 🌐/🏬 — a sobreposição é sincronizada entre os dois aparelhos.
  function defaultChannelForId(id) {
    return id.indexOf('mensal-') === 0 ? 'internet' : 'presencial';
  }

  // Categorias existentes, usadas no formulário de "Adicionar item"
  const TYPE_LABELS = {
    mensal: [
      ['suplementos', '💊 Suplementos & Funcionais'],
      ['carboidratos', '🍠 Carboidratos & Grãos'],
      ['temperos', '🌿 Temperos, Molhos & Conservas'],
      ['oleos', '🫒 Óleos & Adoçantes'],
      ['sementes', '🧂 Sementes & Oleaginosas'],
      ['chas', '🍵 Chás & Bebidas'],
      ['proteinas', '🥩 Proteínas (enlatadas)'],
    ],
    semanal: [
      ['proteinas', '🥩 Proteínas'],
      ['laticinios', '🥛 Laticínios'],
      ['carboidratos', '🍠 Carboidratos'],
      ['legumes', '🥦 Legumes & Verduras'],
      ['frutas', '🍓 Frutas'],
    ],
  };

  // ===== Sincronização compartilhada via GitHub =====
  const GITHUB_OWNER = 'kevinsilvatec';
  const GITHUB_REPO = 'meal-plan';
  const GITHUB_BRANCH = 'main';
  const DATA_PATH = 'data/checklist.json';
  const TOKEN_KEY = 'lista-compras-jk-github-token';
  const API_URL = 'https://api.github.com/repos/' + GITHUB_OWNER + '/' + GITHUB_REPO + '/contents/' + DATA_PATH;

  let currentSha = null;

  function getToken() { return localStorage.getItem(TOKEN_KEY) || ''; }
  function setToken(t) { if (t) localStorage.setItem(TOKEN_KEY, t.trim()); else localStorage.removeItem(TOKEN_KEY); }
  function b64EncodeUnicode(str) { return btoa(unescape(encodeURIComponent(str))); }
  function b64DecodeUnicode(str) { return decodeURIComponent(escape(atob(str))); }

  function setSyncStatus(text, kind) {
    const el = document.getElementById('sync-status');
    if (!el) return;
    el.textContent = text;
    el.className = 'sync-status ' + (kind || '');
  }

  function getChecked() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function saveChecked(obj) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  }
  function getChannelOverrides() {
    try { return JSON.parse(localStorage.getItem(CHANNEL_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function saveChannelOverrides(obj) {
    localStorage.setItem(CHANNEL_KEY, JSON.stringify(obj));
  }
  function getRemovedIds() {
    try { return JSON.parse(localStorage.getItem(REMOVED_KEY)) || []; }
    catch (e) { return []; }
  }
  function saveRemovedIds(arr) {
    localStorage.setItem(REMOVED_KEY, JSON.stringify(arr));
  }
  function getCustomItems() {
    try { return JSON.parse(localStorage.getItem(CUSTOM_KEY)) || []; }
    catch (e) { return []; }
  }
  function saveCustomItems(arr) {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(arr));
  }
  function effectiveChannel(id) {
    const overrides = getChannelOverrides();
    return overrides[id] || defaultChannelForId(id);
  }
  function getActiveTab() { return localStorage.getItem(TAB_KEY) || 'all'; }
  function setActiveTab(t) { localStorage.setItem(TAB_KEY, t); }

  function currentFullState() {
    return {
      checked: getChecked(),
      channel: getChannelOverrides(),
      removed: getRemovedIds(),
      custom: getCustomItems(),
    };
  }

  // ===== Progresso (considera só os itens visíveis na aba atual) =====
  function updateProgress() {
    const rows = Array.from(document.querySelectorAll('.item-row')).filter(r => r.style.display !== 'none');
    let total = 0, checked = 0;
    const sectionTotals = {};
    rows.forEach(row => {
      const chk = row.querySelector('.chk');
      const section = chk.closest('[data-section]').dataset.section;
      sectionTotals[section] = sectionTotals[section] || { total: 0, checked: 0 };
      sectionTotals[section].total++;
      total++;
      if (chk.checked) { checked++; sectionTotals[section].checked++; }
    });
    document.getElementById('progress-count').textContent = checked;
    document.getElementById('progress-total').textContent = total;
    document.getElementById('progress-bar').style.width = (total ? (checked/total*100) : 0) + '%';
    document.querySelectorAll('[data-section-progress]').forEach(el => {
      const key = el.dataset.sectionProgress;
      const s = sectionTotals[key] || { total: 0, checked: 0 };
      el.textContent = s.checked + ' de ' + s.total + ' itens comprados nesta seção';
    });
  }

  function applyState() {
    const state = getChecked();
    document.querySelectorAll('.chk').forEach(chk => {
      const id = chk.dataset.id;
      chk.checked = !!state[id];
      chk.closest('.item').classList.toggle('checked', chk.checked);
    });
  }

  // ===== Abas Internet / Presencial + itens removidos =====
  function updateChannelButtonStates() {
    document.querySelectorAll('.item-row').forEach(row => {
      const chk = row.querySelector('.chk');
      if (!chk) return;
      const ch = effectiveChannel(chk.dataset.id);
      row.querySelectorAll('.ch-btn[data-ch]').forEach(btn => btn.classList.toggle('active', btn.dataset.ch === ch));
    });
  }

  function applyTabFilter() {
    const tab = getActiveTab();
    const removed = getRemovedIds();
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));

    document.querySelectorAll('.card').forEach(card => {
      let anyVisible = false;
      card.querySelectorAll('.item-row').forEach(row => {
        const chk = row.querySelector('.chk');
        if (!chk) return;
        const id = chk.dataset.id;
        if (removed.indexOf(id) !== -1) { row.style.display = 'none'; return; }
        const ch = effectiveChannel(id);
        const show = (tab === 'all') || (ch === tab);
        row.style.display = show ? '' : 'none';
        if (show) anyVisible = true;
      });
      card.style.display = anyVisible ? '' : 'none';
    });

    let anyMonthlyVisible = false, anyWeeklyVisible = false;
    document.querySelectorAll('.grid').forEach(grid => {
      const cards = Array.from(grid.children).filter(c => c.classList.contains('card'));
      const anyVisible = cards.some(card => card.style.display !== 'none');
      grid.style.display = anyVisible ? '' : 'none';
      if (anyVisible && cards.some(c => c.dataset.section === 'mensal')) anyMonthlyVisible = true;
      if (anyVisible && cards.some(c => c.dataset.section === 'semanal')) anyWeeklyVisible = true;
      const prev = grid.previousElementSibling;
      if (prev && prev.tagName === 'DIV' && !prev.classList.contains('section-title') && !prev.classList.contains('section-progress')) {
        const styleAttr = prev.getAttribute('style') || '';
        if (styleAttr.indexOf('border-left') !== -1) prev.style.display = anyVisible ? '' : 'none';
      }
    });
    const sectionTitles = document.querySelectorAll('.section-title');
    if (sectionTitles[0]) sectionTitles[0].style.display = anyMonthlyVisible ? '' : 'none';
    if (sectionTitles[1]) sectionTitles[1].style.display = anyWeeklyVisible ? '' : 'none';
    const monthlyProgress = document.querySelector('[data-section-progress="mensal"]');
    if (monthlyProgress) monthlyProgress.style.display = anyMonthlyVisible ? '' : 'none';
    const weeklyProgress = document.querySelector('[data-section-progress="semanal"]');
    if (weeklyProgress) weeklyProgress.style.display = anyWeeklyVisible ? '' : 'none';

    updateProgress();
  }

  function persistAndSync() {
    setSyncStatus('🔄 Salvando...', 'info');
    pushRemoteState(currentFullState());
  }

  function attachRowHandlers(toggle, id, isCustom) {
    toggle.querySelectorAll('.ch-btn[data-ch]').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const overrides = getChannelOverrides();
        overrides[id] = btn.dataset.ch;
        saveChannelOverrides(overrides);
        updateChannelButtonStates();
        applyTabFilter();
        persistAndSync();
      });
    });
    const delBtn = toggle.querySelector('.del-btn');
    delBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      if (!confirm('Remover este item da lista?')) return;
      if (isCustom) {
        saveCustomItems(getCustomItems().filter(it => it.id !== id));
        const row = delBtn.closest('.item-row');
        if (row) row.remove();
      } else {
        const removed = getRemovedIds();
        if (removed.indexOf(id) === -1) removed.push(id);
        saveRemovedIds(removed);
      }
      applyTabFilter();
      persistAndSync();
    });
  }

  function wrapItemsWithChannelToggle() {
    document.querySelectorAll('label.item').forEach(label => {
      const id = label.getAttribute('for');
      const wrapper = document.createElement('div');
      wrapper.className = 'item-row';
      label.parentNode.insertBefore(wrapper, label);
      wrapper.appendChild(label);

      const toggle = document.createElement('div');
      toggle.className = 'channel-toggle';
      toggle.innerHTML =
        '<button type="button" class="ch-btn" data-ch="internet" title="Comprar pela internet">🌐</button>' +
        '<button type="button" class="ch-btn" data-ch="presencial" title="Comprar presencialmente">🏬</button>' +
        '<button type="button" class="ch-btn del-btn" title="Remover item">🗑️</button>';
      wrapper.appendChild(toggle);

      attachRowHandlers(toggle, id, false);
    });
  }

  function buildItemRowDom(item) {
    const wrapper = document.createElement('div');
    wrapper.className = 'item-row';
    wrapper.dataset.custom = '1';

    const label = document.createElement('label');
    label.className = 'item';
    label.setAttribute('for', item.id);

    const noteHtml = item.note ? '<small></small>' : '';
    label.innerHTML =
      '<input type="checkbox" id="' + item.id + '" class="chk" data-id="' + item.id + '">' +
      '<span class="box"></span>' +
      '<span class="item-body">' +
        '<span class="item-name"></span>' +
        '<span class="item-qty"></span>' +
      '</span>';
    label.querySelector('.item-name').textContent = item.name || '';
    if (item.note) {
      const small = document.createElement('small');
      small.textContent = item.note;
      label.querySelector('.item-name').appendChild(small);
    }
    label.querySelector('.item-qty').textContent = item.qty || '';

    wrapper.appendChild(label);

    const toggle = document.createElement('div');
    toggle.className = 'channel-toggle';
    toggle.innerHTML =
      '<button type="button" class="ch-btn" data-ch="internet" title="Comprar pela internet">🌐</button>' +
      '<button type="button" class="ch-btn" data-ch="presencial" title="Comprar presencialmente">🏬</button>' +
      '<button type="button" class="ch-btn del-btn" title="Remover item">🗑️</button>';
    wrapper.appendChild(toggle);

    attachRowHandlers(toggle, item.id, true);
    return wrapper;
  }

  function renderCustomItems() {
    document.querySelectorAll('.item-row[data-custom="1"]').forEach(r => r.remove());
    getCustomItems().forEach(item => {
      let card = document.querySelector('.card[data-section="' + item.section + '"][data-type="' + item.type + '"]');
      if (!card) card = document.querySelector('.card[data-section="' + item.section + '"]');
      if (!card) return;
      card.appendChild(buildItemRowDom(item));
      if (item.channel) {
        const overrides = getChannelOverrides();
        if (!overrides[item.id]) { overrides[item.id] = item.channel; saveChannelOverrides(overrides); }
      }
    });
  }

  window.resetChannels = function() {
    if (!confirm('Redefinir a divisão internet/presencial para o padrão em todos os itens?')) return;
    saveChannelOverrides({});
    updateChannelButtonStates();
    applyTabFilter();
    persistAndSync();
  };

  window.restoreRemoved = function() {
    if (!confirm('Restaurar todos os itens removidos?')) return;
    saveRemovedIds([]);
    applyTabFilter();
    persistAndSync();
  };

  window.selectTab = function(tab) {
    setActiveTab(tab);
    applyTabFilter();
  };

  // ===== Formulário de adicionar item =====
  window.populateTypeOptions = function() {
    const section = document.getElementById('add-section').value;
    const typeSelect = document.getElementById('add-type');
    typeSelect.innerHTML = TYPE_LABELS[section].map(([key, label]) => '<option value="' + key + '">' + label + '</option>').join('');
    document.getElementById('add-channel').value = (section === 'mensal') ? 'internet' : 'presencial';
  };

  window.toggleCustomUnit = function() {
    const unitSelect = document.getElementById('add-qty-unit');
    const wrap = document.getElementById('add-qty-unit-custom-wrap');
    wrap.style.display = (unitSelect.value === 'outro') ? '' : 'none';
  };

  window.toggleAddForm = function(show) {
    const panel = document.getElementById('add-item-panel');
    const willShow = (show === undefined) ? (panel.style.display === 'none') : show;
    panel.style.display = willShow ? '' : 'none';
    if (willShow) {
      populateTypeOptions();
      document.getElementById('add-name').value = '';
      document.getElementById('add-qty-value').value = '';
      document.getElementById('add-qty-unit').value = 'unid.';
      document.getElementById('add-qty-unit-custom').value = '';
      document.getElementById('add-qty-unit-custom-wrap').style.display = 'none';
      document.getElementById('add-qty-freq').value = '/mês';
      document.getElementById('add-note').value = '';
      document.getElementById('add-name').focus();
    }
  };

  window.submitAddItem = function() {
    const name = document.getElementById('add-name').value.trim();
    if (!name) { alert('Digite o nome do item.'); return; }
    const qtyValue = document.getElementById('add-qty-value').value.trim();
    let qtyUnit = document.getElementById('add-qty-unit').value;
    if (qtyUnit === 'outro') {
      qtyUnit = document.getElementById('add-qty-unit-custom').value.trim();
      if (!qtyUnit) { alert('Especifique a unidade de medida.'); return; }
    }
    const qtyFreq = document.getElementById('add-qty-freq').value;
    const qty = [qtyValue, qtyUnit].filter(Boolean).join(' ').trim() + qtyFreq;
    const note = document.getElementById('add-note').value.trim();
    const section = document.getElementById('add-section').value;
    const type = document.getElementById('add-type').value;
    const channel = document.getElementById('add-channel').value;
    const id = 'custom-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);

    const item = { id, name, note, qty, qtyValue, qtyUnit, qtyFreq, section, type };
    const custom = getCustomItems();
    custom.push(item);
    saveCustomItems(custom);

    const overrides = getChannelOverrides();
    overrides[id] = channel;
    saveChannelOverrides(overrides);

    renderCustomItems();
    updateChannelButtonStates();
    applyTabFilter();
    toggleAddForm(false);
    persistAndSync();
  };

  // ===== Sincronização remota (checked + channel + removed + custom num único arquivo) =====
  function normalizeRemote(raw) {
    if (raw && typeof raw === 'object' && ('checked' in raw || 'channel' in raw || 'removed' in raw || 'custom' in raw)) {
      return {
        checked: raw.checked || {},
        channel: raw.channel || {},
        removed: raw.removed || [],
        custom: raw.custom || [],
      };
    }
    return { checked: raw || {}, channel: {}, removed: [], custom: [] }; // formato antigo
  }

  async function fetchRemoteState() {
    const headers = { 'Accept': 'application/vnd.github+json' };
    const token = getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;
    try {
      const res = await fetch(API_URL + '?ref=' + GITHUB_BRANCH, { headers, cache: 'no-store' });
      if (res.status === 404) { currentSha = null; return { checked: {}, channel: {}, removed: [], custom: [] }; }
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      currentSha = data.sha;
      return normalizeRemote(JSON.parse(b64DecodeUnicode(data.content.replace(/\n/g, ''))));
    } catch (err) {
      console.warn('Falha ao buscar estado compartilhado:', err);
      return null;
    }
  }

  async function pushRemoteState(state) {
    const token = getToken();
    if (!token) { setSyncStatus('⚠️ Sem token — mudança salva só neste aparelho', 'warn'); return false; }
    const body = {
      message: 'Atualiza lista de compras',
      content: b64EncodeUnicode(JSON.stringify(state, null, 2)),
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
        if (remote) {
          const mergedCustomIds = new Set((state.custom || []).map(it => it.id));
          const mergedCustom = (remote.custom || []).filter(it => !mergedCustomIds.has(it.id)).concat(state.custom || []);
          const mergedRemoved = Array.from(new Set((remote.removed || []).concat(state.removed || [])));
          return pushRemoteState({
            checked: Object.assign({}, remote.checked, state.checked),
            channel: Object.assign({}, remote.channel, state.channel),
            removed: mergedRemoved,
            custom: mergedCustom,
          });
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
    if (remote === null) {
      setSyncStatus(getToken() ? '⚠️ Não foi possível buscar a lista compartilhada' : '⚠️ Sem token configurado — clique em "Configurar token"', 'warn');
      return;
    }
    const local = currentFullState();
    let changed = false;
    if (JSON.stringify(remote.checked) !== JSON.stringify(local.checked)) { saveChecked(remote.checked); changed = true; }
    if (JSON.stringify(remote.channel) !== JSON.stringify(local.channel)) { saveChannelOverrides(remote.channel); changed = true; }
    if (JSON.stringify(remote.removed) !== JSON.stringify(local.removed)) { saveRemovedIds(remote.removed); changed = true; }
    if (JSON.stringify(remote.custom) !== JSON.stringify(local.custom)) { saveCustomItems(remote.custom); changed = true; }
    if (changed) {
      renderCustomItems();
      applyState();
      updateChannelButtonStates();
      applyTabFilter();
    }
    setSyncStatus(getToken() ? '✅ Sincronizado com o GitHub' : 'ℹ️ Lendo lista compartilhada (configure um token para marcar itens)', getToken() ? 'ok' : 'info');
  }

  window.configurarToken = function() {
    const current = getToken();
    const value = prompt('Cole aqui o token do GitHub (fine-grained, permissão "Contents: Read and write", restrito ao repositório ' + GITHUB_REPO + '). Fica salvo só neste navegador, nunca é enviado para mais ninguém.', current);
    if (value === null) return;
    setToken(value.trim());
    setSyncStatus('🔄 Verificando token...', 'info');
    syncFromRemote();
  };

  document.addEventListener('change', function(e) {
    if (!e.target.classList.contains('chk')) return;
    const state = getChecked();
    state[e.target.dataset.id] = e.target.checked;
    saveChecked(state);
    e.target.closest('.item').classList.toggle('checked', e.target.checked);
    updateProgress();
    persistAndSync();
  });

  window.resetAll = function() {
    if (!confirm('Desmarcar todos os itens da lista?')) return;
    saveChecked({});
    applyState();
    updateProgress();
    persistAndSync();
  };

  wrapItemsWithChannelToggle();
  renderCustomItems();
  applyState();
  updateChannelButtonStates();
  applyTabFilter();
  syncFromRemote();
  setInterval(syncFromRemote, 15000);
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden) syncFromRemote();
  });
})();
