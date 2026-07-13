(() => {
  "use strict";

  const PANEL_ID = "jira-frases-panel-v4";
  const STYLE_ID = "jira-frases-style-v4";
  const STORE = "jira_frases_v4";
  const SYNC_CHANNEL = `${STORE}:sync`;
  const CLIENT_ID = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const CDN_URL = "https://cdn.jsdelivr.net/gh/attgiasi/SAC-PREVENCAO@main/JIRA/FRASES/V4/frases-prontas.min.js";
  const DATA_MARKER = "let BASE_DATA = {\"topics\":[]};";
  let BASE_DATA = {"topics":[]};

  const DEFAULT_NAME = "Giasi Mandela";
  const DEFAULT_AREA = "SAC Prevenção";
  const CUSTOM_AREA = "__custom__";
  const AREAS = ["SAC Prevenção", "Dock Tech Prevenção", "Backoffice Prevenção"];
  const DEFAULT_TABS = [
    { id: "jira", label: "JIRA" },
    { id: "tabulacao", label: "TABULAÇÃO JIRA" }
  ];
  const ALLOWED_TABS = new Set(DEFAULT_TABS.map(tab => tab.id));
  const COLORS = ["#2563eb", "#059669", "#ea580c", "#7c3aed", "#dc2626", "#0891b2", "#ca8a04", "#db2777", "#4f46e5", "#65a30d", "#be123c", "#0f766e", "#9333ea", "#0284c7"];
  const BUILT_INS = new Set(["NOME", "ASSINATURA", "SAUDACAO"]);

  let data = null;
  let config = null;
  let firstRun = false;
  let syncChannel = null;
  let state = {
    tab: "jira",
    view: "home",
    topicId: "",
    query: "",
    searchTab: "all",
    searchTopic: "all",
    dragTopicId: "",
    dragPhraseId: ""
  };

  boot();

  async function boot() {
    window.__jiraFrasesV4Cleanup?.();
    removePanel();
    addStyle();
    const base = await loadBaseData();
    data = normalizeData(read("data", null) || base);
    migrateData();
    const storedConfig = read("config", null);
    firstRun = !storedConfig;
    config = normalizeConfig(storedConfig || {});
    document.body.appendChild(createPanel());
    applyPreferences();
    renderHome();
    bindEvents();
    if (firstRun) renderFirstRunModal();
  }

  async function loadBaseData() {
    if (BASE_DATA?.topics?.length) return clone(BASE_DATA);
    try {
      const response = await fetch(dataUrl(), { cache: "no-store" });
      if (!response.ok) throw new Error("Base de frases não encontrada.");
      return normalizeData(await response.json());
    } catch {
      return normalizeData(BASE_DATA);
    }
  }

  function dataUrl() {
    const src = document.currentScript?.src || CDN_URL;
    return src.replace(/frases-prontas(?:\.min)?\.js(?:\?.*)?$/, "frases-data.json");
  }

  function normalizeData(input) {
    const source = clone(input || {});
    const importedTabs = Array.isArray(source.tabs) && source.tabs.length ? source.tabs : DEFAULT_TABS;
    const tabs = importedTabs.filter(tab => ALLOWED_TABS.has(tab.id));
    const topics = Array.isArray(source.topics) ? source.topics.filter(topic => ALLOWED_TABS.has(topic.tab)) : [];
    source.version = 4;
    source.product = source.product || "Frases Prontas - JIRA Prevenção";
    source.tabs = tabs.map(tab => ({ id: clean(tab.id), label: clean(tab.label || tab.id).toUpperCase() })).filter(tab => tab.id);
    source.topics = topics.map((topic, topicIndex) => ({
      id: clean(topic.id) || uid("topic"),
      title: clean(topic.title || "NOVO TÓPICO").toUpperCase(),
      tab: source.tabs.some(tab => tab.id === topic.tab) ? topic.tab : "jira",
      order: Number(topic.order) || topicIndex + 1,
      color: clean(topic.color) || COLORS[topicIndex % COLORS.length],
      phrases: Array.isArray(topic.phrases) ? topic.phrases.map((phrase, phraseIndex) => ({
        id: clean(phrase.id) || uid("phrase"),
        title: clean(phrase.title || "Nova frase"),
        text: clean(phrase.text),
        tags: Array.isArray(phrase.tags) ? phrase.tags.map(clean).filter(Boolean) : [],
        noGreeting: !!phrase.noGreeting,
        noSignature: !!phrase.noSignature,
        readOnly: !!phrase.readOnly
      })) : []
    }));
    source.tabs.forEach(tab => normalizeTopicOrder(tab.id, source));
    source.topics.forEach(topic => normalizePhraseOrder(topic));
    return source;
  }

  function normalizeConfig(saved) {
    const base = {
      name: DEFAULT_NAME,
      area: DEFAULT_AREA,
      customArea: "",
      theme: "light",
      fontSize: 13,
      suggestions: true,
      favorites: [],
      usage: {}
    };
    const merged = { ...base, ...(saved || {}) };
    merged.name = clean(merged.name) || DEFAULT_NAME;
    merged.area = AREAS.includes(merged.area) || merged.area === CUSTOM_AREA ? merged.area : DEFAULT_AREA;
    merged.customArea = clean(merged.customArea);
    merged.theme = merged.theme === "dark" ? "dark" : "light";
    merged.fontSize = clamp(Number(merged.fontSize) || 13, 11, 17);
    merged.suggestions = merged.suggestions !== false;
    merged.favorites = Array.isArray(merged.favorites) ? [...new Set(merged.favorites.map(clean).filter(Boolean))] : [];
    merged.usage = normalizeUsage(merged.usage);
    return merged;
  }

  function normalizeUsage(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) return {};
    return Object.fromEntries(Object.entries(input).map(([id, count]) => [
      clean(id),
      Math.max(0, Math.floor(Number(count) || 0))
    ]).filter(([id]) => id));
  }

  function migrateData() {
    const phrase = findTopic("jira-spd-21")?.phrases.find(item => item.id === "jira-spd-21-com-saldo-1");
    if (!phrase || !/\(ex\.:\s*BBC\)/i.test(phrase.text)) return;
    phrase.text = phrase.text.replace(/\(ex\.:\s*BBC\)/i, "{{EMISSOR|Nome do emissor}}");
    saveData();
  }

  function root() {
    return document.getElementById(PANEL_ID);
  }

  function body() {
    return qs(".fj-body", root());
  }

  function createPanel() {
    const panel = document.createElement("section");
    panel.id = PANEL_ID;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Frases prontas JIRA Prevenção");
    panel.innerHTML = `
      <div class="fj-shell">
        <header class="fj-head">
          <div class="fj-head-main">
            <div class="fj-brand">
              <strong>Frases V4</strong>
              <span>JIRA Prevenção</span>
            </div>
            <div class="fj-window">
              ${iconButton("minimize", "Minimizar", "minus")}
              ${iconButton("restore", "Voltar ao tamanho inicial", "maximize")}
              ${iconButton("close", "Fechar", "x")}
            </div>
          </div>
          <div class="fj-toolbar">
            ${toolButton("settings", "Config.", "settings")}
            ${toolButton("search", "Buscar", "search")}
            ${toolButton("favorites", "Favoritos", "star")}
            ${toolButton("add-topic", "Tópico", "plus")}
          </div>
        </header>
        <div class="fj-body"></div>
        <div class="fj-toast" aria-live="polite"></div>
      </div>`;
    return panel;
  }

  function renderHome() {
    state.view = "home";
    state.topicId = "";
    const currentTopics = orderedTopics(state.tab);
    body().innerHTML = `
      ${signatureCard()}
      ${tabBar()}
      ${config.suggestions ? suggestionBox() : ""}
      <div class="fj-topic-list">
        ${currentTopics.length ? currentTopics.map((topic, index) => topicCard(topic, index + 1)).join("") : empty("Nenhum tópico nesta aba.")}
      </div>`;
    scrollTop();
  }

  function signatureCard() {
    return `
      <section class="fj-sign-card">
        <div>
          <strong>${esc(signature())}</strong>
          <span>Atalho A copia a assinatura e fecha a janela</span>
        </div>
        ${iconButton("copy-signature", "Copiar assinatura", "copy")}
      </section>`;
  }

  function tabBar() {
    return `<nav class="fj-tabs" aria-label="Abas">${tabs().map(tab => `
      <button type="button" class="fj-tab ${state.tab === tab.id ? "is-active" : ""}" data-tab="${attr(tab.id)}">
        <span>${esc(tab.label)}</span>
      </button>`).join("")}</nav>`;
  }

  function suggestionBox() {
    const suggestion = bestSuggestion();
    if (!suggestion) {
      return `
        <section class="fj-suggestion">
          <div>
            <strong>Sugestão automática ativa</strong>
            <span>Digite na busca ou abra um chamado com termos como SPD, Falcon, permissiva ou subtask.</span>
          </div>
        </section>`;
    }
    return `
      <section class="fj-suggestion" style="--topic-color:${attr(suggestion.topic.color)}">
        <div>
          <small>Sugestão automática</small>
          <strong>${esc(suggestion.topic.title)} · ${esc(suggestion.phrase.title)}</strong>
          <span>${esc(reasonText(suggestion.scoreTerms))}</span>
        </div>
        <button type="button" data-action="open-suggestion" data-topic-id="${attr(suggestion.topic.id)}">${icon("arrowRight")}<span>Abrir</span></button>
      </section>`;
  }

  function reasonText(terms) {
    return terms.length ? `Encontrado por: ${terms.slice(0, 4).join(", ")}` : "Sugestão por contexto da página.";
  }

  function bestSuggestion() {
    const context = normalize(pageContextText() + " " + state.query);
    const relevant = ["spd", "falcon", "permissiva", "subtask", "desbloque", "prioridade", "cartao", "cash", "fila", "documento", "saldo", "dockone", "banking"];
    const contextTerms = relevant.filter(term => context.includes(term));
    if (!contextTerms.length) return null;
    let best = null;
    allTopics().forEach(topic => {
      topic.phrases.forEach(phrase => {
        const haystack = normalize(`${topic.title} ${phrase.title} ${phrase.tags.join(" ")} ${phrase.text}`);
        const scoreTerms = contextTerms.filter(term => haystack.includes(term));
        const score = scoreTerms.length * 10 + (topic.tab === state.tab ? 2 : 0);
        if (score > 0 && (!best || score > best.score)) best = { topic, phrase, score, scoreTerms };
      });
    });
    return best;
  }

  function pageContextText() {
    const clone = document.body.cloneNode(true);
    clone.querySelector(`#${PANEL_ID}`)?.remove();
    return clean(clone.innerText || "");
  }

  function topicCard(topic, number) {
    const count = topic.phrases.length;
    return `
      <article class="fj-topic-row" draggable="true" data-topic-row="${attr(topic.id)}">
        <button type="button" class="fj-topic" data-topic="${attr(topic.id)}" style="--topic-color:${attr(topic.color)}">
          <span class="fj-number">${number}</span>
          <span class="fj-topic-text">
            <strong>${esc(topic.title)}</strong>
            <small>${count} item${count === 1 ? "" : "s"}</small>
          </span>
        </button>
        <div class="fj-row-actions">
          ${iconButton("edit-topic", "Editar tópico", "edit", `data-topic-id="${attr(topic.id)}"`)}
          ${iconButton("delete-topic", "Excluir tópico", "trash", `data-topic-id="${attr(topic.id)}"`)}
        </div>
      </article>`;
  }

  function renderTopic(topicId) {
    const topic = findTopic(topicId);
    if (!topic) return renderHome();
    state.view = "topic";
    state.topicId = topic.id;
    const phrases = orderedPhrases(topic);
    body().innerHTML = `
      <div class="fj-view-head">
        ${iconButton("back", "Voltar", "arrowLeft")}
        <div class="fj-view-title">
          <strong>${esc(topic.title)}</strong>
          <span>${phrases.length} item${phrases.length === 1 ? "" : "s"} · arraste para reordenar</span>
        </div>
        ${iconButton("add-phrase", "Adicionar frase", "plus", `data-topic-id="${attr(topic.id)}"`)}
      </div>
      <div class="fj-phrase-list">
        ${phrases.length ? phrases.map(phrase => phraseCard(topic, phrase)).join("") : empty("Nenhuma frase neste tópico.")}
      </div>`;
    scrollTop();
  }

  function phraseCard(topic, phrase) {
    const fields = extractFields(copyTemplate(topic, phrase));
    const favorite = config.favorites.includes(phrase.id);
    const readOnly = phrase.readOnly;
    return `
      <article class="fj-phrase ${readOnly ? "is-read-only" : ""}" draggable="true" data-phrase-row="${attr(phrase.id)}" data-topic-id="${attr(topic.id)}">
        <button type="button" class="fj-phrase-main" data-phrase="${attr(phrase.id)}" data-topic-id="${attr(topic.id)}">
          <strong>${esc(phrase.title)}</strong>
          <pre>${esc(previewText(topic, phrase))}</pre>
          <span class="fj-chip-row">
            ${readOnly ? chip("Leitura") : fields.length ? chip(`${fields.length} complemento${fields.length === 1 ? "" : "s"}`) : chip("Clique para copiar")}
            ${hasUnresolvedRaw(phrase.text) ? chip("Revisar") : ""}
            <span class="fj-usage" data-usage-id="${attr(phrase.id)}">${esc(usageLabel(phrase.id))}</span>
          </span>
        </button>
        <div class="fj-phrase-actions">
          ${iconButton("toggle-favorite", favorite ? "Remover favorito" : "Adicionar favorito", favorite ? "starFilled" : "star", `data-phrase-id="${attr(phrase.id)}"`)}
          ${iconButton("edit-phrase", "Editar frase", "edit", `data-topic-id="${attr(topic.id)}" data-phrase-id="${attr(phrase.id)}"`)}
          ${iconButton("delete-phrase", "Excluir frase", "trash", `data-topic-id="${attr(topic.id)}" data-phrase-id="${attr(phrase.id)}"`)}
        </div>
      </article>`;
  }

  function previewText(topic, phrase) {
    return clean(copyTemplate(topic, phrase).replace(/\{\{([^{}|]+)(?:\|([^{}]+))?\}\}/g, (_, key, label) => {
      if (key === "NOME") return config.name;
      if (key === "ASSINATURA") return signature();
      if (key === "SAUDACAO") return greeting();
      return `[${label || key}]`;
    })).slice(0, 360);
  }

  function renderSearch() {
    state.view = "search";
    const results = searchResults();
    body().innerHTML = `
      <div class="fj-view-head">
        ${iconButton("back", "Voltar", "arrowLeft")}
        <div class="fj-view-title">
          <strong>Buscar frases</strong>
          <span>Procure por palavra, regra, SPD ou emissor</span>
        </div>
        <span class="fj-space"></span>
      </div>
      <div class="fj-search-box">${icon("search")}<input data-search-input value="${attr(state.query)}" placeholder="Buscar..." autocomplete="off"></div>
      <div class="fj-filter-row">
        <select data-search-tab>${option("all", "Todas as abas", state.searchTab)}${tabs().map(tab => option(tab.id, tab.label, state.searchTab)).join("")}</select>
        <select data-search-topic>${searchTopicOptions()}</select>
      </div>
      ${config.suggestions ? suggestionBox() : ""}
      <div class="fj-search-results">${state.query ? (results.length ? results.map(({ topic, phrase }) => phraseCard(topic, phrase)).join("") : empty("Nenhum resultado encontrado.")) : empty("Digite para buscar.")}</div>`;
    qs("[data-search-input]", body())?.focus();
  }

  function searchTopicOptions() {
    const source = allTopics().filter(topic => state.searchTab === "all" || topic.tab === state.searchTab);
    return option("all", "Todos os tópicos", state.searchTopic) + source.map(topic => option(topic.id, topic.title, state.searchTopic)).join("");
  }

  function searchResults() {
    const terms = normalize(state.query).split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    const results = [];
    allTopics().forEach(topic => {
      if (state.searchTab !== "all" && topic.tab !== state.searchTab) return;
      if (state.searchTopic !== "all" && topic.id !== state.searchTopic) return;
      topic.phrases.forEach(phrase => {
        const haystack = normalize(`${topic.title} ${phrase.title} ${phrase.tags.join(" ")} ${phrase.text}`);
        if (terms.every(term => fuzzy(haystack, term))) results.push({ topic, phrase });
      });
    });
    return results;
  }

  function renderFavorites() {
    state.view = "favorites";
    const groups = [];
    allTopics().forEach(topic => {
      const phrases = topic.phrases.filter(phrase => config.favorites.includes(phrase.id));
      if (phrases.length) groups.push({ topic, phrases });
    });
    body().innerHTML = `
      <div class="fj-view-head">
        ${iconButton("back", "Voltar", "arrowLeft")}
        <div class="fj-view-title">
          <strong>Favoritos</strong>
          <span>${groups.length ? "Organizados por tópico" : "Nenhum favorito ainda"}</span>
        </div>
        <span class="fj-space"></span>
      </div>
      <div class="fj-fav-list">${groups.length ? groups.map(group => favoriteGroup(group.topic, group.phrases)).join("") : empty("Use a estrela ao lado da frase para favoritá-la.")}</div>`;
    scrollTop();
  }

  function favoriteGroup(topic, phrases) {
    return `
      <section class="fj-fav-group" style="--topic-color:${attr(topic.color)}">
        <header><span></span><strong>${esc(topic.title)}</strong><small>${phrases.length}</small></header>
        <div class="fj-phrase-list">${phrases.map(phrase => phraseCard(topic, phrase)).join("")}</div>
      </section>`;
  }

  function renderSettings() {
    state.view = "settings";
    body().innerHTML = `
      <div class="fj-view-head">
        ${iconButton("back", "Voltar", "arrowLeft")}
        <div class="fj-view-title">
          <strong>Configurações</strong>
          <span>Assinatura, tema, dados e sugestão</span>
        </div>
        <span class="fj-space"></span>
      </div>
      <form class="fj-form" data-form="settings">
        <section class="fj-card">
          <div class="fj-setting-line">
            <div><strong>Tema</strong><span>${config.theme === "light" ? "Claro ativo" : "Escuro ativo"}</span></div>
            ${iconButton("toggle-theme", config.theme === "light" ? "Ativar tema escuro" : "Ativar tema claro", config.theme === "light" ? "moon" : "sun")}
          </div>
        </section>
        <section class="fj-card">
          <div class="fj-setting-line">
            <div><strong>Tamanho da fonte</strong><span>Menor à esquerda, maior à direita</span></div>
            <b class="fj-font-value">${config.fontSize}px</b>
          </div>
          <div class="fj-font-row">
            ${iconButton("font-down", "Diminuir fonte", "minus")}
            <div class="fj-font-meter"><span style="width:${fontLevel()}%"></span></div>
            ${iconButton("font-up", "Aumentar fonte", "plus")}
          </div>
        </section>
        <section class="fj-card">
          <strong>Assinatura</strong>
          <label>Nome<input name="name" value="${attr(config.name)}" autocomplete="off"></label>
          <label>Complemento
            <select name="area">
              ${AREAS.map(area => option(area, area, config.area)).join("")}
              ${option(CUSTOM_AREA, "Personalizado", config.area)}
            </select>
          </label>
          <label>Complemento personalizado<input name="customArea" value="${attr(config.customArea)}" placeholder="Ex.: Operações Prevenção" autocomplete="off"></label>
          <pre class="fj-sign-preview">${esc(signature())}</pre>
          <button type="submit" class="fj-primary">${icon("save")}<span>Salvar assinatura</span></button>
        </section>
        <section class="fj-card">
          <div class="fj-setting-line">
            <div><strong>Sugestão automática</strong><span>${config.suggestions ? "Ativa" : "Desativada"}</span></div>
            <label class="fj-switch"><input type="checkbox" name="suggestions" ${config.suggestions ? "checked" : ""}><span></span></label>
          </div>
        </section>
        <section class="fj-card">
          <strong>Dados</strong>
          <div class="fj-data-grid">
            ${button("export-data", "Exportar JSON", "download", "fj-secondary")}
            ${button("choose-import", "Importar JSON", "upload", "fj-secondary")}
            ${button("restore-defaults", "Restaurar base", "rotate", "fj-danger")}
          </div>
          <input type="file" data-import-file accept="application/json,.json">
        </section>
      </form>`;
    updateSignaturePreview();
  }

  function renderTopicForm(topicId = "") {
    const topic = topicId ? findTopic(topicId) : null;
    state.view = topic ? "editTopic" : "addTopic";
    body().innerHTML = `
      <div class="fj-view-head">
        ${iconButton("back", "Voltar", "arrowLeft")}
        <div class="fj-view-title">
          <strong>${topic ? "Editar tópico" : "Novo tópico"}</strong>
          <span>Organização da aba</span>
        </div>
        <span class="fj-space"></span>
      </div>
      <form class="fj-form" data-form="${topic ? "topic-edit" : "topic-add"}" data-topic-id="${attr(topic?.id || "")}">
        <section class="fj-card">
          <label>Título<input name="title" required value="${attr(topic?.title || "")}" autocomplete="off"></label>
          <label>Aba<select name="tab">${tabs().map(tab => option(tab.id, tab.label, topic?.tab || state.tab)).join("")}</select></label>
          <label>Cor<input name="color" type="color" value="${attr(topic?.color || nextColor(topic?.tab || state.tab))}"></label>
          <button type="submit" class="fj-primary">${icon("save")}<span>Salvar tópico</span></button>
        </section>
      </form>`;
    qs("input[name='title']", body())?.focus();
  }

  function renderPhraseForm(topicId, phraseId = "") {
    const topic = findTopic(topicId);
    if (!topic) return renderHome();
    const phrase = phraseId ? topic.phrases.find(item => item.id === phraseId) : null;
    state.view = phrase ? "editPhrase" : "addPhrase";
    state.topicId = topic.id;
    const suggestion = phrase ? suggestTopicForText(phrase.text, topic.id) : null;
    body().innerHTML = `
      <div class="fj-view-head">
        ${iconButton("back-topic", "Voltar", "arrowLeft", `data-topic-id="${attr(topic.id)}"`)}
        <div class="fj-view-title">
          <strong>${phrase ? "Editar frase" : "Nova frase"}</strong>
          <span>${esc(topic.title)}</span>
        </div>
        <span class="fj-space"></span>
      </div>
      <form class="fj-form" data-form="${phrase ? "phrase-edit" : "phrase-add"}" data-topic-id="${attr(topic.id)}" data-phrase-id="${attr(phrase?.id || "")}">
        ${suggestion ? `<section class="fj-suggestion is-compact"><div><small>Sugestão de tópico</small><strong>${esc(suggestion.title)}</strong><span>O texto parece combinar melhor com este tópico.</span></div><button type="button" data-action="apply-topic-suggestion" data-topic-id="${attr(suggestion.id)}">Aplicar</button></section>` : ""}
        <section class="fj-card">
          <label>Tópico<select name="topicId">${allTopics().map(item => option(item.id, `${tabLabel(item.tab)} · ${item.title}`, topic.id)).join("")}</select></label>
          <label>Título<input name="title" required value="${attr(phrase?.title || "")}" autocomplete="off"></label>
          <label>Texto<textarea name="text" required rows="10" placeholder="Use variáveis como {{CONTA_ID|ID da conta}}">${esc(phrase?.text || "")}</textarea></label>
          <label class="fj-check"><input type="checkbox" name="noGreeting" ${phrase?.noGreeting || topic.tab === "tabulacao" ? "checked" : ""}><span>Não adicionar Prezados/saudação</span></label>
          <label class="fj-check"><input type="checkbox" name="noSignature" ${phrase?.noSignature ? "checked" : ""}><span>Não adicionar assinatura</span></label>
          <div class="fj-edit-preview"><strong>Prévia</strong><pre data-live-preview>${esc(phrase ? previewText(topic, phrase) : "")}</pre></div>
          <button type="submit" class="fj-primary">${icon("save")}<span>Salvar frase</span></button>
        </section>
      </form>`;
    updateLivePreview();
    qs("input[name='title']", body())?.focus();
  }

  function renderVariableModal(topic, phrase) {
    const template = copyTemplate(topic, phrase);
    const fields = extractFields(template);
    if (!fields.length) return copyPhrase(topic, phrase, {});
    const modal = document.createElement("div");
    modal.className = "fj-modal";
    modal.innerHTML = `
      <form class="fj-modal-card" data-form="variables" data-topic-id="${attr(topic.id)}" data-phrase-id="${attr(phrase.id)}">
        <header>
          <div><strong>${esc(phrase.title)}</strong><span>Preencha todos os complementos antes de copiar</span></div>
          ${iconButton("close-modal", "Fechar", "x")}
        </header>
        <div class="fj-variable-grid">
          ${fields.map(field => `<label>${esc(field.label)}<input name="${attr(field.key)}" data-var-key="${attr(field.key)}" required autocomplete="off"></label>`).join("")}
        </div>
        <section class="fj-edit-preview"><strong>Prévia</strong><pre data-variable-preview>${esc(renderTemplate(template, {}))}</pre></section>
        <footer>
          <button type="button" class="fj-secondary" data-action="close-modal">${icon("x")}<span>Cancelar</span></button>
          <button type="submit" class="fj-primary">${icon("copy")}<span>Copiar</span></button>
        </footer>
      </form>`;
    root().appendChild(modal);
    qs("input", modal)?.focus();
    updateVariablePreview(modal, template);
  }

  function renderFirstRunModal() {
    const modal = document.createElement("div");
    modal.className = "fj-modal";
    modal.innerHTML = `
      <form class="fj-modal-card" data-form="first-run">
        <header>
          <div><strong>Configurar assinatura</strong><span>Informe o nome que será usado nas frases prontas.</span></div>
        </header>
        <label>Nome<input name="name" required placeholder="Digite seu nome" autocomplete="name"></label>
        <section class="fj-edit-preview"><strong>Prévia</strong><pre data-first-run-preview>${esc(DEFAULT_NAME)} | ${esc(signatureArea())}</pre></section>
        <footer>
          <span></span>
          <button type="submit" class="fj-primary">${icon("save")}<span>Salvar assinatura</span></button>
        </footer>
      </form>`;
    root().appendChild(modal);
    qs("input[name='name']", modal)?.focus();
    updateFirstRunPreview(modal);
  }

  function copyPhrase(topic, phrase, values = {}) {
    if (phrase.readOnly) {
      toast("Este item é apenas para leitura.");
      return false;
    }
    const output = renderTemplate(copyTemplate(topic, phrase), values);
    const invalid = unresolved(output);
    if (invalid.length) {
      toast(`Complete antes de copiar: ${invalid.slice(0, 2).join(", ")}`);
      return false;
    }
    if (!canUseClipboard()) {
      return fallbackCopy(output, phrase.id);
    }
    writeClipboard(output).then(() => completePhraseCopy(phrase.id), () => fallbackCopy(output, phrase.id));
    return true;
  }

  function canUseClipboard() {
    return !!navigator.clipboard?.writeText;
  }

  function writeClipboard(text) {
    if (!canUseClipboard()) return Promise.reject(new Error("Clipboard indisponível."));
    return navigator.clipboard.writeText(text);
  }

  function completePhraseCopy(phraseId) {
    const count = recordUsage(phraseId);
    toast(`Copiado. ${count} uso${count === 1 ? "" : "s"}.`);
  }

  function fallbackCopy(text, phraseId = "") {
    const box = document.createElement("textarea");
    box.value = text;
    box.style.position = "fixed";
    box.style.left = "-9999px";
    document.body.appendChild(box);
    box.focus();
    box.select();
    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch {
      copied = false;
    }
    if (copied) {
      if (phraseId) completePhraseCopy(phraseId);
      else toast("Copiado.");
    } else {
      showManualCopy(text);
    }
    box.remove();
    return copied;
  }

  function showManualCopy(text) {
    closeModal();
    const modal = document.createElement("div");
    modal.className = "fj-modal";
    modal.innerHTML = `
      <section class="fj-modal-card">
        <header>
          <div><strong>Cópia manual</strong><span>O navegador bloqueou a cópia automática. Selecione o texto abaixo.</span></div>
          ${iconButton("close-modal", "Fechar", "x")}
        </header>
        <textarea class="fj-manual-copy" readonly>${esc(text)}</textarea>
        <footer>
          <span></span>
          <button type="button" class="fj-primary" data-action="close-modal">${icon("x")}<span>Fechar</span></button>
        </footer>
      </section>`;
    root().appendChild(modal);
    const area = qs(".fj-manual-copy", modal);
    area?.focus();
    area?.select();
    toast("Cópia automática bloqueada.");
  }

  function copyTemplate(topic, phrase) {
    let text = clean(phrase.text);
    if (phrase.readOnly) return hydrateBuiltIns(text);
    if (topic.tab === "tabulacao") {
      text = stripGreetingAndSignature(text);
      if (!phrase.noSignature) text = `${text}\n\n{{ASSINATURA}}`;
      return hydrateBuiltIns(clean(text));
    }
    const parts = [];
    if (!phrase.noGreeting) parts.push(`Prezados, {{SAUDACAO}}.`);
    parts.push(sentenceStart(stripGreetingAndSignature(text)));
    if (!phrase.noSignature) parts.push(`Atenciosamente,\n{{ASSINATURA}}`);
    return hydrateBuiltIns(clean(parts.filter(Boolean).join("\n\n")));
  }

  function hydrateBuiltIns(text) {
    return clean(text).replace(/\{\{([^{}|]+)(?:\|([^{}]+))?\}\}/g, (token, key) => {
      const normalized = key.toUpperCase();
      if (normalized === "NOME") return config.name;
      if (normalized === "ASSINATURA") return signature();
      if (normalized === "SAUDACAO") return greeting();
      return token;
    });
  }

  function renderTemplate(template, values) {
    return clean(template).replace(/\{\{([^{}|]+)(?:\|([^{}]+))?\}\}/g, (token, key, label) => {
      const normalized = key.toUpperCase();
      if (BUILT_INS.has(normalized)) return hydrateBuiltIns(token);
      return clean(values[normalized] ?? "") || `[${label || normalized}]`;
    });
  }

  function extractFields(text) {
    const fields = new Map();
    clean(text).replace(/\{\{([^{}|]+)(?:\|([^{}]+))?\}\}/g, (_, key, label) => {
      const normalized = key.toUpperCase();
      if (!BUILT_INS.has(normalized)) fields.set(normalized, { key: normalized, label: clean(label || normalized.replace(/_/g, " ")) });
      return "";
    });
    return Array.from(fields.values());
  }

  function unresolved(output) {
    const missing = [];
    output.replace(/\[([^\]]+)\]/g, (_, label) => {
      if (!/^\d+$/.test(label)) missing.push(label);
      return "";
    });
    output.replace(/\{\{([^{}|]+)(?:\|([^{}]+))?\}\}/g, (_, key, label) => {
      missing.push(label || key);
      return "";
    });
    if (/\bX{2,}\b/i.test(output)) missing.push("campos com XXX");
    return [...new Set(missing)];
  }

  function hasUnresolvedRaw(text) {
    return /\bX{2,}\b|\[[^\]]+\]/.test(clean(text));
  }

  function stripGreetingAndSignature(text) {
    return clean(text)
      .replace(/^Prezados,?\s*(?:bom dia|boa tarde|boa noite)?[!.,;:\s-]*/i, "")
      .replace(/^(?:Bom dia|Boa tarde|Boa noite),?\s*/i, "")
      .replace(/^Prezados,?\s*/i, "")
      .replace(/\n?\s*Atenciosamente,?\s*\n\s*.*Prevenção\s*$/i, "")
      .replace(/\n?\s*Analista:\s*.*$/i, "")
      .trim();
  }

  function sentenceStart(text) {
    const body = clean(text);
    return body.replace(/^([a-záàâãéêíóôõúç])/, char => char.toUpperCase());
  }

  function saveTopic(form) {
    const topicId = form.dataset.topicId;
    const title = clean(form.elements.title.value).toUpperCase();
    const tab = clean(form.elements.tab.value);
    const color = clean(form.elements.color.value) || nextColor(tab);
    if (!title) return toast("Informe o título do tópico.");
    if (topicId) {
      const topic = findTopic(topicId);
      if (!topic) return;
      const oldTab = topic.tab;
      topic.title = title;
      topic.tab = tab;
      topic.color = color;
      if (oldTab !== tab) topic.order = orderedTopics(tab).length + 1;
    } else {
      data.topics.push({ id: uid("topic"), title, tab, color, order: orderedTopics(tab).length + 1, phrases: [] });
    }
    normalizeTopicOrder(tab);
    saveData();
    state.tab = tab;
    renderHome();
    toast("Tópico salvo.");
  }

  function savePhrase(form) {
    const sourceTopic = findTopic(form.dataset.topicId);
    const phraseId = form.dataset.phraseId;
    const targetTopic = findTopic(form.elements.topicId.value);
    const title = clean(form.elements.title.value);
    const text = clean(form.elements.text.value);
    if (!sourceTopic || !targetTopic || !title || !text) return toast("Preencha título e texto.");
    let phrase = phraseId ? sourceTopic.phrases.find(item => item.id === phraseId) : null;
    if (phrase) sourceTopic.phrases = sourceTopic.phrases.filter(item => item.id !== phraseId);
    phrase = {
      id: phrase?.id || uid("phrase"),
      title,
      text,
      tags: phrase?.tags || [],
      noGreeting: !!form.elements.noGreeting.checked,
      noSignature: !!form.elements.noSignature.checked,
      readOnly: false
    };
    targetTopic.phrases.push(phrase);
    normalizePhraseOrder(sourceTopic);
    normalizePhraseOrder(targetTopic);
    saveData();
    renderTopic(targetTopic.id);
    toast("Frase salva.");
  }

  function deleteTopic(topicId) {
    const topic = findTopic(topicId);
    if (!topic) return;
    if (!window.confirm(`Excluir o tópico "${topic.title}" e todas as frases dentro dele?`)) return;
    const removedIds = new Set(topic.phrases.map(phrase => phrase.id));
    data.topics = data.topics.filter(item => item.id !== topicId);
    config.favorites = config.favorites.filter(id => !removedIds.has(id));
    removedIds.forEach(id => delete config.usage[id]);
    normalizeTopicOrder(topic.tab);
    saveData();
    saveConfig();
    renderHome();
    toast("Tópico excluído.");
  }

  function deletePhrase(topicId, phraseId) {
    const topic = findTopic(topicId);
    const phrase = topic?.phrases.find(item => item.id === phraseId);
    if (!topic || !phrase) return;
    if (!window.confirm(`Excluir a frase "${phrase.title}"?`)) return;
    topic.phrases = topic.phrases.filter(item => item.id !== phraseId);
    config.favorites = config.favorites.filter(id => id !== phraseId);
    delete config.usage[phraseId];
    normalizePhraseOrder(topic);
    saveData();
    saveConfig();
    renderTopic(topic.id);
    toast("Frase excluída.");
  }

  function reorderTopics(dragId, targetId) {
    if (!dragId || !targetId || dragId === targetId) return;
    const drag = findTopic(dragId);
    const target = findTopic(targetId);
    if (!drag || !target || drag.tab !== target.tab) return;
    const list = orderedTopics(drag.tab);
    const from = list.findIndex(item => item.id === dragId);
    const to = list.findIndex(item => item.id === targetId);
    if (from < 0 || to < 0) return;
    list.splice(to, 0, list.splice(from, 1)[0]);
    list.forEach((topic, index) => { topic.order = index + 1; });
    saveData();
    renderHome();
  }

  function reorderPhrases(topicId, dragId, targetId) {
    if (!dragId || !targetId || dragId === targetId) return;
    const topic = findTopic(topicId);
    if (!topic) return;
    const list = orderedPhrases(topic);
    const from = list.findIndex(item => item.id === dragId);
    const to = list.findIndex(item => item.id === targetId);
    if (from < 0 || to < 0) return;
    list.splice(to, 0, list.splice(from, 1)[0]);
    topic.phrases = list;
    normalizePhraseOrder(topic);
    saveData();
    renderTopic(topic.id);
  }

  function exportData() {
    const payload = {
      schema: "jira-frases-v4",
      exportedAt: new Date().toISOString(),
      settings: config,
      data
    };
    const blob = new Blob([JSON.stringify(payload, null, 2) + "\n"], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `frases-jira-v4-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast("JSON exportado.");
  }

  function importData(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(String(reader.result || ""));
        const importedData = payload.data?.topics ? payload.data : payload.topics ? payload : null;
        if (!importedData) throw new Error("Arquivo sem tópicos.");
        data = normalizeData(importedData);
        if (payload.settings) config = normalizeConfig({ ...config, ...payload.settings });
        saveData();
        saveConfig();
        applyPreferences();
        renderHome();
        toast("JSON importado.");
      } catch (error) {
        toast(`Importação inválida: ${error.message}`);
      }
    };
    reader.readAsText(file, "utf-8");
  }

  async function restoreDefaults() {
    if (!window.confirm("Restaurar a base original da V4? As edições locais serão removidas.")) return;
    data = normalizeData(BASE_DATA);
    saveData();
    renderHome();
    toast("Base restaurada.");
  }

  function bindEvents() {
    document.addEventListener("keydown", onKey);
    root().addEventListener("click", onClick);
    root().addEventListener("input", onInput);
    root().addEventListener("change", onChange);
    root().addEventListener("submit", onSubmit);
    root().addEventListener("dragstart", onDragStart);
    root().addEventListener("dragover", onDragOver);
    root().addEventListener("dragleave", onDragLeave);
    root().addEventListener("drop", onDrop);
    root().addEventListener("dragend", onDragEnd);
    setupSync();
    window.__jiraFrasesV4Cleanup = () => {
      document.removeEventListener("keydown", onKey);
      teardownSync();
      removePanel();
      document.getElementById(STYLE_ID)?.remove();
      delete window.__jiraFrasesV4Cleanup;
    };
  }

  function onClick(event) {
    const actionButton = event.target.closest("[data-action]");
    const tabButton = event.target.closest("[data-tab]");
    const topicButton = event.target.closest("[data-topic]");
    const phraseButton = event.target.closest("[data-phrase]");

    if (actionButton) {
      const action = actionButton.dataset.action;
      if (action === "minimize") root().classList.add("is-minimized");
      if (action === "restore") root().classList.remove("is-minimized");
      if (action === "close") removePanel();
      if (action === "back") renderHome();
      if (action === "back-topic") renderTopic(actionButton.dataset.topicId || state.topicId);
      if (action === "settings") renderSettings();
      if (action === "search") renderSearch();
      if (action === "favorites") renderFavorites();
      if (action === "add-topic") renderTopicForm();
      if (action === "edit-topic") renderTopicForm(actionButton.dataset.topicId);
      if (action === "delete-topic") deleteTopic(actionButton.dataset.topicId);
      if (action === "add-phrase") renderPhraseForm(actionButton.dataset.topicId);
      if (action === "edit-phrase") renderPhraseForm(actionButton.dataset.topicId, actionButton.dataset.phraseId);
      if (action === "delete-phrase") deletePhrase(actionButton.dataset.topicId, actionButton.dataset.phraseId);
      if (action === "toggle-favorite") toggleFavorite(actionButton.dataset.phraseId);
      if (action === "copy-signature") copySignature(false);
      if (action === "toggle-theme") toggleTheme();
      if (action === "font-down") changeFont(-1);
      if (action === "font-up") changeFont(1);
      if (action === "export-data") exportData();
      if (action === "choose-import") qs("[data-import-file]", root())?.click();
      if (action === "restore-defaults") restoreDefaults();
      if (action === "open-suggestion") renderTopic(actionButton.dataset.topicId);
      if (action === "apply-topic-suggestion") {
        const select = qs("select[name='topicId']", body());
        if (select) {
          select.value = actionButton.dataset.topicId;
          updateLivePreview();
          toast("Tópico sugerido aplicado.");
        }
      }
      if (action === "close-modal") closeModal();
      return;
    }

    if (tabButton) {
      state.tab = tabButton.dataset.tab;
      renderHome();
      return;
    }

    if (topicButton) {
      renderTopic(topicButton.dataset.topic);
      return;
    }

    if (phraseButton) {
      const topic = findTopic(phraseButton.dataset.topicId);
      const phrase = topic?.phrases.find(item => item.id === phraseButton.dataset.phrase);
      if (!topic || !phrase) return;
      renderVariableModal(topic, phrase);
    }
  }

  function onInput(event) {
    if (event.target.matches("[data-search-input]")) {
      state.query = event.target.value;
      const wrap = qs(".fj-search-results", body());
      if (wrap) wrap.innerHTML = searchResults().map(({ topic, phrase }) => phraseCard(topic, phrase)).join("") || empty("Nenhum resultado encontrado.");
      const suggestion = qs(".fj-suggestion", body());
      if (suggestion && config.suggestions) suggestion.outerHTML = suggestionBox();
    }
    if (event.target.closest("[data-form='settings']")) updateSignaturePreview();
    if (event.target.closest("[data-form='first-run']")) updateFirstRunPreview(event.target.closest(".fj-modal"));
    if (event.target.closest("[data-form='phrase-edit'],[data-form='phrase-add']")) updateLivePreview();
    if (event.target.closest("[data-form='variables']")) {
      const modal = event.target.closest(".fj-modal");
      const topic = findTopic(qs("[data-form='variables']", modal).dataset.topicId);
      const phrase = topic?.phrases.find(item => item.id === qs("[data-form='variables']", modal).dataset.phraseId);
      if (topic && phrase) updateVariablePreview(modal, copyTemplate(topic, phrase));
    }
  }

  function onChange(event) {
    if (event.target.matches("[data-search-tab]")) {
      state.searchTab = event.target.value;
      state.searchTopic = "all";
      renderSearch();
    }
    if (event.target.matches("[data-search-topic]")) {
      state.searchTopic = event.target.value;
      renderSearch();
    }
    if (event.target.matches("[data-import-file]") && event.target.files?.[0]) importData(event.target.files[0]);
    if (event.target.closest("[data-form='settings']")) updateSignaturePreview();
    if (event.target.matches("[name='suggestions']")) {
      config.suggestions = !!event.target.checked;
      saveConfig();
      renderSettings();
      toast(config.suggestions ? "Sugestão automática ativada." : "Sugestão automática desativada.");
    }
  }

  function onSubmit(event) {
    event.preventDefault();
    const form = event.target;
    if (form.dataset.form === "settings") {
      config.name = clean(form.elements.name.value) || DEFAULT_NAME;
      config.area = form.elements.area.value;
      config.customArea = clean(form.elements.customArea.value);
      config.suggestions = !!form.elements.suggestions.checked;
      saveConfig();
      applyPreferences();
      renderSettings();
      toast("Configurações salvas.");
    }
    if (form.dataset.form === "first-run") {
      config.name = clean(form.elements.name.value) || DEFAULT_NAME;
      saveConfig();
      firstRun = false;
      closeModal();
      renderHome();
      toast("Assinatura salva.");
    }
    if (form.dataset.form === "topic-add" || form.dataset.form === "topic-edit") saveTopic(form);
    if (form.dataset.form === "phrase-add" || form.dataset.form === "phrase-edit") savePhrase(form);
    if (form.dataset.form === "variables") {
      const topic = findTopic(form.dataset.topicId);
      const phrase = topic?.phrases.find(item => item.id === form.dataset.phraseId);
      const values = Object.fromEntries(qsa("[data-var-key]", form).map(input => [input.dataset.varKey, clean(input.value)]));
      const missing = Object.entries(values).filter(([, value]) => !value).map(([key]) => key);
      if (missing.length) return toast("Preencha todos os complementos.");
      if (topic && phrase) {
        if (copyPhrase(topic, phrase, values)) closeModal();
      }
    }
  }

  function onDragStart(event) {
    const topicRow = event.target.closest("[data-topic-row]");
    const phraseRow = event.target.closest("[data-phrase-row]");
    if (topicRow && state.view === "home") {
      state.dragTopicId = topicRow.dataset.topicRow;
      topicRow.classList.add("is-dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", state.dragTopicId);
    }
    if (phraseRow && state.view === "topic") {
      state.dragPhraseId = phraseRow.dataset.phraseRow;
      phraseRow.classList.add("is-dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", state.dragPhraseId);
    }
  }

  function onDragOver(event) {
    const target = event.target.closest("[data-topic-row],[data-phrase-row]");
    if (!target) return;
    event.preventDefault();
    target.classList.add("is-drop-target");
  }

  function onDragLeave(event) {
    event.target.closest("[data-topic-row],[data-phrase-row]")?.classList.remove("is-drop-target");
  }

  function onDrop(event) {
    const topicTarget = event.target.closest("[data-topic-row]");
    const phraseTarget = event.target.closest("[data-phrase-row]");
    event.preventDefault();
    qsa(".is-drop-target", root()).forEach(item => item.classList.remove("is-drop-target"));
    if (topicTarget && state.dragTopicId) reorderTopics(state.dragTopicId, topicTarget.dataset.topicRow);
    if (phraseTarget && state.dragPhraseId) reorderPhrases(phraseTarget.dataset.topicId, state.dragPhraseId, phraseTarget.dataset.phraseRow);
  }

  function onDragEnd() {
    state.dragTopicId = "";
    state.dragPhraseId = "";
    qsa(".is-dragging,.is-drop-target", root()).forEach(item => item.classList.remove("is-dragging", "is-drop-target"));
  }

  function onKey(event) {
    const target = event.target;
    const isTyping = target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
    if (event.key === "Escape") {
      const modal = qs(".fj-modal", root());
      if (modal?.querySelector("[data-form='first-run']")) {
        toast("Informe o nome para salvar a assinatura.");
        return;
      }
      if (modal) closeModal();
      else removePanel();
      return;
    }
    if (isTyping || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key.toLowerCase() === "m") {
      root()?.classList.toggle("is-minimized");
      event.preventDefault();
    }
    if (event.key.toLowerCase() === "p") {
      root()?.classList.remove("is-minimized");
      event.preventDefault();
    }
    if (event.key.toLowerCase() === "a") {
      copySignature(true);
      event.preventDefault();
    }
  }

  function updateSignaturePreview() {
    const form = qs("[data-form='settings']", body());
    if (!form) return;
    const temp = normalizeConfig({
      ...config,
      name: form.elements.name.value,
      area: form.elements.area.value,
      customArea: form.elements.customArea.value
    });
    const preview = qs(".fj-sign-preview", form);
    if (preview) preview.textContent = `${temp.name} | ${temp.area === CUSTOM_AREA ? temp.customArea || DEFAULT_AREA : temp.area}`;
  }

  function updateFirstRunPreview(modal) {
    const form = qs("[data-form='first-run']", modal || root());
    if (!form) return;
    const name = clean(form.elements.name.value) || DEFAULT_NAME;
    const preview = qs("[data-first-run-preview]", form);
    if (preview) preview.textContent = `${name} | ${signatureArea()}`;
  }

  function updateLivePreview() {
    const form = qs("[data-form='phrase-edit'],[data-form='phrase-add']", body());
    if (!form) return;
    const topic = findTopic(form.elements.topicId.value) || findTopic(form.dataset.topicId);
    const preview = qs("[data-live-preview]", form);
    if (!topic || !preview) return;
    const phrase = {
      id: "preview",
      title: form.elements.title.value,
      text: form.elements.text.value,
      noGreeting: !!form.elements.noGreeting.checked,
      noSignature: !!form.elements.noSignature.checked,
      readOnly: false
    };
    preview.textContent = previewText(topic, phrase);
  }

  function updateVariablePreview(modal, template) {
    const values = Object.fromEntries(qsa("[data-var-key]", modal).map(input => [input.dataset.varKey, clean(input.value)]));
    const preview = qs("[data-variable-preview]", modal);
    if (preview) preview.textContent = renderTemplate(template, values);
  }

  function toggleFavorite(phraseId) {
    const has = config.favorites.includes(phraseId);
    config.favorites = has ? config.favorites.filter(id => id !== phraseId) : [...config.favorites, phraseId];
    saveConfig();
    if (state.view === "favorites") renderFavorites();
    else if (state.view === "topic") renderTopic(state.topicId);
    else if (state.view === "search") renderSearch();
    toast(has ? "Favorito removido." : "Favorito adicionado.");
  }

  function usageCount(phraseId) {
    return Math.max(0, Math.floor(Number(config.usage?.[phraseId]) || 0));
  }

  function usageLabel(phraseId) {
    const count = usageCount(phraseId);
    return `${count} uso${count === 1 ? "" : "s"}`;
  }

  function recordUsage(phraseId) {
    if (!phraseId) return 0;
    config.usage = normalizeUsage(config.usage);
    config.usage[phraseId] = usageCount(phraseId) + 1;
    saveConfig();
    updateUsageBadges(phraseId);
    return config.usage[phraseId];
  }

  function updateUsageBadges(phraseId) {
    qsa("[data-usage-id]", root()).forEach(item => {
      if (item.dataset.usageId === phraseId) item.textContent = usageLabel(phraseId);
    });
  }

  function toggleTheme() {
    config.theme = config.theme === "dark" ? "light" : "dark";
    saveConfig();
    applyPreferences();
    renderSettings();
  }

  function changeFont(delta) {
    config.fontSize = clamp(config.fontSize + delta, 11, 17);
    saveConfig();
    applyPreferences();
    renderSettings();
  }

  function copySignature(closeAfter) {
    const text = signature();
    if (!canUseClipboard()) {
      if (fallbackCopy(text) && closeAfter) setTimeout(removePanel, 180);
      return;
    }
    writeClipboard(text).then(() => {
      toast("Assinatura copiada.");
      if (closeAfter) setTimeout(removePanel, 180);
    }, () => {
      if (fallbackCopy(text) && closeAfter) setTimeout(removePanel, 180);
    });
  }

  function closeModal() {
    qs(".fj-modal", root())?.remove();
  }

  function applyPreferences() {
    const panel = root();
    if (!panel) return;
    panel.dataset.theme = config.theme;
    panel.style.setProperty("--fj-font-size", `${config.fontSize}px`);
  }

  function tabs() {
    return data.tabs?.length ? data.tabs : DEFAULT_TABS;
  }

  function tabLabel(tabId) {
    return tabs().find(tab => tab.id === tabId)?.label || tabId.toUpperCase();
  }

  function allTopics() {
    return data.topics || [];
  }

  function orderedTopics(tab = state.tab) {
    return allTopics().filter(topic => topic.tab === tab).sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
  }

  function orderedPhrases(topic) {
    return [...(topic.phrases || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  function findTopic(topicId) {
    return allTopics().find(topic => topic.id === topicId);
  }

  function normalizeTopicOrder(tab, source = data) {
    (source.topics || []).filter(topic => topic.tab === tab).sort((a, b) => a.order - b.order).forEach((topic, index) => {
      topic.order = index + 1;
    });
  }

  function normalizePhraseOrder(topic) {
    (topic.phrases || []).forEach((phrase, index) => {
      phrase.order = index + 1;
    });
  }

  function nextColor(tab) {
    return COLORS[orderedTopics(tab).length % COLORS.length];
  }

  function suggestTopicForText(text, currentTopicId) {
    const terms = normalize(text).split(/\s+/).filter(item => item.length > 2);
    let best = null;
    allTopics().forEach(topic => {
      if (topic.id === currentTopicId) return;
      const haystack = normalize(`${topic.title} ${topic.phrases.map(phrase => `${phrase.title} ${phrase.tags.join(" ")}`).join(" ")}`);
      const score = terms.filter(term => haystack.includes(term)).length;
      if (score > 1 && (!best || score > best.score)) best = { ...topic, score };
    });
    return best;
  }

  function fontLevel() {
    return ((config.fontSize - 11) / 6) * 100;
  }

  function greeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "bom dia";
    if (hour < 18) return "boa tarde";
    return "boa noite";
  }

  function signatureArea() {
    return config.area === CUSTOM_AREA ? clean(config.customArea) || DEFAULT_AREA : config.area;
  }

  function signature() {
    return `${config.name} | ${signatureArea()}`;
  }

  function saveData() {
    write("data", data);
  }

  function saveConfig() {
    const stored = read("config", null);
    if (stored) config.usage = mergeUsage(stored.usage, config.usage);
    write("config", config);
  }

  function keyOf(key) {
    return `${STORE}:${key}`;
  }

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(keyOf(key));
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function write(key, value) {
    localStorage.setItem(keyOf(key), JSON.stringify(value));
    publishSync(key, value);
  }

  function setupSync() {
    window.addEventListener("storage", onStorageSync);
    try {
      syncChannel = new BroadcastChannel(SYNC_CHANNEL);
      syncChannel.addEventListener("message", onBroadcastSync);
    } catch {
      syncChannel = null;
    }
  }

  function teardownSync() {
    window.removeEventListener("storage", onStorageSync);
    try {
      syncChannel?.close();
    } catch {}
    syncChannel = null;
  }

  function publishSync(key, value) {
    try {
      syncChannel?.postMessage({ source: CLIENT_ID, key, value, at: Date.now() });
    } catch {}
  }

  function onStorageSync(event) {
    if (!event.key || event.storageArea !== localStorage) return;
    if (event.key !== keyOf("data") && event.key !== keyOf("config")) return;
    const key = event.key === keyOf("data") ? "data" : "config";
    try {
      applyRemoteUpdate(key, event.newValue ? JSON.parse(event.newValue) : null);
    } catch {}
  }

  function onBroadcastSync(event) {
    const message = event.data || {};
    if (message.source === CLIENT_ID) return;
    if (message.key !== "data" && message.key !== "config") return;
    applyRemoteUpdate(message.key, message.value);
  }

  function applyRemoteUpdate(key, value) {
    if (!value || !root()) return;
    if (key === "data") data = normalizeData(value);
    if (key === "config") {
      config = normalizeConfig(value);
      firstRun = false;
      if (qs("[data-form='first-run']", root())) closeModal();
    }
    applyPreferences();
    refreshSyncedView();
    toast("Atualização sincronizada.");
  }

  function refreshSyncedView() {
    if (!root()) return;
    if (isEditingActive()) return;
    if (state.view === "home") return renderHome();
    if (state.view === "topic") return renderTopic(state.topicId);
    if (state.view === "search") return renderSearch();
    if (state.view === "favorites") return renderFavorites();
    if (state.view === "settings") return renderSettings();
    if (state.view === "editTopic" || state.view === "addTopic" || state.view === "editPhrase" || state.view === "addPhrase") return;
    renderHome();
  }

  function isEditingActive() {
    const active = document.activeElement;
    if (!active || !root()?.contains(active)) return false;
    return /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName) && !!active.closest(".fj-form,.fj-modal-card");
  }

  function mergeUsage(left, right) {
    const merged = { ...normalizeUsage(left), ...normalizeUsage(right) };
    Object.keys(merged).forEach(id => {
      merged[id] = Math.max(
        Math.floor(Number(left?.[id]) || 0),
        Math.floor(Number(right?.[id]) || 0)
      );
    });
    return merged;
  }

  function removePanel() {
    document.getElementById(PANEL_ID)?.remove();
  }

  function toast(message) {
    const box = qs(".fj-toast", root());
    if (!box) return;
    box.textContent = message;
    box.classList.add("is-visible");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => box.classList.remove("is-visible"), 1800);
  }

  function scrollTop() {
    body()?.scrollTo({ top: 0, behavior: "instant" });
  }

  function option(value, label, selected) {
    return `<option value="${attr(value)}" ${String(value) === String(selected) ? "selected" : ""}>${esc(label)}</option>`;
  }

  function chip(text) {
    return `<span class="fj-chip">${esc(text)}</span>`;
  }

  function empty(text) {
    return `<div class="fj-empty">${esc(text)}</div>`;
  }

  function button(action, label, iconName, className = "fj-secondary") {
    return `<button type="button" class="${className}" data-action="${attr(action)}">${icon(iconName)}<span>${esc(label)}</span></button>`;
  }

  function toolButton(action, label, iconName) {
    return `<button type="button" class="fj-tool" data-action="${attr(action)}" title="${attr(label)}">${icon(iconName)}<span>${esc(label)}</span></button>`;
  }

  function iconButton(action, label, iconName, extra = "") {
    return `<button type="button" class="fj-icon-btn" data-action="${attr(action)}" title="${attr(label)}" aria-label="${attr(label)}" ${extra}>${icon(iconName)}</button>`;
  }

  function icon(name) {
    const paths = {
      arrowLeft: '<path d="m15 18-6-6 6-6"></path>',
      arrowRight: '<path d="m9 18 6-6-6-6"></path>',
      copy: '<rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>',
      download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="M7 10l5 5 5-5"></path><path d="M12 15V3"></path>',
      edit: '<path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path>',
      maximize: '<path d="M8 3H5a2 2 0 0 0-2 2v3"></path><path d="M16 3h3a2 2 0 0 1 2 2v3"></path><path d="M8 21H5a2 2 0 0 1-2-2v-3"></path><path d="M16 21h3a2 2 0 0 0 2-2v-3"></path>',
      minus: '<path d="M5 12h14"></path>',
      moon: '<path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.5 6.5 0 0 0 9.8 9.8Z"></path>',
      plus: '<path d="M12 5v14"></path><path d="M5 12h14"></path>',
      rotate: '<path d="M21 12a9 9 0 1 1-3-6.7"></path><path d="M21 3v6h-6"></path>',
      save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"></path><path d="M17 21v-8H7v8"></path><path d="M7 3v5h8"></path>',
      search: '<circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path>',
      settings: '<path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"></path><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3a2 2 0 1 1 4 0 1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"></path>',
      star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2L5.8 21 7 14.2 2 9.3l6.9-1Z"></path>',
      starFilled: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2L5.8 21 7 14.2 2 9.3l6.9-1Z" fill="currentColor"></path>',
      sun: '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m4.9 4.9 1.4 1.4"></path><path d="m17.7 17.7 1.4 1.4"></path><path d="m19.1 4.9-1.4 1.4"></path><path d="m6.3 17.7-1.4 1.4"></path>',
      trash: '<path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="m19 6-1 14H6L5 6"></path><path d="M10 11v5"></path><path d="M14 11v5"></path>',
      upload: '<path d="M12 21V9"></path><path d="m17 14-5-5-5 5"></path><path d="M5 3h14"></path>',
      x: '<path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>'
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.copy}</svg>`;
  }

  function addStyle() {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${PANEL_ID}{position:fixed!important;top:12px!important;right:12px!important;z-index:2147483647!important;width:min(500px,calc(100vw - 24px))!important;max-height:calc(100vh - 24px)!important;opacity:.32!important;color:#172033!important;font:var(--fj-font-size,13px)/1.42 "Segoe UI",Arial,sans-serif!important;transition:opacity .16s ease,transform .16s ease!important}
      #${PANEL_ID}:hover,#${PANEL_ID}:focus-within{opacity:1!important}
      #${PANEL_ID},#${PANEL_ID} *{box-sizing:border-box!important;letter-spacing:0!important;max-width:100%!important}
      #${PANEL_ID} button{all:initial!important;box-sizing:border-box!important;font:inherit!important}
      #${PANEL_ID} input,#${PANEL_ID} textarea,#${PANEL_ID} select{box-sizing:border-box!important;font:inherit!important}
      #${PANEL_ID} .fj-shell{position:relative!important;overflow:hidden!important;display:flex!important;flex-direction:column!important;max-height:calc(100vh - 24px)!important;border:1px solid rgba(15,23,42,.18)!important;border-radius:8px!important;background:#f6f8fb!important;box-shadow:0 22px 60px rgba(15,23,42,.30)!important}
      #${PANEL_ID} .fj-head{display:grid!important;gap:7px!important;padding:8px!important;background:#ffffff!important;border-bottom:1px solid rgba(15,23,42,.12)!important}
      #${PANEL_ID} .fj-head-main,#${PANEL_ID} .fj-setting-line{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;gap:8px!important;align-items:center!important}
      #${PANEL_ID} .fj-brand{display:grid!important;gap:1px!important;min-width:0!important}
      #${PANEL_ID} strong{font-weight:900!important}
      #${PANEL_ID} .fj-brand strong,#${PANEL_ID} .fj-view-title strong,#${PANEL_ID} .fj-topic-text strong,#${PANEL_ID} .fj-phrase-main strong{min-width:0!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;color:#0f172a!important}
      #${PANEL_ID} .fj-brand span,#${PANEL_ID} .fj-view-title span,#${PANEL_ID} .fj-topic-text small,#${PANEL_ID} .fj-card label,#${PANEL_ID} .fj-setting-line span{color:#526174!important;font-size:11px!important;font-weight:760!important}
      #${PANEL_ID} .fj-window{display:flex!important;gap:5px!important}
      #${PANEL_ID} .fj-toolbar{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:5px!important;padding:5px!important;border:1px solid rgba(15,23,42,.12)!important;border-radius:8px!important;background:#e8edf5!important}
      #${PANEL_ID} .fj-tool,#${PANEL_ID} .fj-icon-btn,#${PANEL_ID} .fj-primary,#${PANEL_ID} .fj-secondary,#${PANEL_ID} .fj-danger,#${PANEL_ID} .fj-suggestion button{display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:6px!important;border-radius:8px!important;cursor:pointer!important;user-select:none!important}
      #${PANEL_ID} .fj-tool{height:34px!important;min-width:0!important;border:1px solid rgba(15,23,42,.15)!important;background:#fff!important;color:#1f2a3d!important;overflow:hidden!important}
      #${PANEL_ID} .fj-tool span{min-width:0!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;font-size:11px!important;font-weight:850!important}
      #${PANEL_ID} .fj-icon-btn{width:34px!important;height:34px!important;min-width:34px!important;min-height:34px!important;border:1px solid rgba(15,23,42,.15)!important;background:#fff!important;color:#1f2a3d!important;padding:0!important}
      #${PANEL_ID} svg{display:block!important;width:18px!important;height:18px!important;min-width:18px!important;min-height:18px!important;fill:none!important;stroke:currentColor!important;stroke-width:2!important;stroke-linecap:round!important;stroke-linejoin:round!important;pointer-events:none!important}
      #${PANEL_ID} .fj-body{flex:1 1 auto!important;min-height:132px!important;overflow:auto!important;overflow-x:hidden!important;padding:8px!important;scrollbar-width:thin!important}
      #${PANEL_ID}.is-minimized{width:222px!important}
      #${PANEL_ID}.is-minimized .fj-toolbar,#${PANEL_ID}.is-minimized .fj-body,#${PANEL_ID}.is-minimized .fj-brand span{display:none!important}
      #${PANEL_ID} .fj-sign-card{display:grid!important;grid-template-columns:minmax(0,1fr) 34px!important;gap:7px!important;align-items:center!important;margin-bottom:7px!important;border:1px solid rgba(15,23,42,.12)!important;border-radius:8px!important;background:#fff!important;padding:8px!important}
      #${PANEL_ID} .fj-sign-card div{display:grid!important;gap:2px!important;min-width:0!important}
      #${PANEL_ID} .fj-sign-card strong{overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;color:#0f172a!important}
      #${PANEL_ID} .fj-sign-card span{color:#526174!important;font-size:11px!important;font-weight:780!important}
      #${PANEL_ID} .fj-tabs{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:6px!important;margin-bottom:7px!important}
      #${PANEL_ID} .fj-tab{height:34px!important;display:flex!important;align-items:center!important;justify-content:center!important;text-align:center!important;border:1px solid rgba(15,23,42,.14)!important;border-radius:8px!important;background:#fff!important;color:#334155!important;cursor:pointer!important;overflow:hidden!important}
      #${PANEL_ID} .fj-tab span{min-width:0!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;font-size:10.5px!important;font-weight:900!important}
      #${PANEL_ID} .fj-tab.is-active,#${PANEL_ID} .fj-primary{background:#102033!important;color:#fff!important;border-color:#102033!important}
      #${PANEL_ID} .fj-topic-list,#${PANEL_ID} .fj-phrase-list,#${PANEL_ID} .fj-form,#${PANEL_ID} .fj-search-results,#${PANEL_ID} .fj-fav-list{display:grid!important;gap:7px!important;min-width:0!important}
      #${PANEL_ID} .fj-topic-row{display:grid!important;grid-template-columns:minmax(0,1fr) 75px!important;gap:8px!important;cursor:grab!important}
      #${PANEL_ID} .fj-topic{width:100%!important;min-height:56px!important;display:grid!important;grid-template-columns:36px minmax(0,1fr)!important;border:1px solid rgba(15,23,42,.14)!important;border-radius:8px!important;background:#fff!important;color:#0f172a!important;cursor:pointer!important;overflow:hidden!important}
      #${PANEL_ID} .fj-number{display:flex!important;align-items:center!important;justify-content:center!important;background:var(--topic-color)!important;color:#fff!important;font-size:12px!important;font-weight:950!important}
      #${PANEL_ID} .fj-topic-text{display:grid!important;align-content:center!important;gap:2px!important;padding:8px 10px!important;text-align:left!important;min-width:0!important}
      #${PANEL_ID} .fj-row-actions{display:grid!important;grid-template-columns:34px 34px!important;gap:6px!important;align-content:center!important}
      #${PANEL_ID} .fj-view-head{display:grid!important;grid-template-columns:34px minmax(0,1fr) 38px!important;gap:7px!important;align-items:center!important;margin-bottom:7px!important}
      #${PANEL_ID} .fj-view-title{display:grid!important;gap:2px!important;min-width:0!important}
      #${PANEL_ID} .fj-space{width:34px!important}
      #${PANEL_ID} .fj-phrase{display:grid!important;grid-template-columns:minmax(0,1fr) 36px!important;gap:7px!important;border:1px solid rgba(15,23,42,.14)!important;border-radius:8px!important;background:#fff!important;padding:7px!important;cursor:grab!important;overflow:hidden!important}
      #${PANEL_ID} .fj-phrase-main{display:grid!important;gap:5px!important;min-width:0!important;text-align:left!important;cursor:pointer!important;color:#172033!important}
      #${PANEL_ID} .fj-phrase.is-read-only .fj-phrase-main{cursor:default!important}
      #${PANEL_ID} pre{margin:0!important;white-space:pre-wrap!important;overflow-wrap:anywhere!important;font:var(--fj-font-size,13px)/1.45 "Segoe UI",Arial,sans-serif!important;color:#243145!important}
      #${PANEL_ID} .fj-phrase-main pre{display:-webkit-box!important;-webkit-line-clamp:7!important;-webkit-box-orient:vertical!important;overflow:hidden!important}
      #${PANEL_ID} .fj-phrase-actions{display:grid!important;grid-template-columns:34px!important;gap:5px!important;align-content:start!important}
      #${PANEL_ID} .fj-chip-row{display:flex!important;flex-wrap:wrap!important;align-items:center!important;gap:4px!important}
      #${PANEL_ID} .fj-chip{display:inline-flex!important;width:fit-content!important;border-radius:999px!important;background:#e0f2fe!important;color:#075985!important;padding:3px 7px!important;font-size:10px!important;font-weight:900!important}
      #${PANEL_ID} .fj-usage{display:inline-flex!important;width:fit-content!important;border-radius:999px!important;background:#f1f5f9!important;color:#334155!important;padding:3px 7px!important;font-size:10px!important;font-weight:950!important;border:1px solid rgba(15,23,42,.10)!important}
      #${PANEL_ID} .fj-suggestion{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;gap:8px!important;align-items:center!important;margin-bottom:9px!important;border:1px dashed rgba(8,145,178,.42)!important;border-radius:8px!important;background:#ecfeff!important;color:#155e75!important;padding:9px!important}
      #${PANEL_ID} .fj-suggestion.is-compact{margin:0!important}
      #${PANEL_ID} .fj-suggestion div{display:grid!important;gap:2px!important;min-width:0!important}
      #${PANEL_ID} .fj-suggestion small{font-size:10px!important;font-weight:900!important;text-transform:uppercase!important;color:#0e7490!important}
      #${PANEL_ID} .fj-suggestion strong,#${PANEL_ID} .fj-suggestion span{min-width:0!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}
      #${PANEL_ID} .fj-suggestion button{min-height:32px!important;border:1px solid rgba(8,145,178,.30)!important;background:#fff!important;color:#155e75!important;padding:0 9px!important;font-size:11px!important;font-weight:900!important}
      #${PANEL_ID} .fj-search-box{position:relative!important;margin-bottom:8px!important}
      #${PANEL_ID} .fj-search-box svg{position:absolute!important;left:10px!important;top:10px!important;color:#64748b!important}
      #${PANEL_ID} .fj-search-box input{padding-left:36px!important}
      #${PANEL_ID} input,#${PANEL_ID} textarea,#${PANEL_ID} select{width:100%!important;border:1px solid rgba(15,23,42,.18)!important;border-radius:8px!important;background:#fff!important;color:#172033!important;outline:none!important;padding:9px!important}
      #${PANEL_ID} textarea{resize:vertical!important;min-height:128px!important}
      #${PANEL_ID} .fj-filter-row,#${PANEL_ID} .fj-data-grid{display:grid!important;grid-template-columns:1fr 1fr!important;gap:8px!important;margin-bottom:9px!important}
      #${PANEL_ID} .fj-card,#${PANEL_ID} .fj-empty,#${PANEL_ID} .fj-edit-preview,#${PANEL_ID} .fj-fav-group{border:1px solid rgba(15,23,42,.14)!important;border-radius:8px!important;background:#fff!important;padding:10px!important}
      #${PANEL_ID} .fj-card{display:grid!important;gap:9px!important;text-align:left!important}
      #${PANEL_ID} .fj-card label{display:grid!important;gap:5px!important}
      #${PANEL_ID} .fj-primary,#${PANEL_ID} .fj-secondary,#${PANEL_ID} .fj-danger{min-height:36px!important;border:1px solid rgba(15,23,42,.15)!important;padding:0 12px!important;font-size:12px!important;font-weight:900!important}
      #${PANEL_ID} .fj-secondary{background:#fff!important;color:#1f2a3d!important}
      #${PANEL_ID} .fj-danger,#${PANEL_ID} .fj-icon-btn[data-action='delete-topic'],#${PANEL_ID} .fj-icon-btn[data-action='delete-phrase']{background:#fff1f2!important;color:#be123c!important;border-color:rgba(190,18,60,.22)!important}
      #${PANEL_ID} input[type='file']{display:none!important}
      #${PANEL_ID} .fj-font-row{display:grid!important;grid-template-columns:38px minmax(0,1fr) 38px!important;gap:10px!important;align-items:center!important}
      #${PANEL_ID} .fj-font-row .fj-icon-btn{width:38px!important;height:38px!important}
      #${PANEL_ID} .fj-font-meter{height:9px!important;border-radius:999px!important;background:#cbd5e1!important;overflow:hidden!important}
      #${PANEL_ID} .fj-font-meter span{display:block!important;height:100%!important;border-radius:inherit!important;background:#2563eb!important}
      #${PANEL_ID} .fj-font-value{display:inline-flex!important;align-items:center!important;justify-content:center!important;min-width:48px!important;height:28px!important;border:1px solid #bfdbfe!important;border-radius:999px!important;background:#eff6ff!important;color:#1d4ed8!important;font-size:12px!important;font-weight:950!important}
      #${PANEL_ID} .fj-switch{width:52px!important;height:30px!important;position:relative!important;display:block!important}
      #${PANEL_ID} .fj-switch input{position:absolute!important;opacity:0!important}
      #${PANEL_ID} .fj-switch span{display:block!important;width:52px!important;height:30px!important;border-radius:999px!important;background:#cbd5e1!important}
      #${PANEL_ID} .fj-switch span:before{content:""!important;position:absolute!important;top:4px!important;left:4px!important;width:22px!important;height:22px!important;border-radius:999px!important;background:#fff!important;transition:.16s ease!important}
      #${PANEL_ID} .fj-switch input:checked+span{background:#2563eb!important}
      #${PANEL_ID} .fj-switch input:checked+span:before{transform:translateX(22px)!important}
      #${PANEL_ID} .fj-check{grid-template-columns:18px minmax(0,1fr)!important;align-items:center!important}
      #${PANEL_ID} .fj-check input{width:16px!important;height:16px!important}
      #${PANEL_ID} .fj-empty{text-align:center!important;color:#526174!important;font-size:12px!important}
      #${PANEL_ID} .fj-fav-group{display:grid!important;gap:8px!important}
      #${PANEL_ID} .fj-fav-group header{display:grid!important;grid-template-columns:8px minmax(0,1fr) auto!important;gap:8px!important;align-items:center!important}
      #${PANEL_ID} .fj-fav-group header span{width:8px!important;height:28px!important;border-radius:999px!important;background:var(--topic-color)!important}
      #${PANEL_ID} .fj-modal{position:absolute!important;inset:0!important;background:rgba(15,23,42,.42)!important;display:grid!important;align-items:end!important;padding:10px!important;z-index:2!important}
      #${PANEL_ID} .fj-modal-card{display:grid!important;gap:10px!important;max-height:100%!important;overflow:auto!important;border:1px solid rgba(15,23,42,.16)!important;border-radius:8px!important;background:#fff!important;padding:10px!important}
      #${PANEL_ID} .fj-modal-card header,#${PANEL_ID} .fj-modal-card footer{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;gap:8px!important;align-items:center!important}
      #${PANEL_ID} .fj-variable-grid{display:grid!important;grid-template-columns:1fr 1fr!important;gap:8px!important}
      #${PANEL_ID} .fj-variable-grid label{display:grid!important;gap:5px!important;color:#526174!important;font-size:12px!important;font-weight:850!important}
      #${PANEL_ID} .is-dragging{opacity:.45!important}
      #${PANEL_ID} .is-drop-target{outline:2px solid #2563eb!important;outline-offset:2px!important}
      #${PANEL_ID} .fj-toast{position:absolute!important;left:10px!important;right:10px!important;bottom:10px!important;transform:translateY(14px)!important;opacity:0!important;pointer-events:none!important;border-radius:8px!important;background:#102033!important;color:#fff!important;padding:10px!important;text-align:center!important;font-size:12px!important;font-weight:900!important;transition:.16s ease!important;z-index:4!important}
      #${PANEL_ID} .fj-toast.is-visible{opacity:1!important;transform:translateY(0)!important}
      #${PANEL_ID}[data-theme='dark']{color:#e8eef6!important}
      #${PANEL_ID}[data-theme='dark'] .fj-shell{background:#0b1220!important;border-color:rgba(203,213,225,.22)!important;box-shadow:0 22px 60px rgba(0,0,0,.55)!important}
      #${PANEL_ID}[data-theme='dark'] .fj-head,#${PANEL_ID}[data-theme='dark'] .fj-sign-card,#${PANEL_ID}[data-theme='dark'] .fj-topic,#${PANEL_ID}[data-theme='dark'] .fj-phrase,#${PANEL_ID}[data-theme='dark'] .fj-card,#${PANEL_ID}[data-theme='dark'] .fj-empty,#${PANEL_ID}[data-theme='dark'] .fj-edit-preview,#${PANEL_ID}[data-theme='dark'] .fj-fav-group,#${PANEL_ID}[data-theme='dark'] .fj-tab,#${PANEL_ID}[data-theme='dark'] .fj-tool,#${PANEL_ID}[data-theme='dark'] .fj-icon-btn,#${PANEL_ID}[data-theme='dark'] input,#${PANEL_ID}[data-theme='dark'] textarea,#${PANEL_ID}[data-theme='dark'] select,#${PANEL_ID}[data-theme='dark'] .fj-modal-card{background:#111c2d!important;color:#e8eef6!important;border-color:rgba(203,213,225,.20)!important}
      #${PANEL_ID}[data-theme='dark'] .fj-toolbar{background:#1a2638!important;border-color:rgba(203,213,225,.18)!important}
      #${PANEL_ID}[data-theme='dark'] strong,#${PANEL_ID}[data-theme='dark'] .fj-brand strong,#${PANEL_ID}[data-theme='dark'] .fj-view-title strong,#${PANEL_ID}[data-theme='dark'] .fj-topic-text strong,#${PANEL_ID}[data-theme='dark'] .fj-phrase-main strong,#${PANEL_ID}[data-theme='dark'] .fj-sign-card strong{color:#f8fbff!important}
      #${PANEL_ID}[data-theme='dark'] pre,#${PANEL_ID}[data-theme='dark'] .fj-phrase-main{color:#d8e2ee!important}
      #${PANEL_ID}[data-theme='dark'] .fj-brand span,#${PANEL_ID}[data-theme='dark'] .fj-view-title span,#${PANEL_ID}[data-theme='dark'] .fj-topic-text small,#${PANEL_ID}[data-theme='dark'] .fj-card label,#${PANEL_ID}[data-theme='dark'] .fj-setting-line span,#${PANEL_ID}[data-theme='dark'] .fj-sign-card span{color:#b7c4d3!important}
      #${PANEL_ID}[data-theme='dark'] .fj-tab.is-active,#${PANEL_ID}[data-theme='dark'] .fj-primary{background:#2f6fed!important;border-color:#4d86ff!important;color:#fff!important}
      #${PANEL_ID}[data-theme='dark'] .fj-secondary{background:#111c2d!important;color:#e8eef6!important}
      #${PANEL_ID}[data-theme='dark'] .fj-suggestion{background:#102b36!important;color:#d5fbff!important;border-color:rgba(103,232,249,.30)!important}
      #${PANEL_ID}[data-theme='dark'] .fj-suggestion small{color:#a5f3fc!important}
      #${PANEL_ID}[data-theme='dark'] .fj-suggestion button{background:#111c2d!important;color:#d5fbff!important;border-color:rgba(103,232,249,.28)!important}
      #${PANEL_ID}[data-theme='dark'] .fj-chip{background:#173655!important;color:#bfdbfe!important}
      #${PANEL_ID}[data-theme='dark'] .fj-usage{background:#1f2f46!important;color:#dbeafe!important;border-color:rgba(147,197,253,.24)!important}
      #${PANEL_ID}[data-theme='dark'] .fj-danger,#${PANEL_ID}[data-theme='dark'] .fj-icon-btn[data-action='delete-topic'],#${PANEL_ID}[data-theme='dark'] .fj-icon-btn[data-action='delete-phrase']{background:#461320!important;color:#fecdd3!important;border-color:rgba(251,113,133,.26)!important}
      #${PANEL_ID}[data-theme='dark'] .fj-font-value{background:#1a2638!important;color:#dbeafe!important;border-color:rgba(147,197,253,.30)!important}
      #${PANEL_ID}[data-theme='dark'] .fj-font-meter{background:#334155!important}
      @media(max-width:650px){#${PANEL_ID}{top:10px!important;left:50%!important;right:auto!important;width:calc(100vw - 20px)!important;max-height:calc(100vh - 20px)!important;transform:translateX(-50%)!important}#${PANEL_ID} .fj-shell{max-height:calc(100vh - 20px)!important}}
      @media(max-width:390px){#${PANEL_ID} .fj-tool span{display:none!important}#${PANEL_ID} .fj-filter-row,#${PANEL_ID} .fj-data-grid,#${PANEL_ID} .fj-variable-grid{grid-template-columns:1fr!important}}
    `;
    document.head.appendChild(style);
  }

  function uid(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function clean(value) {
    return String(value ?? "").replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  }

  function normalize(value) {
    return clean(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function fuzzy(haystack, term) {
    if (haystack.includes(term)) return true;
    return haystack.split(/\s+/).some(word => Math.abs(word.length - term.length) <= 1 && distance(word, term) <= 1);
  }

  function distance(a, b) {
    let prev = Array.from({ length: b.length + 1 }, (_, index) => index);
    for (let i = 1; i <= a.length; i += 1) {
      const row = [i];
      for (let j = 1; j <= b.length; j += 1) {
        row[j] = a[i - 1] === b[j - 1] ? prev[j - 1] : Math.min(prev[j - 1], prev[j], row[j - 1]) + 1;
      }
      prev = row;
    }
    return prev[b.length];
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value || {}));
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function qs(selector, scope = document) {
    return scope.querySelector(selector);
  }

  function qsa(selector, scope = document) {
    return Array.from(scope.querySelectorAll(selector));
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }

  const attr = esc;
})();
