# Contexto do Projeto · Dieta Jessica & Kevin (meal-plan)

> Documento de referência para retomar o projeto em qualquer conversa futura. Descreve o que já existe, como funciona e para onde pode evoluir.
> Última atualização: 2026-07-18.

## Visão geral

Site estático (HTML + CSS + JS puro, sem build tooling) hospedado no GitHub Pages, repositório `kevinsilvatec/meal-plan`. Serve como central do plano alimentar do casal: cardápio, lista de compras compartilhada e guia de preparo semanal para a personal chef. Não há backend: a "sincronização entre aparelhos" é feita gravando JSON direto no repositório GitHub via API de Contents, autenticado com um Personal Access Token (fine-grained) que cada pessoa cola uma vez no navegador (fica salvo em `localStorage`).

**Regra permanente combinada com o Kevin: eu (Claude) nunca faço `git add/commit/push` neste projeto.** Só edito os arquivos e aviso que terminei; commits e push ficam por conta do Kevin.

## Estrutura de arquivos

```
meal-plan/
├── index.html                     → hub com 3 cards de navegação
├── cardapio-opcoes-semana.html    → catálogo de opções de almoço/jantar + semana modelo
├── preparo-chef.html              → fichas técnicas + calculadora semanal para a chef
├── lista-compras.html             → checklist de compras (mensal/semanal)
├── assets/
│   ├── css/
│   │   ├── common.css             → reset, header/footer, .back-nav, .tag, barra global de token, compartilhado
│   │   ├── index.css
│   │   ├── cardapio.css
│   │   ├── preparo-chef.css
│   │   └── lista-compras.css
│   └── js/
│       ├── common.js              → barra fixa de configuração do token do GitHub, presente em todas as páginas
│       ├── preparo-chef.js        → dados das fichas + calculadora + persistência/sync
│       └── lista-compras.js       → checklist + cadastro de itens + persistência/sync
└── data/
    ├── checklist.json             → estado sincronizado da lista de compras
    └── chef-prep-state.json       → estado sincronizado da calculadora da chef (criado automaticamente no 1º save)
```

CSS/JS ficam 100% separados do HTML (refatorado para manutenibilidade); nenhuma mudança de estrutura alterou chaves de `localStorage`, schema do GitHub ou IDs dos itens: deploys não exigem remarcar o que já foi comprado.

**Convenção de estilo do texto do site**: sem travessões (—) em nenhum lugar (título, notas, labels); usar "·" (ponto médio) como separador curto entre rótulos, ou reescrever a frase com vírgula/dois-pontos/ponto final quando o travessão indicava uma pausa maior. Decisão do Kevin em 2026-07-18, aplicada a todo o site.

## Mapa de features implementadas

### 1. Hub inicial (`index.html`)
Página simples com 3 cards de navegação (Cardápio, Preparo para a Chef, Lista de Compras). Sem lógica própria.

### 2. Cardápio (`cardapio-opcoes-semana.html`)
- Catálogo completo de opções de almoço (6 opções dia de semana, 5 no fim de semana) e jantar (4 opções dia de semana, 5 no fim de semana), com ingredientes e observações por prato.
- Tabela "Semana Modelo" ligando cada dia às opções do catálogo.
- Conteúdo estático, sem persistência, sem sync (o cardápio em si não muda por interação do usuário).
- Peixe padronizado como tilápia em todas as opções, exceto o jantar de fim de semana opção 3, que continua sendo **sardinha com salada** (decisão explícita do Kevin).
- **Mandioquinha removida do site inteiro em 2026-07-18** (não é ingrediente usado): a opção de almoço "Tilápia Grelhada + Couve + Mandioquinha" virou "Tilápia Grelhada + Couve + Mandioca" (nível nutricional equivalente), no cardápio, na ficha técnica e na calculadora do preparo-chef.

### 3. Preparo para a Chef (`preparo-chef.html` + `assets/js/preparo-chef.js`)
- **Convenção de peso: todas as gramaturas das fichas técnicas e da calculadora são in natura (cru, antes de cozinhar)**, confirmado com o Kevin em 2026-07-18. Não há conversão para peso cozido em nenhum ponto do site.
- **Correção de 2026-07-18 (porções infladas)**: a chef preparou quase o dobro do necessário numa semana. Causa provável identificada: a Ficha Técnica trazia a instrução "dobre para o casal" (peso por pessoa) bem perto dos quadros que já vinham somados para as 2 pessoas, risco real de dobrar um número que já estava dobrado. Correção aplicada:
  - Textos da Ficha Técnica e dos quadros de totais agora deixam explícito onde é "por pessoa" (só referência) vs. onde já é "para as 2 pessoas, não dobrar de novo".
  - Nota de aviso adicionada no topo da página reforçando o total esperado: **10 marmitas de almoço (5 dias × 2 pessoas) + ingredientes de jantar para 5 dias × 2 pessoas**, nada além disso.
  - Gramaturas in natura de proteínas/carboidratos/vegetais reduzidas em ~15-25% para porções mais enxutas por adulto (ex: proteína principal do almoço passou de ~180-200g para ~150-160g por pessoa; jantar de ~150-180g para ~120-140g por pessoa).
- **Linguagem simplificada para a chef, em 2026-07-18**: removido o termo "insumo" (ex: o antigo rótulo "Jantar, insumo entregue") de toda a página, por ser jargão que ela pode não entender. Também ficou explícito, em vários pontos, que **almoço vira marmita pronta para só esquentar** (única exceção: salada fresca de alguma opção, que o casal adiciona em casa para não murchar) e que **jantar é entregue com os ingredientes separados**, não montado (o casal monta em casa).
- **Instruções de preparo consolidadas, em 2026-07-18**: o quadro de totais da semana (antigo "Resultados") virou "Instruções de Preparo", com frases de ação em vez de números soltos (ex: "Grelhar peito de frango: 640 g"). O mesmo tipo de preparo é somado automaticamente entre dias diferentes e entre almoço e jantar (ex: frango grelhado de segunda no almoço + frango grelhado de sexta no jantar somam num único total), para a chef poder grelhar/desfiar tudo de uma vez em vez de repetir o preparo dia a dia.
- **Vegetais frescos (salada) separados dos cozidos, em 2026-07-18**: itens como agrião e rabanete (opção de almoço "Patinho em Tiras + Abóbora") são marcados como frescos e aparecem num bloco à parte ("Saladas frescas, casal adiciona em casa"), tanto nas Instruções de Preparo quanto no Guia de Montagem do Dia, para não ir cozido pra marmita.
- Fichas técnicas estáticas de almoço (6 opções) e jantar (4 opções) com proteína, carboidrato (incl. alternativa de arroz) e vegetais por opção.
- **Calculadora semanal**: para cada dia (seg-sex) escolhe-se opção de almoço, opção de jantar e se usa arroz no lugar da raiz. 4 presets prontos (Variada, Mais Peixe, Só Frango, Com Mais Carne).
- Calcula automaticamente o total de proteínas, carboidratos e vegetais a comprar/cozinhar na semana, e um guia de montagem dia a dia.
- **Persistência local + sync via GitHub**: toda escolha (almoço/jantar/arroz/presets) salva em `localStorage` (`preparo-chef-jk-state`) e é enviada para `data/chef-prep-state.json` no GitHub.
  - Reaproveita o mesmo token da lista de compras (`lista-compras-jk-github-token`), configurável pela barra global de token (ver seção 5).
  - Sincroniza a cada 15s e ao voltar para a aba (`visibilitychange`), então a escolha feita em um aparelho aparece no outro quase em tempo real.
  - Sem token configurado, funciona só localmente (status "salvo só neste aparelho"); o arquivo remoto é criado automaticamente no primeiro save.
  - Resolução de conflito simplificada: em caso de 409/422, refaz o fetch para pegar o `sha` novo e tenta de novo (último a salvar prevalece, sem merge campo a campo, aceitável pelo baixo volume de edições simultâneas).

### 4. Lista de Compras (`lista-compras.html` + `assets/js/lista-compras.js`)
- Checklist dividido em seções **mensal** e **semanal**, cada uma com categorias (ex: suplementos, carboidratos, temperos, óleos, sementes, chás, proteínas, laticínios, legumes, frutas).
- Checkbox de "comprado" por item, com progresso visual.
- Abas para filtrar por canal de compra: **Internet** / **Presencial**.
- **Cadastro de itens novo** (feature dedicada): formulário para adicionar item com nome, quantidade + unidade de medida (g, kg, ml, L, unid., pote(s), pacote(s), caixa(s), frasco(s), maço(s) ou unidade customizada), frequência (/mês, /sem. ou nenhuma), observação, seção (mensal/semanal), categoria e canal (internet/presencial). Também é possível remover itens (com opção de restaurar os removidos).
- **Persistência local + sync via GitHub**: chaves de `localStorage` separadas para itens marcados, overrides de canal, itens removidos, itens customizados e aba ativa. Estado sincronizado com `data/checklist.json` via GitHub Contents API, mesmo padrão de token/polling/conflito do preparo-chef.
- Responsivo para celular (uso no mercado).
- **Item "Mandioquinha" removido em 2026-07-18** (categoria Carboidratos, seção semanal): a quantidade semanal de Mandioca (item que já existia) foi ajustada de 700 g/sem. para 1,1 kg/sem. para cobrir a demanda equivalente.

### 5. Barra global de configuração do token do GitHub (`assets/js/common.js`, novo em 2026-07-18)
- Antes, cada página com sincronização (lista de compras e preparo-chef) tinha seu próprio botão "Configurar token", e as páginas sem sincronização (início, cardápio) não tinham nenhum jeito de configurar o token.
- Agora existe uma barra fixa no canto inferior direito, presente em **todas as páginas** (`index.html`, `cardapio-opcoes-semana.html`, `lista-compras.html`, `preparo-chef.html`), com um botão "🔑 Token do GitHub" que funciona de qualquer lugar do site.
- Ao clicar, `window.configurarTokenGlobal()` delega para o fluxo já existente da página atual (`window.configurarToken` na lista de compras, `window.configurarTokenChef` no preparo-chef) quando ele existe, para que a sincronização daquela página seja atualizada na hora. Nas páginas sem sincronização própria, usa um fluxo genérico que só salva o token em `localStorage` (mesma chave `lista-compras-jk-github-token`), pronto para quando a pessoa abrir a lista de compras ou o preparo-chef.
- Os botões antigos de "Configurar token" dentro de cada página foram removidos (o texto de status de sincronização continua ali, só o botão saiu, substituído pela barra global).
- **Ponte entre páginas via `window.name`, adicionada em 2026-07-18**: o Kevin reportou precisar reconfigurar o token em toda página, pois estava testando localmente abrindo os `.html` direto (`file://`), e nesse modo o navegador isola o `localStorage` por arquivo. `common.js` agora também guarda o token em `window.name` (que sobrevive a navegações dentro da mesma aba, mesmo trocando de origem) e, assim que carrega em cada página, reconcilia: se o `localStorage` daquela página estiver vazio mas houver token em `window.name`, copia de volta para o `localStorage` antes que `lista-compras.js`/`preparo-chef.js` tentem ler. Isso faz o token "seguir" a pessoa de página em página na mesma aba mesmo testando local. Limitações: só vale enquanto a aba continua aberta (fechar e reabrir, ou abrir link em aba nova, perde a ponte) e é só uma camada de conveniência para teste local; **uma vez publicado no GitHub Pages, todas as páginas são a mesma origem https e o token persiste normalmente via `localStorage`, sem precisar dessa ponte**. Todas as chamadas a `localStorage` em `common.js` têm fallback silencioso (`try/catch`) para o caso de o navegador bloquear armazenamento por completo em `file://`.
- `common.js` agora é carregado **antes** do script específico de cada página (`lista-compras.js` / `preparo-chef.js`) no HTML, para que a reconciliação acima já tenha rodado quando esses scripts lerem o token pela primeira vez.

### 6. Padrão técnico comum às duas sincronizações
- Token GitHub fine-grained (permissão "Contents: Read and write", restrito ao repo), colado via `prompt()` e salvo só no navegador, nunca commitado nem enviado a terceiros.
- Codificação Base64 Unicode-safe para o conteúdo (`btoa(unescape(encodeURIComponent(...)))` / inverso).
- Concorrência otimista via `sha` do arquivo + retry em caso de 409/422.
- Polling de 15s + listener de `visibilitychange` para sincronizar quase em tempo real sem backend/websocket.

## Roadmap · possíveis novas features

**Planejamento e cardápio**
- Gerar automaticamente a lista de compras semanal a partir das escolhas feitas na calculadora do preparo-chef (hoje são independentes).
- Histórico de cardápios por semana, para não repetir demais e ver o que já foi comido nas últimas semanas.
- Sistema simples de favoritos/avaliação por prato (👍/👎 da Jessica e do Kevin) para priorizar opções nos presets.
- Informação nutricional aproximada (calorias/macros) por opção de prato e total semanal.

**Lista de compras**
- Alertas de recompra: para itens mensais, avisar quando já se passaram ~30 dias desde a última vez que foram marcados como comprados (usando o histórico de commits ou um campo de data).
- Exportar a lista filtrada (ex: só "Internet" ou só o que falta) para compartilhar via WhatsApp/print em um clique.
- Campo de preço estimado por item e total da compra, para acompanhar orçamento.

**Sincronização e infraestrutura**
- Trocar o polling de 15s por atualização mais eficiente (ex: webhook + Server-Sent Events, se algum dia houver backend) ou pelo menos reduzir chamadas quando a aba está em segundo plano.
- Log de "quem mudou o quê e quando" reaproveitando o histórico de commits do GitHub (a API de Contents já grava um commit a cada save).
- Transformar em PWA instalável (manifest + service worker) para abrir como app no celular e funcionar melhor offline.
- Testes automatizados leves (ex: GitHub Action rodando `node --check` nos arquivos JS a cada push) para pegar erros de sintaxe antes do deploy.

**UX geral**
- Modo escuro.
- Indicador visual de "última sincronização há X minutos" em vez de só um status textual.
- Modo "visitante" explícito (ex: para a personal chef acessar o preparo-chef só para leitura, sem precisar/poder configurar token).
