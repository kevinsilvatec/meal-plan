// ===== Configuração do token do GitHub, comum a todas as páginas =====
// Mesma chave usada pela lista de compras e pelo preparo-chef, para que o token
// configurado aqui funcione nas duas sincronizações sem precisar repetir.
(function () {
  const TOKEN_KEY = 'lista-compras-jk-github-token';

  // ----- Ponte entre páginas via window.name -----
  // localStorage é isolado por origem. No site publicado (https://...) isso não é
  // problema: todas as páginas são a mesma origem e compartilham o localStorage
  // normalmente. Mas ao testar localmente abrindo os arquivos .html direto (file://),
  // vários navegadores tratam cada arquivo como uma origem separada, isolando o
  // localStorage por página, daí a sensação de "ter que colocar o token de novo em
  // cada página". window.name é uma exceção: ele persiste na mesma aba durante toda
  // a navegação, mesmo trocando de origem, então usamos ele como ponte para o token
  // seguir a pessoa de página em página dentro da mesma aba enquanto ela navega.
  function readTokenFromWindowName() {
    try {
      const data = JSON.parse(window.name || '{}');
      return data.mealPlanToken || '';
    } catch (e) {
      return '';
    }
  }
  function writeTokenToWindowName(token) {
    let data = {};
    try { data = JSON.parse(window.name || '{}'); } catch (e) {}
    data.mealPlanToken = token || '';
    window.name = JSON.stringify(data);
  }

  // Alguns navegadores bloqueiam localStorage por completo em páginas abertas via
  // file:// (origem "opaca"), em vez de só isolar por arquivo. Os try/catch abaixo
  // evitam que isso quebre a página inteira; nesse caso o token ainda funciona
  // dentro da mesma aba via window.name, só não sobrevive a fechar a aba.
  function safeGetLocal(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function safeSetLocal(key, value) {
    try { localStorage.setItem(key, value); } catch (e) {}
  }
  function safeRemoveLocal(key) {
    try { localStorage.removeItem(key); } catch (e) {}
  }

  // Reconciliação: roda assim que este script carrega, antes do script da própria
  // página (lista-compras.js / preparo-chef.js) ler o token, para que ele já encontre
  // o valor certo no localStorage.
  (function reconcileTokenAcrossPages() {
    const stored = safeGetLocal(TOKEN_KEY);
    if (stored) {
      writeTokenToWindowName(stored);
      return;
    }
    const fromWindowName = readTokenFromWindowName();
    if (fromWindowName) {
      safeSetLocal(TOKEN_KEY, fromWindowName);
    }
  })();

  function getSharedToken() {
    return safeGetLocal(TOKEN_KEY) || readTokenFromWindowName() || '';
  }
  function setSharedToken(t) {
    const value = t ? t.trim() : '';
    if (value) safeSetLocal(TOKEN_KEY, value);
    else safeRemoveLocal(TOKEN_KEY);
    writeTokenToWindowName(value);
  }

  function isFileProtocol() {
    return window.location.protocol === 'file:';
  }

  function updateBarStatus() {
    const el = document.getElementById('global-token-status');
    if (!el) return;
    const hasToken = !!getSharedToken();
    if (isFileProtocol() && !hasToken) {
      el.textContent = '⚠️ Testando local (file://): sirva por um servidor local para o token valer em todas as páginas';
      el.className = 'global-token-status warn';
      el.title = 'Abrindo os .html direto no computador, cada arquivo fica isolado e o token não passa de uma página pra outra ao fechar e reabrir a aba. Rode algo como "python3 -m http.server" na pasta do projeto e acesse http://localhost:8000, ou publique no GitHub Pages: aí o token configurado uma vez vale em todas as páginas normalmente.';
      return;
    }
    el.textContent = hasToken ? '🔑 Token configurado' : '🔑 Sem token configurado';
    el.className = 'global-token-status ' + (hasToken ? 'ok' : 'warn');
    el.title = '';
  }

  // Ponto único para configurar o token, chamável de qualquer página.
  // Se a página atual já tem seu próprio fluxo (lista de compras ou preparo-chef),
  // usa ele para que a sincronização daquela página seja atualizada na hora.
  window.configurarTokenGlobal = function () {
    if (typeof window.configurarToken === 'function') {
      window.configurarToken();
      writeTokenToWindowName(getSharedToken());
      updateBarStatus();
      return;
    }
    if (typeof window.configurarTokenChef === 'function') {
      window.configurarTokenChef();
      writeTokenToWindowName(getSharedToken());
      updateBarStatus();
      return;
    }
    const current = getSharedToken();
    const value = prompt('Cole aqui o token do GitHub (fine-grained, permissão "Contents: Read and write", restrito ao repositório meal-plan). Fica salvo neste navegador e vale para a Lista de Compras e o Preparo para a Chef.', current);
    if (value === null) return;
    setSharedToken(value.trim());
    updateBarStatus();
  };

  function injectBar() {
    if (document.getElementById('global-token-bar')) return;
    const bar = document.createElement('div');
    bar.id = 'global-token-bar';
    bar.innerHTML = '<span id="global-token-status" class="global-token-status"></span>' +
      '<button class="global-token-btn" onclick="configurarTokenGlobal()">🔑 Token do GitHub</button>';
    document.body.appendChild(bar);
    updateBarStatus();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectBar);
  } else {
    injectBar();
  }
})();
