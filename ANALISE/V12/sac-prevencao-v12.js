(async function SacPrevencaoV12() {
  "use strict";

  const APP = "sac_prevencao_V12_20260801";
  const BUILD = "ANALISE/V12";
  const BUILD_FAMILY = "12";
  const BUILD_VERSION = "12.5";
  const NOTICE_MS = 7600;
  const PACKAGE_TTL_MS = 12 * 60 * 60 * 1000;
  const EXECUTION_TTL_MS = 12 * 60 * 60 * 1000;
  const PACKAGE_SCHEMA = 1;
  const EXPORT_FALCON = "SAC_FALCON";
  const EXPORT_CONSOLE = "SAC_CONSOLE";
  const DEFAULT_SIGNATURE_SECTOR = "SAC Prevenção";
  const SIGNATURE_SECTORS = ["SAC Prevenção", "Dock Teck Prevenção", "Backoffice Prevenção"];

  const FLOW = {
    banking: { label: "BANKING", tone: "#22c55e" },
    card: { label: "CARTÃO", tone: "#7c3aed" },
    hold: { label: "HOLD", tone: "#ff2d00" }
  };

  const TREATMENT = {
    brasil: { label: "BACKOFFICE BRASIL" },
    global: { label: "GLOBAL BACKOFFICE" }
  };

  const FLOW_COLOR_OPTIONS = [
    ["#111827", "preto"],
    ["#22c55e", "verde secundário"],
    ["#7c3aed", "violeta secundário"],
    ["#ff2d00", "laranja alerta"],
    ["#ef4444", "vermelho"],
    ["#ff5a1f", "laranja vibrante"],
    ["#f59e0b", "amarelo"],
    ["#14b8a6", "turquesa"],
    ["#2563eb", "azul"]
  ];

  const DECISIONS = [
    "FRAUDE",
    "NÃO FRAUDE",
    "NÃO FOI POSSÍVEL CONFIRMAR FRAUDE",
    "NÃO FOI POSSÍVEL CONFIRMAR NÃO FRAUDE"
  ];

  const STATUS_OPTIONS = [
    "normal", "ativo", "bloqueado", "bloqueio preventivo falcon 254", "cancelada",
    "spd 1", "spd 2", "spd 8", "spd 15", "spd 17", "spd 21", "spd 25", "spd 33", "outro"
  ];
  const MEDIA_OPTIONS = ["não", "sim", "sem acesso"];
  const HISTORY_SPD = ["não", "sim", "spd 1", "spd 2", "spd 8", "spd 15", "spd 17", "spd 21", "spd 25", "spd 33", "outro"];
  const CARD_REVIEW = ["não", "sim", "reconhece a compra", "autofinanciamento", "ausência de dados"];
  const EMAIL_OPTIONS = ["de acordo", "divergente", "sem informação"];
  const DOC_OPTIONS = ["sem ressalvas", "com ressalvas", "baixa qualidade", "foto de tela", "editado", "falsificado", "ilegível", "danificado", "sem arquivos"];
  const STATEMENT_OPTIONS = ["sem suspeitas", "com suspeitas", "triangulação", "autofinanciamento", "sem histórico"];
  const EMAIL_DIVERGENCE_OPTIONS = ["E-mail não se refere ao nome", "DDD diferente da região do endereço", "Copia e cola"];
  const BAD_MEDIA_OPTIONS = [
    "Crimes contra a fé pública",
    "Tráfico de drogas",
    "Terrorismo",
    "Crimes contra o patrimônio",
    "Crimes contra o sistema financeiro",
    "Crimes contra a ordem tributária",
    "Crimes contra a administração da justiça",
    "Crimes contra a administração pública",
    "Falsidade ideológica",
    "Receptação",
    "Estelionato",
    "Roubo (majorado ou qualificado)",
    "Furto (majorado ou qualificado)",
    "Estupro",
    "Homicídio"
  ];
  const PID_DEFAULT_REQUIRED = [
    "Dois últimos dígitos do CPF",
    "Cinco últimos dígitos do cartão",
    "Data aproximada e estabelecimento da última compra"
  ];
  const PID_DEFAULT_COMPLEMENTARY = [
    "Data de nascimento completa",
    "Endereço de correspondência cadastrado",
    "Telefone alternativo, se houver",
    "Nome da mãe cadastrado",
    "Limite aproximado do cartão, se for crédito",
    "Saldo da conta, se for pré-pago"
  ];
  const PID_AMIGOZ_REQUIRED = [
    "Nome da mãe",
    "Final do CPF",
    "Data de nascimento",
    "Últimos dígitos do cartão",
    "Última compra"
  ];
  const PID_AMIGOZ_COMPLEMENTARY = [
    "Endereço de correspondência cadastrado",
    "Telefone alternativo, se houver",
    "Limite aproximado do cartão ou saldo da conta"
  ];

  const scriptUrl = (() => {
    try { return new URL(document.currentScript?.src || location.href); }
    catch (_err) { return new URL(location.href); }
  })();
  const STAGE = (scriptUrl.searchParams.get("stage") || window.__SAC_PREVENCAO_STAGE || "auto").toLowerCase();
  const memory = window.SACMemoryV12;
  const tabulatorEngine = window.SACTabulatorV12;
  const counterpartyEngine = window.SACCounterpartyV12;
  const corporateEngine = window.SACCorporateV12;
  const transactionEngine = window.SACTransactionV12;
  const mediaEngine = window.SACMediaV12;
  const dddEngine = window.SACDddV12;
  const RUNTIME_SLOT = "__SAC_PREVENCAO_V12_RUNTIME__";
  if (!memory || !tabulatorEngine || !counterpartyEngine || !corporateEngine || !transactionEngine || !mediaEngine || !dddEngine) {
    throw new Error("Motores da V12 não foram carregados.");
  }
  Object.getOwnPropertyNames(window)
    .filter((name) => /^__SAC_PREVENCAO_V\d+_RUNTIME__$/.test(name))
    .forEach((name) => {
      try { window[name]?.dispose?.(); } catch (_error) {}
      try { delete window[name]; } catch (_error) { window[name] = undefined; }
    });
  await memory.hydrateFromClipboard({ timeoutMs: 1100 });

  const counterpartySessionResults = new Map();
  const INVESTIGATION_RESULT_FIELDS = ["counterpartyResult", "corporateResult", "mediaInvestigation", "transactionInvestigation"];

  function clearInvestigationFields(data) {
    if (!data || typeof data !== "object") return data;
    INVESTIGATION_RESULT_FIELDS.forEach((field) => { try { delete data[field]; } catch (_error) {} });
    if (data.falcon && data.falcon !== data) clearInvestigationFields(data.falcon);
    return data;
  }

  function releaseInvestigationSession(data = null) {
    counterpartySessionResults.clear();
    clearInvestigationFields(data);
    try { counterpartyEngine.releaseSession?.(); } catch (_error) {}
    try { corporateEngine.releaseSession?.(); } catch (_error) {}
  }

  function transferableCaseData(data) {
    const source = data && typeof data === "object" ? data : {};
    const copy = { ...source };
    INVESTIGATION_RESULT_FIELDS.forEach((field) => { delete copy[field]; });
    if (source.falcon && source.falcon !== source) {
      copy.falcon = { ...source.falcon };
      INVESTIGATION_RESULT_FIELDS.forEach((field) => { delete copy.falcon[field]; });
    }
    return copy;
  }

  const all = (selector, root = document) => Array.from(root?.querySelectorAll?.(selector) || []);
  const byId = (id) => document.getElementById(id);
  const textOf = (node) => String(node?.innerText || node?.textContent || "").replace(/\s+/g, " ").trim();
  const clean = (value, fallback = "N/A") => {
    const text = String(value ?? "").replace(/\s+/g, " ").trim();
    return text || fallback;
  };
  const normalize = (value) => clean(value, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[–—−]/g, "-")
    .toUpperCase();
  const isMissing = (value) => ["", "N/A", "NA", "NULL", "UNDEFINED"].includes(normalize(value));
  const bodyText = () => textOf(document.body);
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  async function readClipboardText(timeoutMs = 450) {
    if (!navigator.clipboard?.readText) return "";
    let timeout = 0;
    try {
      return await Promise.race([
        navigator.clipboard.readText(),
        new Promise((resolve) => { timeout = setTimeout(() => resolve(""), Math.max(50, Number(timeoutMs) || 450)); })
      ]);
    } catch (_err) {
      return "";
    } finally {
      clearTimeout(timeout);
    }
  }
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
  const cssEscape = (value) => window.CSS?.escape ? CSS.escape(String(value)) : String(value).replace(/["\\]/g, "\\$&");

  const runtimeController = new AbortController();
  const runtimeCleanups = [];
  let runtimeDisposed = false;
  function addRuntimeEvent(target, type, handler, options = {}) {
    if (!target?.addEventListener || runtimeDisposed) return;
    const normalizedOptions = typeof options === "boolean" ? { capture: options } : { ...(options || {}) };
    target.addEventListener(type, handler, { ...normalizedOptions, signal: runtimeController.signal });
  }
  function registerRuntimeCleanup(cleanup) {
    if (typeof cleanup === "function") runtimeCleanups.push(cleanup);
  }
  function disposeRuntime() {
    if (runtimeDisposed) return;
    runtimeDisposed = true;
    runtimeController.abort();
    runtimeCleanups.splice(0).reverse().forEach((cleanup) => {
      try { cleanup(); } catch (_err) {}
    });
    document.querySelectorAll("[id^='sac-style'],.sac-panel,.sac-history-panel,.sac-choice-popover,.sac-side-panel,.sac-pid-panel,#sac-notices")
      .forEach((node) => node.remove());
  }
  registerRuntimeCleanup(() => releaseInvestigationSession());
  registerRuntimeCleanup(() => {
    window.__SAC_TABULATOR_DECISION_WRITE_ACTIVE__ = false;
    window.__SAC_TABULATOR_DECISION_PANEL_ACTIVE__ = false;
  });
  window[RUNTIME_SLOT] = Object.freeze({ build: BUILD_VERSION, dispose: disposeRuntime });

  const SHARED_SETTING_NAMES = new Set([
    "theme", "safeMode", "invisibleMode", "investigationMode", "helpMode", "fontScale", "signatureName", "signatureSector", "counterpartyLocalRecords",
    "flowTone:banking", "flowTone:card", "flowTone:hold"
  ]);
  const MEMORY_SETTINGS_STORAGE_KEY = "sac_prevencao_V12:settings";
  const key = (name) => `${APP}:${name}`;
  let settingsSyncTimer = 0;
  function scheduleSettingsEnvelopeSync() {
    clearTimeout(settingsSyncTimer);
    settingsSyncTimer = setTimeout(() => {
      settingsSyncTimer = 0;
      memory.commitCurrentText?.();
    }, 220);
  }
  registerRuntimeCleanup(() => clearTimeout(settingsSyncTimer));
  const storageGet = (name) => {
    if (SHARED_SETTING_NAMES.has(name)) {
      try {
        const sharedMemoryValue = memory.settings?.get?.(name);
        if (typeof sharedMemoryValue === "string" && sharedMemoryValue) return sharedMemoryValue;
      } catch (_err) {}
    }
    try {
      const persisted = localStorage.getItem(key(name)) || sessionStorage.getItem(key(name)) || "";
      if (persisted) return persisted;
    } catch (_err) {}
    return "";
  };
  const storageSet = (name, value) => {
    if (SHARED_SETTING_NAMES.has(name)) {
      try {
        memory.settings?.set?.(name, value);
        scheduleSettingsEnvelopeSync();
      } catch (_err) {}
      try { localStorage.removeItem(key(name)); sessionStorage.removeItem(key(name)); } catch (_err) {}
      return;
    }
    try { localStorage.setItem(key(name), value); }
    catch (_err) {
      try { sessionStorage.setItem(key(name), value); } catch (_err2) {}
    }
  };
  const storageRemove = (name) => {
    if (SHARED_SETTING_NAMES.has(name)) {
      try {
        memory.settings?.remove?.(name);
        memory.commitCurrentText?.();
      } catch (_err) {}
    }
    try { localStorage.removeItem(key(name)); sessionStorage.removeItem(key(name)); } catch (_err) {}
  };
  const readJson = (name) => {
    try { return JSON.parse(storageGet(name) || "null"); } catch (_err) { return null; }
  };
  const writeJson = (name, value) => storageSet(name, JSON.stringify(value));
  let counterpartyRecordsHydrated = false;
  function hydrateCounterpartyLocalRecords() {
    if (counterpartyRecordsHydrated) return;
    try {
      const records = JSON.parse(storageGet("counterpartyLocalRecords") || "[]");
      if (Array.isArray(records) && records.length) counterpartyEngine.importLocalRecords?.(records);
    } catch (_err) {}
    counterpartyRecordsHydrated = true;
  }
  function persistCounterpartyLocalRecords() {
    try {
      const records = counterpartyEngine.exportLocalRecords?.() || [];
      storageSet("counterpartyLocalRecords", JSON.stringify(records));
      return records;
    } catch (_err) {
      return [];
    }
  }
  if (storageGet("investigationMode") === "on") hydrateCounterpartyLocalRecords();
  function packageMemorySnapshot() {
    const snap = memory.state?.get?.() || memory.mergeCurrentMirrors?.() || memory.snapshot?.() || {};
    return {
      schema: 1,
      savedAt: Date.now(),
      settings: snap.settings || {},
      listTombstones: snap.listTombstones || [],
      listsVault: snap.listsVault || snap.lists || [],
      history: snap.history || []
    };
  }
  function hydrateMemoryFromPackage(data) {
    if (!data?.sharedMemory) return;
    try { memory.state?.merge?.(data.sharedMemory) || memory.mergeSnapshot?.(data.sharedMemory); } catch (_err) {}
  }
  const previousBuildFamily = storageGet("activeBuildFamily");
  if (previousBuildFamily && previousBuildFamily !== BUILD_FAMILY) {
    ["lastFalcon", "lastConsole"].forEach(storageRemove);
  }
  storageSet("activeBuildFamily", BUILD_FAMILY);
  storageSet("activeBuild", BUILD_VERSION);
  storageRemove("activeListTab");
  function clearPreviousRuntime() {
    all("[id^='sac-style'],.sac-panel,.sac-history-panel,.sac-choice-popover,.sac-side-panel,.sac-pid-panel,#sac-notices").forEach((node) => node.remove());
    Object.keys(window)
      .filter((handlerName) => /^__SAC_PREVENCAO(?:_V\d+)?_KEYS$/.test(handlerName))
      .forEach((handlerName) => {
        const handler = window[handlerName];
        if (typeof handler === "function") document.removeEventListener("keydown", handler);
        if (handlerName !== "__SAC_PREVENCAO_V12_KEYS") {
          try { delete window[handlerName]; } catch (_err) { window[handlerName] = undefined; }
        }
      });
  }
  clearPreviousRuntime();
  window.__SAC_PREVENCAO_ACTIVE_BUILD__ = BUILD_VERSION;
  window.__SAC_PREVENCAO_ACTIVE_PATH__ = BUILD;

  const TABULATOR_PROTECTED_IDS = [
    "txt_ValorTransacao", "txt_NumeroCaso", "txt_data_entrada", "txt_hora_entrada",
    "txt_cpf", "txt_cnpj", "txt_obs", "ddl_tabulador", "ddl_tipoDoc", "ddl_idemissor",
    "ddl_TipoChamada", "ddl_ChamadaAtiva", "ddl_Fila", "ddl_status", "ddl_motivostatus"
  ];
  function isTabulatorProtectedField(node) {
    if (!node || node.nodeType !== 1) return false;
    const id = String(node.id || "");
    const name = String(node.name || node.getAttribute?.("name") || "");
    return TABULATOR_PROTECTED_IDS.includes(id) || /^_partial_Falcon\./i.test(name);
  }
  const TABULATOR_WRITE_GUARD_SLOT = "__SAC_TABULATOR_WRITE_GUARD__";
  function restoreTabulatorWriteGuard() {
    const guard = window[TABULATOR_WRITE_GUARD_SLOT];
    if (!guard?.installed) return;
    const restore = (prototype, property, descriptor) => {
      if (!prototype || !descriptor) return;
      try { Object.defineProperty(prototype, property, descriptor); } catch (_error) {}
    };
    restore(window.HTMLInputElement?.prototype, "value", guard.input);
    restore(window.HTMLTextAreaElement?.prototype, "value", guard.textarea);
    restore(window.HTMLSelectElement?.prototype, "value", guard.select);
    restore(window.HTMLOptionElement?.prototype, "selected", guard.option);
    try { delete window[TABULATOR_WRITE_GUARD_SLOT]; } catch (_error) { window[TABULATOR_WRITE_GUARD_SLOT] = undefined; }
  }
  function installTabulatorWriteGuard() {
    const guard = window[TABULATOR_WRITE_GUARD_SLOT] || {};
    if (guard.installed && guard.owner === BUILD_FAMILY) {
      window.__SAC_TABULATOR_DECISION_WRITE_ACTIVE__ = false;
      return;
    }
    if (guard.installed) restoreTabulatorWriteGuard();
    const shouldBlock = (node) => Boolean(
      (window.__SAC_TABULATOR_DECISION_PANEL_ACTIVE__ || document.getElementById("sac-panel-tabulador"))
      && !window.__SAC_TABULATOR_DECISION_WRITE_ACTIVE__
      && isTabulatorProtectedField(node)
    );
    const patchValue = (prototype) => {
      const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
      if (!descriptor?.set || !descriptor?.get) return null;
      Object.defineProperty(prototype, "value", {
        configurable: true,
        get() { return descriptor.get.call(this); },
        set(value) {
          if (shouldBlock(this)) return;
          return descriptor.set.call(this, value);
        }
      });
      return descriptor;
    };
    const optionDescriptor = Object.getOwnPropertyDescriptor(HTMLOptionElement.prototype, "selected");
    if (optionDescriptor?.set && optionDescriptor?.get) {
      Object.defineProperty(HTMLOptionElement.prototype, "selected", {
        configurable: true,
        get() { return optionDescriptor.get.call(this); },
        set(value) {
          if (shouldBlock(this.closest?.("select") || this.parentElement)) return;
          return optionDescriptor.set.call(this, value);
        }
      });
    }
    window[TABULATOR_WRITE_GUARD_SLOT] = {
      installed: true,
      owner: BUILD_FAMILY,
      input: patchValue(HTMLInputElement.prototype),
      textarea: patchValue(HTMLTextAreaElement.prototype),
      select: patchValue(HTMLSelectElement.prototype),
      option: optionDescriptor
    };
    window.__SAC_TABULATOR_DECISION_WRITE_ACTIVE__ = false;
  }
  registerRuntimeCleanup(() => {
    if (window[TABULATOR_WRITE_GUARD_SLOT]?.owner === BUILD_FAMILY) restoreTabulatorWriteGuard();
  });
  let tabulatorFieldLock = null;
  function tabulatorProtectedElements() {
    return all("input,textarea,select").filter(isTabulatorProtectedField);
  }
  function readTabulatorFieldSnapshot() {
    return tabulatorProtectedElements().map((element) => ({
      element,
      value: String(element.value ?? ""),
      selectedIndex: element instanceof HTMLSelectElement ? element.selectedIndex : -1
    }));
  }
  function withTabulatorGuardBypass(callback) {
    const previous = window.__SAC_TABULATOR_DECISION_WRITE_ACTIVE__;
    window.__SAC_TABULATOR_DECISION_WRITE_ACTIVE__ = true;
    try { return callback(); }
    finally { window.__SAC_TABULATOR_DECISION_WRITE_ACTIVE__ = previous; }
  }
  function restoreTabulatorFieldSnapshot(snapshot) {
    if (!snapshot?.length || window.__SAC_TABULATOR_DECISION_WRITE_ACTIVE__) return;
    withTabulatorGuardBypass(() => {
      snapshot.forEach(({ element, value, selectedIndex }) => {
        if (!element?.isConnected) return;
        if (element instanceof HTMLSelectElement) {
          if (String(element.value ?? "") !== value) element.value = value;
          if (selectedIndex >= 0 && element.selectedIndex !== selectedIndex) element.selectedIndex = selectedIndex;
          try { window.jQuery?.fn?.selectpicker && window.jQuery(element).selectpicker("render").selectpicker("refresh"); } catch (_err) {}
          return;
        }
        if (String(element.value ?? "") !== value) element.value = value;
      });
    });
  }
  function unlockTabulatorFieldLock() {
    if (!tabulatorFieldLock) return;
    clearInterval(tabulatorFieldLock.interval);
    try { tabulatorFieldLock.observer?.disconnect(); } catch (_err) {}
    tabulatorFieldLock = null;
  }
  function lockTabulatorFieldsUntilDecision() {
    unlockTabulatorFieldLock();
    const snapshot = readTabulatorFieldSnapshot();
    const restore = () => restoreTabulatorFieldSnapshot(snapshot);
    const observer = new MutationObserver(restore);
    try { observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["value", "selected"] }); } catch (_err) {}
    tabulatorFieldLock = { snapshot, observer, interval: setInterval(restore, 80) };
    restore();
  }
  registerRuntimeCleanup(unlockTabulatorFieldLock);

  let automationButtonGuardInstalled = false;
  function neutralizeAutomationButtons(root = document) {
    all(".sac-panel button,.sac-side-panel button,.sac-history-panel button,.sac-media-panel button,.sac-pid-panel button,.sac-notice button", root)
      .forEach((button) => {
        if (!button.hasAttribute("type")) button.setAttribute("type", "button");
      });
  }
  function ensureAutomationButtonGuard() {
    if (automationButtonGuardInstalled) return;
    automationButtonGuardInstalled = true;
    addRuntimeEvent(document, "click", (event) => {
      const button = event.target?.closest?.(".sac-panel button,.sac-side-panel button,.sac-history-panel button,.sac-media-panel button,.sac-pid-panel button,.sac-notice button");
      if (button && !button.hasAttribute("type")) button.setAttribute("type", "button");
    }, true);
  }

  const TABULATOR_NAVIGATION_GUARD_SLOT = "__SAC_TABULATOR_NAVIGATION_GUARD__";
  const TABULATOR_FORM_GUARD_SLOT = "__SAC_TABULATOR_FORM_GUARD_V12__";
  const tabulatorNavigationState = window[TABULATOR_NAVIGATION_GUARD_SLOT] || { active: false, until: 0 };
  window[TABULATOR_NAVIGATION_GUARD_SLOT] = tabulatorNavigationState;
  let tabulatorNavigationGuardInstalled = false;
  function isTabulatorNavigationGuardActive() {
    return tabulatorNavigationState.active
      || Boolean(window.__SAC_TABULATOR_DECISION_WRITE_ACTIVE__)
      || Date.now() < tabulatorNavigationState.until;
  }
  function blockTabulatorNavigation(event) {
    if (!isTabulatorNavigationGuardActive()) return false;
    event?.preventDefault?.();
    event?.stopImmediatePropagation?.();
    event?.stopPropagation?.();
    return true;
  }
  function restoreTabulatorFormGuard() {
    const guard = window[TABULATOR_FORM_GUARD_SLOT];
    if (!guard?.installed || !guard.prototype) return;
    try {
      if (guard.guardedSubmit && guard.prototype.submit === guard.guardedSubmit) guard.prototype.submit = guard.nativeSubmit;
      if (guard.guardedRequestSubmit && guard.prototype.requestSubmit === guard.guardedRequestSubmit) guard.prototype.requestSubmit = guard.nativeRequestSubmit;
      if (guard.prototype.__sacSubmitGuardRuntime === "SAC_V12") delete guard.prototype.__sacSubmitGuardRuntime;
    } catch (_error) {}
    try { delete window[TABULATOR_FORM_GUARD_SLOT]; } catch (_error) { window[TABULATOR_FORM_GUARD_SLOT] = undefined; }
  }
  function ensureTabulatorNavigationGuard() {
    if (tabulatorNavigationGuardInstalled) return;
    tabulatorNavigationGuardInstalled = true;
    addRuntimeEvent(document, "submit", (event) => {
      if (blockTabulatorNavigation(event)) return false;
      return true;
    }, true);
    addRuntimeEvent(document, "click", (event) => {
      if (!isTabulatorNavigationGuardActive()) return;
      const submitter = event.target?.closest?.('button[type="submit"],input[type="submit"],input[type="image"]');
      if (submitter) blockTabulatorNavigation(event);
    }, true);
    const proto = window.HTMLFormElement?.prototype;
    if (!proto) return;
    tabulatorNavigationState.isActive = isTabulatorNavigationGuardActive;
    if (window[TABULATOR_FORM_GUARD_SLOT]?.installed) return;
    const nativeSubmit = proto.submit;
    const nativeRequestSubmit = proto.requestSubmit;
    Object.defineProperty(proto, "__sacSubmitGuardRuntime", { value: "SAC_V12", configurable: true });
    const guardedSubmit = typeof nativeSubmit === "function"
      ? function sacGuardedSubmit(...args) {
        const state = window[TABULATOR_NAVIGATION_GUARD_SLOT];
        if (state?.isActive?.()) return undefined;
        return nativeSubmit.apply(this, args);
      }
      : null;
    const guardedRequestSubmit = typeof nativeRequestSubmit === "function"
      ? function sacGuardedRequestSubmit(...args) {
        const state = window[TABULATOR_NAVIGATION_GUARD_SLOT];
        if (state?.isActive?.()) return undefined;
        return nativeRequestSubmit.apply(this, args);
      }
      : null;
    if (guardedSubmit) proto.submit = guardedSubmit;
    if (guardedRequestSubmit) proto.requestSubmit = guardedRequestSubmit;
    window[TABULATOR_FORM_GUARD_SLOT] = {
      installed: true,
      prototype: proto,
      nativeSubmit,
      nativeRequestSubmit,
      guardedSubmit,
      guardedRequestSubmit
    };
  }
  function startTabulatorNavigationGuard() {
    ensureTabulatorNavigationGuard();
    tabulatorNavigationState.active = true;
    tabulatorNavigationState.until = Date.now() + 60000;
  }
  function releaseTabulatorNavigationGuard(cooldownMs = 20000) {
    tabulatorNavigationState.active = false;
    tabulatorNavigationState.until = Date.now() + cooldownMs;
  }
  registerRuntimeCleanup(() => {
    tabulatorNavigationState.active = false;
    tabulatorNavigationState.until = 0;
    restoreTabulatorFormGuard();
    if (window[TABULATOR_NAVIGATION_GUARD_SLOT] === tabulatorNavigationState) {
      try { delete window[TABULATOR_NAVIGATION_GUARD_SLOT]; } catch (_error) { window[TABULATOR_NAVIGATION_GUARD_SLOT] = undefined; }
    }
  });

  // ========================= CONFIGURAÇÕES ==========================
  const getTheme = () => storageGet("theme") === "light" ? "light" : "dark";
  const getSafeMode = () => storageGet("safeMode") !== "off";
  const setSafeMode = (enabled) => storageSet("safeMode", enabled ? "on" : "off");
  const getInvisibleMode = () => storageGet("invisibleMode") === "on";
  const setInvisibleMode = (enabled) => storageSet("invisibleMode", enabled ? "on" : "off");
  const getInvestigationMode = () => storageGet("investigationMode") === "on";
  const setInvestigationMode = (enabled) => storageSet("investigationMode", enabled ? "on" : "off");
  const getHelpMode = () => storageGet("helpMode") === "on";
  const setHelpMode = (enabled) => storageSet("helpMode", enabled ? "on" : "off");
  const setTheme = (theme) => {
    storageSet("theme", theme === "light" ? "light" : "dark");
    all(".sac-panel,.sac-history-panel").forEach((panel) => {
      panel.classList.toggle("sac-light", getTheme() === "light");
      panel.classList.toggle("sac-dark", getTheme() !== "light");
    });
  };
  const getFlowTone = (flow) => {
    const fallback = FLOW[flow]?.tone || FLOW.banking.tone;
    const value = storageGet(`flowTone:${flow}`);
    return FLOW_COLOR_OPTIONS.some(([color]) => color === value) ? value : fallback;
  };
  const setFlowTone = (flow, color) => {
    if (!FLOW[flow] || !FLOW_COLOR_OPTIONS.some(([option]) => option === color)) return false;
    const otherFlows = Object.keys(FLOW).filter((item) => item !== flow);
    if (otherFlows.some((item) => getFlowTone(item) === color)) return false;
    storageSet(`flowTone:${flow}`, color);
    all(`.sac-panel[data-flow="${cssEscape(flow)}"]`).forEach((panel) => {
      panel.style.setProperty("--sac-primary", color);
    });
    all(`.sac-pid-panel[data-flow="${cssEscape(flow)}"]`).forEach((panel) => {
      panel.style.setProperty("--sac-primary", color);
    });
    return true;
  };
  const flowConfig = (flow) => ({ ...(FLOW[flow] || FLOW.banking), tone: getFlowTone(flow) });
  const getFontScale = () => {
    const value = Number(storageGet("fontScale"));
    return Number.isFinite(value) ? Math.min(1.18, Math.max(0.92, value)) : 1.05;
  };
  const setFontScale = (value) => {
    const next = Math.min(1.18, Math.max(0.92, Number(value) || 1));
    storageSet("fontScale", String(next));
    all(".sac-panel,.sac-history-panel,.sac-choice-popover,.sac-side-panel,.sac-config")
      .forEach((panel) => panel.style.setProperty("--sac-font-scale", String(next)));
    all("[data-font-value]").forEach((node) => node.textContent = `${Math.round(next * 100)}%`);
    return next;
  };
  const adjustFontScale = (delta) => {
    const openConfigs = all(".sac-config.open").map((config) => ({ config, panel: config.closest(".sac-panel") }));
    const next = setFontScale(getFontScale() + delta);
    openConfigs.forEach(({ config, panel }) => {
      config.hidden = false;
      config.classList.add("open");
      if (panel) {
        panel.style.zIndex = "2147483646";
        placeConfigPanel(panel, config);
      }
    });
    return next;
  };
  function syncLiveSettings() {
    const theme = getTheme();
    all(".sac-panel,.sac-history-panel,.sac-choice-popover,.sac-side-panel,.sac-config").forEach((panel) => {
      panel.classList.toggle("sac-light", theme === "light");
      panel.classList.toggle("sac-dark", theme !== "light");
      panel.style.setProperty("--sac-font-scale", String(getFontScale()));
    });
    all(".sac-panel").forEach((panel) => {
      const flow = panel.dataset.flow;
      if (flow) panel.style.setProperty("--sac-primary", getFlowTone(flow));
      panel.style.setProperty("--sac-font-scale", String(getFontScale()));
    });
    all(".sac-pid-panel[data-flow]").forEach((panel) => {
      panel.style.setProperty("--sac-primary", getFlowTone(panel.dataset.flow));
    });
    all("[data-font-value]").forEach((node) => node.textContent = `${Math.round(getFontScale() * 100)}%`);
    all("[data-action='theme']").forEach((node) => { node.textContent = theme === "dark" ? "☀ Tema claro" : "☾ Tema escuro"; });
    all("[data-action='investigation-mode']").forEach((node) => {
      const enabled = getInvestigationMode();
      if (enabled) hydrateCounterpartyLocalRecords();
      else releaseInvestigationSession();
      node.classList.toggle("on", enabled);
      node.setAttribute("aria-pressed", enabled ? "true" : "false");
      const state = node.querySelector("b");
      if (state) state.textContent = enabled ? "Ligado" : "Desligado";
    });
    all("[data-action='help-mode']").forEach((node) => {
      const enabled = getHelpMode();
      node.classList.toggle("on", enabled);
      node.setAttribute("aria-pressed", enabled ? "true" : "false");
      const state = node.querySelector("b");
      if (state) state.textContent = enabled ? "Ligado" : "Desligado";
    });
    all("[data-action='safe-mode']").forEach((node) => {
      const enabled = getSafeMode();
      node.classList.toggle("on", enabled);
      node.setAttribute("aria-pressed", enabled ? "true" : "false");
      const state = node.querySelector("b");
      if (state) state.textContent = enabled ? "Ligado" : "Desligado";
    });
    all("[data-action='invisible-mode']").forEach((node) => {
      const enabled = getInvisibleMode();
      node.classList.toggle("on", enabled);
      node.setAttribute("aria-pressed", enabled ? "true" : "false");
      const state = node.querySelector("b");
      if (state) state.textContent = enabled ? "Ligado" : "Desligado";
    });
    all("[data-flow-color-choice]").forEach((node) => {
      node.classList.toggle("active", node.dataset.color === getFlowTone(node.dataset.flowColorChoice));
    });
    const sector = getSignatureSector();
    all("[data-signature-name]").forEach((node) => { node.value = getSignatureName(); });
    all("[data-signature-sector]").forEach((node) => {
      node.value = SIGNATURE_SECTORS.includes(sector) ? sector : "custom";
    });
    all("[data-signature-custom]").forEach((node) => {
      const custom = !SIGNATURE_SECTORS.includes(sector);
      node.hidden = !custom;
      node.value = custom ? sector : "";
    });
  }
  addRuntimeEvent(window, "storage", (event) => {
    if (!event.key || (event.key !== MEMORY_SETTINGS_STORAGE_KEY && !event.key.startsWith(key("")))) return;
    memory.mergeCurrentMirrors?.();
    syncLiveSettings();
  });
  const getSignatureName = () => String(storageGet("signatureName") || "").trim();
  const getSignatureSector = () => {
    const value = clean(storageGet("signatureSector"), DEFAULT_SIGNATURE_SECTOR);
    if (value === "Dock Tech Prevenção") return "Dock Teck Prevenção";
    return value;
  };
  const signatureText = () => {
    const name = getSignatureName();
    return name ? `${name} | ${getSignatureSector()}` : "";
  };
  function showNotice(message, type = "info", duration = NOTICE_MS) {
    // A interface já mostra as ações concluídas. Mantemos avisos apenas para
    // erros, atenção e a confirmação final, evitando uma fila de toasts.
    if (type === "info" || type === "success") return;
    ensureStyles();
    let host = byId("sac-notices");
    if (!host) {
      host = document.createElement("div");
      host.id = "sac-notices";
      document.body.appendChild(host);
    }
    const node = document.createElement("div");
    const classes = type === "warn-pulse" ? "warn warn-pulse" : type === "complete" ? "success" : type;
    node.className = `sac-notice ${classes} sac-${getTheme()}`;
    node.textContent = message;
    while (host.children.length >= 2) host.firstElementChild?.remove();
    host.appendChild(node);
    setTimeout(() => node.remove(), duration);
  }

  let clipboardEnvelopeReady = true;
  async function copyText(text) {
    const result = await memory.commit(text);
    clipboardEnvelopeReady = result.memoryCopied;
    if (result.textCopied) return true;
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch (_err) { return false; }
  }
  addRuntimeEvent(document, "copy", (event) => {
    memory.preserveCopyEvent?.(event);
  }, true);
  function installProgrammaticCopyPreserver() {
    const clipboard = navigator.clipboard;
    if (!clipboard || typeof clipboard.writeText !== "function" || typeof memory.preserveProgrammaticText !== "function") return;
    const ownDescriptor = Object.getOwnPropertyDescriptor(clipboard, "writeText");
    const nativeWriteText = clipboard.writeText.bind(clipboard);
    const wrappedWriteText = (text) => memory.preserveProgrammaticText(text, nativeWriteText);
    try {
      Object.defineProperty(clipboard, "writeText", { configurable: true, writable: true, value: wrappedWriteText });
    } catch (_error) {
      try { clipboard.writeText = wrappedWriteText; } catch (_ignored) { return; }
    }
    if (clipboard.writeText !== wrappedWriteText) return;
    registerRuntimeCleanup(() => {
      try {
        if (ownDescriptor) Object.defineProperty(clipboard, "writeText", ownDescriptor);
        else if (clipboard.writeText === wrappedWriteText) delete clipboard.writeText;
      } catch (_error) {}
    });
  }
  installProgrammaticCopyPreserver();

  function openChoicePopover({ id, title, options, selected = [], extraInput = null, onSave }) {
    ensureStyles();
    byId(id)?.remove();
    const panel = document.createElement("div");
    panel.id = id;
    panel.className = `sac-choice-popover sac-${getTheme()}`;
    panel.style.setProperty("--sac-primary", getFlowTone("banking"));
    panel.style.setProperty("--sac-font-scale", String(getFontScale()));
    const selectedSet = new Set((selected || []).map(normalize));
    panel.innerHTML = `
      <div class="sac-choice-head">
        <strong>${escapeHtml(title)}</strong>
      </div>
      <div class="sac-choice-grid">
      ${options.map((option, index) => `
        <label>
          <input type="checkbox" value="${escapeHtml(option)}" ${selectedSet.has(normalize(option)) ? "checked" : ""}>
          <span>${escapeHtml(option)}</span>
        </label>
      `).join("")}
      </div>
      ${extraInput ? `<label class="sac-choice-extra"><span>${escapeHtml(extraInput.label || "Complemento opcional")}</span><input data-choice-extra value="${escapeHtml(extraInput.value || "")}" placeholder="${escapeHtml(extraInput.placeholder || "")}"></label>` : ""}
      <div class="sac-choice-actions">
        <button data-save>Aplicar</button>
      </div>
    `;
    const host = byId("sac-panel-console") || byId("sac-panel-tabulador") || document.querySelector(".sac-panel");
    if (host) panel.dataset.owner = host.id;
    document.body.appendChild(panel);
    if (host) {
      placeAuxiliaryPanel(host, panel);
      panel.style.setProperty("--sac-primary", getComputedStyle(host).getPropertyValue("--sac-primary") || getFlowTone("banking"));
    }
    panel.querySelector("[data-save]")?.addEventListener("click", () => {
      const values = all("input:checked", panel).map((input) => input.value);
      const extra = panel.querySelector("[data-choice-extra]")?.value || "";
      onSave?.(values, extra);
      panel.remove();
    });
  }

  function closePidPanel() {
    byId("sac-pid-panel")?.remove();
  }
  function forcePidPanelVisible(panel) {
    if (!panel) return;
    const owner = byId(panel.dataset.owner || "sac-panel-console");
    panel.hidden = false;
    panel.classList.toggle("sac-minimized", Boolean(owner?.classList.contains("sac-minimized")));
    panel.style.setProperty("position", "fixed", "important");
    panel.style.setProperty("z-index", "2147483647", "important");
    ["display", "visibility", "opacity", "pointer-events"].forEach((property) => panel.style.removeProperty(property));
  }
  function closeAuxiliaryPanels(ownerId = "") {
    const scoped = ownerId ? `[data-owner="${cssEscape(ownerId)}"]` : "";
    all(`.sac-choice-popover${scoped}:not(.sac-pid-panel)`).forEach((panel) => panel.remove());
  }
  function placeAuxiliaryPanel(ownerPanel, auxPanel) {
    if (!ownerPanel || !auxPanel) return;
    const rect = ownerPanel.getBoundingClientRect();
    const width = auxPanel.offsetWidth || (auxPanel.classList.contains("sac-pid-panel") ? 360 : 354);
    const preferredLeft = rect.left - width - 8;
    const rightFallback = Math.min(window.innerWidth - width - 8, rect.right + 8);
    auxPanel.style.left = `${preferredLeft >= 8 ? preferredLeft : Math.max(8, rightFallback)}px`;
    auxPanel.style.right = "auto";
    auxPanel.style.top = `${Math.max(8, rect.top)}px`;
  }
  function placeConfigPanel(ownerPanel, configPanel) {
    if (!ownerPanel || !configPanel || configPanel.hidden) return;
    const rect = ownerPanel.getBoundingClientRect();
    const width = configPanel.offsetWidth || 360;
    const preferredLeft = rect.left - width - 8;
    const rightFallback = Math.min(window.innerWidth - width - 8, rect.right + 8);
    const top = Math.max(8, rect.top);
    configPanel.style.left = `${preferredLeft >= 8 ? preferredLeft : Math.max(8, rightFallback)}px`;
    configPanel.style.top = `${top}px`;
    configPanel.style.maxHeight = `${Math.max(180, window.innerHeight - top - 8)}px`;
    if (ownerPanel.id === "sac-panel-console") placePidPanel();
  }
  function placePidPanel() {
    const panel = byId("sac-pid-panel");
    const host = byId("sac-panel-console");
    if (!panel || !host || panel.classList.contains("sac-minimized") || host.classList.contains("sac-minimized")) return;
    const config = host.querySelector(".sac-config.open:not([hidden])");
    const visibleSides = all(`.sac-side-panel[data-owner="${cssEscape(host.id)}"]`).filter((item) => !item.classList.contains("sac-minimized"));
    const side = visibleSides[visibleSides.length - 1] || null;
    const anchor = config || side || host;
    const rect = anchor.getBoundingClientRect();
    const hostRect = host.getBoundingClientRect();
    const width = panel.offsetWidth || 420;
    const height = panel.offsetHeight || 420;
    const launcherReserve = anchor === host && host.querySelector(".sac-investigation-launcher") ? 100 : 0;
    const viewportWidth = Math.max(width + 16, window.innerWidth || document.documentElement.clientWidth || width + 16);
    const viewportHeight = Math.max(120, window.innerHeight || document.documentElement.clientHeight || 720);
    const oppositeOfSide = side
      ? (rect.left < hostRect.left ? hostRect.right + 8 : hostRect.left - width - 8)
      : null;
    const oppositeFits = oppositeOfSide !== null && oppositeOfSide >= 8 && oppositeOfSide + width <= viewportWidth - 8;
    const leftOfAnchor = rect.left - width - launcherReserve - 8;
    const rightOfAnchor = rect.right + 8;
    const fitsLeft = leftOfAnchor >= 8;
    const fitsRight = rightOfAnchor + width <= viewportWidth - 8;
    const left = oppositeFits ? oppositeOfSide : fitsLeft ? leftOfAnchor : fitsRight ? rightOfAnchor : Math.max(8, Math.min(hostRect.left, viewportWidth - width - 8));
    const below = rect.bottom + 8;
    const top = !oppositeFits && !fitsLeft && !fitsRight && below + Math.min(height, viewportHeight - 16) <= viewportHeight
      ? below
      : Math.max(8, Math.min(rect.top, viewportHeight - Math.min(height, viewportHeight - 16) - 8));
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    panel.style.right = "auto";
  }
  function pidProfileFor(data) {
    const issuer = clean(data?.issuer || data?.falcon?.issuer, "");
    const isAmigoz = normalize(issuer).includes("AMIGOZ");
    return {
      issuer: issuer || "N/A",
      title: isAmigoz ? "PID - AMIGOZ" : `PID - ${issuer || "PADRÃO"}`,
      required: isAmigoz ? PID_AMIGOZ_REQUIRED : PID_DEFAULT_REQUIRED,
      complementary: isAmigoz ? PID_AMIGOZ_COMPLEMENTARY : PID_DEFAULT_COMPLEMENTARY,
      note: isAmigoz
        ? "AMIGOZ possui PID próprio. Não aplicar bloqueio sem tentativa de contato, salvo fraude crítica evidente."
        : "Tempo mínimo de espera no ativo: 30 segundos. Não revele ao cliente quais respostas divergiram."
    };
  }
  function openPidPanel(data, options = {}) {
    ensureStyles();
    const host = byId("sac-panel-console");
    if (!host?.isConnected) return null;
    if (typeof closeSidePanels === "function") closeSidePanels(host.id);
    const existing = byId("sac-pid-panel");
    const pidKey = normalize(`${data?.falcon?.caseNumber || data?.caseNumber || ""}|${data?.issuer || data?.falcon?.issuer || ""}`);
    if (existing?.dataset.pidKey === pidKey && !options.rebuild) {
      const existingFlow = ["banking", "card", "hold"].includes(data?.visualFlow) ? data.visualFlow : (["banking", "card", "hold"].includes(data?.flow) ? data.flow : "banking");
      existing.dataset.flow = existingFlow;
      existing.style.setProperty("--sac-primary", getFlowTone(existingFlow));
      forcePidPanelVisible(existing);
      try { placePidPanel(); } catch (_error) { /* O painel já está visível na posição atual. */ }
      return existing;
    }
    existing?.remove();
    const profile = pidProfileFor(data);
    const panel = document.createElement("div");
    panel.id = "sac-pid-panel";
    panel.className = `sac-choice-popover sac-pid-panel sac-${getTheme()}`;
    panel.dataset.owner = "sac-panel-console";
    panel.dataset.pidKey = pidKey;
    panel.dataset.runtime = BUILD_VERSION;
    const pidFlow = ["banking", "card", "hold"].includes(data?.visualFlow) ? data.visualFlow : (["banking", "card", "hold"].includes(data?.flow) ? data.flow : "banking");
    panel.dataset.flow = pidFlow;
    panel.style.setProperty("--sac-primary", getFlowTone(pidFlow));
    panel.style.setProperty("--sac-font-scale", String(getFontScale()));
    const pid = data?.pidData || {};
    const knownPidValue = (label) => {
      const keyValue = normalize(label);
      if (keyValue.includes("NOME DO RESPONSAVEL") || keyValue.includes("NOME DO SOCIO")) return pid.responsibleName;
      if (keyValue.includes("CPF DO RESPONSAVEL") || keyValue.includes("CPF DO SOCIO")) return pid.responsibleCpf;
      if (keyValue.includes("NOME DO CLIENTE")) return pid.clientName;
      if (keyValue === "CPF") return pid.clientCpf || documentFieldValue(data?.cpfCnpj);
      if (keyValue.includes("NOME DA MAE")) return pid.motherName;
      if (keyValue.includes("CPF")) return String(data?.cpfCnpj || pid.document || "").replace(/\D/g, "").slice(-2);
      if (keyValue.includes("NASCIMENTO")) return pid.birthDate;
      if (keyValue.includes("CARTAO")) return data?.cardLast4 || data?.falcon?.cardLast4;
      if (keyValue.includes("ULTIMA COMPRA")) return pid.lastPurchase;
      if (keyValue.includes("ENDERECO")) return pid.address;
      if (keyValue.includes("TELEFONE")) return pid.phone || data?.phone;
      if (keyValue.includes("LIMITE") && keyValue.includes("SALDO")) return pid.cardLimit || pid.balance;
      if (keyValue.includes("LIMITE")) return pid.cardLimit;
      if (keyValue.includes("SALDO")) return pid.balance;
      return "";
    };
    const cards = (items) => items.map((item, index) => {
      const value = clean(knownPidValue(item), "");
      return `<div class="sac-pid-card ${value ? "sac-pid-filled" : ""}"><b>${index + 1}</b><span><strong>${escapeHtml(item)}</strong>${value ? `<small>${escapeHtml(value)}</small>` : ""}</span>${value ? "" : `<button type="button" class="sac-pid-reload sac-pid-reload-control" data-pid-reload="${escapeHtml(item)}" data-tooltip="Atualizar dado" aria-label="Buscar somente ${escapeHtml(item)}" aria-busy="false" title="Buscar este dado novamente na página do Console"><span class="sac-pid-reload-icon" aria-hidden="true">⟳</span></button>`}</div>`;
    }).join("");
    const identityLabels = documentKind(data?.cpfCnpj) === "CNPJ"
      ? ["Nome do responsável da empresa", "CPF do responsável"]
      : ["Nome do cliente", "CPF"];
    panel.innerHTML = `
      <div class="sac-choice-head">
        <strong>${escapeHtml(profile.title)}</strong>
      </div>
      <div class="sac-pid-note">${escapeHtml(profile.note)}</div>
      <div class="sac-pid-groups">
        <div class="sac-pid-group"><strong>Identificação</strong><div class="sac-pid-grid">${cards(identityLabels)}</div></div>
        <div class="sac-pid-group"><strong>Dados obrigatórios</strong><div class="sac-pid-grid">${cards(profile.required)}</div></div>
        ${profile.complementary.length ? `<div class="sac-pid-group"><strong>Dados complementares</strong><div class="sac-pid-grid">${cards(profile.complementary)}</div></div>` : ""}
      </div>
    `;
    forcePidPanelVisible(panel);
    document.body.appendChild(panel);
    try {
      placePidPanel();
    } catch (_error) {
      placeAuxiliaryPanel(host, panel);
    }
    requestAnimationFrame(() => {
      if (!panel.isConnected || !host.isConnected) return;
      forcePidPanelVisible(panel);
      placePidPanel();
    });
    all("[data-pid-reload]", panel).forEach((button) => button.addEventListener("click", () => {
      const icon = button.querySelector(".sac-pid-reload-icon");
      button.classList.remove("error");
      button.dataset.tooltip = "Buscando...";
      button.setAttribute("aria-busy", "true");
      if (icon) icon.textContent = "⟳";
      button.disabled = true;
      button.classList.add("loading");
      const label = button.dataset.pidReload || "";
      const result = collectConsolePidField(label, data);
      if (result.key && result.value) {
        data.pidData = { ...(data.pidData || {}), [result.key]: result.value };
        if (result.key === "phone" && !data.phone) data.phone = result.value;
        openPidPanel(data, { rebuild: true });
        return;
      }
      button.disabled = false;
      button.classList.remove("loading");
      button.classList.add("error");
      button.dataset.tooltip = "Não encontrado. Tentar novamente";
      button.setAttribute("aria-busy", "false");
      button.setAttribute("aria-label", `Tentar novamente: ${label}`);
      button.title = "Dado não encontrado. Clique para tentar novamente.";
      if (icon) icon.textContent = "!";
      showNotice(`Não encontrei ${label.toLowerCase()} nesta página do Console.`, "error", 10000);
    }));
    return panel;
  }

  function ensureStyles() {
    if (byId("sac-style-V12")) return;
    const style = document.createElement("style");
    style.id = "sac-style-V12";
    style.textContent = `
      .sac-panel{--sac-font-scale:1;--sac-primary:#14b8a6;--sac-panel-width:420px;position:fixed;top:8px;right:8px;z-index:2147483647;box-sizing:border-box!important;inline-size:var(--sac-panel-width)!important;width:var(--sac-panel-width)!important;min-inline-size:var(--sac-panel-width)!important;min-width:var(--sac-panel-width)!important;max-inline-size:var(--sac-panel-width)!important;max-width:var(--sac-panel-width)!important;border:1px solid var(--sac-border);border-top:3px solid var(--sac-primary);border-radius:8px;background:var(--sac-bg);color:var(--sac-text);font-family:Inter,Segoe UI,Arial,sans-serif;box-shadow:0 18px 44px rgba(0,0,0,.30);overflow:visible;text-align:left}
      .sac-panel,.sac-panel *{box-sizing:border-box!important}.sac-panel .sac-body,.sac-panel .sac-section,.sac-panel .sac-grid,.sac-panel .sac-field-grid,.sac-panel .sac-decision-grid,.sac-panel .sac-final-actions,.sac-panel textarea{min-width:0!important;max-width:100%!important}
      .sac-panel.sac-listas-panel{--sac-panel-width:min(720px,calc(100vw - 16px));left:8px;right:auto;top:8px;max-height:calc(100vh - 16px)}
      .sac-dark{--sac-bg:#121a26;--sac-panel:#1b2635;--sac-card:#111927;--sac-border:#465a73;--sac-text:#edf3fb;--sac-muted:#b9c7d9;--sac-input:#0f1724}.sac-light{--sac-bg:#fff;--sac-panel:#f3f6fa;--sac-card:#fff;--sac-border:#c9d6e6;--sac-text:#172033;--sac-muted:#5b697f;--sac-input:#fff}
      .sac-config{max-height:calc(100vh - 16px);overflow-y:auto;overscroll-behavior:contain}
      .sac-head{position:relative;z-index:4;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 8px;background:var(--sac-primary);color:#fff;cursor:grab;user-select:none;touch-action:none;text-shadow:0 1px 1px rgba(0,0,0,.55),0 0 1px rgba(0,0,0,.72)}.sac-head:active,.sac-history-head:active{cursor:grabbing}.sac-panel.sac-minimized .sac-body,.sac-panel.sac-minimized .sac-config{display:none!important}.sac-title{display:flex;align-items:center;gap:6px;font-size:calc(12px * var(--sac-font-scale));font-weight:950;line-height:1.1}.sac-flow-dot{width:10px;height:10px;border-radius:999px;background:var(--sac-primary);border:2px solid rgba(255,255,255,.72);box-shadow:0 0 0 1px rgba(0,0,0,.2)}.sac-subtitle{font-size:calc(9px * var(--sac-font-scale));opacity:.9;font-weight:800;max-width:260px;line-height:1.15}
      .sac-actions{display:flex;gap:4px}.sac-icon{width:28px;height:28px;border:1px solid rgba(255,255,255,.38);border-radius:5px;background:rgba(255,255,255,.15);color:#fff;cursor:pointer;font-size:15px;line-height:1;font-weight:950;display:grid;place-items:center;padding:0;text-shadow:0 1px 1px rgba(0,0,0,.55),0 0 1px rgba(0,0,0,.72)}.sac-icon.sac-emoji-icon{font-family:"Segoe UI Emoji","Apple Color Emoji",sans-serif;font-size:17px}.sac-icon.sac-emoji-icon span{display:grid;place-items:center;width:100%;height:100%;line-height:1}.sac-icon.close{background:#dc2626;border-color:#fecaca;color:#fff}
      .sac-config{position:fixed;left:auto;top:8px;width:360px;max-width:calc(100vw - 16px);z-index:2147483647;display:none;gap:7px;padding:8px;border:1px solid var(--sac-border);border-radius:8px;background:var(--sac-bg);box-shadow:0 14px 34px rgba(0,0,0,.28)}.sac-config.open{display:grid}.sac-config-title{font-size:11px;font-weight:950;color:var(--sac-muted);text-transform:uppercase}.sac-config-preview{border:1px solid var(--sac-border);border-radius:7px;background:var(--sac-card);padding:7px;color:var(--sac-text);font-size:11px;font-weight:900;overflow-wrap:anywhere}.sac-config input,.sac-config select,.sac-config button{width:100%;border:1px solid var(--sac-border);border-radius:6px;background:var(--sac-input);color:var(--sac-text);padding:7px;font-weight:850}.sac-config input:hover,.sac-config select:hover,.sac-config button:hover,.sac-config input:focus,.sac-config select:focus,.sac-config button:focus{border-color:#38bdf8;background:#12314a;color:#edf3fb;box-shadow:0 0 0 2px rgba(56,189,248,.22);outline:none;filter:brightness(1.08)}.sac-light .sac-config input:hover,.sac-light .sac-config select:hover,.sac-light .sac-config button:hover,.sac-light .sac-config input:focus,.sac-light .sac-config select:focus,.sac-light .sac-config button:focus{background:#eef7ff;color:#172033}.sac-font-block{display:grid;gap:4px}.sac-font-label{color:var(--sac-muted);font-size:10px;font-weight:950;text-transform:uppercase}.sac-config-row{display:grid;grid-template-columns:54px minmax(0,1fr) 54px;gap:0;align-items:stretch;border:1px solid var(--sac-border);border-radius:7px;background:var(--sac-card);overflow:hidden}.sac-config-row button{min-height:36px;border:0!important;border-radius:0!important;background:var(--sac-input);font-size:16px;font-weight:950;padding:6px 4px;box-shadow:none!important}.sac-config-row button+*{border-left:1px solid var(--sac-border)}.sac-config-row button:hover,.sac-config-row button:focus{background:#12314a!important;color:#fff!important;filter:none!important}.sac-light .sac-config-row button:hover,.sac-light .sac-config-row button:focus{background:#e0f2fe!important;color:#172033!important}.sac-font-value{display:grid;place-items:center;background:var(--sac-card);color:var(--sac-text);font-size:12px;font-weight:950;padding:0 8px}.sac-flow-legend{display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px}.sac-flow-legend span{display:flex;align-items:center;gap:4px;border:1px solid var(--sac-border);border-radius:6px;background:var(--sac-card);padding:5px 4px;font-size:9px;font-weight:950;color:var(--sac-muted)}.sac-flow-legend i{width:10px;height:10px;border-radius:999px;display:inline-block}.sac-signature-editor,.sac-color-editor{display:none;gap:6px}.sac-signature-editor.open,.sac-color-editor.open{display:grid}.sac-color-row{display:grid;grid-template-columns:62px minmax(0,1fr);gap:6px;align-items:center}.sac-color-row strong{font-size:10px;color:var(--sac-muted);font-weight:950}.sac-color-swatches{display:flex;gap:5px;flex-wrap:nowrap;align-items:center}.sac-color-swatch{width:20px!important;height:20px!important;min-width:20px;border-radius:999px!important;padding:0!important;border:2px solid var(--sac-border)!important;background:var(--swatch)!important;cursor:pointer}.sac-color-swatch.active{border-color:#fff!important;box-shadow:0 0 0 2px var(--swatch)}.sac-light .sac-color-swatch.active{border-color:#172033!important}.sac-signature-custom[hidden]{display:none!important}.sac-toggle{display:grid!important;grid-template-columns:34px minmax(0,1fr) auto;align-items:center;justify-items:start;gap:7px;text-align:left}.sac-toggle span:not(.sac-switch),.sac-toggle b{justify-self:start;text-align:left}.sac-toggle b{font-size:10px;color:var(--sac-muted)}.sac-switch{position:relative;width:32px;height:18px;border-radius:999px;background:#64748b;box-shadow:inset 0 0 0 1px rgba(255,255,255,.18)}.sac-switch:after{content:"";position:absolute;left:3px;top:3px;width:12px;height:12px;border-radius:999px;background:#fff;transition:.15s}.sac-toggle.on .sac-switch{background:#16a34a}.sac-toggle.on .sac-switch:after{left:17px}.sac-toggle.on b{color:#86efac}
      .sac-body{padding:5px;display:grid;gap:5px}.sac-section{border:1px solid var(--sac-border);border-radius:6px;background:var(--sac-panel);padding:5px}.sac-section-title{display:flex;align-items:center;justify-content:space-between;gap:8px;color:var(--sac-muted);font-size:calc(9px * var(--sac-font-scale));font-weight:950;text-transform:uppercase;margin-bottom:4px}.sac-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:3px}.sac-single-alert{grid-column:1/-1;min-height:50px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:calc(13px * var(--sac-font-scale));font-weight:950;letter-spacing:.02em}
      .sac-kv{position:relative;min-width:0;min-height:34px;margin-top:7px;border:1px solid var(--sac-border);border-radius:5px;background:var(--sac-card);padding:7px 4px 4px;transition:border-color .15s,background .15s,box-shadow .15s,color .15s;cursor:pointer}.sac-kv:hover,.sac-field:hover{border-color:#38bdf8;background:#10263a;box-shadow:0 0 0 2px rgba(56,189,248,.12)}.sac-kv.sac-copied{border-color:#22c55e!important;box-shadow:0 0 0 2px rgba(34,197,94,.28)!important}.sac-light .sac-kv:hover,.sac-light .sac-field:hover{background:#eef7ff;color:#172033}.sac-kv-label{position:absolute;top:-8px;left:4px;max-width:calc(100% - 8px);padding:1px 3px;border-radius:3px;background:var(--sac-panel);font-size:calc(8px * var(--sac-font-scale));font-weight:900;color:var(--sac-muted);line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sac-kv-value{display:flex;align-items:center;min-height:23px;font-size:calc(11px * var(--sac-font-scale));font-weight:800;color:var(--sac-text);line-height:1.08;overflow-wrap:anywhere}.sac-light .sac-kv:hover .sac-kv-label,.sac-light .sac-kv:hover .sac-kv-value{color:#172033}.sac-missing{border-color:#f59e0b!important;background:#3a230b!important;animation:sacPulseOrange 1s ease-in-out infinite}.sac-light .sac-missing{background:#fff7ed!important}.sac-history-ok{background:#052e1a;border-color:#15803d}.sac-history-warn,.sac-alert-warn{background:#3a230b;border-color:#c2410c}.sac-history-danger,.sac-alert-danger{background:#3a0d0d;border-color:#ef4444;animation:sacPulseRed 1s ease-in-out infinite}.sac-light .sac-history-ok{background:#ecfdf5;border-color:#86efac}.sac-light .sac-history-warn,.sac-light .sac-alert-warn{background:#fff7ed;border-color:#fdba74}.sac-light .sac-history-danger,.sac-light .sac-alert-danger{background:#fef2f2}@keyframes sacPulseRed{0%,100%{box-shadow:0 0 0 rgba(239,68,68,0);filter:saturate(1)}50%{box-shadow:0 0 12px rgba(239,68,68,.65);filter:saturate(1.35)}}@keyframes sacPulseOrange{0%,100%{box-shadow:0 0 0 rgba(245,158,11,0)}50%{box-shadow:0 0 12px rgba(245,158,11,.70)}}
      .sac-field-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px}.sac-console-flags{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px}.sac-console-flags .sac-toggle{min-height:34px;border:1px solid var(--sac-border);border-radius:6px;background:var(--sac-card);color:var(--sac-text);font:inherit;text-align:left;padding:6px 5px;cursor:pointer;grid-template-columns:28px minmax(0,1fr)!important;appearance:none}.sac-console-flags .sac-toggle b{display:none}.sac-console-flags .sac-toggle span:not(.sac-switch){font-size:calc(9.4px * var(--sac-font-scale));font-weight:950;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sac-console-flags .sac-toggle[aria-disabled="true"]{opacity:.52;cursor:not-allowed}.sac-console-flags .sac-toggle:hover{border-color:#38bdf8;background:#10263a;box-shadow:0 0 0 2px rgba(56,189,248,.12)}.sac-light .sac-console-flags .sac-toggle:hover{background:#eef7ff;color:#172033}.sac-jira-reference{display:grid;gap:3px;margin-top:4px;border:1px solid var(--sac-border);border-radius:6px;background:var(--sac-card);padding:5px}.sac-jira-reference[hidden]{display:none!important}.sac-jira-reference span{color:var(--sac-muted);font-size:calc(8.7px * var(--sac-font-scale));font-weight:950}.sac-jira-reference input{width:100%;height:29px;border:1px solid var(--sac-border);border-radius:5px;background:var(--sac-input);color:var(--sac-text);padding:4px 6px;font-size:calc(10.4px * var(--sac-font-scale));font-weight:850}.sac-jira-reference input:focus{border-color:#38bdf8;outline:none;box-shadow:0 0 0 2px rgba(56,189,248,.16)}.sac-jira-reference small{color:var(--sac-muted);font-size:calc(8px * var(--sac-font-scale));font-weight:800}.sac-field{display:grid;gap:2px;min-width:0;border:1px solid var(--sac-border);border-radius:6px;background:var(--sac-card);padding:4px;transition:border-color .15s,box-shadow .15s,background .15s}.sac-field span{display:block;font-size:calc(8.4px * var(--sac-font-scale));font-weight:900;color:var(--sac-muted);line-height:1.05}.sac-field select,.sac-field input{width:100%;height:28px;border:1px solid var(--sac-border);border-radius:5px;background:var(--sac-input);color:var(--sac-text);font-size:calc(10.6px * var(--sac-font-scale));font-weight:800;padding:3px}.sac-field select:hover,.sac-field select:focus,.sac-field input:hover,.sac-field input:focus{border-color:#38bdf8;background:#10263a;color:#edf3fb;outline:none;box-shadow:0 0 0 2px rgba(56,189,248,.16)}.sac-light .sac-field select:hover,.sac-light .sac-field select:focus,.sac-light .sac-field input:hover,.sac-light .sac-field input:focus{background:#eef7ff;color:#172033}.sac-other-input[hidden]{display:none!important}
      .sac-main{width:100%;border:0;border-radius:6px;background:var(--sac-primary);color:#fff;font-size:calc(11.5px * var(--sac-font-scale));font-weight:950;padding:9px 7px;line-height:1.12;cursor:pointer;white-space:normal;overflow-wrap:anywhere;text-shadow:0 1px 1px rgba(0,0,0,.55),0 0 1px rgba(0,0,0,.72)}.sac-main:hover,.sac-secondary:hover,.sac-decision:hover,.sac-icon:hover{filter:brightness(1.12);box-shadow:0 0 0 2px rgba(255,255,255,.14)}.sac-secondary{width:100%;border:1px solid var(--sac-border);border-radius:6px;background:transparent;color:var(--sac-text);font-size:calc(11px * var(--sac-font-scale));font-weight:950;padding:8px 7px;line-height:1.12;cursor:pointer;white-space:normal}.sac-decision-grid,.sac-final-actions{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:4px}.sac-decision{min-height:54px;border:0;border-radius:6px;color:#fff;font-size:calc(11.5px * var(--sac-font-scale));font-weight:950;line-height:1.08;white-space:pre-line;cursor:pointer;padding:7px 5px;overflow-wrap:anywhere;text-shadow:0 1px 1px rgba(0,0,0,.55),0 0 1px rgba(0,0,0,.72)}.sac-decision.danger{background:#dc2626}.sac-decision.success{background:#16a34a}.sac-decision.warning{background:#d97706}.sac-decision.info{background:#2563eb}
      .sac-textarea{width:100%;height:232px;border:1px solid var(--sac-border);border-radius:6px;background:var(--sac-input);color:var(--sac-text);font:700 calc(10.5px * var(--sac-font-scale))/1.08 Consolas,Menlo,monospace;padding:6px;resize:none;overflow:hidden;white-space:pre-wrap}.sac-motive{height:62px;font:800 calc(11px * var(--sac-font-scale))/1.2 Inter,Segoe UI,Arial,sans-serif}.sac-final-textarea{height:286px;font-size:calc(10.8px * var(--sac-font-scale));line-height:1.12}.sac-final-textarea.sac-final-card{height:214px}
      #sac-notices{position:fixed;left:50%;right:auto;bottom:16px;transform:translateX(-50%);z-index:2147483647;display:grid;gap:6px;justify-items:center;pointer-events:none}.sac-notice{width:min(360px,calc(100vw - 36px));border:1px solid #38506c;border-left:4px solid #2563eb;border-radius:8px;background:#101722;color:#f8fbff;padding:8px 10px;font:800 11.5px/1.22 Inter,Segoe UI,Arial,sans-serif;box-shadow:0 10px 26px rgba(0,0,0,.24);opacity:.96;text-align:left;pointer-events:auto}.sac-notice.success{border-left-color:#16a34a;background:#062e1b;color:#ecfdf5}.sac-notice.warn{border-left-color:#d97706;background:#351f05;color:#fff7ed}.sac-notice.warn-pulse{animation:sacPulseOrange 1.15s ease-in-out infinite}.sac-notice.error{border-left-color:#dc2626;background:#3a0d0d;color:#fef2f2}.sac-notice.info{border-left-color:#2563eb;background:#0b2442;color:#eff6ff}.sac-notice.sac-light{background:#fff;color:#172033;border-color:#cbd5e1}.sac-notice.sac-light.success{background:#ecfdf5;color:#064e3b}.sac-notice.sac-light.warn{background:#fff7ed;color:#7c2d12}.sac-notice.sac-light.error{background:#fef2f2;color:#7f1d1d}.sac-notice.sac-light.info{background:#eff6ff;color:#1e3a8a}
      .sac-choice-popover{position:fixed;right:14px;top:72px;z-index:2147483647;width:min(354px,calc(100vw - 28px));display:grid;gap:6px;padding:0 8px 8px;border:1px solid var(--sac-border);border-top:3px solid var(--sac-primary);border-radius:8px;background:var(--sac-bg);color:var(--sac-text);box-shadow:0 18px 44px rgba(0,0,0,.32);font-family:Inter,Segoe UI,Arial,sans-serif;box-sizing:border-box!important}.sac-choice-popover.sac-minimized{display:none!important}.sac-choice-popover *{box-sizing:border-box!important}.sac-choice-head{margin:0 -8px;padding:7px 8px;background:var(--sac-primary);color:#fff;display:flex;justify-content:space-between;align-items:center;border-radius:6px 6px 0 0}.sac-choice-head strong{font-size:12px}.sac-choice-head button{width:24px;height:24px;padding:0;border-color:#fecaca;background:#dc2626;color:#fff}.sac-choice-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:4px}.sac-choice-popover label{display:flex;gap:5px;align-items:flex-start;min-width:0;min-height:34px;border:1px solid var(--sac-border);border-radius:5px;background:var(--sac-card);padding:5px;font-size:9.5px;font-weight:850;line-height:1.15;cursor:pointer;word-break:normal;overflow-wrap:normal;hyphens:none;white-space:normal}.sac-choice-popover label>span{display:block;min-width:0;white-space:normal;word-break:normal;overflow-wrap:normal;hyphens:none}.sac-choice-popover label:hover{border-color:#38bdf8;background:#10263a;color:#edf3fb}.sac-light.sac-choice-popover label:hover{background:#eef7ff;color:#172033}.sac-choice-popover input[type="checkbox"]{flex:0 0 auto;margin:1px 0 0}.sac-choice-extra{display:grid!important;gap:4px;min-height:0!important;font-size:10.5px!important}.sac-choice-extra input{width:100%;height:30px;border:1px solid var(--sac-border);border-radius:6px;background:var(--sac-input);color:var(--sac-text);padding:5px;font-weight:850}.sac-choice-popover .sac-choice-actions{display:grid;grid-template-columns:1fr;gap:6px}.sac-choice-popover button{border:1px solid var(--sac-border);border-radius:6px;background:var(--sac-primary);color:#fff;padding:8px;font-weight:950;cursor:pointer}.sac-choice-popover button.secondary{background:transparent;color:var(--sac-text)}.sac-pid-panel{width:min(420px,calc(100vw - 16px))!important;min-width:0!important;max-width:420px!important;max-height:calc(100vh - 16px);overflow:auto;padding:0 10px 10px!important}.sac-pid-panel .sac-choice-head{margin:0 -10px}.sac-pid-groups{display:grid;gap:7px}.sac-pid-group{display:grid;gap:4px}.sac-pid-group strong{font-size:10px;color:var(--sac-muted);text-transform:uppercase}.sac-pid-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:4px}.sac-pid-card{border:1px solid var(--sac-border);border-radius:6px;background:var(--sac-card);padding:5px 7px;min-height:44px;font-size:10.5px;font-weight:850;line-height:1.12;display:grid;grid-template-columns:22px minmax(0,1fr) 25px;align-items:center;align-content:center;gap:5px}.sac-pid-card.sac-pid-filled{border-color:#22c55e;background:rgba(34,197,94,.10)}.sac-pid-card b{display:grid;place-items:center;width:20px;height:20px;border-radius:4px;background:var(--sac-primary);color:#fff;font-size:9px}.sac-pid-card span strong{display:block;color:var(--sac-text);font-size:10px;text-transform:none}.sac-pid-card span small{display:block;margin-top:2px;color:var(--sac-muted);font-size:9.5px;overflow-wrap:break-word}.sac-pid-reload{width:24px!important;height:24px!important;min-width:24px;padding:0!important;display:grid;place-items:center;border-radius:5px!important;background:var(--sac-input)!important;color:var(--sac-text)!important;font-size:15px}.sac-pid-reload.loading{animation:sacPidSpin .75s linear infinite}.sac-pid-card.sac-pid-filled:after{content:"✓";display:grid;place-items:center;width:20px;height:20px;border-radius:999px;background:#16a34a;color:#fff;font-size:10px}@keyframes sacPidSpin{to{transform:rotate(360deg)}}.sac-pid-note{border:1px solid #f59e0b;border-radius:6px;background:#3a230b;color:#fff7ed;padding:6px;font-size:10.5px;font-weight:900;line-height:1.18}.sac-light .sac-pid-note{background:#fff7ed;color:#7c2d12}
      .sac-apply-status{border:1px solid var(--sac-border);border-left:4px solid #2563eb;border-radius:6px;background:var(--sac-card);color:var(--sac-text);padding:7px;font-size:calc(10.5px * var(--sac-font-scale));font-weight:900;line-height:1.15}.sac-apply-status.ok{border-left-color:#16a34a}.sac-apply-status.warn{border-left-color:#d97706}.sac-apply-status.error{border-left-color:#dc2626}.sac-issue-list{display:grid;gap:4px;margin-top:6px}.sac-issue-list span{display:block;border:1px solid #f59e0b;border-radius:5px;background:rgba(245,158,11,.12);padding:5px 6px;color:var(--sac-text);font-size:calc(10px * var(--sac-font-scale));font-weight:900;text-align:left}
      .sac-history-panel{--sac-font-scale:1.05;--sac-history-tone:#64748b;position:fixed;left:10px;top:10px;z-index:2147483647;box-sizing:border-box!important;width:min(900px,calc(100vw - 20px));max-height:min(720px,calc(100vh - 20px));border:1px solid var(--sac-border);border-top:3px solid var(--sac-history-tone);border-radius:8px;background:var(--sac-bg);color:var(--sac-text);font-family:Inter,Segoe UI,Arial,sans-serif;box-shadow:0 18px 44px rgba(0,0,0,.30);overflow:hidden}.sac-history-panel *{box-sizing:border-box!important}.sac-history-head{display:flex;justify-content:space-between;align-items:center;gap:8px;background:var(--sac-history-tone);color:#fff;padding:8px;font-size:calc(12px * var(--sac-font-scale));font-weight:950;cursor:grab;user-select:none;touch-action:none}.sac-history-tools{display:grid;grid-template-columns:minmax(180px,1fr) repeat(3,minmax(112px,150px));gap:6px;padding:7px;border-bottom:1px solid var(--sac-border);background:var(--sac-panel)}.sac-history-tools input,.sac-history-tools select{min-width:0;height:34px;border:1px solid var(--sac-border);border-radius:7px;background:var(--sac-input);color:var(--sac-text);padding:7px 9px;font-size:calc(10px * var(--sac-font-scale));font-weight:900;outline:none}.sac-history-tools input:hover,.sac-history-tools select:hover,.sac-history-tools input:focus,.sac-history-tools select:focus{border-color:#38bdf8;background:#12314a;color:#edf3fb;box-shadow:0 0 0 2px rgba(56,189,248,.18)}.sac-light .sac-history-tools input:hover,.sac-light .sac-history-tools select:hover,.sac-light .sac-history-tools input:focus,.sac-light .sac-history-tools select:focus{background:#eef7ff;color:#172033}.sac-history-body{display:grid;grid-template-columns:260px 1fr;gap:6px;padding:6px}.sac-history-list{display:grid;gap:4px;align-content:start;max-height:560px;overflow:auto;padding-right:3px}.sac-history-list button{text-align:left;border:1px solid var(--sac-border);border-radius:6px;background:var(--sac-card);color:var(--sac-text);padding:7px;font-size:calc(10px * var(--sac-font-scale));font-weight:900;line-height:1.1;cursor:pointer}.sac-history-list button:hover,.sac-history-list button.active{border-color:#38bdf8;background:#10263a;color:#edf3fb;box-shadow:0 0 0 2px rgba(56,189,248,.12);transform:translateY(-1px)}.sac-light .sac-history-list button:hover,.sac-light .sac-history-list button.active{background:#eef7ff;color:#172033}.sac-history-list small{display:block;color:var(--sac-muted);font-size:calc(9px * var(--sac-font-scale));margin-top:2px}.sac-history-empty{color:var(--sac-muted);font-weight:850;padding:8px}.sac-history-identifiers{grid-template-columns:repeat(2,minmax(0,1fr));margin-bottom:6px}.sac-history-detail textarea{height:472px;overflow:auto;resize:none}.sac-list-tabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;margin-bottom:6px}.sac-list-tabs button{min-width:0;border:1px solid var(--sac-border);border-radius:6px;background:var(--sac-card);color:var(--sac-text);padding:8px 3px;font-size:9.5px;font-weight:950;line-height:1.05;cursor:pointer;overflow-wrap:anywhere}.sac-list-tabs button:hover,.sac-list-tabs button.active{border-color:#38bdf8;background:#12314a;color:#edf3fb;box-shadow:0 0 0 2px rgba(56,189,248,.14)}.sac-light .sac-list-tabs button:hover,.sac-light .sac-list-tabs button.active{background:#eef7ff;color:#172033}.sac-allowlist-list{display:grid;gap:7px;max-height:min(560px,calc(100vh - 210px));overflow:auto;padding-right:3px}.sac-list-issuer-group{display:grid;gap:5px}.sac-list-issuer-head{display:flex;align-items:center;justify-content:space-between;gap:8px;border-left:4px solid var(--sac-primary);border-radius:5px;background:var(--sac-panel);padding:6px 7px}.sac-list-issuer-head strong{min-width:0;overflow-wrap:break-word;font-size:11px}.sac-list-issuer-head button{flex:0 0 auto;border:1px solid #86efac;border-radius:5px;background:#166534;color:#fff;padding:5px 7px;font-size:9px;font-weight:950;cursor:pointer}.sac-allowlist-item{border:1px solid var(--sac-border);border-radius:7px;background:var(--sac-card);padding:6px;display:grid;grid-template-columns:1fr 72px;gap:6px;align-items:stretch}.sac-allowlist-item:hover{border-color:#38bdf8;box-shadow:0 0 0 2px rgba(56,189,248,.14)}.sac-allowlist-row{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:3px}.sac-allowlist-actions{display:grid;grid-template-rows:1fr 1fr;gap:4px}.sac-allowlist-actions button{border:0;border-radius:6px;color:#fff;font-size:10px;font-weight:950;cursor:pointer}.sac-allowlist-actions [data-list-apply]{background:#16a34a}.sac-allowlist-actions [data-list-remove]{background:#dc2626}@media(max-width:760px){.sac-history-tools{grid-template-columns:1fr 1fr}.sac-history-body{grid-template-columns:1fr}.sac-history-list{max-height:180px}}
      .sac-help-btn{position:absolute;top:3px;right:3px;width:18px;height:18px;border:1px solid #fde68a;border-radius:999px;background:#d4af37;color:#1f1600;font-size:11px;font-weight:950;line-height:1;display:grid;place-items:center;padding:0;cursor:pointer;box-shadow:0 0 0 1px rgba(0,0,0,.16)}.sac-help-btn:hover{filter:brightness(1.12);box-shadow:0 0 0 2px rgba(250,204,21,.32)}
      .sac-pid-reload-control{position:relative;transition:transform .14s ease,filter .14s ease,box-shadow .14s ease}.sac-pid-reload-control:hover:not(:disabled){filter:brightness(1.18);transform:scale(1.08);box-shadow:0 0 0 2px rgba(56,189,248,.22)}.sac-pid-reload-control:focus-visible{outline:2px solid #67e8f9;outline-offset:2px}.sac-pid-reload-control.error{border-color:#fca5a5!important;background:#b91c1c!important;color:#fff!important;animation:none}.sac-pid-reload-control:before{content:attr(data-tooltip);position:absolute;right:calc(100% + 7px);top:50%;z-index:2;min-width:max-content;max-width:180px;transform:translateY(-50%) scale(.98);border:1px solid var(--sac-border);border-radius:5px;background:var(--sac-bg);color:var(--sac-text);padding:4px 6px;box-shadow:0 8px 18px rgba(0,0,0,.28);font-size:9px;font-weight:900;line-height:1;opacity:0;pointer-events:none;transition:opacity .12s ease,transform .12s ease}.sac-pid-reload-control:hover:before,.sac-pid-reload-control:focus-visible:before{opacity:1;transform:translateY(-50%) scale(1)}.sac-pid-reload-control.loading:before{display:none}.sac-pid-reload-icon{display:grid;place-items:center;width:100%;height:100%;font-size:14px;line-height:1}
      .sac-side-panel{--sac-font-scale:1.05;position:fixed;z-index:2147483647;width:320px;max-height:calc(100vh - 16px);overflow:hidden;border:1px solid var(--sac-border);border-top:3px solid var(--sac-primary);border-radius:8px;background:var(--sac-bg);color:var(--sac-text);box-shadow:0 18px 44px rgba(0,0,0,.32);font-family:Inter,Segoe UI,Arial,sans-serif;text-align:left}.sac-side-panel,.sac-side-panel *{box-sizing:border-box!important}.sac-side-panel.sac-minimized{display:none!important}.sac-side-head{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:7px 8px;background:var(--sac-primary);color:#fff;font-size:calc(12px * var(--sac-font-scale));font-weight:950;text-align:left;text-shadow:0 1px 1px rgba(0,0,0,.58),0 0 1px rgba(0,0,0,.72)}.sac-side-body{display:grid;gap:5px;padding:7px;overflow:hidden;text-align:left}.sac-investigation-drawer .sac-side-body,.sac-help-drawer .sac-side-body,.sac-context-drawer .sac-side-body{max-height:calc(100vh - 64px);overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;scrollbar-width:thin}.sac-side-group{display:grid;gap:4px;min-width:0;text-align:left}.sac-side-group-title{border-left:3px solid var(--sac-primary);padding-left:6px;color:var(--sac-text);font-size:calc(10px * var(--sac-font-scale));font-weight:950;text-transform:uppercase;line-height:1.1;text-align:left}.sac-side-card{display:block;width:100%;min-width:0;max-width:100%;min-height:32px;border:1px solid var(--sac-border);border-radius:6px;background:var(--sac-card);padding:5px 6px;text-align:left;overflow:hidden}.sac-side-card span{display:block;max-width:100%;font-size:calc(10px * var(--sac-font-scale));line-height:1.18;color:var(--sac-muted);font-weight:800;white-space:normal;word-break:normal;overflow-wrap:break-word;text-align:left}.sac-side-card[data-cnpj-copy]{cursor:pointer;transition:border-color .15s,background .15s,box-shadow .15s}.sac-side-card[data-cnpj-copy]:hover{border-color:#38bdf8;background:#10263a;box-shadow:0 0 0 2px rgba(56,189,248,.12)}.sac-light .sac-side-card[data-cnpj-copy]:hover{background:#eef7ff;color:#172033}.sac-side-card[data-cnpj-copy].sac-copied{border-color:#22c55e!important;box-shadow:0 0 0 2px rgba(34,197,94,.28)!important}
      .sac-support-panel{width:312px;max-width:calc(100vw - 16px)}.sac-support-actions{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:4px}.sac-support-actions[hidden]{display:none!important}.sac-support-actions.three{grid-template-columns:repeat(3,minmax(0,1fr))}.sac-support-actions.three button{font-size:9.5px;padding:7px 3px}.sac-support-summary{border-left:3px solid var(--sac-primary)}.sac-support-summary.success{border-color:#16a34a;background:#052e1a}.sac-support-summary.warning{border-color:#d97706;background:#3a230b}.sac-support-summary.danger{border-color:#dc2626;background:#3a0d0d}.sac-support-summary.neutral{border-color:#64748b}.sac-light .sac-support-summary.success{background:#ecfdf5}.sac-light .sac-support-summary.warning{background:#fff7ed}.sac-light .sac-support-summary.danger{background:#fef2f2}.sac-investigation-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px}.sac-investigation-grid{align-items:stretch}.sac-investigation-grid>.sac-grid-full{grid-column:1/-1}.sac-support-empty{color:var(--sac-muted);font-size:10px;font-weight:850}.sac-investigation-grid .sac-side-card{position:relative;width:100%;min-height:35px;margin-top:7px;display:flex;flex-direction:column;justify-content:center;text-align:left;padding:8px 5px 4px!important;overflow:visible}.sac-investigation-grid .sac-side-card strong{display:block;font-size:9.5px;line-height:1.08;color:var(--sac-text);overflow-wrap:break-word;text-align:left}.sac-investigation-alert{border:1px solid #ef4444!important;background:#3a0d0d!important;animation:sacPulseInvestigationRed 1.05s ease-in-out infinite}.sac-support-summary.sac-investigation-alert{border-left-width:1px!important}.sac-light .sac-investigation-alert{background:#fef2f2!important}@keyframes sacPulseInvestigationRed{0%,100%{box-shadow:inset 0 0 0 0 rgba(239,68,68,.15),0 0 0 rgba(239,68,68,0)}50%{box-shadow:inset 0 0 0 1px rgba(239,68,68,.82),0 0 8px rgba(239,68,68,.46)}}
      .sac-cnpj-card{position:relative;padding-right:30px!important}.sac-cnpj-indicator{position:absolute;right:6px;top:50%;transform:translateY(-50%);display:grid;width:19px;height:19px;place-items:center;border:1px solid var(--sac-border);border-radius:999px;background:transparent;color:var(--sac-muted);font-size:11px;font-weight:950}.sac-cnpj-card.is-success{border-color:#16a34a;background:#052e1a}.sac-cnpj-card.is-warning{border-color:#d97706;background:#3a230b}.sac-cnpj-card.is-danger{border-color:#dc2626;background:#3a0d0d}.sac-cnpj-indicator.is-success{border-color:#22c55e;background:#16a34a;color:#fff}.sac-cnpj-indicator.is-warning{border-color:#f59e0b;background:#d97706;color:#fff}.sac-cnpj-indicator.is-danger{border-color:#ef4444;background:#dc2626;color:#fff}.sac-light .sac-cnpj-card.is-success{background:#ecfdf5}.sac-light .sac-cnpj-card.is-warning{background:#fff7ed}.sac-light .sac-cnpj-card.is-danger{background:#fef2f2}
      .sac-cnpj-state{display:block;margin-top:2px;color:var(--sac-muted);font-size:8.4px;line-height:1.05;font-style:normal;font-weight:900}.sac-launcher-icon{display:grid!important;place-items:center;width:16px!important;height:16px!important;border-radius:5px;background:color-mix(in srgb,var(--sac-primary) 20%,var(--sac-input));color:var(--sac-primary);font-size:10px!important;font-weight:950;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--sac-primary) 42%,var(--sac-border))}
      .sac-panel.sac-minimized .sac-investigation-launcher{display:none}.sac-chevron{display:grid;place-items:center;width:18px;height:18px;font:950 24px/1 "Segoe UI Symbol","Segoe UI",Arial,sans-serif;transform:translateY(-1px);text-shadow:0 1px 1px rgba(0,0,0,.48)}.sac-drawer-toggle{width:30px;height:28px;border:1px solid rgba(255,255,255,.52);border-radius:7px;background:rgba(255,255,255,.16);color:#fff;display:grid;place-items:center;padding:0;cursor:pointer;transition:background .15s,transform .15s,box-shadow .15s}.sac-drawer-toggle:hover,.sac-drawer-toggle:focus-visible{background:rgba(255,255,255,.28);transform:translateX(1px);box-shadow:0 0 0 2px rgba(255,255,255,.20);outline:none}.sac-investigation-controls{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px}.sac-investigation-controls.count-1{grid-template-columns:minmax(0,1fr)}.sac-investigation-controls.count-2{grid-template-columns:repeat(2,minmax(0,1fr))}.sac-investigation-controls button{min-width:0;min-height:32px;display:flex;align-items:center;justify-content:center;gap:4px;border:1px solid var(--sac-border);border-radius:6px;background:var(--sac-card);color:var(--sac-text);padding:4px 3px;text-align:center;font-size:8.8px;font-weight:950;line-height:1.08;cursor:pointer}.sac-investigation-controls button:hover,.sac-investigation-controls button:focus,.sac-investigation-controls button.active,.sac-investigation-controls button.selected{border-color:#38bdf8;background:#10263a;color:#edf3fb;box-shadow:0 0 0 2px rgba(56,189,248,.14);outline:none}.sac-light .sac-investigation-controls button:hover,.sac-light .sac-investigation-controls button:focus,.sac-light .sac-investigation-controls button.active,.sac-light .sac-investigation-controls button.selected{background:#eef7ff;color:#172033}.sac-investigation-controls button span{display:grid;place-items:center;width:16px;height:16px;border-radius:5px;background:var(--sac-primary);color:#fff;font-size:8.5px}.sac-investigation-controls .sac-investigation-cnpj{font-size:8.8px;background:transparent}.sac-investigation-result{display:grid;gap:5px;margin-top:5px}
      .sac-side-panel,.sac-config.open,.sac-pid-panel{animation:sacPanelEnter .18s cubic-bezier(.2,.8,.2,1) both;transform-origin:top right}.sac-transaction-view{display:grid;gap:6px}.sac-transaction-metric{border-color:color-mix(in srgb,var(--sac-primary) 34%,var(--sac-border))!important;background:color-mix(in srgb,var(--sac-primary) 7%,var(--sac-card))!important}.sac-transaction-metric strong{font-size:10px!important}.sac-merchant-card{display:grid;gap:4px;padding:6px!important}.sac-merchant-card>strong{display:block;font-size:10.5px;color:var(--sac-text);overflow-wrap:break-word}.sac-merchant-meta{display:flex!important;flex-wrap:wrap;gap:3px;margin-top:1px}.sac-merchant-meta i{display:inline-flex;align-items:center;min-height:19px;border:1px solid var(--sac-border);border-radius:4px;background:var(--sac-input);color:var(--sac-muted);padding:2px 4px;font-size:8.5px;font-style:normal;font-weight:900;line-height:1.05}.sac-side-head,.sac-choice-head{box-shadow:inset 0 -1px 0 rgba(255,255,255,.18)}@keyframes sacPanelEnter{from{opacity:0;transform:translateX(8px) scale(.985)}to{opacity:1;transform:translateX(0) scale(1)}}@media (prefers-reduced-motion:reduce){.sac-side-panel,.sac-config.open,.sac-pid-panel{animation:none!important}.sac-switch:after{transition:none!important}}
      .sac-investigation-drawer .sac-side-body{gap:7px}.sac-investigation-drawer .sac-side-card span{color:var(--sac-text);font-size:calc(9.5px * var(--sac-font-scale));line-height:1.18}.sac-investigation-drawer .sac-side-group-title{font-size:calc(9.3px * var(--sac-font-scale))}.sac-investigation-grid .sac-side-card>strong{position:absolute;top:-7px;left:4px;z-index:1;max-width:calc(100% - 8px);padding:1px 3px;border-radius:3px;background:var(--sac-bg);color:var(--sac-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:calc(8.2px * var(--sac-font-scale))!important}.sac-counterparty-line{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:4px;align-items:stretch}.sac-counterparty-line .sac-side-card{min-height:38px}.sac-counterparty-line strong{display:block;color:var(--sac-text);font-size:calc(8.8px * var(--sac-font-scale));line-height:1.08}.sac-cnpj-selector{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px}.sac-cnpj-selector button{min-width:0;border:1px solid var(--sac-border);border-radius:6px;background:var(--sac-card);color:var(--sac-text);padding:5px 6px;text-align:left;cursor:pointer}.sac-cnpj-selector button.selected,.sac-cnpj-selector button:hover{border-color:#38bdf8;background:#10263a;box-shadow:0 0 0 2px rgba(56,189,248,.14)}.sac-light .sac-cnpj-selector button.selected,.sac-light .sac-cnpj-selector button:hover{background:#eef7ff;color:#172033}.sac-cnpj-selector strong,.sac-cnpj-selector span{display:block;overflow-wrap:anywhere}.sac-cnpj-selector strong{color:var(--sac-muted);font-size:calc(7.6px * var(--sac-font-scale));font-weight:800;line-height:1.05}.sac-cnpj-selector button.selected strong,.sac-cnpj-selector button:hover strong{color:inherit}.sac-cnpj-selector span{margin-top:2px;font-size:calc(9.5px * var(--sac-font-scale));font-weight:900}.sac-cnpj-actions button{min-width:0;min-height:34px;display:flex;align-items:center;justify-content:center;gap:4px;border-width:1px;border-style:solid;border-radius:6px;color:#fff;font-size:calc(9.2px * var(--sac-font-scale));line-height:1.05;text-align:center;font-weight:950;cursor:pointer;text-shadow:0 1px 1px rgba(0,0,0,.48)}.sac-cnpj-actions i{display:grid;place-items:center;width:16px;height:16px;border-radius:999px;background:rgba(255,255,255,.18);font-style:normal}.sac-classify-favorable{background:#166534!important;border-color:#4ade80!important}.sac-classify-suspicious{background:#991b1b!important;border-color:#f87171!important}.sac-classify-remove{background:#334155!important;border-color:#94a3b8!important}.sac-cnpj-actions button:hover,.sac-cnpj-actions button:focus-visible{filter:brightness(1.14);box-shadow:0 0 0 2px rgba(255,255,255,.16);outline:none}
      .sac-investigation-launcher{position:absolute;left:-92px;top:48px;z-index:1;width:92px;height:32px;display:grid;grid-template-columns:16px minmax(0,1fr) 11px;align-items:center;gap:5px;border:1px solid var(--sac-border);border-right:0;border-left:3px solid var(--sac-primary);border-radius:9px 0 0 9px;background:var(--sac-panel);color:var(--sac-text);padding:0 6px;box-shadow:-8px 8px 24px rgba(0,0,0,.30),inset 0 1px rgba(255,255,255,.08);font-size:9.5px;font-weight:950;line-height:1;letter-spacing:0;cursor:pointer;transition:opacity .14s ease,transform .16s ease,border-color .16s ease,background .16s ease,box-shadow .16s ease}.sac-investigation-launcher.sac-help-launcher{top:84px}.sac-investigation-launcher.sac-help-launcher.sac-solo-launcher{top:48px}.sac-investigation-launcher.sac-launcher-open{opacity:0;pointer-events:none;transform:translateX(-5px)}.sac-investigation-launcher:hover,.sac-investigation-launcher:focus-visible{filter:none;transform:translateX(-2px);border-color:#38bdf8;border-left-color:var(--sac-primary);background:var(--sac-input);box-shadow:-10px 9px 28px rgba(0,0,0,.36),0 0 0 2px rgba(56,189,248,.16);outline:none}.sac-launcher-chevron{display:grid;place-items:center;color:var(--sac-muted);font:950 18px/1 "Segoe UI Symbol","Segoe UI",Arial,sans-serif;font-style:normal}.sac-investigation-launcher:hover .sac-launcher-chevron{color:var(--sac-text)}.sac-investigation-drawer,.sac-help-drawer{width:332px;border:1px solid var(--sac-border);border-left:3px solid var(--sac-primary);border-right:2px solid var(--sac-primary);border-top-width:1px;border-radius:10px 4px 4px 10px;background:var(--sac-bg);box-shadow:0 22px 54px rgba(0,0,0,.38),inset 0 1px rgba(255,255,255,.05)}.sac-investigation-head{position:relative;display:grid;grid-template-columns:30px minmax(0,1fr);align-items:center;gap:8px;min-height:48px;padding:7px 8px;background:var(--sac-panel);border-bottom:1px solid var(--sac-border);border-radius:7px 2px 0 0;color:var(--sac-text)}.sac-investigation-head:after{content:"";position:absolute;left:38px;right:10px;bottom:-1px;height:1px;background:var(--sac-primary);opacity:.75}.sac-investigation-mark{position:relative;display:grid;width:28px;height:28px;place-items:center;border:1px solid color-mix(in srgb,var(--sac-primary) 70%,var(--sac-border));border-radius:7px;background:color-mix(in srgb,var(--sac-primary) 12%,var(--sac-input))}.sac-investigation-mark:before,.sac-investigation-mark:after{content:"";position:absolute;background:var(--sac-primary);opacity:.8}.sac-investigation-mark:before{width:12px;height:1px}.sac-investigation-mark:after{width:1px;height:12px}.sac-investigation-mark i{display:block;width:7px;height:7px;border:2px solid var(--sac-primary);border-radius:999px}.sac-investigation-heading{display:grid;gap:2px;min-width:0;text-align:left}.sac-investigation-heading strong{font-size:11.5px;line-height:1;color:var(--sac-text)}.sac-investigation-heading small{font-size:8.5px;line-height:1;color:var(--sac-muted);font-weight:900;text-transform:uppercase}.sac-investigation-collapse{position:absolute;left:-39px;top:8px;z-index:3;display:grid;width:34px;height:34px;place-items:center;border:1px solid var(--sac-border);border-right:3px solid var(--sac-primary);border-radius:9px 4px 4px 9px;background:var(--sac-panel);color:var(--sac-text);padding:0;cursor:pointer;box-shadow:-8px 8px 22px rgba(0,0,0,.28);transition:border-color .15s ease,background .15s ease,transform .15s ease}.sac-investigation-chevron{display:grid;place-items:center;width:22px;height:22px;border-radius:999px;background:color-mix(in srgb,var(--sac-primary) 18%,var(--sac-input));font:950 25px/1 "Segoe UI Symbol","Segoe UI",Arial,sans-serif;transform:translateX(1px)}.sac-investigation-collapse:hover,.sac-investigation-collapse:focus-visible{border-color:#38bdf8;border-right-color:var(--sac-primary);background:#10263a;color:#edf3fb;transform:translateX(1px);box-shadow:-8px 8px 24px rgba(0,0,0,.34),0 0 0 2px rgba(56,189,248,.14);outline:none}.sac-light .sac-investigation-collapse:hover,.sac-light .sac-investigation-collapse:focus-visible{background:#eef7ff;color:#172033}.sac-book-guidance{padding:5px;border:1px solid color-mix(in srgb,var(--sac-primary) 28%,var(--sac-border));border-radius:7px;background:color-mix(in srgb,var(--sac-primary) 5%,var(--sac-panel))}.sac-book-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px}.sac-book-grid .sac-side-card{min-height:54px;display:flex;align-items:center}.sac-book-grid .sac-side-card span{line-height:1.2}
      .sac-list-group-actions{display:flex;align-items:center;gap:4px}.sac-list-group-actions button{font-size:8.5px!important;padding:5px 6px!important}.sac-list-group-actions [data-list-remove-issuer]{background:#991b1b!important;border-color:#f87171!important}.sac-list-group-actions button:disabled{opacity:.58;cursor:wait}
      .sac-investigation-controls button{font-size:calc(8.8px * var(--sac-font-scale))}.sac-investigation-controls button span{font-size:calc(8.5px * var(--sac-font-scale))}.sac-investigation-controls .sac-investigation-cnpj{font-size:calc(8.8px * var(--sac-font-scale))}.sac-investigation-heading strong{font-size:calc(11.5px * var(--sac-font-scale))}.sac-investigation-heading small{font-size:calc(8.5px * var(--sac-font-scale))}.sac-transaction-metric strong,.sac-merchant-card>strong{font-size:calc(10px * var(--sac-font-scale))!important}.sac-merchant-meta i{font-size:calc(8.5px * var(--sac-font-scale))}
      .sac-investigation-head{grid-template-columns:30px minmax(0,1fr) auto}.sac-investigation-head:after{right:92px}.sac-investigation-collapse{position:static;left:auto;top:auto;width:auto;min-width:82px;height:30px;display:grid;grid-template-columns:18px auto;gap:4px;border:1px solid var(--sac-border);border-right:1px solid var(--sac-primary);border-radius:7px;box-shadow:none;padding:0 7px;font-size:9px;font-weight:950}.sac-investigation-collapse:hover,.sac-investigation-collapse:focus-visible{transform:none;box-shadow:0 0 0 2px rgba(56,189,248,.14)}.sac-investigation-collapse .sac-investigation-chevron{width:18px;height:18px;font-size:18px;transform:none}.sac-investigation-collapse-label{white-space:nowrap}
      .sac-invisible-active>.sac-head>.sac-actions [data-action="config"],.sac-invisible-active>.sac-head>.sac-actions [data-action="history"]{display:none}.sac-panel.sac-minimized .sac-invisible-hub{display:none}.sac-invisible-hub{position:absolute;left:-42px;top:48px;z-index:6;width:38px;font-family:Inter,Segoe UI,Arial,sans-serif}.sac-invisible-hub-toggle{width:38px;height:38px;display:grid;place-items:center;border:1px solid var(--sac-border);border-right:3px solid var(--sac-primary);border-radius:9px 4px 4px 9px;background:var(--sac-panel);color:var(--sac-text);padding:0;cursor:pointer;box-shadow:-8px 8px 22px rgba(0,0,0,.28);font-size:20px;font-weight:950;line-height:1}.sac-invisible-hub-toggle:hover,.sac-invisible-hub-toggle:focus-visible,.sac-invisible-hub.open .sac-invisible-hub-toggle{border-color:#38bdf8;border-right-color:var(--sac-primary);background:#10263a;color:#edf3fb;box-shadow:-8px 8px 24px rgba(0,0,0,.34),0 0 0 2px rgba(56,189,248,.14);outline:none}.sac-light .sac-invisible-hub-toggle:hover,.sac-light .sac-invisible-hub-toggle:focus-visible,.sac-light .sac-invisible-hub.open .sac-invisible-hub-toggle{background:#eef7ff;color:#172033}.sac-invisible-hub-menu{position:absolute;top:43px;right:0;width:132px;display:grid;gap:4px;padding:5px;border:1px solid var(--sac-border);border-radius:8px;background:var(--sac-bg);box-shadow:0 14px 32px rgba(0,0,0,.34)}.sac-invisible-hub-menu[hidden]{display:none}.sac-invisible-hub-menu button{min-height:32px;display:grid;grid-template-columns:22px minmax(0,1fr);align-items:center;gap:5px;border:1px solid var(--sac-border);border-radius:6px;background:var(--sac-card);color:var(--sac-text);padding:5px 6px;text-align:left;font-size:9.5px;font-weight:950;cursor:pointer}.sac-invisible-hub-menu button span{display:grid;width:20px;height:20px;place-items:center;border-radius:5px;background:var(--sac-primary);color:#fff}.sac-invisible-hub-menu button:hover,.sac-invisible-hub-menu button:focus-visible{border-color:#38bdf8;background:#10263a;color:#edf3fb;outline:none}.sac-light .sac-invisible-hub-menu button:hover,.sac-light .sac-invisible-hub-menu button:focus-visible{background:#eef7ff;color:#172033}.sac-invisible-anchor{border:0!important;border-top:0!important;background:transparent!important;box-shadow:none!important}.sac-invisible-anchor>.sac-head{width:42px;height:42px;padding:0;background:transparent;cursor:default;overflow:visible}.sac-invisible-anchor>.sac-head>div:first-child,.sac-invisible-anchor>.sac-head>.sac-actions,.sac-invisible-anchor>.sac-body{display:none!important}.sac-invisible-anchor .sac-invisible-hub{position:relative;left:auto;top:auto;width:42px}.sac-invisible-anchor .sac-invisible-hub-toggle{width:42px;height:42px;border-right-width:1px;border-left:3px solid var(--sac-primary);border-radius:9px}.sac-invisible-anchor .sac-invisible-hub-menu{right:0}
      @media (max-width:460px){.sac-grid,.sac-field-grid{grid-template-columns:1fr}.sac-history-body{grid-template-columns:1fr}.sac-book-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  // ========================= AJUDA DIDÁTICA =========================
  const ISSUER_HELP = [
    { match: ["ONLYPAY"], title: "ONLYPAY", items: ["Cliente premiado via JIRA usa allowlist por 5 dias corridos.", "Durante o período de LISTAS, evitar bloqueios de fraude relacionados ao caso validado.", "BANKING não fraude entra em LISTAS quando houver ID conta."] },
    { match: ["SOFISA"], title: "SOFISA", items: ["Regra de contenção usa prazo de 3 dias.", "Não fraude com contenção entra em Allowlist e Contenção.", "Quando não for contenção, seguir prazo padrão da lista aplicável."] },
    { match: ["CONTA SIMPLES", "CONTA SIMPLES 155"], title: "CONTA SIMPLES", items: ["Tratativa normal pode entrar em LISTAS quando a conta tem pelo menos 90 dias e não possui bloqueio ou SPD.", "JIRA autorizado entra em LISTAS mesmo com bloqueio, SPD ou conta recente.", "Avaliar perfil, CNPJ recente, nome suspeito e indícios de fraude antes de liberar."] },
    { match: ["AMIGOZ"], title: "AMIGOZ", items: ["Possui PID próprio no fluxo de cartão.", "Bloqueio preventivo só com cliente não reconhecendo ou fraude crítica evidente.", "Tentar contato entre 08h e 22h em suspeita de fraude."] },
    { match: ["TIPCARD"], title: "TIPCARD", items: ["SPD 29 é bloqueio estratégico.", "A operação DBM não deve remover esse bloqueio.", "Remoção indevida pode comprometer a estratégia antifraude."] },
    { match: ["WUDIPAY"], title: "WUDIPAY", items: ["Não bloquear contas deste emissor.", "Alertas devem ser classificados como não fraude e tabulados normalmente."] },
    { match: ["EZZEPAY", "EZZE PAY"], title: "EZZEPAY", items: ["Opera com conta única e foco em Pix Checkout.", "Não bloquear; tratar alertas como não fraude e tabular."] },
    { match: ["REDEFROTA", "REDE FROTA", "FROTABANK", "FROTA BANK", "LYON"], title: "REDEFROTA / FROTABANK", items: ["Código do emissor: 266.", "Perfil comum: caminhoneiros, postos, restaurantes e oficinas.", "Transferências de alto valor podem ser compatíveis com o perfil.", "Não bloquear apenas por alto valor ou falta de contato isolada."] },
    { match: ["NOH"], title: "NOH", items: ["Conta de casais com regra HOLD rígida.", "Atenção a valores altos, e-mail com JOIA e conta recente incompatível.", "Validar idade da conta, região, renda, vínculo e endereço."] },
    { match: ["TRAMPAY"], title: "TRAMPAY", items: ["Perfil esperado: entregadores e motoboys.", "Fora do perfil com indício de fraude pode justificar bloqueio.", "Regra de referência: Nega_Nao_Entregador_V2."] },
    { match: ["BEMOL"], title: "BEMOL", items: ["Atuação concentrada na região Norte.", "Conta fora da região pode ser sinal de atenção.", "boleto_valor_suspeito é alto risco: classificar como fraude e aplicar SPD 15."] },
    { match: ["IFOOD", "IFOOD DOCK"], title: "IFOOD", items: ["Capital de Giro iFood não deve ter bloqueio de cartão pela operação.", "Manter análise e abordagem, mas bloqueio é responsabilidade do iFood."] },
    { match: ["JEITTO", "JEITTO DOCK", "JEITTODOCK", "JEITTODOCKONE", "JEITTO DOCK ONE"], title: "JEITTO", items: ["Perfil: inclusão financeira para classes C/D, baixa renda e pequenas transações.", "Uso esperado: remédios, gás, contas, pequenas compras e despesas emergenciais.", "Produtos: Pré não possui empréstimos; É Grana possui transferências, empréstimos e Pix.", "Crédito costuma ser baixo após onboarding, geralmente entre R$ 50 e R$ 200.", "Atenção a P2P em sequência, conta nova com alto volume, valores acima de R$ 5 mil ou R$ 10 mil no mês.", "Infrações iguais ou acima de 004 são alerta forte para a análise.", "Tratativa JeittoDock One das 09h às 18h; DBM após 18h, fins de semana e feriados.", "Em suspeita, seguir fluxo de bloqueio preventivo; cancelamento fica a critério da JeittoDockOne."] },
    { match: ["MEU TUDO"], title: "MEU TUDO", items: ["Bloquear somente com confirmação de fraude pelo cliente.", "Sem contato ou sem confirmação: não bloquear apenas por ausência de retorno."] }
  ];
  const RULE_HELP = [
    { match: ["HOLD"], title: "HOLD", items: ["Bloqueio cautelar Pix tem análise manual e prazo regulatório de até 72h.", "Não aplicar SPD15 nem LISTAS em tratativa HOLD.", "Não fraude: aprovar transação e aplicar HOLD para liberar o valor.", "Fraude: declinar valor e aplicar HOLD; SPD17 é aplicado automaticamente.", "Se houver múltiplas HOLDs, tratar todas as linhas com regra HOLD."] },
    { match: ["DENYLIST_EC"], title: "DENYLIST_EC", items: ["Risco concentrado no estabelecimento comercial.", "Contato e PID são obrigatórios para confirmar se o cliente reconhece a compra.", "Não bloquear automaticamente por conta nova ou transação alta isolada.", "Verificar recorrência, MCC, histórico no estabelecimento e padrão de compra."] },
    { match: ["DENYLIST_CCS"], title: "DENYLIST_CCS", items: ["Origem comum: cliente informou ao CCS que não reconhece a transação.", "O estabelecimento pode ficar em blocklist por 10 dias.", "Validar retorno do emissor/JIRA antes de liberar.", "Atualize o status do caso para não deixar ativo indevidamente."] },
    { match: ["DENYLIST"], title: "DENYLIST", items: ["Lista restritiva exige análise completa antes da decisão.", "Avaliar cadastro, extrato, DICT, similaridade e comportamento transacional.", "Não decidir por um único indício; busque pelo menos duas evidências consistentes.", "Se houver suspeita, aplicar SPD conforme política. Se não houver, liberar por allowlist."] },
    { match: ["CONTENCAO", "CONTENÇÃO", "CONTENSAO", "CONTENSÃO"], title: "CONTENÇÃO", items: ["BANKING não fraude entra em Allowlist e também em Contenção.", "Na Contenção, usar CPF/CNPJ sem pontos, traços ou barra.", "Sofisa usa prazo de 3 dias; demais emissores usam 48h.", "Somente allowlist não libera contenção; as duas listas são complementares."] },
    { match: ["AUTO_FRAUDE", "AUTO FRAUDE", "AUTOFRAUDE"], title: "AUTO FRAUDE", items: ["Realizar até 3 tentativas de contato ativo.", "Se atender, validar PID e questionar uso em estabelecimento próprio.", "Se não atender ou não validar PID, bloquear o cartão.", "Não confundir auto fraude com autofinanciamento no dropdown de Extrato."] },
    { match: ["CAPITAL_DE_GIRO", "CAPITAL DE GIRO"], title: "CAPITAL DE GIRO", items: ["Validar compatibilidade com perfil, atividade, origem e destino.", "Atenção a triangulação, recorrência e conta recente.", "Em Capital de Giro iFood, não bloquear cartão pela operação; decisão é do iFood."] },
    { match: ["BLOQUEIO PREVENTIVO FALCON", "BLOQUEIO PREVENTIVO FALCON 254", "FALCON 254"], title: "BLOQUEIO PREVENTIVO FALCON", items: ["Cartão: bloquear quando o cliente responde ao CCS/SMS que não reconhece a compra.", "Cartão: com suspeita e sem contato, aplicar bloqueio temporário; Ifood e Amigoz somente com contato.", "Banking/JIRA: regra alinhada ao emissor pode aplicar bloqueio preventivo automaticamente.", "Exemplo JSLNEW: perfil esperado é caminhoneiro com P2P recebido de conta vinculada ao emissor.", "Fora do perfil esperado pode indicar conta laranja; validar Console, Big Data e Receita Federal quando PJ.", "Extrato deve ser compatível com o perfil do emissor e com a movimentação esperada.", "Possível conta laranja com sustentação: aplicar SPD 21.", "Documento de baixa qualidade sem sustentação de conta laranja: aplicar SPD 2 para atualização documental.", "Em alerta Falcon Banking com suspeita: aplicar SPD 15.", "Se a suspeita for descartada, encerrar como não foi possível confirmar não fraude e manter bloqueio até JIRA."] },
    { match: ["SPD 1", "SPD01", "SPD 01"], title: "SPD 01", items: ["Aguardando documentos no onboarding KYC.", "Bloqueia Cash-IN e Cash-OUT.", "Remoção automática após envio e aprovação dos documentos obrigatórios.", "Mesa principal: N2 SAC Onboarding; cenário atípico: GLB Risks/Ragnarok."] },
    { match: ["SPD 2", "SPD02", "SPD 02"], title: "SPD 02", items: ["Pendência de ajuste documental no onboarding.", "Bloqueia Cash-IN e Cash-OUT.", "Cliente deve reenviar documentos pendentes para análise KYC.", "Usado quando documento tem inconsistência ou baixa qualidade sem sustentação de conta laranja."] },
    { match: ["SPD 8", "SPD08", "SPD 08"], title: "SPD 08", items: ["Política preventiva de risco por comportamento suspeito.", "Bloqueia Cash-IN e Cash-OUT.", "Em regra, não pode ser removido pela mesa.", "Se veio automático com motivo de SPD 2, a mesa deve analisar documentação."] },
    { match: ["SPD 15"], title: "SPD 15", items: ["Suspeita de fraude transacional.", "Bloqueia Cash-IN e Cash-OUT.", "Remoção depende de ticket e documentos do titular.", "Tratativa Falcon/Prevenção; casos de grande porte ou dúvida podem exigir N3."] },
    { match: ["SPD 17"], title: "SPD 17", items: ["Fraude transacional confirmada.", "Bloqueia Cash-IN e Cash-OUT.", "Só pode ser removido se o titular enviar evidências de que não houve fraude.", "Se a fraude for confirmada, o bloqueio não deve ser removido."] },
    { match: ["SPD 21"], title: "SPD 21", items: ["Desinteresse comercial por política de risco.", "Bloqueia Cash-IN e permite Cash-OUT.", "Não é removido pela mesa.", "Pode ser aplicado quando houver sustentação de possível conta laranja."] },
    { match: ["SPD 25"], title: "SPD 25", items: ["Notificação de infração por suspeita em Cash-IN/reembolso.", "Permite Cash-IN e bloqueia Cash-OUT.", "Se não houver evidência, pode remover; se fraude confirmar, cancelar.", "Tratativa indicada: N3 BK Fraud Prevention."] },
    { match: ["SPD 33", "SPD33", "BLOQUEADO PREVENCAO", "BLOQUEADO PREVENÇÃO"], title: "SPD 33 / BLOQUEADO PREVENÇÃO", items: ["Status de prevenção que não permite transações.", "Remoção deve passar por Fraud Prevention.", "Validar histórico, documentação, extrato e sustentação antes de qualquer baixa."] },
    { match: ["BLOQUEADA", "BLOQUEADO"], title: "STATUS CONTA BLOQUEADA", items: ["Status 1 indica bloqueio simples de conta.", "Pode ser removido pelo parceiro ou analista via Console/API quando aplicável.", "Status 33 Bloqueado Prevenção não permite transações e a remoção é via Fraud Prevention."] },
    { match: ["CANCELADA", "CANCELADO"], title: "STATUS CONTA CANCELADA", items: ["Status 2 indica cancelamento aplicado pelo parceiro ou pela Dock.", "Geralmente vem acompanhado de SPD.", "Validar motivo antes de seguir a tratativa."] },
    { match: ["ACAO JUDICIAL", "AÇÃO JUDICIAL"], title: "AÇÃO JUDICIAL", items: ["Status 30 permite Cash-IN e bloqueia Cash-OUT.", "Desbloqueio intraday após 17h, conforme tabela do book.", "Direcionar conforme política operacional."] },
    { match: ["CONTA NAO ATIVADA", "CONTA NÃO ATIVADA"], title: "CONTA NÃO ATIVADA", items: ["Status 200 indica conta ainda não ativada.", "Após o primeiro Cash-IN, muda para Normal.", "Não tratar como fraude isoladamente sem contexto adicional."] },
    { match: ["CANCELAMENTO DEFINITIVO FALCON", "CANCELAMENTO DEFINITIVO"], title: "CANCELAMENTO DEFINITIVO FALCON", items: ["Status 255 indica cancelamento definitivo Falcon.", "Não seguir como bloqueio simples.", "Validar alçada e histórico antes de qualquer tratativa manual."] },
    { match: ["HISTORICO", "HISTÓRICO", "DICT"], title: "HISTÓRICO DICT", items: ["Histórico de infração é vinculado ao CPF/CNPJ, não apenas à instituição.", "Formato usado no fluxo: 4 dígitos para 30 dias, 3 para 90 dias e 3 para 60 meses.", "Se houver 3 ou mais infrações no bloco relevante, tratar como alerta crítico."] },
    { match: ["P2P_OUT_DIF", "P2P OUT DIF", "DIF_CONTA", "DIF DEVICE", "DIF_DEVICE"], title: "P2P / Dispositivo diferente", items: ["Saída de valor para fora da conta com dispositivo diferente exige cautela.", "O alerta não confirma falta de 2FA; ele indica aparelho incomum ou não confiável.", "Verificar vínculo do destino, dispositivo, limite, conta controle e padrão transacional."] },
    { match: ["ALTO_RISCO_NEGA_CASHOUT_LIMITE_ISPB"], title: "Alto risco Cashout / ISPB", items: ["Quando o emissor solicitar a liberação via JIRA, utilizar ALLOWLIST_EMISSOR e ALLOWLIST_CASHOUT_LIMITE_ISPB_CRYPTO em conjunto.", "O caso BANKING concluído como não fraude fica disponível nas duas abas de LISTAS até a inclusão."] },
    { match: ["NAO_TRATAR_NEGA_CASHOUT_LIMITE_ISPB"], title: "Não tratar Cashout / ISPB", items: ["A allowlist isolada não resolve esta regra.", "Direcionar por JIRA ao N3 BK Regras de Fraude Alçadas e sinalizar a supervisão conforme o book."] },
    { match: ["CASHOUT", "CHASHOUT"], title: "Cashout", items: ["Cashout indica saída ou saque de saldo.", "Avaliar velocidade, horário, dispositivo, histórico e possível triangulação.", "Fim de semana ou madrugada aumenta a necessidade de contexto."] },
    { match: ["SEMP2PIN", "SEM P2PIN", "VELOCIDADE"], title: "Velocidade / Segundo fator", items: ["Velocidade indica sequência incomum em curto intervalo.", "Sem P2Pin sugere operação sem camada adicional de validação.", "Cruzar com dispositivo, horário, destino e histórico da conta."] },
    { match: ["PIXIN_DICT", "PIX IN DICT", "DICT_BBC"], title: "PixIn DICT", items: ["Regra ligada à situação cadastral do CPF/CNPJ vinculado à chave Pix.", "Confirmar se há irregularidade cadastral antes de decidir.", "Não confundir com notícia falsa sobre tributação de Pix."] },
    { match: ["PIX_MADRUGADA"], title: "Pix Madrugada", items: ["Pix enviados em sequência na madrugada podem indicar velocidade atípica.", "Verificar recorrência, destinatários, vínculo e histórico do cliente."] },
    { match: ["COMPRA_POS_PIX", "COMPRA POS PIX"], title: "Compra pós Pix", items: ["Sequência de Pix seguido de compra pode fugir do padrão do cliente.", "Comparar horário, valor, estabelecimento e comportamento anterior.", "Bloqueio não significa fraude confirmada; exige análise do contexto."] },
    { match: ["DESVIO_PADRAO", "DESVIO PADRAO", "DESVIO_PADRÃO"], title: "Desvio de padrão", items: ["Transação fora do perfil esperado do cliente.", "Conta sem histórico pode gerar falso positivo; valide períodos anteriores.", "Compare valor, localidade, frequência e tipo de operação."] },
    { match: ["BOL_VLR_SUSPEITO", "BOLETO_VALOR_SUSPEITO", "VALOR_SUSPEITO"], title: "Boleto valor suspeito", items: ["Boleto alto ou em sequência pode indicar comportamento suspeito.", "No emissor Bemol, boleto_valor_suspeito é alto risco e orienta fraude/SPD15.", "Verificar origem, recorrência, valor e compatibilidade com perfil."] },
    { match: ["TETO_PAGAMENTO_BOLETO", "PAGAMENTO_BOLETO_DIA"], title: "Teto boleto", items: ["Regra de teto indica limite operacional ou de risco para boleto.", "Validar valor, horário, canal usado e perfil do cliente.", "Não tratar como falta de saldo sem checar o contexto antifraude."] },
    { match: ["EST_TETO_CP", "TETO_CP"], title: "Teto CP / Teste", items: ["Pode envolver compras pequenas usadas como teste de cartão.", "Atenção a várias tentativas de baixo valor em pouco tempo.", "Validar se há tentativa automatizada, fintech intermediária ou golpe de regularização."] },
    { match: ["3DS", "TAT_CNP_TETO_3DS"], title: "3DS", items: ["3DS é autenticação adicional em compra online.", "Teto 3DS indica recusa por limite de risco mesmo com autenticação.", "Verificar valor, MCC, recorrência e padrão do portador."] },
    { match: ["CONTACTLESS"], title: "Contactless", items: ["Aproximação em velocidade indica várias tentativas em curto intervalo.", "Verificar valor, localidade, frequência e histórico do cartão.", "Chip/senha e mesma localidade reduzem risco, mas não eliminam análise."] },
    { match: ["DOMINIO", "DOMÍNIO"], title: "Domínio de alto risco", items: ["Risco ligado ao local/site de compra, não necessariamente ao cartão.", "Validar reputação, domínio recente, comportamento de compra e valor.", "Pode indicar phishing, site falso ou estabelecimento de risco."] }
  ];
  function closeSidePanels(ownerId = "") {
    const selector = ownerId ? `.sac-side-panel[data-owner="${cssEscape(ownerId)}"]` : ".sac-side-panel";
    all(selector).forEach((panel) => panel.remove());
    const owners = ownerId ? [byId(ownerId)].filter(Boolean) : all(".sac-panel");
    owners.forEach((owner) => all(".sac-investigation-launcher", owner).forEach((button) => {
      button.classList.remove("sac-launcher-open");
      button.setAttribute("aria-expanded", "false");
    }));
    owners.forEach((owner) => owner.querySelector("[data-invisible-tool='investigation']")?.setAttribute("aria-expanded", "false"));
    if (!ownerId || ownerId === "sac-panel-console") placePidPanel();
  }
  function placeSidePanel(ownerPanel, sidePanel) {
    const rect = ownerPanel.getBoundingClientRect();
    const width = sidePanel.offsetWidth || 292;
    const preferredLeft = rect.left - width - 4;
    const opensLeft = preferredLeft >= 8;
    const rightFallback = Math.min(window.innerWidth - width - 8, rect.right + 4);
    sidePanel.dataset.sidePosition = opensLeft ? "left" : "right";
    sidePanel.style.left = `${opensLeft ? preferredLeft : Math.max(8, rightFallback)}px`;
    sidePanel.style.top = `${Math.max(8, rect.top)}px`;
    if (ownerPanel.id === "sac-panel-console") placePidPanel();
  }
  function syncSidePanels(ownerPanel) {
    const minimized = ownerPanel.classList.contains("sac-minimized");
    all(`.sac-side-panel[data-owner="${cssEscape(ownerPanel.id)}"]`).forEach((panel) => {
      panel.classList.toggle("sac-minimized", minimized);
      if (!minimized) placeSidePanel(ownerPanel, panel);
    });
    all(`.sac-choice-popover[data-owner="${cssEscape(ownerPanel.id)}"]`).forEach((panel) => {
      panel.classList.toggle("sac-minimized", minimized);
      if (!minimized) {
        if (panel.classList.contains("sac-pid-panel")) placePidPanel();
        else placeAuxiliaryPanel(ownerPanel, panel);
      }
    });
    placeConfigPanel(ownerPanel, ownerPanel.querySelector(".sac-config"));
  }
  function matchedHelpEntries(source, value) {
    const target = normalize(value);
    if (!target) return [];
    return source.filter((entry) => entry.match.some((keyValue) => target.includes(normalize(keyValue))));
  }
  function compactHelpItems(entry, value) {
    const repeatedLabels = [entry.title, value].map(normalize).filter(Boolean);
    return entry.items
      .map((item) => clean(item, ""))
      .filter((item) => item && !repeatedLabels.includes(normalize(item)));
  }
  function hasHelpEntry(kind, value) {
    const source = kind === "issuer" ? ISSUER_HELP : RULE_HELP;
    return matchedHelpEntries(source, value).some((entry) => compactHelpItems(entry, value).length > 0);
  }
  function contextHelpGroups(kind, value) {
    const entries = matchedHelpEntries(kind === "issuer" ? ISSUER_HELP : RULE_HELP, value);
    return entries.map((entry) => {
      const items = compactHelpItems(entry, value);
      if (!items.length) return "";
      return `<div class="sac-side-group"><div class="sac-side-group-title">${escapeHtml(entry.title)}</div>${items.map((item) => `<div class="sac-side-card"><span>${escapeHtml(item)}</span></div>`).join("")}</div>`;
    }).join("");
  }
  function openContextHelp(kind, value, ownerPanel) {
    if (!getHelpMode()) return;
    const groups = contextHelpGroups(kind, value);
    if (!groups.trim()) return;
    return openSupportPanel(ownerPanel, kind === "issuer" ? "Particularidades do emissor" : "Orientação da regra", groups);
  }

  function renderPanel({ id, stage, flow = "banking", subtitle = "", body = "", footer = "", onEnter, onSignature }) {
    ensureStyles();
    ensureAutomationButtonGuard();
    const previousPanel = byId(id);
    previousPanel?.__sacDragDispose?.();
    previousPanel?.remove();
    const cfg = flowConfig(flow);
    const panel = document.createElement("div");
    panel.id = id;
    panel.className = `sac-panel sac-stage-${stage.toLowerCase()} sac-${getTheme()}${stage === "LISTAS" ? " sac-listas-panel" : ""}`;
    panel.dataset.flow = flow;
    panel.style.setProperty("--sac-primary", cfg.tone);
    panel.style.setProperty("--sac-font-scale", String(getFontScale()));
    if (stage !== "LISTAS") {
      panel.style.setProperty("--sac-panel-width", "420px", "important");
      ["inline-size", "width", "min-inline-size", "min-width", "max-inline-size", "max-width"]
        .forEach((property) => panel.style.setProperty(property, "420px", "important"));
    }
    const currentSector = getSignatureSector();
    const sectorPreset = SIGNATURE_SECTORS.includes(currentSector) ? currentSector : "custom";
    const customSector = sectorPreset === "custom" ? currentSector : "";
    const allowSignatureConfig = stage === "TABULADOR";
    const panelTitle = stage === "LISTAS" ? "LISTAS" : `${stage} - ${cfg.label}`;
    const signatureConfig = allowSignatureConfig ? `
          <button data-action="toggle-signature">✎ Assinatura</button>
          <div class="sac-signature-editor">
            <div class="sac-config-preview" data-signature-preview>${escapeHtml(signatureText() || "Informe seu nome para montar a assinatura.")}</div>
            <input data-signature-name value="${escapeHtml(getSignatureName())}" placeholder="Nome da assinatura" />
            <select data-signature-sector>
              <option value="SAC Prevenção" ${sectorPreset === "SAC Prevenção" ? "selected" : ""}>SAC Prevenção</option>
              <option value="Dock Teck Prevenção" ${sectorPreset === "Dock Teck Prevenção" ? "selected" : ""}>Dock Teck Prevenção</option>
              <option value="Backoffice Prevenção" ${sectorPreset === "Backoffice Prevenção" ? "selected" : ""}>Backoffice Prevenção</option>
              <option value="custom" ${sectorPreset === "custom" ? "selected" : ""}>Personalizado</option>
            </select>
            <input class="sac-signature-custom" data-signature-custom value="${escapeHtml(customSector)}" placeholder="Complemento personalizado" ${sectorPreset === "custom" ? "" : "hidden"} />
            <button data-action="save-signature">Salvar assinatura</button>
          </div>` : "";
    const flowColorSwatches = (flowName) => FLOW_COLOR_OPTIONS
      .map(([color, label]) => `<button class="sac-color-swatch ${getFlowTone(flowName) === color ? "active" : ""}" style="--swatch:${color}" data-flow-color-choice="${escapeHtml(flowName)}" data-color="${color}" aria-label="${escapeHtml(label)}"></button>`)
      .join("");
    const colorConfig = `
          <button data-action="toggle-colors">Cores dos fluxos</button>
          <div class="sac-color-editor">
            <div class="sac-color-row"><strong>BANKING</strong><div class="sac-color-swatches">${flowColorSwatches("banking")}</div></div>
            <div class="sac-color-row"><strong>CARTÃO</strong><div class="sac-color-swatches">${flowColorSwatches("card")}</div></div>
            <div class="sac-color-row"><strong>HOLD</strong><div class="sac-color-swatches">${flowColorSwatches("hold")}</div></div>
          </div>`;
    panel.innerHTML = `
      <div class="sac-head">
        <div>
          <div class="sac-title"><span class="sac-flow-dot"></span>${escapeHtml(panelTitle)}</div>
          <div class="sac-subtitle">${escapeHtml(`${subtitle || BUILD} · V${BUILD_VERSION}`)}</div>
        </div>
        <div class="sac-actions">
          <button class="sac-icon sac-emoji-icon" data-action="config" aria-label="Abrir configurações" title="Configurações"><span aria-hidden="true">⚙️</span></button>
          <button class="sac-icon sac-emoji-icon" data-action="history" aria-label="Abrir histórico" title="Histórico"><span aria-hidden="true">🕘</span></button>
          <button class="sac-icon sac-emoji-icon" data-action="reload" aria-label="Recarregar automação" title="Recarregar"><span aria-hidden="true">🔄</span></button>
          <button class="sac-icon" data-action="minimize" aria-label="Minimizar" title="Minimizar">_</button>
          <button class="sac-icon close" data-action="close" aria-label="Fechar" title="Fechar">×</button>
        </div>
        <div class="sac-config" hidden>
          <div class="sac-config-title">Configurações</div>
          <button data-action="theme">${getTheme() === "dark" ? "☀ Tema claro" : "☾ Tema escuro"}</button>
          <div class="sac-font-block">
            <span class="sac-font-label">Tamanho da fonte</span>
            <div class="sac-config-row">
              <button data-action="font-minus" aria-label="Diminuir fonte" title="Diminuir fonte">A−</button>
              <span class="sac-font-value" data-font-value>${Math.round(getFontScale() * 100)}%</span>
              <button data-action="font-plus" aria-label="Aumentar fonte" title="Aumentar fonte">A+</button>
            </div>
          </div>
          <button class="sac-toggle ${getSafeMode() ? "on" : ""}" data-action="safe-mode" aria-pressed="${getSafeMode() ? "true" : "false"}"><span class="sac-switch"></span><span>Modo seguro</span><b>${getSafeMode() ? "Ligado" : "Desligado"}</b></button>
          <button class="sac-toggle ${getInvisibleMode() ? "on" : ""}" data-action="invisible-mode" aria-pressed="${getInvisibleMode() ? "true" : "false"}"><span class="sac-switch"></span><span>Modo invisível</span><b>${getInvisibleMode() ? "Ligado" : "Desligado"}</b></button>
          <button class="sac-toggle ${getInvestigationMode() ? "on" : ""}" data-action="investigation-mode" aria-pressed="${getInvestigationMode() ? "true" : "false"}"><span class="sac-switch"></span><span>Modo investigação</span><b>${getInvestigationMode() ? "Ligado" : "Desligado"}</b></button>
          <button class="sac-toggle ${getHelpMode() ? "on" : ""}" data-action="help-mode" aria-pressed="${getHelpMode() ? "true" : "false"}"><span class="sac-switch"></span><span>Modo ajuda</span><b>${getHelpMode() ? "Ligado" : "Desligado"}</b></button>
          ${signatureConfig}
          <div class="sac-flow-legend">
            <span><i style="background:${escapeHtml(getFlowTone("banking"))}"></i>BANKING</span>
            <span><i style="background:${escapeHtml(getFlowTone("card"))}"></i>CARTÃO</span>
            <span><i style="background:${escapeHtml(getFlowTone("hold"))}"></i>HOLD</span>
          </div>
          ${colorConfig}
        </div>
      </div>
      <div class="sac-body">${body}</div>
      ${footer ? `<div class="sac-body">${footer}</div>` : ""}
    `;
    neutralizeAutomationButtons(panel);
    document.body.appendChild(panel);
    if (stage === "LISTAS") {
      panel.style.left = "8px";
      panel.style.right = "auto";
      panel.style.top = "8px";
    }
    enableDrag(panel, ".sac-head");

    const config = panel.querySelector(".sac-config");
    const close = () => {
      if (panel.dataset.decisionApplying === "true") {
        return false;
      }
      if (panel.dataset.finalLocked === "true") {
        activeTabulatorDecisionRun += 1;
        panel.dataset.finalLocked = "false";
        showNotice("Janela fechada. A tabulação só finaliza o fluxo quando você usa Copiar.", "warn", 9000);
      }
      if (id === "sac-panel-console" || id === "sac-panel-tabulador") closePidPanel();
      closeAuxiliaryPanels(id);
      closeSidePanels(id);
      releaseInvestigationSession();
      panel.__sacDragDispose?.();
      if (id === "sac-panel-tabulador") {
        unlockTabulatorFieldLock();
        stopTabulatorWriting(panel);
        releaseTabulatorNavigationGuard(0);
        window.__SAC_TABULATOR_DECISION_PANEL_ACTIVE__ = false;
      }
      panel.remove();
      return true;
    };
    const reload = () => {
      if (!close()) return;
      runStage(STAGE === "auto" ? detectStage() : STAGE);
    };
    const toggleMinimize = () => {
      panel.classList.toggle("sac-minimized");
      syncSidePanels(panel);
    };
    const resetPosition = () => {
      panel.style.top = "8px";
      if (stage === "LISTAS") {
        panel.style.left = "8px";
        panel.style.right = "auto";
      } else {
        panel.style.right = "8px";
        panel.style.left = "";
      }
      panel.style.transform = "";
      panel.classList.remove("sac-minimized");
      syncSidePanels(panel);
    };
    const openConfig = () => {
      panel.classList.remove("sac-minimized");
      closeSidePanels(panel.id);
      if (panel.id === "sac-panel-console") closePidPanel();
      config.hidden = false;
      config.classList.add("open");
      panel.style.zIndex = "2147483646";
      placeConfigPanel(panel, config);
    };
    panel.querySelector("[data-action='close']")?.addEventListener("click", close);
    panel.querySelector("[data-action='reload']")?.addEventListener("click", reload);
    panel.querySelector("[data-action='minimize']")?.addEventListener("click", toggleMinimize);
    panel.querySelector(".sac-head")?.addEventListener("dblclick", () => panel.classList.remove("sac-minimized"));
    panel.querySelector("[data-action='config']")?.addEventListener("click", () => {
      const opening = config.hidden;
      if (opening) {
        closeSidePanels(panel.id);
        if (panel.id === "sac-panel-console") closePidPanel();
      }
      config.hidden = !config.hidden;
      config.classList.toggle("open", !config.hidden);
      panel.style.zIndex = config.hidden ? "" : "2147483646";
      placeConfigPanel(panel, config);
      if (panel.id === "sac-panel-console" && !opening) placePidPanel();
    });
    panel.querySelector("[data-action='theme']")?.addEventListener("click", () => {
      setTheme(getTheme() === "dark" ? "light" : "dark");
      reload();
    });
    panel.querySelector("[data-action='font-minus']")?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      adjustFontScale(-0.05);
    });
    panel.querySelector("[data-action='font-plus']")?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      adjustFontScale(0.05);
    });
    panel.querySelector("[data-action='safe-mode']")?.addEventListener("click", (event) => {
      const next = !getSafeMode();
      setSafeMode(next);
      event.currentTarget.classList.toggle("on", next);
      event.currentTarget.setAttribute("aria-pressed", next ? "true" : "false");
      const state = event.currentTarget.querySelector("b");
      if (state) state.textContent = next ? "Ligado" : "Desligado";
    });
    panel.querySelector("[data-action='invisible-mode']")?.addEventListener("click", (event) => {
      const next = !getInvisibleMode();
      setInvisibleMode(next);
      event.currentTarget.classList.toggle("on", next);
      event.currentTarget.setAttribute("aria-pressed", next ? "true" : "false");
      const state = event.currentTarget.querySelector("b");
      if (state) state.textContent = next ? "Ligado" : "Desligado";
      reload();
    });
    panel.querySelector("[data-action='investigation-mode']")?.addEventListener("click", (event) => {
      const next = !getInvestigationMode();
      setInvestigationMode(next);
      if (next) hydrateCounterpartyLocalRecords();
      else releaseInvestigationSession();
      event.currentTarget.classList.toggle("on", next);
      event.currentTarget.setAttribute("aria-pressed", next ? "true" : "false");
      const state = event.currentTarget.querySelector("b");
      if (state) state.textContent = next ? "Ligado" : "Desligado";
      reload();
    });
    panel.querySelector("[data-action='help-mode']")?.addEventListener("click", (event) => {
      const next = !getHelpMode();
      setHelpMode(next);
      event.currentTarget.classList.toggle("on", next);
      event.currentTarget.setAttribute("aria-pressed", next ? "true" : "false");
      const state = event.currentTarget.querySelector("b");
      if (state) state.textContent = next ? "Ligado" : "Desligado";
      reload();
    });
    const refreshSignaturePreview = () => {
      const selectedSector = panel.querySelector("[data-signature-sector]")?.value || DEFAULT_SIGNATURE_SECTOR;
      const custom = clean(panel.querySelector("[data-signature-custom]")?.value, "");
      const sector = selectedSector === "custom" ? (custom || "Personalizado") : selectedSector;
      const name = String(panel.querySelector("[data-signature-name]")?.value || "").trim();
      const preview = name ? `${name} | ${sector}` : "Informe seu nome para montar a assinatura.";
      const previewEl = panel.querySelector("[data-signature-preview]");
      if (previewEl) previewEl.textContent = preview;
      const customEl = panel.querySelector("[data-signature-custom]");
      if (customEl) customEl.hidden = selectedSector !== "custom";
    };
    panel.querySelector("[data-action='toggle-signature']")?.addEventListener("click", () => {
      panel.querySelector(".sac-signature-editor")?.classList.toggle("open");
      refreshSignaturePreview();
    });
    panel.querySelector("[data-signature-sector]")?.addEventListener("change", refreshSignaturePreview);
    panel.querySelector("[data-signature-name]")?.addEventListener("input", refreshSignaturePreview);
    panel.querySelector("[data-signature-custom]")?.addEventListener("input", refreshSignaturePreview);
    panel.querySelector("[data-action='save-signature']")?.addEventListener("click", () => {
      const selectedSector = clean(panel.querySelector("[data-signature-sector]")?.value, DEFAULT_SIGNATURE_SECTOR);
      const custom = clean(panel.querySelector("[data-signature-custom]")?.value, DEFAULT_SIGNATURE_SECTOR);
      const name = String(panel.querySelector("[data-signature-name]")?.value || "").trim();
      if (!name) {
        showNotice("Informe seu nome para salvar a assinatura.", "warn");
        panel.querySelector("[data-signature-name]")?.focus();
        return;
      }
      storageSet("signatureName", name);
      storageSet("signatureSector", selectedSector === "custom" ? custom : selectedSector);
      onSignature?.();
    });
    panel.querySelector("[data-action='toggle-colors']")?.addEventListener("click", () => {
      panel.querySelector(".sac-color-editor")?.classList.toggle("open");
    });
    all("[data-flow-color-choice]", panel).forEach((button) => {
      button.addEventListener("click", (event) => {
        const flowName = event.currentTarget.dataset.flowColorChoice;
        const previous = getFlowTone(flowName);
        const color = event.currentTarget.dataset.color;
        if (!setFlowTone(flowName, color)) {
          showNotice("Cada fluxo precisa ter uma cor diferente.", "warn");
          return;
        }
        if (previous === color) return;
        reload();
      });
    });
    panel.querySelector("[data-action='history']")?.addEventListener("click", renderHistory);
    panel.addEventListener("click", (event) => {
      const help = event.target.closest("[data-help-kind]");
      if (!help) return;
      event.preventDefault();
      event.stopPropagation();
      openContextHelp(help.dataset.helpKind, help.dataset.helpValue, panel);
    });
    all("[data-other-select]", panel).forEach((select) => {
      const input = panel.querySelector(`[data-other-for="${cssEscape(select.id)}"]`);
      const syncOther = () => { if (input) input.hidden = normalize(select.value) !== "OUTRO"; };
      select.addEventListener("change", syncOther);
      syncOther();
    });

    panel.__sacKeys = { close, reload, onEnter, toggleMinimize, resetPosition, openConfig };
    return panel;
  }

  function closeTopSacWindow() {
    const side = all(".sac-side-panel").at(-1);
    if (side) {
      const owner = byId(side.dataset.owner);
      if (owner?.__sacInvestigationApi?.close) owner.__sacInvestigationApi.close();
      else side.remove();
      return true;
    }
    const popover = all(".sac-choice-popover").at(-1);
    if (popover) {
      if (popover.id === "sac-pid-panel") closePidPanel();
      else popover.remove();
      return true;
    }
    const historyPanel = byId("sac-history-panel");
    if (historyPanel) {
      historyPanel.__sacDragDispose?.();
      historyPanel.remove();
      return true;
    }
    const config = all(".sac-config.open").at(-1);
    if (config) {
      const owner = config.closest(".sac-panel");
      config.hidden = true;
      config.classList.remove("open");
      if (owner) owner.style.zIndex = "";
      if (owner?.id === "sac-panel-console") placePidPanel();
      return true;
    }
    const panel = all(".sac-panel").at(-1);
    if (panel?.__sacKeys) return panel.__sacKeys.close();
    return false;
  }

  window.__SAC_PREVENCAO_V12_KEYS = (event) => {
    const tag = event.target?.tagName?.toLowerCase();
    if (["input", "select", "textarea"].includes(tag) && event.key !== "Escape") return;
    const panel = all(".sac-panel").at(-1);
    if (event.key === "Escape") {
      if (closeTopSacWindow()) event.preventDefault();
      return;
    }
    if (!panel?.__sacKeys) return;
    if (event.key.toLowerCase() === "r" || event.key === "0") { panel.__sacKeys.reload(); event.preventDefault(); }
    if (event.key.toLowerCase() === "t") { setTheme(getTheme() === "dark" ? "light" : "dark"); panel.__sacKeys.reload(); event.preventDefault(); }
    if (event.key.toLowerCase() === "m") { panel.__sacKeys.toggleMinimize?.(); event.preventDefault(); }
    if (event.key.toLowerCase() === "p") { panel.__sacKeys.resetPosition?.(); event.preventDefault(); }
    if (event.key.toLowerCase() === "a" && panel.querySelector("[data-signature-name]")) { panel.__sacKeys.openConfig?.(); panel.querySelector("[data-signature-name]")?.focus(); event.preventDefault(); }
    if (event.key === "+" || event.key === "Add") { adjustFontScale(0.05); event.preventDefault(); }
    if (event.key === "-" || event.key === "Subtract") { adjustFontScale(-0.05); event.preventDefault(); }
    if (event.key === "Enter") { panel.__sacKeys.onEnter?.(); event.preventDefault(); }
    if (["1", "2", "3", "4"].includes(event.key)) {
      panel.querySelector(`[data-decision-index="${Number(event.key) - 1}"]`)?.click();
      event.preventDefault();
    }
  };
  addRuntimeEvent(document, "keydown", window.__SAC_PREVENCAO_V12_KEYS);

  function section(title, content, meta = "") {
    const metaText = clean(meta, "");
    const metaHtml = metaText && normalize(metaText) !== normalize(title) ? `<span>${escapeHtml(metaText)}</span>` : "";
    return `<section class="sac-section"><div class="sac-section-title"><span>${escapeHtml(title)}</span>${metaHtml}</div>${content}</section>`;
  }
  function kv(label, value, cls = "") {
    const missing = isMissing(value);
    const labelKey = normalize(label);
    const possibleKind = getHelpMode() && (labelKey === "REGRA" || ((labelKey.includes("STATUS") || labelKey.includes("SPD")) && hasHelpEntry("rule", value))) ? "rule" : getHelpMode() && labelKey === "EMISSOR" ? "issuer" : "";
    const kind = possibleKind && hasHelpEntry(possibleKind, value) ? possibleKind : "";
    const icon = kind === "rule" ? "!" : "i";
    const title = kind === "rule" ? "Clique para ver orientação da regra" : "Clique para ver particularidades do emissor";
    const help = kind ? `<button class="sac-help-btn" data-help-kind="${kind}" data-help-value="${escapeHtml(clean(value, ""))}" aria-label="${escapeHtml(title)}" title="${escapeHtml(title)}">${icon}</button>` : "";
    return `<div class="sac-kv ${missing ? "sac-missing" : ""} ${cls}">${help}<div class="sac-kv-label">${escapeHtml(label)}</div><div class="sac-kv-value">${escapeHtml(clean(value))}</div></div>`;
  }
  function kvNoHelp(label, value, cls = "") {
    const missing = isMissing(value);
    return `<div class="sac-kv ${missing ? "sac-missing" : ""} ${cls}"><div class="sac-kv-label">${escapeHtml(label)}</div><div class="sac-kv-value">${escapeHtml(clean(value))}</div></div>`;
  }
  function kvOptional(label, value, cls = "") {
    const labelKey = normalize(label);
    const possibleKind = getHelpMode() && (labelKey === "REGRA" || ((labelKey.includes("STATUS") || labelKey.includes("SPD")) && hasHelpEntry("rule", value))) ? "rule" : getHelpMode() && labelKey === "EMISSOR" ? "issuer" : "";
    const kind = possibleKind && hasHelpEntry(possibleKind, value) ? possibleKind : "";
    const icon = kind === "rule" ? "!" : "i";
    const title = kind === "rule" ? "Clique para ver orientação da regra" : "Clique para ver particularidades do emissor";
    const help = kind ? `<button class="sac-help-btn" data-help-kind="${kind}" data-help-value="${escapeHtml(clean(value, ""))}" aria-label="${escapeHtml(title)}" title="${escapeHtml(title)}">${icon}</button>` : "";
    return `<div class="sac-kv ${cls}">${help}<div class="sac-kv-label">${escapeHtml(label)}</div><div class="sac-kv-value">${escapeHtml(clean(value, ""))}</div></div>`;
  }
  function field(id, label, options, selected, config = {}) {
    const allowEmpty = Boolean(config.allowEmpty);
    const selectedValue = options.find((opt) => normalize(opt) === normalize(selected)) || selected || (allowEmpty ? "" : options[0] || "");
    const emptyOption = allowEmpty ? `<option value="" ${selectedValue ? "" : "selected"}>Selecione</option>` : "";
    const opts = emptyOption + options.map((opt) => `<option value="${escapeHtml(opt)}" ${normalize(opt) === normalize(selectedValue) ? "selected" : ""}>${escapeHtml(opt)}</option>`).join("");
    const needsOther = options.some((opt) => normalize(opt) === "OUTRO");
    const otherOpen = normalize(selectedValue) === "OUTRO";
    return `<label class="sac-field"><span>${escapeHtml(label)}</span><select id="${escapeHtml(id)}" ${needsOther ? `data-other-select="${escapeHtml(id)}"` : ""}>${opts}</select>${needsOther ? `<input class="sac-other-input" data-other-for="${escapeHtml(id)}" placeholder="Digite o valor manualmente" ${otherOpen ? "" : "hidden"} />` : ""}</label>`;
  }
  function setManualDataValue(data, label, value, sectionTitle = "") {
    const key = normalize(label);
    const isFalconSection = normalize(sectionTitle).includes("FALCON");
    const target = isFalconSection ? (data.falcon || data) : data;
    if (key === "CASO") target.caseNumber = value;
    else if (key === "VALOR") target.value = value.replace(/^R\$\s*/i, "");
    else if (key === "REGRA") target.rule = value;
    else if (key === "DATA/HORA") target.transactionDate = value;
    else if (key.includes("HISTORICO DE INFRACOES")) { target.history = formatHistoryValue(value); target.historyFound = true; }
    else if (key.includes("TIPO TRANSACAO")) target.transactionType = value;
    else if (key.includes("ESTABELECIMENTO")) target.merchant = value;
    else if (key.includes("DECISAO TRANSACAO")) target.transactionDecision = value;
    else if (key === "CPF/CNPJ") data.cpfCnpj = value;
    else if (key === "EMISSOR") data.issuer = value;
    else if (key === "CONTA") data.account = value;
    else if (key === "CADASTRO") data.registrationDate = value;
    else if (key === "STATUS CONTA") { data.accountStatus = value; data.fields = { ...(data.fields || {}), accountStatus: value }; }
    else if (key.includes("STATUS CARTAO")) data.cardStatus = value;
    else if (key.includes("ID CARTAO")) data.cardId = value;
    else if (key.includes("FINAL CARTAO")) data.cardLast4 = value;
    else if (key.includes("TIPO CARTAO")) data.cardType = value;
    else if (key === "CARTAO") data.cardNumber = value;
    else if (key.includes("STATUS PESSOA")) data.fields = { ...(data.fields || {}), personStatus: value };
    else if (key.includes("MIDIA")) data.fields = { ...(data.fields || {}), badMedia: value };
    else if (key.includes("HISTORICO SPD")) data.fields = { ...(data.fields || {}), spdHistory: value };
    else if (key.includes("E-MAIL")) data.fields = { ...(data.fields || {}), emailPhoneAddress: value };
    else if (key.includes("DOCUMENTACAO")) data.fields = { ...(data.fields || {}), documentation: value };
    else if (key.includes("EXTRATO")) data.fields = { ...(data.fields || {}), statement: value };
  }
  function enableGridCopy(panel) {
    if (panel.dataset.sacGridCopyReady) return;
    panel.dataset.sacGridCopyReady = "1";
    panel.addEventListener("click", async (event) => {
      const cell = event.target.closest(".sac-kv");
      if (!cell || cell.querySelector("input")) return;
      if (!getSafeMode()) return;
      const value = textOf(cell.querySelector(".sac-kv-value"));
      if (!value) return;
      await copyText(value);
      cell.classList.add("sac-copied");
      setTimeout(() => cell.classList.remove("sac-copied"), 650);
    });
  }
  function enableManualGridEditing(panel, data) {
    enableGridCopy(panel);
    panel.addEventListener("dblclick", (event) => {
      const cell = event.target.closest(".sac-kv");
      if (!cell) return;
      if (getSafeMode()) {
        showNotice("Para editar um grid manualmente, desligue o modo seguro nas configurações.", "warn");
        return;
      }
      const valueNode = cell.querySelector(".sac-kv-value");
      const label = textOf(cell.querySelector(".sac-kv-label"));
      const sectionTitle = textOf(cell.closest(".sac-section")?.querySelector(".sac-section-title span"));
      const input = document.createElement("input");
      input.value = valueNode?.textContent === "N/A" ? "" : valueNode?.textContent || "";
      input.style.width = "100%";
      input.style.border = "1px solid var(--sac-border)";
      input.style.borderRadius = "5px";
      input.style.background = "var(--sac-input)";
      input.style.color = "var(--sac-text)";
      input.style.fontWeight = "850";
      valueNode.replaceChildren(input);
      input.focus();
      const save = () => {
        const next = clean(input.value);
        setManualDataValue(data, label, next, sectionTitle);
        valueNode.textContent = next;
        cell.classList.remove("sac-missing");
      };
      input.addEventListener("keydown", (keyEvent) => {
        if (keyEvent.key === "Enter") save();
        if (keyEvent.key === "Escape") valueNode.textContent = clean(input.defaultValue);
      });
      input.addEventListener("blur", save, { once: true });
    });
  }
  function enableDrag(panel, handleSelector) {
    const handle = panel.querySelector(handleSelector);
    if (!handle || panel.dataset.sacDragReady) return;
    panel.dataset.sacDragReady = "1";
    let dragging = false;
    let armed = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;
    let startWidth = 0;
    let positionFrozen = false;
    let previousUserSelect = "";
    const dragThreshold = 3;
    const pointOf = (event) => event.touches?.[0] || event;
    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
    const freezePanelPosition = () => {
      if (positionFrozen) return;
      if (panel.classList.contains("sac-panel")) panel.style.setProperty("--sac-panel-width", `${startWidth}px`, "important");
      ["inline-size", "width", "min-inline-size", "min-width", "max-inline-size", "max-width"]
        .forEach((property) => panel.style.setProperty(property, `${startWidth}px`, "important"));
      panel.style.position = "fixed";
      panel.style.left = `${startLeft}px`;
      panel.style.top = `${startTop}px`;
      panel.style.right = "auto";
      panel.style.bottom = "auto";
      panel.style.transform = "none";
      positionFrozen = true;
    };
    const start = (event) => {
      if (event.target?.closest?.("button,input,select,textarea,a,[data-no-drag]")) return;
      const point = pointOf(event);
      const rect = panel.getBoundingClientRect();
      all(".sac-panel,.sac-history-panel").forEach((item) => { item.style.zIndex = "2147483646"; });
      panel.style.zIndex = "2147483647";
      armed = true;
      dragging = false;
      startX = point.clientX;
      startY = point.clientY;
      startLeft = rect.left;
      startTop = rect.top;
      startWidth = rect.width;
      positionFrozen = false;
      previousUserSelect = document.body.style.userSelect || "";
      document.body.style.userSelect = "none";
      try { handle.setPointerCapture?.(event.pointerId); } catch (_err) {}
      event.preventDefault();
    };
    const move = (event) => {
      if (!armed) return;
      const point = pointOf(event);
      const dx = point.clientX - startX;
      const dy = point.clientY - startY;
      if (!dragging) {
        if (Math.hypot(dx, dy) < dragThreshold) return;
        dragging = true;
        freezePanelPosition();
      }
      const rect = panel.getBoundingClientRect();
      const maxLeft = Math.max(0, window.innerWidth - startWidth);
      const maxTop = Math.max(0, window.innerHeight - Math.min(rect.height, window.innerHeight));
      panel.style.setProperty("left", `${clamp(startLeft + dx, 0, maxLeft)}px`, "important");
      panel.style.setProperty("top", `${clamp(startTop + dy, 0, maxTop)}px`, "important");
      if (panel.id === "sac-panel-console") placePidPanel();
      syncSidePanels(panel);
      event.preventDefault();
    };
    const stop = (event) => {
      armed = false;
      dragging = false;
      document.body.style.userSelect = previousUserSelect;
      try { handle.releasePointerCapture?.(event?.pointerId); } catch (_err) {}
      document.removeEventListener("mousemove", move, true);
      document.removeEventListener("mouseup", stop, true);
      document.removeEventListener("touchmove", move, false);
      document.removeEventListener("touchend", stop, true);
      document.removeEventListener("touchcancel", stop, true);
    };
    panel.__sacDragDispose = stop;
    if (window.PointerEvent) {
      handle.addEventListener("pointerdown", start);
      handle.addEventListener("pointermove", move);
      handle.addEventListener("pointerup", stop);
      handle.addEventListener("pointercancel", stop);
    } else {
      handle.addEventListener("mousedown", (event) => {
        start(event);
        if (!armed) return;
        document.addEventListener("mousemove", move, true);
        document.addEventListener("mouseup", stop, true);
      });
      handle.addEventListener("touchstart", (event) => {
        start(event);
        if (!armed) return;
        document.addEventListener("touchmove", move, { passive: false });
        document.addEventListener("touchend", stop, true);
        document.addEventListener("touchcancel", stop, true);
      }, { passive: false });
    }
  }
  registerRuntimeCleanup(() => all(".sac-panel,.sac-history-panel").forEach((panel) => panel.__sacDragDispose?.()));

  function extractHistoryCode(value) {
    const text = String(value ?? "");
    const grouped = text.match(/\b(\d{4})\s+(\d{3})\s+(\d{3})\b/);
    if (grouped) return `${grouped[1]}${grouped[2]}${grouped[3]}`;
    const exact = text.match(/\b\d{10}\b/);
    if (exact) return exact[0];
    const short = text.match(/\b\d{1,9}\b/);
    return short ? short[0].padStart(10, "0") : "";
  }
  function formatHistoryValue(value) {
    return extractHistoryCode(value) || "0000000000";
  }
  function historyBlocks(value) {
    const history = formatHistoryValue(value);
    return {
      days30: Number(history.slice(0, 4)) || 0,
      days90: Number(history.slice(4, 7)) || 0,
      months60: Number(history.slice(7, 10)) || 0
    };
  }
  function historyLevel(value, found = true) {
    if (!found) return "sac-history-warn";
    return Object.values(historyBlocks(value)).some((amount) => amount >= 3) ? "sac-history-danger" : "sac-history-ok";
  }
  function parseRegistrationDate(value) {
    const text = clean(value, "");
    let match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (match) return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
    match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return null;
  }
  function trimTimeToMinute(value) {
    const text = clean(value, "");
    return text.replace(/(\b\d{2}:\d{2})(?::\d{2})\b/g, "$1");
  }
  function isRecentRegistration(value) {
    const date = parseRegistrationDate(value);
    if (!date || Number.isNaN(date.getTime())) return false;
    const days = (Date.now() - date.getTime()) / 86400000;
    return days >= 0 && days < 90;
  }
  function alertIf(flag) { return flag ? "sac-alert-danger" : ""; }
  function accountStatusAlert(value) {
    const status = normalize(value);
    return alertIf(Boolean(status) && !["NORMAL", "ATIVO", "ATIVA"].includes(status));
  }
  function defaultOption(options) { return options[0] || ""; }
  function exceptionOption(value) {
    const status = normalize(value);
    return ["SEM HISTORICO", "AUSENCIA DE DADOS", "SEM DOCUMENTOS", "SEM INFORMACAO", "SEM ARQUIVOS", "SEM ACESSO", "NAO APLICAVEL"].includes(status);
  }
  function dropdownAlert(value, options) {
    if (isMissing(value)) return "";
    if (exceptionOption(value)) return "sac-alert-warn";
    return normalize(value) !== normalize(defaultOption(options)) ? "sac-alert-danger" : "";
  }
  function cardReviewAlert(value) {
    if (exceptionOption(value)) return "sac-alert-warn";
    return normalize(value) === "NAO" ? "sac-alert-danger" : "";
  }
  function resolveOtherOption(value, label, missing, typedValue = "") {
    if (normalize(value) !== "OUTRO") return value;
    const typed = clean(typedValue, "");
    if (!typed) {
      missing.push(label);
      return "N/A";
    }
    return typed;
  }
  function digitsOnly(value) { return String(value ?? "").replace(/\D/g, ""); }
  function alnumOnly(value) { return String(value ?? "").toUpperCase().replace(/[^0-9A-Z]/g, ""); }
  function last4(value) {
    const digits = digitsOnly(value);
    return digits.length >= 4 ? digits.slice(-4) : "";
  }
  function findDocumentInText(text) {
    const source = clean(text, "").toUpperCase();
    return clean(
      source.match(/\b[A-Z0-9]{2}\.[A-Z0-9]{3}\.[A-Z0-9]{3}\/[A-Z0-9]{4}-\d{2}\b/)?.[0]
      || source.match(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/)?.[0]
      || source.match(/\b[A-Z0-9]{12}\d{2}\b/)?.[0]
      || source.match(/\b\d{14}\b/)?.[0]
      || source.match(/\b\d{11}\b/)?.[0],
      ""
    );
  }
  function documentKind(value) {
    const text = clean(value, "").toUpperCase();
    const alnum = alnumOnly(text);
    if (/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(text) || /^\d{11}$/.test(alnum)) return "CPF";
    if (/^[A-Z0-9]{2}\.[A-Z0-9]{3}\.[A-Z0-9]{3}\/[A-Z0-9]{4}-\d{2}$/.test(text) || /^[A-Z0-9]{12}\d{2}$/.test(alnum)) return "CNPJ";
    return "";
  }
  function documentFieldValue(value) {
    const kind = documentKind(value);
    return kind === "CNPJ" ? alnumOnly(value) : digitsOnly(value);
  }
  function revealDocumentField(kind) {
    const normalizedKind = normalize(kind);
    const cpfBox = byId("div_cpf");
    const cnpjBox = byId("div_cnpj");
    const cpfField = byId("txt_cpf");
    const cnpjField = byId("txt_cnpj");
    const showCpf = normalizedKind === "CPF";
    const showCnpj = normalizedKind === "CNPJ";
    if (cpfBox) {
      cpfBox.toggleAttribute("hidden", !showCpf);
      cpfBox.setAttribute("aria-hidden", showCpf ? "false" : "true");
      cpfBox.style.display = showCpf ? "" : "none";
    }
    if (cnpjBox) {
      cnpjBox.toggleAttribute("hidden", !showCnpj);
      cnpjBox.setAttribute("aria-hidden", showCnpj ? "false" : "true");
      cnpjBox.style.display = showCnpj ? "" : "none";
    }
    [cpfField, cnpjField].forEach((field) => {
      if (!field) return;
      field.disabled = false;
      field.readOnly = false;
    });
    const inactive = showCpf ? cnpjField : showCnpj ? cpfField : null;
    if (inactive) setNativeValue(inactive, "", { quiet: true, allowEmpty: true });
  }
  function redactSensitiveDocuments(value) {
    return String(value ?? "")
      .replace(/\b[A-Z0-9]{2}\.[A-Z0-9]{3}\.[A-Z0-9]{3}\/[A-Z0-9]{4}-\d{2}\b/gi, "[CNPJ REMOVIDO]")
      .replace(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g, "[CNPJ REMOVIDO]")
      .replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, "[CPF REMOVIDO]")
      .replace(/\b[A-Z0-9]{12}\d{2}\b/gi, "[CNPJ REMOVIDO]")
      .replace(/\b\d{14}\b/g, "[CNPJ REMOVIDO]")
      .replace(/\b\d{11}\b/g, "[CPF REMOVIDO]");
  }
  function numericCase(value) {
    const digits = digitsOnly(value);
    return /^\d{6,12}$/.test(digits) ? digits : "";
  }
  function idText(id) { return textOf(byId(id)); }

  const FALCON_SELECTORS = Object.freeze({
    caseNumber: "csOvwFrm:TabView:CaSmDtCaseNumber",
    transactionType: "csOvwFrm:TabView:CaSmDtTranType",
    accountId: "Acct1NumLink",
    cardNumber: "ServiceNumLink",
    orangeRgb: "rgb(239, 130, 0)",
    gridBase: "csInvFrm:csInvTbVw:resultGrid:"
  });
  const FALCON_ROW_FIELDS = Object.freeze({
    rule: ["RULESTEXT_VALUE1", "RULESTEXT_VALUE", "RULES_TEXT"],
    date: ["TRANSACTION_DTTM_VALUE", "TRANSACTION_DATE_VALUE"],
    value: ["TRANSACTION_AMT_VALUE", "TRANSACTION_AMOUNT_VALUE"],
    history: ["USER_DATA_20_STRG_VALUE", "USER_DATA_20_VALUE", "USER_DATA_20"],
    debitCustomerId: ["DEBIT_CUSTOMER_XID_VALUE"],
    creditCustomerId: ["CREDIT_CUSTOMER_XID_VALUE"],
    customerId: ["CUSTOMER_XID_VALUE"],
    debitAccount: ["DEBIT_ACCOUNT_NUM_VALUE"],
    creditAccount: ["CREDIT_ACCOUNT_NUM_VALUE"],
    merchant: ["MERCHANT_NAME_VALUE", "MERCHANT_DBA_NAME_VALUE", "CARD_ACCEPTOR_NAME_VALUE"],
    decision: ["FALCON_DECISION_CODE_VALUE", "FALCON_DECISION_VALUE"],
    payment: ["TRANSACTION_POSTING_ENTRY_XFLG_VALUE", "TRANSACTION_ENTRY_MODE_VALUE", "POS_ENTRY_MODE_VALUE"]
  });

  function falconCaseNumber() {
    const label = byId("csOvwFrm:TabView:CaSmLbCaseNumber");
    if (label && !normalize(textOf(label)).includes("NUMERO DO CASO")) return "";
    return numericCase(idText(FALCON_SELECTORS.caseNumber));
  }

  function rowElementLooksOrange(row) {
    if (!row) return false;
    const exact = all("td", row).some((td) => td.style.backgroundColor === FALCON_SELECTORS.orangeRgb);
    if (exact) return true;
    const nodes = [row, ...all("td,div,span", row).slice(0, 16)];
    return nodes.some((node) => {
      const rgb = getComputedStyle(node).backgroundColor.match(/\d+(\.\d+)?/g)?.map(Number) || [];
      return rgb.length >= 3 && rgb[0] >= 180 && rgb[1] >= 70 && rgb[1] <= 190 && rgb[2] <= 130;
    });
  }

  function setFalconCheckbox(checkbox, checked) {
    if (!checkbox) return false;
    if (checkbox.checked !== checked) {
      try { checkbox.click(); } catch (_err) {}
      if (checkbox.checked !== checked) {
        checkbox.checked = checked;
        checkbox.dispatchEvent(new Event("input", { bubbles: true }));
        checkbox.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
    return checkbox.checked === checked;
  }
  function selectFalconTransactionCheckbox(row = orangeFalconRow()) {
    if (!row) return all("input[id*='caseTranGridVwColSelCheckBox']:checked")[0] || null;
    const inputs = all("input[id*='caseTranGridVwColSelCheckBox']", row);
    const candidate = inputs.find((input) => input.checked) || inputs[0];
    setFalconCheckbox(candidate, true);
    return candidate;
  }
  function selectHoldActionCheckbox() {
    const checkbox = all("input[type='checkbox']").find((input) => {
      const descriptor = `${input.name || ""} ${input.value || ""} ${input.id || ""}`;
      return normalize(descriptor).includes("HOLD") && normalize(descriptor).includes("ACTION");
    });
    if (!checkbox) return { found: false, selected: false };
    setFalconCheckbox(checkbox, true);
    return { found: true, selected: checkbox.checked };
  }
  function selectHoldRowsCheckboxes() {
    let selected = 0;
    let found = 0;
    all("tr,[role='row']").forEach((row) => {
      const checkbox = all("input[id*='caseTranGridVwColSelCheckBox']", row)[0];
      if (!checkbox) return;
      const rule = falconMappedText({ row, rows: [row], rowIndex: falconRowIndex(row, checkbox) }, "rule");
      const isHoldRow = Boolean(rule) && normalize(rule).includes("HOLD");
      if (!isHoldRow && checkbox.checked) setFalconCheckbox(checkbox, false);
      if (!isHoldRow) return;
      found += 1;
      setFalconCheckbox(checkbox, true);
      if (checkbox.checked) selected += 1;
    });
    return { found, selected };
  }
  function uniqueNodes(nodes) {
    return nodes.filter((node, index, list) => node && list.indexOf(node) === index);
  }
  function closestGridRow(node) {
    return node?.closest?.("tr,[role='row']") || null;
  }
  function orangeFalconRow() {
    const exactCell = all("td").find((td) => td.style.backgroundColor === FALCON_SELECTORS.orangeRgb);
    const exactRow = exactCell?.parentElement || null;
    return exactRow || all("tr,[role='row']").find(rowElementLooksOrange) || null;
  }
  function falconIdSuffix(node) {
    return String(node?.id || "").match(/_(\d+)$/)?.[1] || "";
  }
  function falconRowIndex(row, checkbox = null) {
    return falconIdSuffix(checkbox)
      || all("[id]", row).map(falconIdSuffix).find(Boolean)
      || "";
  }
  function falconIdMatchesField(id, field) {
    const prefixes = FALCON_ROW_FIELDS[field] || [];
    return prefixes.some((prefix) => id.startsWith(`${FALCON_SELECTORS.gridBase}${prefix}`) || id.includes(`:${prefix}`));
  }
  function falconMappedText(context, field) {
    const rowNodes = uniqueNodes([...(context.rows || []), context.orangeRow, context.row]).filter(Boolean);
    const rowCandidates = rowNodes.flatMap((row) => all("[id]", row).filter((node) => falconIdMatchesField(String(node.id || ""), field) && textOf(node)));
    const rowExact = context.rowIndex ? rowCandidates.find((node) => node.id.endsWith(`_${context.rowIndex}`)) : null;
    const contextual = clean(textOf(rowExact || rowCandidates[0]), "");
    if (contextual) return contextual;
    if (!context.rowIndex) return "";
    const exact = all("[id]").find((node) => falconIdMatchesField(String(node.id || ""), field) && node.id.endsWith(`_${context.rowIndex}`) && textOf(node));
    return clean(textOf(exact), "");
  }
  function falconRowContext() {
    const orangeRow = orangeFalconRow();
    const checkbox = selectFalconTransactionCheckbox(orangeRow);
    const row = orangeRow || closestGridRow(checkbox);
    const rows = uniqueNodes([row]);
    return {
      checkbox,
      orangeRow,
      row,
      rows,
      rowIndex: falconRowIndex(row, checkbox),
      text: rows.map(textOf).filter(Boolean).join(" ")
    };
  }
  function falconAmountFallback(context) {
    return clean(context.text.match(/(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})\b/)?.[1], "");
  }
  function falconDateFallback(context) {
    return clean(context.text.match(/\b\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2}\b/)?.[0] || context.text.match(/\b\d{2}\/\d{2}\/\d{4}\b/)?.[0], "");
  }
  function falconRuleFallback(context) {
    return clean(context.text.match(/\b[A-Za-z0-9]+(?:_[A-Za-z0-9]+){1,}\b/)?.[0], "");
  }
  function readOriginalOrangeRowData(context) {
    const history = falconMappedText(context, "history");
    const data = {
      value: falconMappedText(context, "value") || falconAmountFallback(context),
      rule: falconMappedText(context, "rule") || falconRuleFallback(context),
      date: falconMappedText(context, "date") || falconDateFallback(context),
      history: extractHistoryCode(history),
      historyFound: Boolean(history),
      debitCustomerId: falconMappedText(context, "debitCustomerId"),
      creditCustomerId: falconMappedText(context, "creditCustomerId"),
      customerId: falconMappedText(context, "customerId"),
      debitAccount: falconMappedText(context, "debitAccount"),
      creditAccount: falconMappedText(context, "creditAccount"),
      merchant: falconMappedText(context, "merchant"),
      decision: falconMappedText(context, "decision"),
      payment: falconMappedText(context, "payment")
    };
    return data;
  }
  function falconPanelLabelValue(label) {
    const wanted = normalize(label);
    const node = all(".panelLabel").find((el) => normalize(textOf(el)).includes(wanted));
    return clean(node?.nextElementSibling?.innerText || node?.nextElementSibling?.textContent, "");
  }
  function isCardTransactionType(value) {
    const text = normalize(value);
    const hasAuthorization = text.includes("AUTORIZACAO");
    const hasPosting = text.includes("LANCAMENTO");
    const hasCredit = text.includes("CREDITO");
    return hasAuthorization && hasPosting && hasCredit;
  }
  function isHoldRule(rule) { return normalize(rule).includes("HOLD"); }

  function falconHolderDocument(accountId, orangeData, transactionType = "") {
    const accountKey = alnumOnly(accountId);
    const debitAccountKey = alnumOnly(orangeData?.debitAccount);
    const creditAccountKey = alnumOnly(orangeData?.creditAccount);
    const debitDocument = documentFieldValue(orangeData?.debitCustomerId);
    const creditDocument = documentFieldValue(orangeData?.creditCustomerId);
    const customerDocument = documentFieldValue(orangeData?.customerId);
    const transaction = normalize(transactionType);
    if (transaction.includes("DEPOSITO")) {
      return documentKind(creditDocument)
        ? { document: creditDocument, source: "CREDIT_CUSTOMER_XID" }
        : { document: "", source: "" };
    }
    if (transaction.includes("PAGAMENTO")) {
      return documentKind(debitDocument)
        ? { document: debitDocument, source: "DEBIT_CUSTOMER_XID" }
        : { document: "", source: "" };
    }
    if (accountKey && debitAccountKey && accountKey === debitAccountKey && documentKind(debitDocument)) {
      return { document: debitDocument, source: "DEBIT_CUSTOMER_XID" };
    }
    if (accountKey && creditAccountKey && accountKey === creditAccountKey && documentKind(creditDocument)) {
      return { document: creditDocument, source: "CREDIT_CUSTOMER_XID" };
    }
    const maskedSuffix = digitsOnly(orangeData?.customerId).slice(-4);
    if (maskedSuffix.length === 4) {
      if (documentKind(debitDocument) && debitDocument.endsWith(maskedSuffix)) return { document: debitDocument, source: "DEBIT_CUSTOMER_XID" };
      if (documentKind(creditDocument) && creditDocument.endsWith(maskedSuffix)) return { document: creditDocument, source: "CREDIT_CUSTOMER_XID" };
    }
    if (documentKind(customerDocument)) return { document: customerDocument, source: "CUSTOMER_XID" };
    return { document: "", source: "" };
  }

  // ========================= FALCON: LEITURA ========================
  function collectFalconData() {
    const context = falconRowContext();
    const orangeData = readOriginalOrangeRowData(context);
    const caseNumber = falconCaseNumber();
    const accountId = idText(FALCON_SELECTORS.accountId);
    const overviewType = idText(FALCON_SELECTORS.transactionType);
    const panelTransactionType = falconPanelLabelValue("Tipo de transação");
    const cardNumber = idText(FALCON_SELECTORS.cardNumber);
    const cardLast4 = last4(cardNumber);
    const transactionTypeText = overviewType || panelTransactionType;
    const holder = falconHolderDocument(accountId, orangeData, transactionTypeText);
    const cardByTransactionType = isCardTransactionType(transactionTypeText);
    const rule = clean(orangeData.rule);
    const holdByRule = isHoldRule(rule);
    const flow = (cardByTransactionType || cardLast4) ? "card" : "banking";
    const visualFlow = flow === "banking" && holdByRule ? "hold" : flow;
    const historyRaw = flow === "card" ? "" : orangeData.history;
    const paymentCode = orangeData.payment;
    const transactionDecision = orangeData.decision || clean(context.text.match(/\b(approve|decline)\b/i)?.[0], "");
    const merchant = orangeData.merchant;
    const value = orangeData.value;
    const transactionDate = orangeData.date;
    const counterparty = counterpartyEngine.selectFalconCounterparty({
      transactionType: transactionTypeText,
      debitCustomerId: orangeData.debitCustomerId,
      creditCustomerId: orangeData.creditCustomerId
    });
    const data = {
      type: EXPORT_FALCON,
      flow,
      visualFlow,
      orangeFound: Boolean(context.orangeRow),
      holdByRule,
      cardByTransactionType,
      sourceTransactionType: clean(transactionTypeText),
      caseNumber,
      accountId: clean(accountId),
      holderDocument: flow === "card" ? "" : holder.document,
      holderDocumentSource: flow === "card" ? "" : holder.source,
      rowIndex: context.rowIndex,
      originCustomerId: clean(orangeData.debitCustomerId),
      creditCustomerId: clean(orangeData.creditCustomerId),
      counterpartyDocument: counterparty.document,
      counterpartyCnpj: counterparty.cnpj,
      counterpartyCpf: counterparty.cpf,
      counterpartyDirection: counterparty.direction,
      counterpartySourceField: counterparty.sourceField,
      counterpartySourceLabel: counterparty.sourceLabel,
      cardNumber: flow === "card" ? clean(cardNumber) : "N/A",
      cardLast4,
      transactionType: flow === "card"
        ? paymentMethodName(paymentCode, "")
        : clean(transactionTypeText || paymentCode),
      transactionDecision: flow === "card" ? clean(transactionDecision) : "N/A",
      merchant: flow === "card" ? clean(merchant) : "N/A",
      value: clean(value),
      rule,
      history: flow === "card" ? "N/A" : formatHistoryValue(historyRaw),
      historyFound: flow !== "card" && (Boolean(historyRaw) || orangeData.historyFound),
      transactionDateRaw: clean(transactionDate),
      transactionDate: trimTimeToMinute(transactionDate)
    };
    return data;
  }
  function paymentMethodName(code, fallback) {
    const map = { V: "Chip e senha", D: "Aproximação", E: "E-commerce", K: "Digitado manual" };
    const key = normalize(code).slice(0, 1);
    if (key === "A") return "";
    return map[key] || clean(fallback);
  }
  function emptyFalconData() {
    return {
      type: EXPORT_FALCON,
      flow: "banking",
      visualFlow: "banking",
      orangeFound: false,
      caseNumber: "N/A",
      accountId: "N/A",
      holderDocument: "",
      holderDocumentSource: "",
      originCustomerId: "",
      creditCustomerId: "",
      counterpartyDocument: "",
      counterpartyCnpj: "",
      counterpartyCpf: "",
      counterpartyDirection: "BOTH",
      counterpartySourceField: "",
      counterpartySourceLabel: "",
      cardNumber: "N/A",
      cardLast4: "",
      transactionType: "N/A",
      transactionDecision: "N/A",
      merchant: "N/A",
      value: "N/A",
      rule: "N/A",
      history: "0000000000",
      historyFound: false,
      transactionDateRaw: "N/A",
      transactionDate: "N/A"
    };
  }

  function mergeFalconCollections(beforeCase, afterCase) {
    const before = beforeCase || emptyFalconData();
    const after = afterCase || emptyFalconData();
    const flow = before.flow === "card" || after.flow === "card" ? "card" : "banking";
    const visualFlow = flow === "banking" && (before.visualFlow === "hold" || after.visualFlow === "hold") ? "hold" : flow;
    const valid = (...values) => values.find((value) => !isMissing(value)) || "N/A";
    const optional = (...values) => values.find((value) => !isMissing(value)) || "";
    const cardFirst = (name) => valid(before[name], after[name]);
    const caseFirst = (name) => valid(after[name], before[name]);
    return {
      ...before,
      ...after,
      type: EXPORT_FALCON,
      flow,
      visualFlow,
      orangeFound: Boolean(before.orangeFound || after.orangeFound),
      holdByRule: Boolean(before.holdByRule || after.holdByRule),
      cardByTransactionType: Boolean(before.cardByTransactionType || after.cardByTransactionType),
      caseNumber: caseFirst("caseNumber"),
      accountId: caseFirst("accountId"),
      holderDocument: optional(after.holderDocument, before.holderDocument),
      holderDocumentSource: optional(after.holderDocumentSource, before.holderDocumentSource),
      originCustomerId: optional(after.originCustomerId, before.originCustomerId),
      creditCustomerId: optional(after.creditCustomerId, before.creditCustomerId),
      counterpartyDocument: optional(after.counterpartyDocument, before.counterpartyDocument),
      counterpartyCnpj: optional(after.counterpartyCnpj, before.counterpartyCnpj),
      counterpartyCpf: optional(after.counterpartyCpf, before.counterpartyCpf),
      counterpartyDirection: [after.counterpartyDirection, before.counterpartyDirection].find((value) => ["ORIGIN", "DESTINATION"].includes(value)) || "BOTH",
      counterpartySourceField: optional(after.counterpartySourceField, before.counterpartySourceField),
      counterpartySourceLabel: optional(after.counterpartySourceLabel, before.counterpartySourceLabel),
      sourceTransactionType: flow === "card" ? cardFirst("sourceTransactionType") : caseFirst("sourceTransactionType"),
      cardNumber: flow === "card" ? cardFirst("cardNumber") : "N/A",
      cardLast4: flow === "card" ? valid(before.cardLast4, after.cardLast4, last4(before.cardNumber), last4(after.cardNumber)) : "",
      transactionType: flow === "card" ? cardFirst("transactionType") : caseFirst("transactionType"),
      transactionDecision: flow === "card" ? cardFirst("transactionDecision") : "N/A",
      merchant: flow === "card" ? cardFirst("merchant") : "N/A",
      value: flow === "card" ? cardFirst("value") : caseFirst("value"),
      rule: flow === "card" ? cardFirst("rule") : caseFirst("rule"),
      history: flow === "card" ? "N/A" : formatHistoryValue(valid(after.history, before.history, "0000000000")),
      historyFound: flow !== "card" && Boolean(before.historyFound || after.historyFound),
      transactionDateRaw: flow === "card"
        ? valid(before.transactionDateRaw, before.transactionDate, after.transactionDateRaw, after.transactionDate)
        : valid(after.transactionDateRaw, after.transactionDate, before.transactionDateRaw, before.transactionDate),
      transactionDate: flow === "card" ? cardFirst("transactionDate") : caseFirst("transactionDate")
    };
  }

  // ========================= CONSOLE: LEITURA =======================
  const CONSOLE_SELECTORS = Object.freeze({
    issuerMenu: ".userGuide-company-menu button",
    treatmentNodes: "button,[role='button'],a,.c-breadcrumb__li",
    valueLabels: "p,span,label,strong,small",
    infoContainers: ".grid-container-info,.c-grid--container,[data-testid*='info'],[class*='info'],li",
    accountData: ".account-data",
    accountStatusChip: ".c-chip__label",
    cardAccordion: "[data-testid='cards-accordion'],.accordion-cards",
    cardAccordionTrigger: ".c-accordion__summary,[data-testid='cards-accordion-summary']"
  });
  const CONSOLE_TREATMENT = Object.freeze({
    brasil: ["BACKOFFICE BRASIL"],
    global: ["GLOBAL BACKOFFICE", "BACKOFFICE GLOBAL"]
  });
  const CONSOLE_EMPTY_CARD = Object.freeze({
    cardId: "N/A",
    cardNumber: "N/A",
    cardLast4: "N/A",
    cardType: "N/A",
    cardStatus: "N/A",
    matched: false
  });

  function consoleText(node) {
    return clean(textOf(node), "");
  }
  function consoleTreatmentFromText(value) {
    const text = normalize(value);
    if (CONSOLE_TREATMENT.global.includes(text)) return TREATMENT.global.label;
    if (CONSOLE_TREATMENT.brasil.includes(text)) return TREATMENT.brasil.label;
    return "";
  }
  function findIssuer() {
    const menu = document.querySelector(CONSOLE_SELECTORS.issuerMenu);
    const menuText = consoleText(menu);
    if (menuText && !consoleTreatmentFromText(menuText)) return clean(menuText);
    const ignored = /^(BACKOFFICE|GLOBAL|JIRA|COM CHAMADA|COM SUCESSO|FINALIZAR|TENTAR|HISTORICO|CONFIG|RECARREGAR|FECHAR|MINIMIZAR)/i;
    const candidate = all("button,[role='button']")
      .map((button) => ({ button, text: consoleText(button) }))
      .find(({ button, text }) => button.querySelector("svg") && text && text.length < 60 && !ignored.test(text) && !consoleTreatmentFromText(text));
    return clean(candidate?.text);
  }
  function findTreatment() {
    const exact = all(CONSOLE_SELECTORS.treatmentNodes).map(consoleText).map(consoleTreatmentFromText).find(Boolean);
    if (exact) return exact;
    if (/global-backoffice/i.test(location.pathname) || document.querySelector(".global-backoffice-home-container,[class*='global-backoffice']")) return TREATMENT.global.label;
    return TREATMENT.brasil.label;
  }
  function treatmentKindOf(value) {
    return normalize(value).includes("GLOBAL") ? "global" : "brasil";
  }
  function findConsoleCpfCnpj() {
    const labeled = ["CPF/CNPJ", "CPF", "CNPJ", "Documento", "Número do documento"]
      .map(findValueAfterLabel)
      .find((value) => documentKind(findDocumentInText(value)));
    return clean(findDocumentInText(labeled));
  }
  function findValueAfterLabel(label) {
    const wanted = normalize(label);
    for (const node of all(CONSOLE_SELECTORS.valueLabels)) {
      if (normalize(consoleText(node)) !== wanted) continue;
      const next = consoleText(node.nextElementSibling);
      if (next && normalize(next) !== wanted) return next;
      const labelBox = node.closest(".c-grid--item,[class*='item'],div,li");
      const siblings = Array.from(labelBox?.parentElement?.children || []);
      const index = siblings.indexOf(labelBox);
      if (index >= 0) {
        const siblingValue = siblings.slice(index + 1).map(consoleText).find((value) => value && normalize(value) !== wanted);
        if (siblingValue) return siblingValue;
      }
      const container = node.closest(CONSOLE_SELECTORS.infoContainers);
      const pieces = all(CONSOLE_SELECTORS.valueLabels, container).map(consoleText).filter(Boolean);
      const pieceIndex = pieces.findIndex((piece) => normalize(piece) === wanted);
      if (pieceIndex >= 0) {
        const value = pieces.slice(pieceIndex + 1).find((piece) => normalize(piece) !== wanted);
        if (value) return value;
      }
    }
    return "";
  }
  function findRegistrationDate() {
    const directRegistration = all(
      ".accounts-details-registration-date,.accounts-details-registration-date-info,[data-testid*='registration-date'],[class*='registration-date']"
    ).map(textOf).find((text) => /\b\d{2}\/\d{2}\/\d{4}\b/.test(text) || /\b\d{4}-\d{2}-\d{2}\b/.test(text));
    if (directRegistration) {
      return clean(directRegistration.match(/\b\d{2}\/\d{2}\/\d{4}\b/)?.[0] || directRegistration.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0]);
    }
    for (const label of ["Data de cadastro", "Data de registro"]) {
      const labeled = findValueAfterLabel(label);
      const date = labeled.match(/\b\d{2}\/\d{2}\/\d{4}\b/)?.[0] || labeled.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0];
      if (date) return clean(date);
    }
    const registrationNode = all("[class*='registration-date'],[data-testid*='registration'],[data-testid*='created']").map(textOf).find((text) => /\b\d{2}\/\d{2}\/\d{4}\b/.test(text) || /\b\d{4}-\d{2}-\d{2}\b/.test(text));
    if (registrationNode) return clean(registrationNode.match(/\b\d{2}\/\d{2}\/\d{4}\b/)?.[0] || registrationNode.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0] || registrationNode);
    return "N/A";
  }
  function findAccountNumber(expectedAccount = "") {
    const selectedAccount = consoleText(document.querySelector(".select-account .c-select__input-root"));
    const selectedId = selectedAccount.match(/^\s*([0-9A-Z-]{4,})\s*-/i)?.[1] || "";
    if (selectedId) return clean(selectedId);
    const expectedKey = alnumOnly(expectedAccount);
    const croppedIds = all("[data-testid^='cropped-id-']")
      .map((node) => String(node.dataset.testid || "").replace(/^cropped-id-/, ""))
      .filter(Boolean);
    const matchingCropped = expectedKey ? croppedIds.find((value) => alnumOnly(value) === expectedKey) : "";
    if (matchingCropped) return clean(matchingCropped);
    if (croppedIds.length === 1) return clean(croppedIds[0]);
    const account = consoleText(document.querySelector(CONSOLE_SELECTORS.accountData));
    if (account) return clean(account);
    return clean(["Conta", "Número da conta", "ID conta", "ID da conta"].map(findValueAfterLabel).find(Boolean));
  }

  function findConsolePhone() {
    const direct = ["Telefone", "Celular", "Número de telefone", "Telefone celular"]
      .map(findValueAfterLabel)
      .find((value) => /\d{2}\D*\d{4,5}\D*\d{4}/.test(String(value || "")));
    return clean(direct, "");
  }

  function firstConsoleLabeledValue(labels = []) {
    return clean(labels.map(findValueAfterLabel).find((value) => !isMissing(value)), "");
  }

  function firstScopedConsoleValue(root, labels = []) {
    if (!root) return "";
    const wanted = new Set(labels.map(normalize));
    for (const node of all(CONSOLE_SELECTORS.valueLabels, root)) {
      if (!wanted.has(normalize(consoleText(node)))) continue;
      const direct = consoleText(node.nextElementSibling);
      if (direct && !wanted.has(normalize(direct))) return direct;
      const row = node.closest(".c-grid--item,[class*='item'],div,li,tr");
      const rowText = consoleText(row);
      const withoutLabel = rowText.replace(consoleText(node), "").trim();
      if (withoutLabel && !wanted.has(normalize(withoutLabel))) return withoutLabel;
    }
    return "";
  }

  function consolePartnerIdentity() {
    const marker = all("button,[role='tab'],h1,h2,h3,h4,h5,h6,p,span,strong")
      .find((node) => ["SOCIO", "SOCIOS", "QUADRO SOCIETARIO"].includes(normalize(consoleText(node))));
    if (!marker) return { name: "", cpf: "" };
    let scope = marker.parentElement;
    for (let depth = 0; scope && depth < 7; depth += 1, scope = scope.parentElement) {
      const scopeText = consoleText(scope);
      const cpf = scopeText.match(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/)?.[0]
        || scopeText.match(/(?:^|\D)(\d{11})(?:\D|$)/)?.[1]
        || "";
      const name = firstScopedConsoleValue(scope, [
        "Nome completo", "Nome do sócio", "Nome do socio", "Nome do responsável", "Nome do responsavel", "Responsável", "Responsavel"
      ]);
      if (cpf || name) return { name: clean(name, ""), cpf: digitsOnly(cpf).slice(0, 11) };
    }
    return { name: "", cpf: "" };
  }

  function consolePersonHeaderName() {
    return clean(textOf(document.querySelector(".person-header .person-name p,.person-header [data-testid*='name'],[data-testid='person-name']")), "");
  }

  function collectConsolePidIdentity(data = {}) {
    const kind = documentKind(data?.cpfCnpj);
    const partner = consolePartnerIdentity();
    if (kind === "CNPJ") {
      const responsibleName = partner.name || firstConsoleLabeledValue([
        "Nome do responsável", "Nome do responsavel", "Nome do sócio", "Nome do socio", "Responsável", "Responsavel"
      ]);
      const responsibleDocument = partner.cpf || firstConsoleLabeledValue([
        "CPF do responsável", "CPF do responsavel", "CPF do sócio", "CPF do socio", "Documento do sócio", "Documento do socio"
      ]);
      const responsibleCpf = digitsOnly(responsibleDocument).slice(0, 11);
      return {
        responsibleName,
        responsibleCpf: responsibleCpf.length === 11 ? responsibleCpf : ""
      };
    }
    const clientCpf = partner.cpf || (documentKind(data?.cpfCnpj) === "CPF" ? documentFieldValue(data.cpfCnpj) : "");
    return {
      clientName: partner.name || firstConsoleLabeledValue(["Nome do Cliente", "Nome do cliente", "Nome completo"])
        || consolePersonHeaderName(),
      clientCpf: digitsOnly(clientCpf).slice(0, 11)
    };
  }

  function collectConsolePidField(label, data = {}) {
    const wanted = normalize(label);
    const saved = data?.pidData || {};
    const identity = collectConsolePidIdentity(data);
    if (wanted.includes("NOME DO RESPONSAVEL") || wanted.includes("NOME DO SOCIO")) {
      return { key: "responsibleName", value: clean(identity.responsibleName || saved.responsibleName, "") };
    }
    if (wanted.includes("CPF DO RESPONSAVEL") || wanted.includes("CPF DO SOCIO")) {
      return { key: "responsibleCpf", value: clean(identity.responsibleCpf || saved.responsibleCpf, "") };
    }
    if (wanted.includes("NOME DO CLIENTE")) return { key: "clientName", value: clean(identity.clientName || saved.clientName, "") };
    if (wanted === "CPF DO CLIENTE" || wanted === "CPF") return { key: "clientCpf", value: clean(identity.clientCpf || saved.clientCpf, "") };
    if (wanted.includes("NOME DA MAE")) return { key: "motherName", value: firstConsoleLabeledValue(["Nome da mãe", "Nome da mae", "Mãe", "Mae"]) || clean(saved.motherName, "") };
    if (wanted.includes("NASCIMENTO")) return { key: "birthDate", value: firstConsoleLabeledValue(["Data de nascimento", "Nascimento"]) || clean(saved.birthDate, "") };
    if (wanted.includes("ENDERECO")) return { key: "address", value: firstConsoleLabeledValue(["Endereço de correspondência", "Endereço cadastrado", "Endereço"]) || clean(saved.address, "") };
    if (wanted.includes("TELEFONE")) return { key: "phone", value: findConsolePhone() || clean(saved.phone, "") };
    if (wanted.includes("ULTIMA COMPRA")) return { key: "lastPurchase", value: firstConsoleLabeledValue(["Última compra", "Ultima compra", "Última transação de cartão", "Ultima transacao de cartao"]) };
    if (wanted.includes("LIMITE") && wanted.includes("SALDO")) {
      const cardLimit = firstConsoleLabeledValue(["Limite disponível", "Limite do cartão", "Limite"]);
      if (cardLimit) return { key: "cardLimit", value: cardLimit };
      return { key: "balance", value: firstConsoleLabeledValue(["Saldo disponível", "Saldo da conta", "Saldo"]) };
    }
    if (wanted.includes("LIMITE")) return { key: "cardLimit", value: firstConsoleLabeledValue(["Limite disponível", "Limite do cartão", "Limite"]) };
    if (wanted.includes("SALDO")) return { key: "balance", value: firstConsoleLabeledValue(["Saldo disponível", "Saldo da conta", "Saldo"]) };
    if (wanted.includes("CPF")) return { key: "document", value: documentFieldValue(data.cpfCnpj) };
    if (wanted.includes("CARTAO")) return { key: "cardLast4", value: last4(data.cardNumber || data.cardLast4) };
    return { key: "", value: "" };
  }

  function collectConsolePidData(data = {}) {
    const labels = [
      "Nome do cliente", "CPF do cliente", "Nome do responsável da empresa", "CPF do responsável",
      ...PID_DEFAULT_REQUIRED, ...PID_DEFAULT_COMPLEMENTARY, ...PID_AMIGOZ_REQUIRED, ...PID_AMIGOZ_COMPLEMENTARY
    ];
    return labels.reduce((result, label) => {
      const field = collectConsolePidField(label, data);
      if (field.key && field.value && !result[field.key]) result[field.key] = field.value;
      return result;
    }, {});
  }

  function compareFalconConsoleAccount(falcon, consoleAccount, consoleDocument = "", consoleCardNumber = "") {
    if (falcon?.flow === "card") {
      const falconCardLast4 = last4(falcon?.cardNumber || falcon?.cardLast4);
      const consoleCardLast4 = last4(consoleCardNumber);
      return {
        comparable: Boolean(falconCardLast4 && consoleCardLast4),
        matches: Boolean(falconCardLast4 && consoleCardLast4 && falconCardLast4 === consoleCardLast4),
        cardComparable: Boolean(falconCardLast4 && consoleCardLast4),
        cardMatches: Boolean(falconCardLast4 && consoleCardLast4 && falconCardLast4 === consoleCardLast4),
        accountComparable: false,
        accountMatches: true,
        documentComparable: false,
        documentMatches: true
      };
    }
    const falconKey = alnumOnly(falcon?.accountId);
    const consoleKey = alnumOnly(consoleAccount);
    const falconDocument = documentFieldValue(falcon?.holderDocument);
    const consoleDocumentValue = documentFieldValue(consoleDocument);
    const accountComparable = Boolean(falconKey && consoleKey);
    const documentComparable = Boolean(falconDocument && consoleDocumentValue);
    const accountMatches = !accountComparable || falconKey === consoleKey;
    const documentMatches = !documentComparable || falconDocument === consoleDocumentValue;
    const data = {
      comparable: accountComparable || documentComparable,
      matches: (accountComparable || documentComparable) && accountMatches && documentMatches,
      accountComparable,
      accountMatches,
      documentComparable,
      documentMatches
    };
    return data;
  }
  function accountStatusFromContainer(root) {
    if (!root) return "";
    const candidates = all(".c-chip__label,div[data-state='closed'][type='button']", root);
    if (candidates.length !== 1) return "";
    const value = consoleText(candidates[0]);
    return value && !["STATUS CONTA", "STATUS DA CONTA"].includes(normalize(value)) ? value : "";
  }
  function findAccountStatus() {
    const labeled = ["Status conta", "Status da conta"].map(findValueAfterLabel).find(Boolean);
    if (labeled) return clean(labeled);

    const statusLabel = all(CONSOLE_SELECTORS.valueLabels)
      .find((node) => ["STATUS CONTA", "STATUS DA CONTA"].includes(normalize(consoleText(node))));
    const scoped = accountStatusFromContainer(statusLabel?.closest(CONSOLE_SELECTORS.infoContainers))
      || accountStatusFromContainer(statusLabel?.parentElement?.parentElement);
    if (scoped) return clean(scoped);

    const accountRoot = document.querySelector(CONSOLE_SELECTORS.accountData)
      ?.closest(".c-grid--container,[data-testid*='account'],[class*='account'],section");
    const accountScoped = accountStatusFromContainer(accountRoot);
    if (accountScoped) return clean(accountScoped);

    const chips = all(CONSOLE_SELECTORS.accountStatusChip).map(consoleText).filter(Boolean);
    if (chips.length === 1) return clean(chips[0]);

    const stateButtons = all("div[data-state='closed'][type='button']").map(consoleText).filter(Boolean);
    return stateButtons.length === 1 ? clean(stateButtons[0]) : "N/A";
  }
  function tableColumn(row, columnIndex) {
    return all("[data-testid]", row).find((node) => {
      const id = node.getAttribute("data-testid") || "";
      return id === `column_0_${columnIndex}` || new RegExp(`^column_\\d+_${columnIndex}$`).test(id);
    }) || null;
  }
  function tableCells(row) {
    const mapped = [0, 1, 2, 3].map((index) => tableColumn(row, index));
    if (mapped.every(Boolean)) return mapped;
    return all("td,[role='cell']", row);
  }
  function consoleCardTable() {
    return all("table").find((table) => {
      const text = normalize(textOf(table.querySelector("thead") || table));
      return text.includes("ID CARTAO") && text.includes("NUMERO DO CARTAO") && text.includes("STATUS DO CARTAO");
    }) || null;
  }
  function consoleCardRows() {
    const table = consoleCardTable();
    if (!table) return [];
    return all("tbody tr.c-table__row,tbody tr", table).filter((row) => tableCells(row).length >= 4);
  }
  async function ensureCardGridOpen() {
    if (consoleCardRows().length) return true;
    const accordion = document.querySelector(CONSOLE_SELECTORS.cardAccordion)
      || all(".c-accordion").find((node) => normalize(node.getAttribute("title") || textOf(node.querySelector(".accordion-summary"))) === "CARTOES");
    const trigger = accordion?.querySelector(CONSOLE_SELECTORS.cardAccordionTrigger)
      || all("button,a,[role='button']").find((node) => normalize(textOf(node)) === "CARTOES");
    if (!trigger) return false;
    try { trigger.click(); } catch (_err) {}
    return waitForField(() => consoleCardRows().length > 0, 24, 100);
  }
  function consoleCardCell(row, index) {
    return tableColumn(row, index) || tableCells(row)[index] || null;
  }
  function emptyConsoleCard(cardLast4 = "N/A") {
    return { ...CONSOLE_EMPTY_CARD, cardLast4 };
  }
  function findCardConsoleData(lastDigits) {
    const rows = consoleCardRows();
    const targetLast4 = clean(lastDigits, "");
    if (!targetLast4 || targetLast4.length !== 4) {
      return emptyConsoleCard();
    }
    const matchedRow = rows.find((tr) => {
      const cardText = digitsOnly(textOf(consoleCardCell(tr, 1)));
      return cardText.endsWith(targetLast4);
    });
    if (!matchedRow) {
      return emptyConsoleCard(targetLast4);
    }
    const cardNumber = clean(textOf(consoleCardCell(matchedRow, 1)));
    const statusCell = consoleCardCell(matchedRow, 3);
    return {
      cardId: clean(textOf(consoleCardCell(matchedRow, 0))),
      cardNumber,
      cardLast4: last4(cardNumber) || targetLast4,
      cardType: clean(textOf(consoleCardCell(matchedRow, 2))),
      cardStatus: clean(textOf(statusCell?.querySelector(".c-chip__label")) || textOf(statusCell)),
      matched: true
    };
  }

  async function loadFalconPackage() {
    const stored = readJson("lastFalcon");
    const shared = memory.transport.get("falcon");
    let clipboardPackage = null;
    const pasted = await readClipboardText();
    if (pasted?.startsWith(`${EXPORT_FALCON}::`)) {
      try {
        const data = JSON.parse(pasted.slice(`${EXPORT_FALCON}::`.length));
        if (isCurrentPackage(data, EXPORT_FALCON)) clipboardPackage = data;
      } catch (_err) {}
    }
    const selected = [stored, shared, clipboardPackage]
      .filter((data) => isCurrentPackage(data, EXPORT_FALCON))
      .sort((a, b) => Number(b.savedAt || 0) - Number(a.savedAt || 0))[0] || null;
    if (selected) {
      hydrateMemoryFromPackage(selected);
      writeJson("lastFalcon", selected);
    }
    else if (stored) storageRemove("lastFalcon");
    return selected;
  }
  async function loadConsolePackage() {
    const stored = readJson("lastConsole");
    const shared = memory.transport.get("console");
    let clipboardPackage = null;
    const pasted = await readClipboardText();
    if (pasted?.startsWith(`${EXPORT_CONSOLE}::`)) {
      try {
        const data = JSON.parse(pasted.slice(`${EXPORT_CONSOLE}::`.length));
        if (isCurrentPackage(data, EXPORT_CONSOLE)) clipboardPackage = data;
      } catch (_err) {}
    }
    const selected = [stored, shared, clipboardPackage]
      .filter((data) => isCurrentPackage(data, EXPORT_CONSOLE))
      .sort((a, b) => Number(b.savedAt || 0) - Number(a.savedAt || 0))[0] || null;
    if (selected) {
      hydrateMemoryFromPackage(selected);
      writeJson("lastConsole", selected);
    }
    else if (stored) storageRemove("lastConsole");
    return selected;
  }
  function isCurrentPackage(data, type) {
    if (!data || data.type !== type) return false;
    if (Number(data.packageSchema || 1) !== PACKAGE_SCHEMA) return false;
    const packageFamily = String(data.buildFamily || data.buildVersion || "").split(".")[0];
    if (packageFamily !== BUILD_FAMILY) return false;
    const age = Date.now() - Number(data.savedAt || 0);
    return age >= 0 && age < PACKAGE_TTL_MS;
  }

  function falconCaseTabSelected() {
    const cell = byId("csOvwFrm:TabView:CaseSummary");
    if (cell?.getAttribute("oselected") === "true") return true;
    if (cell?.querySelector(".tabItemSelected") && normalize(textOf(cell)) === "CASO") return true;
    return all(".tabItemSelected").some((node) => normalize(textOf(node)) === "CASO");
  }
  async function ensureFalconCaseTab() {
    if (falconCaseTabSelected()) return true;
    const cell = byId("csOvwFrm:TabView:CaseSummary");
    const clickable = cell?.querySelector("a,button,[role='tab']")
      || all("a,button,[role='tab']").find((node) => normalize(textOf(node)) === "CASO")
      || all("span,div,td,li").find((node) => normalize(textOf(node)) === "CASO")?.closest?.("a,button,[role='tab'],td,li");
    if (!clickable) return false;
    try {
      clickable.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window }));
      clickable.click();
      clickable.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, view: window }));
    } catch (_err) {
      return false;
    }
    return waitForField(falconCaseTabSelected, 50, 100);
  }
  function hasFalconCaseTab() {
    return Boolean(byId("csOvwFrm:TabView:CaseSummary"))
      || all("span,div,a,td,li").some((node) => normalize(textOf(node)) === "CASO");
  }
  function scrollFalconGridRight() {
    const container = document.querySelector(".autoScroll");
    if (container) {
      container.scrollLeft = 5000;
      return true;
    }
    try {
      window.scrollTo(document.body.scrollWidth, window.scrollY);
    } catch (_err) {}
    return false;
  }

  // ========================= FALCON: JANELA =========================
  async function renderFalcon() {
    scrollFalconGridRight();
    await wait(180);
    const beforeCase = collectFalconData();
    const caseTabAvailable = hasFalconCaseTab();
    const caseTabReady = await ensureFalconCaseTab();
    if (caseTabAvailable && !caseTabReady) {
      const panel = renderPanel({
        id: "sac-panel-falcon",
        stage: "FALCON",
        flow: "banking",
        subtitle: "Aba necessária para a coleta",
        body: section("Atenção", `<div class="sac-grid">${kv("Acesse a aba Caso", "ACESSE A ABA CASO", "sac-missing sac-single-alert")}</div>`, "ação necessária"),
        footer: `<button class="sac-main" id="sac-retry-case">Tentar novamente</button>`
      });
      panel.querySelector("#sac-retry-case")?.addEventListener("click", () => {
        panel.remove();
        renderFalcon();
      });
      return;
    }
    scrollFalconGridRight();
    await wait(600);
    const data = mergeFalconCollections(beforeCase, collectFalconData());
    if (data.visualFlow === "hold") {
      const holdRows = selectHoldRowsCheckboxes();
      const holdAction = selectHoldActionCheckbox();
      data.holdRowsFound = holdRows.found;
      data.holdRowsSelected = holdRows.selected;
      data.holdActionFound = holdAction.found;
      data.holdActionSelected = holdAction.selected;
    }
    const missing = requiredFalcon(data);
    if (!data.orangeFound) {
      showNotice("Ainda não encontrei a linha laranja do Falcon. Selecione a transação para eu coletar tudo certinho.", "error");
    }
    const save = async (options = {}) => {
      if (missing.length) {
        if (getSafeMode()) {
          showNotice(`Ainda faltam dados: ${missing.join(", ")}. Veja os grids em laranja e tente novamente.`, "error");
          return false;
        }
        showNotice(`Atenção: faltam dados (${missing.join(", ")}), mas o modo seguro está desligado.`, "warn");
      }
      storeMediaRequest({ falcon: data, visualFlow: data.visualFlow, flow: data.flow });
      const packageData = { ...transferableCaseData(data), packageSchema: PACKAGE_SCHEMA, buildFamily: BUILD_FAMILY, buildVersion: BUILD_VERSION, savedAt: Date.now(), sharedMemory: packageMemorySnapshot() };
      writeJson("lastFalcon", packageData);
      storageRemove("lastConsole");
      memory.transport.set("falcon", packageData);
      memory.transport.clear("console");
      const copied = await copyText(`${EXPORT_FALCON}::${JSON.stringify(packageData)}`);
      if (!copied) {
        showNotice("Não consegui transferir os dados do Falcon. A janela foi mantida aberta; clique em Finalizar etapa novamente.", "error", 15000);
        return false;
      }
      releaseInvestigationSession(data);
      showNotice(options.invisible ? "Dados do Falcon coletados. Pode seguir para o Console." : "Falcon finalizado. Abra o Console para continuar.", options.invisible ? "complete" : "success");
      closeAuxiliaryPanels("sac-panel-falcon");
      closeSidePanels("sac-panel-falcon");
      byId("sac-panel-falcon")?.remove();
      return true;
    };
    const falconRowsSource = () => transactionEngine.collectFalconTransactions({
      root: document,
      transactionType: data.sourceTransactionType || data.transactionType
    });
    if (getInvisibleMode()) {
      const saved = await save({ invisible: true });
      if (saved) {
        const toolsPanel = renderPanel({
          id: "sac-panel-falcon",
          stage: "FALCON",
          flow: data.visualFlow,
          subtitle: "Coleta concluída · modo invisível"
        });
        attachInvisibleToolHub(toolsPanel, "FALCON", data, falconRowsSource, { standalone: true });
        return;
      }
    }
    const body = section("Dados do Falcon", falconGrid(data), FLOW[data.visualFlow]?.label || "BANKING");
    const panel = renderPanel({
      id: "sac-panel-falcon",
      stage: "FALCON",
      flow: data.visualFlow,
      subtitle: "Dados coletados da transação",
      body,
      footer: `<button class="sac-main" id="sac-save-falcon">Finalizar etapa</button>`,
      onEnter: save
    });
    byId("sac-save-falcon")?.addEventListener("click", save);
    if (getInvisibleMode()) attachInvisibleToolHub(panel, "FALCON", data, falconRowsSource);
    else attachInvestigationLauncher(panel, "FALCON", data, falconRowsSource);
    enableManualGridEditing(panel, data);
  }

  function requiredFalcon(data) {
    const base = [["Caso", data.caseNumber], ["Valor", data.value], ["Regra", data.rule], ["Data/Hora", data.transactionDate]];
    const extra = data.flow === "card"
      ? [[data.cardByTransactionType ? "" : "Cartão", data.cardNumber], ["Estabelecimento", data.merchant], ["Decisão transação", data.transactionDecision]]
      : [["Tipo transação", data.transactionType]];
    const missing = [...base, ...extra].filter(([label, value]) => label && isMissing(value)).map(([label]) => label);
    if (data.visualFlow === "hold" && data.holdActionFound && !data.holdActionSelected) missing.push("Ação HOLD");
    if (!data.orangeFound) missing.unshift("Linha laranja");
    return missing;
  }
  function falconGrid(data) {
    const common = kv("Caso", data.caseNumber) + kv("Valor", `R$ ${data.value}`) + kv("Regra", data.rule) + kv("Data/Hora", trimTimeToMinute(data.transactionDate));
    const historyGrid = data.flow === "card" ? "" : kv("Histórico de infrações", formatHistoryValue(data.history), historyLevel(data.history, data.historyFound));
    const holderDocumentGrid = data.holderDocument ? kv("CPF/CNPJ", data.holderDocument) : "";
    if (data.flow === "card") {
      const cardIdentity = data.cardByTransactionType ? kv("Tipo transação", data.sourceTransactionType) : kv("Cartão", data.cardNumber);
      return `<div class="sac-grid">${cardIdentity}${kv("Estabelecimento", data.merchant)}${kvOptional("Tipo compra cartão", data.transactionType)}${kv("Decisão transação", data.transactionDecision)}${common}${holderDocumentGrid}</div>`;
    }
    const counterpartyGrid = data.counterpartyDocument
      ? kv(data.counterpartySourceLabel || "Quem enviou ou recebeu", data.counterpartyDocument)
      : "";
    return `<div class="sac-grid">${kv("Tipo transação", data.transactionType)}${common}${historyGrid}${holderDocumentGrid}${counterpartyGrid}</div>`;
  }

  function collectConsoleData(falcon) {
    const flow = falcon?.flow === "card" ? "card" : "banking";
    const treatment = findTreatment();
    const treatmentKind = treatmentKindOf(treatment);
    const isGlobal = treatmentKind === "global";
    const collectedCard = flow === "card"
      ? findCardConsoleData(falcon.cardLast4)
      : { cardId: "ausência de dados", cardNumber: "ausência de dados", cardLast4: "ausência de dados", cardType: "ausência de dados", cardStatus: "ausência de dados", matched: true };
    const globalCardWithoutData = flow === "card" && isGlobal && collectedCard.matched === false;
    const card = globalCardWithoutData
      ? { cardId: "ausência de dados", cardNumber: "ausência de dados", cardLast4: "ausência de dados", cardType: "ausência de dados", cardStatus: "ausência de dados", matched: true }
      : collectedCard;
    const data = {
      type: EXPORT_CONSOLE,
      flow,
      visualFlow: falcon?.visualFlow || flow,
      falcon,
      treatment,
      treatmentKind,
      treatmentLabel: TREATMENT[treatmentKind].label,
      isGlobal,
      account: findAccountNumber(falcon?.accountId),
      accountStatus: clean(findAccountStatus(), ""),
      cpfCnpj: findConsoleCpfCnpj(),
      registrationDate: findRegistrationDate(),
      phone: findConsolePhone(),
      issuer: findIssuer(),
      cardId: card.cardId || "N/A",
      cardNumber: card.cardNumber || "N/A",
      cardLast4: card.cardLast4 || "N/A",
      cardType: card.cardType || "N/A",
      cardStatus: card.cardStatus || "N/A",
      cardMatched: card.matched !== false,
      cardDataOptional: globalCardWithoutData,
      jiraActive: false,
      jiraReference: "",
      investigationSnapshot: falcon?.investigationSnapshot || {},
      fields: defaultConsoleFields(flow, isGlobal)
    };
    const consolePidData = collectConsolePidData(data);
    data.pidData = { ...(falcon?.pidData || {}), ...consolePidData };
    return data;
  }
  function defaultConsoleFields(flow, isGlobal) {
    if (flow === "card") return { callMode: "sem chamada", callResult: "", merchantHistory: "", purchasePattern: "" };
    return {
      callMode: "sem chamada",
      callResult: "",
      badMedia: "não",
      personStatus: isGlobal ? "N/A" : "normal",
      emailPhoneAddress: "de acordo",
      spdHistory: isGlobal ? "N/A" : "não",
      documentation: isGlobal ? "N/A" : "sem ressalvas",
      statement: "sem suspeitas"
    };
  }

  function counterpartySessionKey(data) {
    return [data?.falcon?.caseNumber, data?.account, data?.issuer]
      .map((value) => normalize(value))
      .filter(Boolean)
      .join("|") || "CURRENT";
  }

  function investigationSnapshot(data) {
    data.investigationSnapshot = data.investigationSnapshot && typeof data.investigationSnapshot === "object"
      ? data.investigationSnapshot
      : {};
    return data.investigationSnapshot;
  }

  function corporateCandidates(data = {}) {
    const falcon = data?.falcon || data || {};
    const candidates = [];
    const add = (documentValue, role, direction = "BOTH", source = "") => {
      const cnpj = counterpartyEngine.normalizeCnpj(documentValue || "");
      if (!counterpartyEngine.validateCnpj(cnpj) || candidates.some((item) => item.cnpj === cnpj)) return;
      candidates.push({ cnpj, role, direction: counterpartyEngine.normalizeDirection(direction), source });
    };
    add(falcon.holderDocument || data?.cpfCnpj, "Titular da conta", "BOTH", falcon.holderDocumentSource || "CPF/CNPJ do titular");
    add(falcon.counterpartyCnpj, "Quem está transacionando", falcon.counterpartyDirection, falcon.counterpartySourceLabel);
    (Array.isArray(data?.investigationSnapshot?.cnpjs) ? data.investigationSnapshot.cnpjs : []).forEach((item) => {
      add(item.cnpj, item.role || "CNPJ analisado", item.direction || "BOTH", item.source || "Análise anterior");
    });
    return candidates;
  }

  function investigationMediaOverview(data) {
    const media = data?.mediaInvestigation?.found ? data.mediaInvestigation : data?.investigationSnapshot?.media;
    if (!media?.found) return "";
    const types = mediaEngine.normalizeTypes(media.mediaTypes || []);
    if (!types.length) return "";
    return `<div class="sac-side-group"><div class="sac-side-group-title">Mídias desabonadoras encontradas</div>${types.map((item) => `<div class="sac-side-card sac-support-summary danger"><strong>${escapeHtml(item)}</strong><span>O CPF do titular foi localizado como réu em processo compatível com esta categoria.</span></div>`).join("")}</div>`;
  }

  function investigationControls(stage, data, rows = []) {
    const snapshot = data?.investigationSnapshot || {};
    const controls = [];
    if ((stage === "FALCON" && rows.length) || stage === "CONSOLE" || snapshot.transaction) {
      controls.push(`<button data-investigation="transaction"><span aria-hidden="true">↗</span>Transacional</button>`);
    }
    if (corporateCandidates(data).length) {
      controls.push(`<button class="sac-investigation-cnpj" data-investigation="cnpj"><span aria-hidden="true">✓</span>CNPJ</button>`);
    }
    if (investigationMediaOverview(data)) {
      controls.push(`<button data-investigation="media"><span aria-hidden="true">!</span>Mídias</button>`);
    }
    return `<div class="sac-investigation-controls count-${controls.length}">${controls.join("")}</div>`;
  }

  function investigationHelpOverview(data, stage = "") {
    const issuer = clean(data?.issuer || data?.falcon?.issuer, "");
    const rule = clean(data?.rule || data?.falcon?.rule, "");
    const issuerHelp = issuer ? contextHelpGroups("issuer", issuer) : "";
    const ruleHelp = rule ? contextHelpGroups("rule", rule) : "";
    const profile = transactionEngine.issuerProfileFor(issuer);
    const transactional = profile ? `
      <div class="sac-side-group">
        <div class="sac-side-group-title">Particularidades transacionais do emissor</div>
        ${profile.expected.map((item) => `<div class="sac-side-card sac-support-summary success"><span>${escapeHtml(item)}</span></div>`).join("")}
        ${profile.cautions.map((item) => `<div class="sac-side-card sac-support-summary warning"><span>${escapeHtml(item)}</span></div>`).join("")}
      </div>` : "";
    const flow = data?.visualFlow || data?.flow || data?.falcon?.flow || "banking";
    const isCard = flow === "card";
    const bookGuidance = [
      isCard
        ? "Compare recorrência, estabelecimento, modo de entrada e histórico de compra antes da decisão."
        : "Cruze status/SPD, idade da conta e extrato dos últimos 90 dias quando estiver disponível.",
      "Não baseie bloqueio em um único sinal; reúna pelo menos dois indícios concretos e coerentes.",
      "Mídia desabonadora isolada não define fraude: valide também cadastro e comportamento transacional.",
      "Registre no Falcon e no Console os elementos que sustentaram a decisão."
    ];
    const book = `<div class="sac-side-group sac-book-guidance">
      <div class="sac-side-group-title">Pontos de análise do book</div>
      <div class="sac-book-grid">${bookGuidance.map((item) => `<div class="sac-side-card"><span>${escapeHtml(item)}</span></div>`).join("")}</div>
    </div>`;
    return [
      book,
      issuerHelp ? `<div class="sac-side-group"><div class="sac-side-group-title">Particularidades do emissor</div>${issuerHelp}</div>` : "",
      transactional,
      ruleHelp ? `<div class="sac-side-group"><div class="sac-side-group-title">Orientação da regra</div>${ruleHelp}</div>` : ""
    ].filter(Boolean).join("");
  }

  function attachInvestigationLauncher(ownerPanel, stage, data, rowsSource = [], options = {}) {
    const forceInvestigation = options.forceInvestigation === true;
    const suppressLaunchers = options.suppressLaunchers === true;
    const investigationEnabled = getInvestigationMode() || forceInvestigation;
    if (!ownerPanel || (!investigationEnabled && !getHelpMode()) || !["FALCON", "CONSOLE", "TABULADOR"].includes(stage)) return null;
    ownerPanel.querySelectorAll(".sac-investigation-launcher").forEach((item) => item.remove());
    let launcher = null;
    let helpLauncher = null;
    if (investigationEnabled && !suppressLaunchers) {
      launcher = document.createElement("button");
      launcher.className = "sac-investigation-launcher";
      launcher.type = "button";
      launcher.title = "Abrir análises do caso";
      launcher.setAttribute("aria-label", "Abrir análises do caso");
      launcher.setAttribute("aria-expanded", "false");
      launcher.innerHTML = `<span class="sac-launcher-icon" aria-hidden="true">⌁</span><span>Analisar</span><i class="sac-launcher-chevron" aria-hidden="true">‹</i>`;
      ownerPanel.appendChild(launcher);
    }
    if (getHelpMode() && !suppressLaunchers) {
      helpLauncher = document.createElement("button");
      helpLauncher.className = `sac-investigation-launcher sac-help-launcher${launcher ? "" : " sac-solo-launcher"}`;
      helpLauncher.type = "button";
      helpLauncher.title = "Abrir ajuda de regra e emissor";
      helpLauncher.setAttribute("aria-label", "Abrir ajuda de regra e emissor");
      helpLauncher.setAttribute("aria-expanded", "false");
      helpLauncher.innerHTML = `<span class="sac-launcher-icon" aria-hidden="true">?</span><span>Ajuda</span><i class="sac-launcher-chevron" aria-hidden="true">‹</i>`;
      ownerPanel.appendChild(helpLauncher);
    }

    const closeCurrentDrawer = () => {
      closeSidePanels(ownerPanel.id);
      launcher?.setAttribute("aria-expanded", "false");
      helpLauncher?.setAttribute("aria-expanded", "false");
      launcher?.classList.remove("sac-launcher-open");
      helpLauncher?.classList.remove("sac-launcher-open");
      ownerPanel.querySelector("[data-invisible-tool='investigation']")?.setAttribute("aria-expanded", "false");
      releaseInvestigationSession(data);
      if (ownerPanel.id === "sac-panel-console") placePidPanel();
    };
    const prepareDrawer = () => {
      const config = ownerPanel.querySelector(".sac-config");
      if (config) {
        config.hidden = true;
        config.classList.remove("open");
        ownerPanel.style.zIndex = "";
      }
      closeSidePanels(ownerPanel.id);
      launcher?.classList.remove("sac-launcher-open");
      helpLauncher?.classList.remove("sac-launcher-open");
      if (ownerPanel.id === "sac-panel-console") closePidPanel();
    };
    const createDrawer = ({ className, supportKey, title, content }) => {
      prepareDrawer();
      const drawer = document.createElement("aside");
      drawer.className = `sac-side-panel sac-support-panel ${className} sac-${getTheme()}`;
      drawer.dataset.owner = ownerPanel.id;
      drawer.dataset.supportKey = supportKey;
      drawer.style.setProperty("--sac-primary", ownerPanel.style.getPropertyValue("--sac-primary") || getFlowTone("banking"));
      drawer.style.setProperty("--sac-font-scale", String(getFontScale()));
      const flowLabel = flowConfig(data?.visualFlow || data?.flow || "banking").label;
      drawer.innerHTML = `
        <div class="sac-investigation-head">
          <span class="sac-investigation-mark" aria-hidden="true"><i></i></span>
          <span class="sac-investigation-heading"><strong>${escapeHtml(title)}</strong><small>${escapeHtml(stage)} · ${escapeHtml(flowLabel)}</small></span>
          <button class="sac-investigation-collapse" data-collapse-investigation aria-label="Recolher painel" title="Recolher painel"><span class="sac-investigation-chevron" aria-hidden="true">›</span><span class="sac-investigation-collapse-label">Recolher</span></button>
        </div>
        <div class="sac-side-body">${content}</div>`;
      document.body.appendChild(drawer);
      placeSidePanel(ownerPanel, drawer);
      drawer.querySelector("[data-collapse-investigation]")?.addEventListener("click", closeCurrentDrawer);
      return drawer;
    };

    const toggleDrawer = () => {
      const existing = document.querySelector(`.sac-investigation-drawer[data-owner="${cssEscape(ownerPanel.id)}"]`);
      if (existing) {
        closeCurrentDrawer();
        return null;
      }
      const rows = stage === "FALCON"
        ? (typeof rowsSource === "function" ? rowsSource() : rowsSource)
        : [];
      const controls = investigationControls(stage, data, Array.isArray(rows) ? rows : []);
      if (!controls.includes("data-investigation")) return null;
      const drawer = createDrawer({
        className: "sac-investigation-drawer",
        supportKey: "MODO ANALISE",
        title: "ANÁLISES",
        content: `${controls}<div class="sac-investigation-result" data-investigation-content><div class="sac-side-card"><span>Escolha uma análise.</span></div></div>`
      });
      launcher?.setAttribute("aria-expanded", "true");
      helpLauncher?.setAttribute("aria-expanded", "false");
      launcher?.classList.add("sac-launcher-open");
      helpLauncher?.classList.add("sac-launcher-open");
      ownerPanel.querySelector("[data-invisible-tool='investigation']")?.setAttribute("aria-expanded", "true");
      const runAction = async (button) => {
        if (!button || button.disabled) return;
        button.disabled = true;
        button.classList.add("active");
        try {
          drawer.querySelectorAll("[data-investigation]").forEach((item) => item.classList.toggle("selected", item === button));
          if (button.dataset.investigation === "cnpj") await openCounterpartyVerification(data, ownerPanel);
          if (button.dataset.investigation === "transaction") {
            if (stage === "FALCON") await openFalconTransactionAnalysis(data, Array.isArray(rows) ? rows : [], ownerPanel);
            else if (stage === "CONSOLE") await openTransactionAnalysis(data, ownerPanel);
            else if (data?.investigationSnapshot?.transaction) openSupportPanel(ownerPanel, data.investigationSnapshot.transaction.title, data.investigationSnapshot.transaction.html);
          }
          if (button.dataset.investigation === "media") openSupportPanel(ownerPanel, "Mídias", investigationMediaOverview(data));
        } finally {
          button.disabled = false;
          button.classList.remove("active");
        }
      };
      drawer.querySelectorAll("[data-investigation]").forEach((button) => button.addEventListener("click", () => runAction(button)));
      return drawer;
    };
    const toggleHelp = () => {
      const existing = document.querySelector(`.sac-help-drawer[data-owner="${cssEscape(ownerPanel.id)}"]`);
      if (existing) {
        closeCurrentDrawer();
        return null;
      }
      const content = investigationHelpOverview(data, stage);
      if (!content) return null;
      const drawer = createDrawer({ className: "sac-help-drawer", supportKey: "MODO AJUDA", title: "AJUDA", content });
      helpLauncher?.setAttribute("aria-expanded", "true");
      launcher?.setAttribute("aria-expanded", "false");
      helpLauncher?.classList.add("sac-launcher-open");
      launcher?.classList.add("sac-launcher-open");
      return drawer;
    };
    launcher?.addEventListener("click", toggleDrawer);
    helpLauncher?.addEventListener("click", toggleHelp);
    const api = Object.freeze({ toggleInvestigation: toggleDrawer, toggleHelp, close: closeCurrentDrawer });
    ownerPanel.__sacInvestigationApi = api;
    return api;
  }

  function attachInvisibleToolHub(ownerPanel, stage, data, rowsSource = [], options = {}) {
    if (!ownerPanel || !["FALCON", "CONSOLE"].includes(stage)) return null;
    ownerPanel.classList.add("sac-invisible-active");
    ownerPanel.querySelector(".sac-invisible-hub")?.remove();
    if (options.standalone) {
      ownerPanel.classList.add("sac-invisible-anchor");
      ["inline-size", "width", "min-inline-size", "min-width", "max-inline-size", "max-width"]
        .forEach((property) => ownerPanel.style.setProperty(property, "42px", "important"));
    }

    const hub = document.createElement("div");
    hub.className = "sac-invisible-hub";
    hub.innerHTML = `
      <button type="button" class="sac-invisible-hub-toggle" data-invisible-tools-toggle aria-expanded="false" aria-label="Abrir ferramentas" title="Abrir ferramentas">⋯</button>
      <div class="sac-invisible-hub-menu" data-invisible-tools-menu hidden>
        <button type="button" data-invisible-tool="investigation" aria-expanded="false"><span aria-hidden="true">⌁</span>Analisar</button>
        <button type="button" data-invisible-tool="config"><span aria-hidden="true">⚙</span>Configurações</button>
        <button type="button" data-invisible-tool="history"><span aria-hidden="true">◷</span>Histórico</button>
      </div>`;
    ownerPanel.querySelector(".sac-head")?.appendChild(hub);

    const support = attachInvestigationLauncher(ownerPanel, stage, data, rowsSource, {
      forceInvestigation: true,
      suppressLaunchers: true
    });
    const toggle = hub.querySelector("[data-invisible-tools-toggle]");
    const menu = hub.querySelector("[data-invisible-tools-menu]");
    const closeMenu = () => {
      menu.hidden = true;
      hub.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    };
    toggle.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const opening = menu.hidden;
      menu.hidden = !opening;
      hub.classList.toggle("open", opening);
      toggle.setAttribute("aria-expanded", opening ? "true" : "false");
    });
    menu.addEventListener("click", (event) => {
      const action = event.target.closest("[data-invisible-tool]");
      if (!action) return;
      event.preventDefault();
      event.stopPropagation();
      closeMenu();
      if (action.dataset.invisibleTool === "investigation") support?.toggleInvestigation();
      if (action.dataset.invisibleTool === "config") {
        support?.close();
        ownerPanel.__sacKeys?.openConfig?.();
      }
      if (action.dataset.invisibleTool === "history") {
        support?.close();
        renderHistory();
      }
    });
    ownerPanel.__sacInvisibleHub = Object.freeze({ closeMenu });
    return hub;
  }

  function mediaHolderDocument(data) {
    const falcon = data?.falcon || (data?.type === EXPORT_FALCON ? data : null);
    const holderDocument = documentFieldValue(falcon?.holderDocument);
    return documentKind(holderDocument) === "CPF" ? holderDocument : "";
  }

  function mediaRequestFor(data) {
    const falcon = data?.falcon || (data?.type === EXPORT_FALCON ? data : null);
    return mediaEngine.createRequest({
      caseNumber: falcon?.caseNumber,
      flow: data?.visualFlow || data?.flow || falcon?.visualFlow || falcon?.flow,
      holderDocument: mediaHolderDocument(data)
    });
  }

  function storeMediaRequest(data) {
    const request = mediaRequestFor(data);
    if (!request.parties.length) return null;
    memory.transport.set("mediaRequest", request);
    return request;
  }

  async function applyPendingMediaResult(data) {
    await memory.hydrateFromClipboard?.();
    const result = memory.transport.get("mediaResult");
    const currentRequest = mediaRequestFor(data);
    let applied = false;
    if (result && mediaEngine.resultMatches(currentRequest, result)) {
      data.fields = data.fields || {};
      data.fields.badMedia = result.found ? "sim" : "não";
      data.fields.badMediaDetails = result.found ? mediaEngine.normalizeTypes(result.mediaTypes) : [];
      data.pidData = { ...(data.pidData || {}), ...(result.pidData || {}) };
      data.mediaInvestigation = result;
      data.investigationSnapshot = {
        ...(data.investigationSnapshot || {}),
        media: result.found ? {
          found: true,
          mediaTypes: mediaEngine.normalizeTypes(result.mediaTypes),
          defendants: Array.isArray(result.defendants) ? result.defendants : []
        } : null
      };
      memory.transport.clear("mediaResult");
      applied = true;
    }
    if (applied) {
      memory.transport.clear("mediaRequest");
      await memory.commitCurrentText?.();
    }
    return applied;
  }

  function openSupportPanel(ownerPanel, title, content) {
    if (!ownerPanel) return null;
    const supportKey = normalize(title);
    const drawer = all(".sac-investigation-drawer").find((item) => item.dataset.owner === ownerPanel.id);
    if (drawer) {
      drawer.dataset.activeSupportKey = supportKey;
      const resultHost = drawer.querySelector("[data-investigation-content]");
      if (resultHost) {
        resultHost.innerHTML = `<div class="sac-side-group"><div class="sac-side-group-title">${escapeHtml(title)}</div>${content}</div>`;
        resultHost.querySelectorAll("[data-close-support]").forEach((button) => button.remove());
      }
      return drawer;
    }
    const existing = all(".sac-side-panel").find((item) => item.dataset.owner === ownerPanel.id && item.dataset.supportKey === supportKey);
    if (existing) {
      existing.remove();
      if (ownerPanel.id === "sac-panel-console") placePidPanel();
      return null;
    }
    closeSidePanels(ownerPanel.id);
    const panel = document.createElement("aside");
    panel.className = `sac-side-panel sac-support-panel sac-context-drawer sac-${getTheme()}`;
    panel.dataset.owner = ownerPanel.id;
    panel.dataset.supportKey = supportKey;
    panel.style.setProperty("--sac-primary", ownerPanel.style.getPropertyValue("--sac-primary") || getFlowTone("banking"));
    panel.style.setProperty("--sac-font-scale", String(getFontScale()));
    panel.innerHTML = `<div class="sac-side-head"><span>${escapeHtml(title)}</span><button class="sac-drawer-toggle" data-close-support aria-label="Recolher painel" title="Recolher painel"><span class="sac-chevron" aria-hidden="true">›</span></button></div><div class="sac-side-body">${content}</div>`;
    document.body.appendChild(panel);
    placeSidePanel(ownerPanel, panel);
    panel.querySelectorAll("[data-close-support]").forEach((button) => button.addEventListener("click", () => {
      panel.remove();
      if (ownerPanel.id === "sac-panel-console") placePidPanel();
    }));
    return panel;
  }

  function transactionSignalClass(kind) {
    if (kind === "favorable") return "success";
    if (kind === "alert") return "danger";
    if (kind === "attention") return "warning";
    return "neutral";
  }

  function investigationCurrency(value) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
  }

  function investigationPeriod(start, end, validDateCount = 0) {
    if (!validDateCount || !Number(start)) return "Período não identificado";
    const formatter = new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
    const first = formatter.format(new Date(Number(start)));
    const last = formatter.format(new Date(Number(end || start)));
    return first === last ? first : `${first} até ${last}`;
  }

  function investigationVelocityHtml(metrics = {}) {
    const buckets = [
      ["1 minuto", Number(metrics.velocity1m || 0)],
      ["5 minutos", Number(metrics.velocity5m || 0)],
      ["10 minutos", Number(metrics.velocity10m || 0)]
    ];
    const active = buckets.filter(([, count]) => count >= 2);
    if (!active.length) return "";
    return `<div class="sac-side-group"><div class="sac-side-group-title">Velocidade transacional</div><div class="sac-investigation-grid">${active.map(([period, count]) => `<div class="sac-side-card sac-support-summary warning"><strong>Dentro de ${escapeHtml(period)}</strong><span>${count} transações</span></div>`).join("")}</div></div>`;
  }

  function investigationUnusualHoursHtml(metrics = {}) {
    const count = Number(metrics.unusualHours || 0);
    if (!count) return "";
    return `<div class="sac-side-group"><div class="sac-side-group-title">Horário suspeito</div><div class="sac-investigation-grid"><div class="sac-side-card sac-support-summary warning"><strong>Entre 00h e 06h</strong><span>${count} transaç${count === 1 ? "ão" : "ões"}</span></div><div class="sac-side-card sac-support-summary warning"><strong>Valor no horário</strong><span>${escapeHtml(investigationCurrency(metrics.unusualHoursAmount))}</span></div></div></div>`;
  }

  function investigationMoneyFlowHtml(metrics = {}) {
    const creditCount = Number(metrics.creditCount || 0);
    const debitCount = Number(metrics.debitCount || 0);
    if (!creditCount && !debitCount) return "";
    const cards = [
      creditCount ? `<div class="sac-side-card sac-support-summary success"><strong>Entradas efetivas</strong><span>${creditCount} · ${escapeHtml(investigationCurrency(metrics.creditAmount))}</span></div>` : "",
      debitCount ? `<div class="sac-side-card sac-support-summary warning"><strong>Saídas efetivas</strong><span>${debitCount} · ${escapeHtml(investigationCurrency(metrics.debitAmount))}</span></div>` : ""
    ].filter(Boolean).join("");
    return `<div class="sac-side-group"><div class="sac-side-group-title">Movimentação efetiva</div><div class="sac-investigation-grid">${cards}</div></div>`;
  }

  function investigationPatternsHtml(metrics = {}) {
    const recurring = Number(metrics.repeatedCounterpartyCount || 0);
    const passThroughPairs = Number(metrics.passThroughPairs || 0);
    const blocked = Number(metrics.blockedAttemptCount || 0);
    const escalations = Number(metrics.lowToHighEscalations || 0);
    const cards = [];
    if (metrics.passThrough) {
      cards.push(`<div class="sac-side-card sac-support-summary danger"><strong>Possível triangulação</strong><span>${passThroughPairs} par${passThroughPairs === 1 ? "" : "es"} de entrada e saída semelhantes em até 10 minutos</span></div>`);
    }
    if (recurring) {
      cards.push(`<div class="sac-side-card sac-support-summary warning"><strong>Envios ou destinos recorrentes</strong><span>${recurring} pessoa${recurring === 1 ? " ou empresa" : "s ou empresas"} recorrente${recurring === 1 ? "" : "s"}</span></div>`);
    }
    if (escalations) {
      cards.push(`<div class="sac-side-card sac-support-summary warning"><strong>Teste seguido de valor elevado</strong><span>${escalations} sequência${escalations === 1 ? "" : "s"} com aumento rápido de valor</span></div>`);
    }
    if (blocked) {
      cards.push(`<div class="sac-side-card sac-support-summary neutral"><strong>Tentativas barradas</strong><span>${blocked} tentativa${blocked === 1 ? "" : "s"}; valores barrados não compõem a movimentação efetiva</span></div>`);
    }
    return cards.length
      ? `<div class="sac-side-group"><div class="sac-side-group-title">Padrões transacionais</div><div class="sac-investigation-grid">${cards.join("")}</div></div>`
      : "";
  }

  function uniqueTransactionSignals(signals = []) {
    const representedByMetrics = new Set(["P2P_PRESENT", "PASS_THROUGH", "TRANSACTION_BURST", "UNUSUAL_HOURS", "LOW_TO_HIGH_ESCALATION"]);
    return (Array.isArray(signals) ? signals : []).filter((item) => !representedByMetrics.has(item?.code));
  }

  function investigationDrawerActive(ownerPanel) {
    return Boolean(ownerPanel?.isConnected && document.querySelector(`.sac-investigation-drawer[data-owner="${cssEscape(ownerPanel.id)}"]`));
  }

  function transactionSignalFact(value) {
    return clean(String(value || "").split(/(?<=[.!?])\s+/)[0], "Sinal transacional identificado.");
  }

  function openInvestigationResult(data, ownerPanel, title, content, snapshotKey = "transaction") {
    const snapshot = investigationSnapshot(data);
    snapshot[snapshotKey] = { title, html: content, savedAt: Date.now() };
    return openSupportPanel(ownerPanel, title, content);
  }

  async function openFalconTransactionAnalysis(data, rows, ownerPanel) {
    const supportKey = normalize("Análise transacional Falcon");
    const existing = all(".sac-side-panel").find((item) => item.dataset.owner === ownerPanel?.id && item.dataset.supportKey === supportKey);
    if (existing) {
      existing.remove();
      return;
    }
    const summary = transactionEngine.summarizeFalconTransactions(rows, {
      issuer: data?.issuer,
      holderDocument: data?.holderDocument || data?.cpfCnpj,
      alertRowIndex: data?.rowIndex,
      alertDateTime: data?.transactionDateRaw || data?.transactionDate,
      rule: data?.rule
    });
    const cardFlow = transactionEngine.isCardTransaction({
      flow: data?.flow,
      transactionType: data?.sourceTransactionType || data?.transactionType
    }, rows);
    const analysis = transactionEngine.analyze({
      flow: data?.flow,
      issuer: data?.issuer,
      transactionType: data?.sourceTransactionType || data?.transactionType,
      rule: data?.rule,
      alertRowIndex: data?.rowIndex,
      alertDateTime: data?.transactionDateRaw || data?.transactionDate,
      rows
    });
    const visibleSignals = uniqueTransactionSignals(analysis.signals);
    const signalCards = visibleSignals.length
      ? `<div class="sac-side-group"><div class="sac-side-group-title">Alertas transacionais</div>${visibleSignals.map((item) => `<div class="sac-side-card sac-support-summary ${transactionSignalClass(item.kind)}"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(transactionSignalFact(item.detail))}</span></div>`).join("")}</div>`
      : "";

    if (cardFlow) {
      const merchantCards = summary.merchants.length
        ? summary.merchants.map((item) => {
            const severity = item.attentionModeCount >= 2
              ? "danger"
              : item.count >= 2
                ? "warning"
                : item.chipPinCount > 0
                  ? "success"
                  : "neutral";
            const modes = item.modes.length ? item.modes : ["Modo de entrada não identificado"];
            const decisions = item.decisions.length ? item.decisions : ["Decisão não identificada"];
            return `<div class="sac-side-card sac-support-summary sac-merchant-card ${severity}">
              <strong>${escapeHtml(item.name || "Estabelecimento não identificado")}</strong>
              <span>${item.count} tentativa${item.count === 1 ? "" : "s"} · ${escapeHtml(investigationCurrency(item.amount))}</span>
              <span class="sac-merchant-meta">${modes.map((mode) => `<i>${escapeHtml(mode)}</i>`).join("")}${decisions.map((decision) => `<i>${escapeHtml(decision)}</i>`).join("")}</span>
            </div>`;
          }).join("")
        : `<div class="sac-side-card sac-support-summary warning"><strong>Estabelecimento não identificado</strong><span>As linhas foram lidas, mas o campo mapeado de estabelecimento não estava disponível.</span></div>`;
      if (!investigationDrawerActive(ownerPanel)) return;
      openInvestigationResult(data, ownerPanel, "Análise transacional de cartão", `
        <div class="sac-transaction-view">
          <div class="sac-investigation-grid">
            <div class="sac-side-card sac-transaction-metric"><strong>Tentativas analisadas</strong><span>${summary.transactionCount}</span></div>
            <div class="sac-side-card sac-transaction-metric"><strong>Estabelecimentos</strong><span>${summary.merchantCount}</span></div>
            <div class="sac-side-card sac-transaction-metric"><strong>Valor somado</strong><span>${escapeHtml(investigationCurrency(summary.totalAmount))}</span></div>
            <div class="sac-side-card sac-support-summary ${summary.chipPinCount ? "success" : "neutral"}"><strong>Chip e senha</strong><span>${summary.chipPinCount} tentativa${summary.chipPinCount === 1 ? "" : "s"}</span></div>
            <div class="sac-side-card sac-support-summary ${summary.repeatedAttentionMerchantCount ? "danger" : summary.attentionModeCount ? "warning" : "neutral"}"><strong>Canais de atenção</strong><span>${summary.attentionModeCount} tentativa${summary.attentionModeCount === 1 ? "" : "s"}</span></div>
            ${summary.approvedChipAfterAlert ? `<div class="sac-side-card sac-grid-full sac-support-summary success"><strong>Transação segura posterior</strong><span>${summary.approvedChipAfterAlertCount} compra aprovada com chip e senha após o alerta · ${escapeHtml(investigationPeriod(summary.approvedChipAfterAlertLatestAt, summary.approvedChipAfterAlertLatestAt, 1))}</span></div>` : ""}
            <div class="sac-side-card sac-grid-full sac-transaction-metric"><strong>Período analisado</strong><span>${escapeHtml(investigationPeriod(summary.periodStart, summary.periodEnd, summary.validDateCount))}</span></div>
          </div>
          ${signalCards}
          <div class="sac-side-group"><div class="sac-side-group-title">Estabelecimentos</div>${merchantCards}</div>
        </div>`);
      return;
    }

    if (!investigationDrawerActive(ownerPanel)) return;
    openInvestigationResult(data, ownerPanel, "Análise transacional Falcon", `<div class="sac-transaction-view">
      <div class="sac-side-group"><div class="sac-side-group-title">Visão geral</div>
      <div class="sac-investigation-grid">
        <div class="sac-side-card"><strong>Total de transações analisadas</strong><span>${summary.transactionCount}</span></div>
        <div class="sac-side-card"><strong>Valor total transacionado</strong><span>${escapeHtml(investigationCurrency(summary.totalAmount))}</span></div>
        <div class="sac-side-card"><strong>Período transacionado</strong><span>${escapeHtml(investigationPeriod(summary.periodStart, summary.periodEnd, summary.validDateCount))}</span></div>
        <div class="sac-side-card"><strong>Contatos diferentes</strong><span>${summary.uniqueCounterpartyCount}</span></div>
        <div class="sac-side-card sac-support-summary ${summary.p2pCount ? "success" : "neutral"}"><strong>P2P</strong><span>${summary.p2pCount ? `Detectado · ${summary.p2pCount} transaç${summary.p2pCount === 1 ? "ão" : "ões"}` : "Não detectado"}</span></div>
        ${summary.p2pIssuerCount ? `<div class="sac-side-card sac-support-summary success"><strong>P2P Emissor</strong><span>${summary.p2pIssuerCount}</span></div>` : ""}
        ${summary.p2pPersonalCount ? `<div class="sac-side-card sac-support-summary success"><strong>P2P Pessoal</strong><span>${summary.p2pPersonalCount}</span></div>` : ""}
      </div></div>
      ${investigationMoneyFlowHtml(summary)}
      ${investigationPatternsHtml(summary)}
      ${investigationVelocityHtml(summary)}
      ${investigationUnusualHoursHtml(summary)}
      ${signalCards}
    </div>`);
  }

  async function openTransactionAnalysis(data, ownerPanel) {
    const falcon = data?.falcon || {};
    const counterpart = counterpartySessionResults.get(counterpartySessionKey(data)) || null;
    const dddInfo = dddEngine.lookup(data?.phone || data?.pidData?.phone || "");
    const dddAssessment = normalize(data?.issuer).includes("BEMOL")
      ? dddEngine.bemolAssessment(data?.phone || data?.pidData?.phone || "")
      : null;
    const result = await transactionEngine.analyzeConsole({
      root: document,
      flow: data?.flow,
      issuer: data?.issuer,
      transactionType: falcon.transactionType,
      rule: falcon.rule,
      description: falcon.sourceTransactionType,
      counterpartyResult: counterpart,
      dddAssessment,
      holderDocument: data?.cpfCnpj || falcon.holderDocument
    });
    const cardFlow = transactionEngine.isCardTransaction({
      flow: data?.flow,
      transactionType: falcon.transactionType,
      description: falcon.sourceTransactionType
    }, result.rows || []);
    const visibleSignals = uniqueTransactionSignals(result.signals);
    const signals = visibleSignals.length
      ? visibleSignals.map((item) => `
          <div class="sac-side-card sac-support-summary ${transactionSignalClass(item.kind)}">
            <strong>${escapeHtml(item.title)}</strong>
            <span>${escapeHtml(transactionSignalFact(item.detail))}</span>
          </div>`).join("")
      : "";
    const metrics = result.metrics || {};
    if (!investigationDrawerActive(ownerPanel)) return;
    openInvestigationResult(data, ownerPanel, cardFlow ? "Análise transacional de cartão" : "Análise transacional", `<div class="sac-transaction-view">
      ${result.mappingPending ? `<div class="sac-side-card sac-support-summary warning"><strong>Dados transacionais não encontrados</strong><span>Nenhuma movimentação mapeada está disponível nesta página.</span></div>` : ""}
      ${result.mappingPending ? "" : `<div class="sac-side-group"><div class="sac-side-group-title">Visão geral</div><div class="sac-investigation-grid">
        <div class="sac-side-card"><strong>Total de transações analisadas</strong><span>${Number(metrics.count || 0)}</span></div>
        <div class="sac-side-card"><strong>Valor total transacionado</strong><span>${escapeHtml(investigationCurrency(metrics.totalAmount))}</span></div>
        <div class="sac-side-card"><strong>Período transacionado</strong><span>${escapeHtml(investigationPeriod(metrics.periodStart, metrics.periodEnd, metrics.validDateCount))}</span></div>
        <div class="sac-side-card"><strong>Contatos diferentes</strong><span>${Number(cardFlow ? metrics.merchantCount : metrics.uniqueCounterparties || 0)}</span></div>
        <div class="sac-side-card sac-support-summary ${metrics.p2pCount ? "success" : "neutral"}"><strong>P2P</strong><span>${Number(metrics.p2pCount || 0) ? `Detectado · ${Number(metrics.p2pCount || 0)} transaç${Number(metrics.p2pCount || 0) === 1 ? "ão" : "ões"}` : "Não detectado"}</span></div>
        ${Number(metrics.p2pIssuerCount || 0) ? `<div class="sac-side-card sac-support-summary success"><strong>P2P Emissor</strong><span>${Number(metrics.p2pIssuerCount || 0)}</span></div>` : ""}
        ${Number(metrics.p2pPersonalCount || 0) ? `<div class="sac-side-card sac-support-summary success"><strong>P2P Pessoal</strong><span>${Number(metrics.p2pPersonalCount || 0)}</span></div>` : ""}
      </div></div>`}
      ${result.mappingPending || cardFlow ? "" : investigationPatternsHtml(metrics)}
      ${result.mappingPending || cardFlow ? "" : investigationMoneyFlowHtml(metrics)}
      ${result.mappingPending ? "" : investigationVelocityHtml(metrics)}
      ${result.mappingPending ? "" : investigationUnusualHoursHtml(metrics)}
      ${dddInfo.found ? `<div class="sac-side-group"><div class="sac-side-group-title">DDD</div><div class="sac-investigation-grid"><div class="sac-side-card"><strong>DDD</strong><span>${escapeHtml(dddInfo.ddd)}</span></div><div class="sac-side-card"><strong>UF / Região</strong><span>${escapeHtml(`${dddInfo.uf} · ${dddInfo.region}`)}</span></div></div></div>` : ""}
      ${signals ? `<div class="sac-side-group"><div class="sac-side-group-title">Alertas transacionais</div>${signals}</div>` : ""}
    </div>`);
  }

  async function renderBigDataMedia() {
    await memory.hydrateFromClipboard?.();
    byId("sac-panel-bigdata")?.remove();
    const request = memory.transport.get("mediaRequest");
    if (!request) {
      showNotice("Não há coleta pendente do Falcon para o BigData.", "warn");
      return;
    }
    const holderCpf = (Array.isArray(request.parties) ? request.parties : [])
      .map((party) => digitsOnly(party?.document))
      .find((documentNumber) => mediaEngine.isCpf(documentNumber));
    if (!holderCpf) {
      showNotice("O CPF do titular não foi recebido do Falcon.", "error", 12000);
      return;
    }
    if (mediaEngine.canSearchPage(document)) {
      const search = await mediaEngine.searchCpf({ root: document, document: holderCpf });
      if (!search.ok) {
        const message = search.code === "BIGDATA_RESULT_IDENTITY_MISMATCH"
          ? "O BigData exibiu outro CPF. Confira a consulta e tente novamente."
          : search.code === "BIGDATA_SEARCH_DISABLED"
            ? "A pesquisa do BigData está indisponível no momento."
            : search.code === "BIGDATA_SEARCH_CLICK_FAILED"
              ? "Não foi possível acionar a pesquisa do BigData."
              : "O resultado do BigData não ficou disponível a tempo. Tente novamente.";
        showNotice(message, "error", 15000);
        return;
      }
    }
    const scan = await mediaEngine.scanPage({ root: document, parties: request.parties });
    if (scan.code === "BIGDATA_IDENTITY_MISMATCH") {
      showNotice("CPF divergente no BigData. Confira o caso antes de continuar.", "error", 15000);
      return;
    }
    if (!scan.supported) {
      showNotice("Os resultados esperados não foram encontrados no BigData.", "error", 12000);
      return;
    }
    const result = mediaEngine.createResult(request, scan);
    memory.transport.set("mediaResult", result);
    await memory.commitCurrentText?.();
    showNotice("BigData consultado. Mídias e dados disponíveis para o PID foram coletados.", "success");
  }

  function resultSeverityClass(result) {
    return result?.severity === "success" ? "success" : result?.severity === "danger" ? "danger" : result?.severity === "warning" ? "warning" : "neutral";
  }

  function counterpartyIndicatorState(counterparty, corporate, crossed) {
    if (crossed?.severity === "danger" || corporate?.severity === "danger" || counterparty?.severity === "danger") return "danger";
    if (crossed?.severity === "warning" || corporate?.severity === "warning" || counterparty?.severity === "warning") return "warning";
    if (counterparty?.severity === "success") return "success";
    return "neutral";
  }

  function counterpartyIndicatorTitle(counterparty, corporate, crossed) {
    if (corporate?.activityAge?.underThreeMonths) return "Atenção: CNPJ aberto há menos de 3 meses.";
    return clean(crossed?.reason || counterparty?.reason || "CNPJ ainda não classificado na base.");
  }

  function companyMatchesText(companyName, reference) {
    const ignored = new Set(["LTDA", "SA", "S", "A", "EIRELI", "ME", "EPP", "BRASIL", "SERVICOS", "COMERCIO"]);
    const tokens = (value) => normalize(value).split(/[^A-Z0-9]+/).filter((item) => item.length >= 4 && !ignored.has(item));
    const companyTokens = tokens(companyName);
    const referenceTokens = new Set(tokens(reference));
    return companyTokens.length > 0 && companyTokens.filter((item) => referenceTokens.has(item)).length >= Math.min(2, companyTokens.length);
  }

  function issuerRelatedCompany(data, corporate) {
    const issuer = clean(data?.issuer || data?.falcon?.issuer, "");
    if (!issuer) return false;
    return [corporate?.tradeName, corporate?.legalName].some((name) => companyMatchesText(name, issuer));
  }

  function possibleSelfFinancing(data, corporate) {
    const flow = data?.visualFlow || data?.flow || data?.falcon?.flow;
    if (flow !== "card") return false;
    const merchant = data?.falcon?.merchant || data?.merchant;
    return [corporate?.tradeName, corporate?.legalName].some((name) => companyMatchesText(name, merchant));
  }

  function counterpartyResultHtml(counterparty, corporate, crossed, data = {}) {
    const corporateStatus = corporate?.found ? corporate.registrationStatus : corporate?.label || "NÃO SINCRONIZADA";
    const statusAlert = corporate?.found && ["INAPTA", "BAIXADA", "SUSPENSA", "NULA"].includes(corporate.registrationStatus);
    const ageAlert = Boolean(corporate?.activityAge?.underThreeMonths);
    const openingClass = ageAlert ? "sac-investigation-alert" : corporate?.activityAge?.known ? "sac-support-summary success" : "sac-support-summary warning";
    const statusClass = statusAlert ? "danger sac-investigation-alert" : resultSeverityClass(corporate);
    const betCategory = normalize(counterparty?.category);
    const isBet = betCategory.includes("BET");
    const legalBet = betCategory.includes("AUTHORIZED");
    const selfFinancing = possibleSelfFinancing(data, corporate);
    return `
      <div class="sac-side-group">
        <div class="sac-side-group-title">Dados cadastrais</div>
        <div class="sac-investigation-grid">
          <div class="sac-side-card sac-grid-full" data-cnpj-copy="${escapeHtml(corporate?.legalName || "N/A")}" data-cnpj-label="Razão social"><strong>Razão social</strong><span>${escapeHtml(corporate?.legalName || "N/A")}</span></div>
          <div class="sac-side-card sac-grid-full" data-cnpj-copy="${escapeHtml(corporate?.tradeName || "N/A")}" data-cnpj-label="Nome fantasia"><strong>Nome fantasia</strong><span>${escapeHtml(corporate?.tradeName || "N/A")}</span></div>
          <div class="sac-side-card ${openingClass}" data-cnpj-copy="${escapeHtml(corporate?.openedAt || "N/A")}" data-cnpj-label="Criação"><strong>Criação</strong><span>${escapeHtml(corporate?.openedAt || "N/A")}</span></div>
          <div class="sac-side-card sac-support-summary ${statusClass}" data-cnpj-copy="${escapeHtml(corporateStatus)}" data-cnpj-label="Situação cadastral"><strong>Situação cadastral</strong><span>${escapeHtml(corporateStatus)}</span></div>
          <div class="sac-side-card sac-grid-full" data-cnpj-copy="${escapeHtml(corporate?.companySize || "N/A")}" data-cnpj-label="Porte da empresa"><strong>Porte da empresa</strong><span>${escapeHtml(corporate?.companySize || "N/A")}</span></div>
        </div>
      </div>
      ${isBet ? `<div class="sac-side-card sac-support-summary ${legalBet ? "success" : "danger"}"><strong>${legalBet ? "BET LEGALIZADA" : "BET EM LISTA DE ATENÇÃO"}</strong><span>${legalBet ? "CNPJ reconhecido na base favorável; mantenha a identificação de que se trata de uma BET." : "CNPJ relacionado a BET que exige atenção reforçada."}</span></div>` : ""}
      ${selfFinancing ? `<div class="sac-side-card sac-support-summary danger sac-investigation-alert"><strong>POSSÍVEL AUTOFINANCIAMENTO</strong><span>O estabelecimento se aproxima do nome empresarial consultado.</span></div>` : ""}`;
  }

  function openCounterpartyVerification(data, ownerPanel) {
    const falcon = data?.falcon || data || {};
    const candidates = corporateCandidates(data);
    if (!candidates.length) return null;
    const panel = openSupportPanel(ownerPanel, "Verificação de CNPJ", `
      <div class="sac-cnpj-selector" data-cnpj-selector>${candidates.map((item, index) => `<button type="button" class="${index === 0 ? "selected" : ""}" data-cnpj-candidate="${escapeHtml(item.cnpj)}"><strong>${escapeHtml(item.role)}</strong><span>${escapeHtml(item.cnpj)}</span></button>`).join("")}</div>
      <div data-cnpj-summary></div>
      <div data-counterparty-result><div class="sac-side-card"><span>Consultando dados cadastrais automaticamente...</span></div></div>
      <div class="sac-support-actions three sac-cnpj-actions" data-counterparty-actions hidden>
        <button class="sac-classify-favorable" data-classify-counterparty="TRUSTED"><i aria-hidden="true">✓</i>Confiável</button>
        <button class="sac-classify-suspicious" data-classify-counterparty="UNTRUSTED"><i aria-hidden="true">!</i>Suspeito</button>
        <button class="sac-classify-remove" data-remove-counterparty><i aria-hidden="true">−</i>Remover</button>
      </div>
    `);
    if (!panel) return;
    if (panel.dataset.cnpjCopyBound !== "1") {
      panel.dataset.cnpjCopyBound = "1";
      panel.addEventListener("click", async (event) => {
        const card = event.target.closest("[data-cnpj-copy]");
        if (!card || !getSafeMode()) return;
        const value = clean(card.dataset.cnpjCopy, "");
        if (!value || value === "N/A") return;
        await copyText(value);
        card.classList.add("sac-copied");
        setTimeout(() => card.classList.remove("sac-copied"), 650);
        showNotice(`${clean(card.dataset.cnpjLabel, "Dado do CNPJ")} copiado.`, "success");
      });
    }
    const resultHost = panel.querySelector("[data-counterparty-result]");
    const summaryHost = panel.querySelector("[data-cnpj-summary]");
    let activeCandidate = candidates[0];
    const verify = async (candidate = activeCandidate) => {
      activeCandidate = candidate;
      const cnpj = candidate.cnpj;
      summaryHost.innerHTML = `<div class="sac-investigation-grid"><div class="sac-side-card sac-cnpj-card sac-grid-full" data-counterparty-cnpj-card data-cnpj-copy="${escapeHtml(cnpj)}" data-cnpj-label="CNPJ"><strong>CNPJ</strong><span>${escapeHtml(cnpj)}</span><em class="sac-cnpj-state" data-counterparty-state>Não classificado</em><i class="sac-cnpj-indicator" data-counterparty-indicator title="CNPJ ainda não classificado" aria-label="CNPJ ainda não classificado">✓</i></div></div>`;
      resultHost.innerHTML = `<div class="sac-side-card"><span>Consultando dados cadastrais automaticamente...</span></div>`;
      panel.querySelector("[data-counterparty-actions]")?.setAttribute("hidden", "");
      try {
        let [counterparty, corporate] = await Promise.all([
          counterpartyEngine.classify({
            cnpj,
            issuer: data?.issuer || falcon?.issuer || "GLOBAL",
            direction: candidate.direction
          }),
          corporateEngine.lookup(cnpj)
        ]);
        if (!panel.isConnected || !investigationDrawerActive(ownerPanel)) return;
        if (issuerRelatedCompany(data, corporate) && counterparty.classification !== "TRUSTED") {
          counterpartyEngine.upsertLocalClassification({
            cnpj,
            issuer: data?.issuer || falcon?.issuer || "GLOBAL",
            direction: candidate.direction,
            classification: "TRUSTED",
            legalName: corporate?.legalName || "",
            reason: "CNPJ relacionado ao próprio emissor identificado no caso."
          });
          persistCounterpartyLocalRecords();
          counterparty = await counterpartyEngine.classify({ cnpj, issuer: data?.issuer || falcon?.issuer || "GLOBAL", direction: candidate.direction });
        }
        const crossed = corporateEngine.cross(corporate, counterparty);
        if (candidate.role === "Quem está transacionando") counterpartySessionResults.set(counterpartySessionKey(data), counterparty);
        data.counterpartyResult = counterparty;
        data.corporateResult = corporate;
        falcon.counterpartyResult = counterparty;
        falcon.corporateResult = corporate;
        const snapshot = investigationSnapshot(data);
        const previous = Array.isArray(snapshot.cnpjs) ? snapshot.cnpjs.filter((item) => item.cnpj !== cnpj) : [];
        snapshot.cnpjs = [...previous, { ...candidate, counterparty, corporate, crossed }];
        resultHost.innerHTML = counterpartyResultHtml(counterparty, corporate, crossed, data);
        const indicatorState = counterpartyIndicatorState(counterparty, corporate, crossed);
        const indicatorTitle = counterpartyIndicatorTitle(counterparty, corporate, crossed);
        const cnpjCard = panel.querySelector("[data-counterparty-cnpj-card]");
        const indicator = panel.querySelector("[data-counterparty-indicator]");
        const stateLabel = panel.querySelector("[data-counterparty-state]");
        cnpjCard?.classList.remove("is-success", "is-warning", "is-danger");
        indicator?.classList.remove("is-success", "is-warning", "is-danger");
        if (indicatorState !== "neutral") {
          cnpjCard?.classList.add(`is-${indicatorState}`);
          indicator?.classList.add(`is-${indicatorState}`);
        }
        if (indicator) {
          indicator.title = indicatorTitle;
          indicator.setAttribute("aria-label", indicatorTitle);
        }
        if (stateLabel) stateLabel.textContent = ({ success: "Confiável", warning: "Atenção", danger: "Suspeito", neutral: "Não classificado" })[indicatorState] || "Não classificado";
        panel.querySelector("[data-counterparty-actions]")?.removeAttribute("hidden");
      } catch (_error) {
        resultHost.innerHTML = `<div class="sac-side-card sac-support-summary danger"><strong>Consulta indisponível</strong><span>Não foi possível consultar a base agora.</span></div>`;
        showNotice("Não foi possível consultar a base de CNPJs.", "error");
      }
    };
    panel.querySelector("[data-cnpj-selector]")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-cnpj-candidate]");
      if (!button) return;
      const candidate = candidates.find((item) => item.cnpj === button.dataset.cnpjCandidate);
      if (!candidate) return;
      panel.querySelectorAll("[data-cnpj-candidate]").forEach((item) => item.classList.toggle("selected", item === button));
      verify(candidate);
    });
    panel.querySelector("[data-counterparty-actions]")?.addEventListener("click", async (event) => {
      const removeButton = event.target.closest("[data-remove-counterparty]");
      if (removeButton) {
        const removed = counterpartyEngine.removeLocalClassification?.({
          cnpj: activeCandidate.cnpj,
          issuer: data?.issuer || falcon?.issuer || "GLOBAL",
          direction: activeCandidate.direction
        });
        persistCounterpartyLocalRecords();
        await verify(activeCandidate);
        showNotice(removed ? "Classificação local do CNPJ excluída." : "Este CNPJ não tinha classificação local para excluir.", removed ? "success" : "warn");
        return;
      }
      const button = event.target.closest("[data-classify-counterparty]");
      if (!button) return;
      counterpartyEngine.upsertLocalClassification({
        cnpj: activeCandidate.cnpj,
        issuer: data?.issuer || falcon?.issuer || "GLOBAL",
        direction: activeCandidate.direction,
        classification: button.dataset.classifyCounterparty,
        legalName: data?.corporateResult?.legalName || ""
      });
      persistCounterpartyLocalRecords();
      await verify(activeCandidate);
      showNotice(button.dataset.classifyCounterparty === "TRUSTED" ? "CNPJ adicionado à base confiável local." : "CNPJ adicionado à base de suspeitos local.", "success");
    });
    verify(activeCandidate);
    return panel;
  }

  // ========================= CONSOLE: JANELA ========================
  async function renderConsole() {
    const falcon = await loadFalconPackage();
    if (!falcon) {
      showNotice("Não recebi os dados do Falcon. Volte ao Falcon, finalize a etapa e tente novamente.", "error", 15000);
      const panel = renderPanel({
        id: "sac-panel-console",
        stage: "CONSOLE",
        flow: "banking",
        subtitle: "Transferência Falcon → Console",
        body: section("Atenção", `<div class="sac-grid">${kv("Dados do Falcon", "DADOS DO FALCON NÃO RECEBIDOS", "sac-missing sac-single-alert")}</div>`, "ação necessária"),
        footer: `<button class="sac-main" id="sac-retry-falcon-transfer">Tentar novamente</button>`
      });
      panel.querySelector("#sac-retry-falcon-transfer")?.addEventListener("click", () => {
        panel.remove();
        renderConsole();
      });
      return;
    }
    if (falcon?.flow === "card") await ensureCardGridOpen();
    const data = collectConsoleData(falcon);
    await applyPendingMediaResult(data);
    data.accountValidation = compareFalconConsoleAccount(data.falcon, data.account, data.cpfCnpj, data.cardNumber || data.cardLast4);
    const isCard = data.flow === "card";
    const fields = isCard ? cardFields(data) : bankingFields(data);
    const divergentCase = data.accountValidation.comparable && !data.accountValidation.matches;
    if (divergentCase) {
      showNotice("INFORMAÇÕES DIVERGENTES, VERIFIQUE O CASO NOVAMENTE", "error", 15000);
      if (getSafeMode()) {
        const panel = renderPanel({
          id: "sac-panel-console",
          stage: "CONSOLE",
          flow: data.visualFlow,
          subtitle: "Validação Falcon → Console",
          body: section("Dados do Falcon", falconGrid(data.falcon), "recebidos")
            + section("Validação", `<div class="sac-grid">${kv("Conferência", "INFORMAÇÕES DIVERGENTES, VERIFIQUE O CASO NOVAMENTE", "sac-missing sac-single-alert")}</div>`, "ação necessária"),
          footer: `<button class="sac-main" id="sac-retry-console-account">Tentar novamente</button>`
        });
        panel.querySelector("#sac-retry-console-account")?.addEventListener("click", () => {
          panel.remove();
          renderConsole();
        });
        return;
      }
    }
    const save = async () => {
      data.jiraActive = Boolean(byId("sac-jira-flag")?.checked);
      data.jiraReference = data.jiraActive ? normalizeJiraReference(byId("sac-jira-reference")?.value) : "";
      data.fields = await readConsoleFields(data);
      if (data.fields.__missingManual?.length) {
        showNotice(`Falta preencher manualmente: ${data.fields.__missingManual.join(", ")}.`, "error");
        return;
      }
      delete data.fields.__missingManual;
      data.issuerId = data.issuerId || await issuerIdForName(data.issuer);
      const missing = requiredWorkflow(data);
      if (missing.length) {
        if (getSafeMode()) {
          showNotice(`Ainda faltam dados: ${missing.join(", ")}. Veja os grids em laranja e tente novamente.`, "error");
          return;
        }
        showNotice(`Atenção: faltam dados (${missing.join(", ")}), mas o modo seguro está desligado.`, "warn");
      }
      const packageData = { ...transferableCaseData(data), packageSchema: PACKAGE_SCHEMA, buildFamily: BUILD_FAMILY, buildVersion: BUILD_VERSION, savedAt: Date.now(), sharedMemory: packageMemorySnapshot() };
      writeJson("lastConsole", packageData);
      memory.transport.set("console", packageData);
      const copied = await copyText(`${EXPORT_CONSOLE}::${JSON.stringify(packageData)}`);
      if (!copied) {
        showNotice("Não consegui transferir os dados do Console. A janela foi mantida aberta; clique em Finalizar etapa novamente.", "error", 15000);
        return;
      }
      releaseInvestigationSession(data);
      showNotice("Console finalizado. Abra o Tabulador para continuar.", "success");
      closePidPanel();
      closeAuxiliaryPanels("sac-panel-console");
      closeSidePanels("sac-panel-console");
      byId("sac-panel-console")?.remove();
    };
    if (data.flow === "card" && data.cardMatched === false && !data.isGlobal) {
      const panel = renderPanel({
        id: "sac-panel-console",
        stage: "CONSOLE",
        flow: data.visualFlow,
        subtitle: "Cartão não localizado",
        body: section("Dados do Falcon", falconGrid(data.falcon), "recebidos")
          + section("Dados do Console", consoleGrid(data), "ação necessária"),
        footer: `<button class="sac-main" id="sac-retry-console-card">Tentar novamente</button>`
      });
      byId("sac-retry-console-card")?.addEventListener("click", () => {
        closeAuxiliaryPanels("sac-panel-console");
        closeSidePanels("sac-panel-console");
        panel.remove();
        renderConsole();
      });
      return;
    }
    const body = getInvisibleMode()
      ? section("Chamada", consoleFlagControls(data), "opcional")
        + section("Dropdowns de análise", `<div class="sac-field-grid">${fields}</div>`, "seleções padrão")
      : section("Dados do Falcon", falconGrid(data.falcon), "recebidos")
        + section("Dados do Console", consoleGrid(data), "coletados")
        + section("Chamada", consoleFlagControls(data), "opcional")
        + section("Dropdowns de análise", `<div class="sac-field-grid">${fields}</div>`, "seleções padrão");
    const panel = renderPanel({
      id: "sac-panel-console",
      stage: "CONSOLE",
      flow: data.visualFlow,
      subtitle: getInvisibleMode() ? "Seleções para análise" : "Conferência e análise",
      body,
      footer: `<button class="sac-main" id="sac-save-console">Finalizar etapa</button>`,
      onEnter: save
    });
    byId("sac-save-console")?.addEventListener("click", save);
    if (getInvisibleMode()) attachInvisibleToolHub(panel, "CONSOLE", data);
    else attachInvestigationLauncher(panel, "CONSOLE", data);
    byId("sac-jira-flag")?.addEventListener("change", (event) => {
      data.jiraActive = Boolean(event.currentTarget.checked);
      const label = event.currentTarget.closest(".sac-jira-toggle");
      label?.classList.toggle("on", data.jiraActive);
      const state = label?.querySelector("b");
      if (state) state.textContent = data.jiraActive ? "Ligado" : "Desligado";
      const jiraField = byId("sac-jira-reference-field");
      if (jiraField) jiraField.hidden = !data.jiraActive;
      if (data.jiraActive) byId("sac-jira-reference")?.focus();
      syncCallToggles();
    });
    const normalizeJiraInput = (event) => {
      const parsed = normalizeJiraReference(event.currentTarget.value);
      data.jiraReference = parsed;
      event.currentTarget.closest(".sac-jira-reference")?.classList.toggle("sac-missing", Boolean(event.currentTarget.value.trim()) && !parsed);
      if (parsed && event.currentTarget.value !== parsed) event.currentTarget.value = parsed;
    };
    byId("sac-jira-reference")?.addEventListener("input", normalizeJiraInput);
    byId("sac-jira-reference")?.addEventListener("change", normalizeJiraInput);
    byId("sac-bad-media")?.addEventListener("change", (event) => {
      if (normalize(event.target.value) !== "SIM") return;
      openChoicePopover({
        id: "sac-bad-media-details",
        title: "Mídia desabonadora",
        options: BAD_MEDIA_OPTIONS,
        selected: [],
        onSave: (values) => { data.fields.badMediaDetails = values; }
      });
    });
    byId("sac-email")?.addEventListener("change", (event) => {
      if (normalize(event.target.value) !== "DIVERGENTE") return;
      openChoicePopover({
        id: "sac-email-details",
        title: "Divergência de e-mail, DDD ou endereço",
        options: EMAIL_DIVERGENCE_OPTIONS,
        selected: data.fields.emailDivergenceDetails || [],
        extraInput: {
          label: "E-mail observado (opcional)",
          placeholder: "exemplo@email.com",
          value: data.fields.emailDivergenceEmail || ""
        },
        onSave: (values, extra) => {
          data.fields.emailDivergenceDetails = values;
          data.fields.emailDivergenceEmail = String(extra || "").trim();
        }
      });
    });
    const syncCallToggles = () => {
      const modeToggle = byId("sac-call-mode-toggle");
      const resultToggle = byId("sac-call-result-toggle");
      const enabled = modeToggle?.dataset.active === "true";
      const jira = Boolean(data.jiraActive);
      if (resultToggle) {
        resultToggle.disabled = !enabled || jira;
        if (!enabled) resultToggle.dataset.active = "false";
        if (enabled && jira) resultToggle.dataset.active = "true";
      }
      modeToggle?.classList.toggle("on", enabled);
      modeToggle?.setAttribute("aria-pressed", enabled ? "true" : "false");
      modeToggle?.querySelector("b") && (modeToggle.querySelector("b").textContent = enabled ? "Ligado" : "Desligado");
      const success = enabled && (jira || resultToggle?.dataset.active === "true");
      resultToggle?.classList.toggle("on", success);
      resultToggle?.setAttribute("aria-disabled", enabled && !jira ? "false" : "true");
      resultToggle?.setAttribute("aria-pressed", success ? "true" : "false");
      resultToggle?.querySelector("b") && (resultToggle.querySelector("b").textContent = enabled ? (jira ? "JIRA" : success ? "Com sucesso" : "Sem sucesso") : "Sem chamada");
      data.fields.callMode = enabled ? "com chamada" : "sem chamada";
      data.fields.callResult = enabled ? (success ? "com sucesso" : "sem sucesso") : "";
      if (enabled && !jira) openPidPanel(data);
      else closePidPanel();
    };
    byId("sac-call-mode-toggle")?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const button = event.currentTarget;
      button.dataset.active = button.dataset.active === "true" ? "false" : "true";
      syncCallToggles();
    });
    byId("sac-call-result-toggle")?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const button = event.currentTarget;
      if (button.disabled) return;
      button.dataset.active = button.dataset.active === "true" ? "false" : "true";
      syncCallToggles();
    });
    syncCallToggles();
    enableManualGridEditing(panel, data);
    if (!falcon) showNotice("Sem pacote salvo do Falcon. Alguns campos podem ficar N/A.", "warn");
  }
  function consoleDocumentGrid(data) {
    return !isMissing(data?.falcon?.holderDocument) ? "" : kv("CPF/CNPJ", data?.cpfCnpj);
  }
  function bemolDddGrid(data) {
    if (!normalize(data?.issuer).includes("BEMOL")) return "";
    const ddd = dddEngine.lookup(data?.phone || data?.pidData?.phone || "");
    const assessment = dddEngine.bemolAssessment(ddd);
    const status = assessment.status === "MATCH" ? "COMPATÍVEL" : assessment.status === "ALERT" ? "NÃO COMPATÍVEL" : "DDD NÃO IDENTIFICADO";
    const details = ddd.found ? `${status} · DDD ${ddd.ddd} · ${ddd.uf} · ${ddd.region}` : status;
    const tone = assessment.severity === "success" ? "sac-history-ok" : assessment.severity === "danger" ? "sac-alert-danger" : "sac-alert-warn";
    return kv("DDD x região", details, tone);
  }
  function consoleGrid(data, options = {}) {
    const includeAccountStatus = options.includeAccountStatus !== false;
    const documentGrid = consoleDocumentGrid(data);
    const dddGrid = bemolDddGrid(data);
    if (data.flow === "card") {
      if (data.cardMatched === false) {
        return `<div class="sac-grid">${kv("Cartões", "ACESSE CARTÕES", "sac-missing sac-single-alert")}</div>`;
      }
      return `<div class="sac-grid">${documentGrid}${kv("Emissor", data.issuer)}${kv("ID cartão", data.cardId)}${kv("Final cartão", data.cardLast4)}${kv("Tipo cartão", data.cardType)}${kv("Status cartão", data.cardStatus)}${kv("Cadastro", data.registrationDate, alertIf(isRecentRegistration(data.registrationDate)))}${dddGrid}</div>`;
    }
    return `<div class="sac-grid">${documentGrid}${kv("Emissor", data.issuer)}${kv("Conta", data.account)}${includeAccountStatus ? kv("Status conta", data.accountStatus, accountStatusAlert(data.accountStatus)) : ""}${kv("Cadastro", data.registrationDate, alertIf(isRecentRegistration(data.registrationDate)))}${dddGrid}</div>`;
  }
  function consoleFlagControls(data) {
    const mode = normalize(data.fields.callMode) === "COM CHAMADA" ? "com chamada" : "sem chamada";
    const result = normalize(data.fields.callResult) === "COM SUCESSO" ? "com sucesso" : normalize(data.fields.callResult) === "SEM SUCESSO" ? "sem sucesso" : "";
    const callEnabled = mode === "com chamada";
    const jira = Boolean(data.jiraActive);
    const success = callEnabled && (jira || result === "com sucesso");
    return `
      <div class="sac-console-flags">
        <label class="sac-toggle sac-jira-toggle ${jira ? "on" : ""}" aria-pressed="${jira ? "true" : "false"}"><input type="checkbox" id="sac-jira-flag" ${jira ? "checked" : ""} hidden><span class="sac-switch"></span><span>JIRA</span><b>${jira ? "Ligado" : "Desligado"}</b></label>
        <button type="button" id="sac-call-mode-toggle" class="sac-toggle ${callEnabled ? "on" : ""}" data-active="${callEnabled ? "true" : "false"}" aria-pressed="${callEnabled ? "true" : "false"}"><span class="sac-switch"></span><span>Com chamada</span><b>${callEnabled ? "Ligado" : "Desligado"}</b></button>
        <button type="button" id="sac-call-result-toggle" class="sac-toggle ${success ? "on" : ""}" data-active="${success ? "true" : "false"}" aria-disabled="${callEnabled && !jira ? "false" : "true"}" aria-pressed="${success ? "true" : "false"}" ${callEnabled && !jira ? "" : "disabled"}><span class="sac-switch"></span><span>Com sucesso</span><b>${callEnabled ? (jira ? "JIRA" : success ? "Ligado" : "Desligado") : "Sem chamada"}</b></button>
      </div>
      <label class="sac-jira-reference" id="sac-jira-reference-field" ${jira ? "" : "hidden"}><span>Chamado JIRA (opcional)</span><input id="sac-jira-reference" value="${escapeHtml(data.jiraReference || "")}" placeholder="Cole o link com SERVICOS ou INCIDENTES" autocomplete="off"><small>O link será reduzido automaticamente, por exemplo: SERVICOS-975709.</small></label>`;
  }

  function normalizeJiraReference(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    let decoded = raw;
    try { decoded = decodeURIComponent(raw); } catch (_err) {}
    const normalized = normalize(decoded);
    const match = normalized.match(/(?:^|[^A-Z0-9])(SERVICOS?|INCIDENTES?)[\s_:/?#=&.\-]{0,24}(\d{1,12})(?:$|[^0-9])/);
    return match ? `${match[1]}-${match[2]}` : "";
  }
  function cardFields(data) {
    return field("sac-merchant-history", "Histórico no estabelecimento", CARD_REVIEW, data.fields.merchantHistory, { allowEmpty: true })
      + field("sac-purchase-pattern", "Padrão de compra", CARD_REVIEW, data.fields.purchasePattern, { allowEmpty: true });
  }
  function bankingFields(data) {
    const statusFields = data.isGlobal ? "" : field("sac-person-status", "Status Pessoa (SPD)", STATUS_OPTIONS, data.fields.personStatus);
    const analysisFields = (data.isGlobal ? "" : field("sac-spd-history", "Histórico SPD", HISTORY_SPD, data.fields.spdHistory))
      + field("sac-bad-media", "Mídia desabonadora", MEDIA_OPTIONS, data.fields.badMedia);
    if (data.isGlobal) return analysisFields
      + field("sac-email", "E-mail, DDD e Endereço", EMAIL_OPTIONS, data.fields.emailPhoneAddress)
      + field("sac-statement", "Extrato", STATEMENT_OPTIONS, data.fields.statement);
    return statusFields + analysisFields
      + field("sac-email", "E-mail, DDD e Endereço", EMAIL_OPTIONS, data.fields.emailPhoneAddress)
      + field("sac-doc", "Documentação", DOC_OPTIONS, data.fields.documentation)
      + field("sac-statement", "Extrato", STATEMENT_OPTIONS, data.fields.statement);
  }
  async function readConsoleFields(data) {
    const callModeActive = byId("sac-call-mode-toggle")?.dataset.active === "true";
    const jiraCall = Boolean(data.jiraActive) && callModeActive;
    const callState = {
      callMode: callModeActive ? "com chamada" : "sem chamada",
      callResult: callModeActive ? (jiraCall || byId("sac-call-result-toggle")?.dataset.active === "true" ? "com sucesso" : "sem sucesso") : ""
    };
    if (data.flow === "card") {
      return {
        ...callState,
        merchantHistory: byId("sac-merchant-history")?.value || "",
        purchasePattern: byId("sac-purchase-pattern")?.value || ""
      };
    }
    const missingManual = [];
    const personStatus = data.isGlobal ? "N/A" : resolveOtherOption(byId("sac-person-status")?.value || "normal", "Status Pessoa (SPD)", missingManual, document.querySelector("[data-other-for='sac-person-status']")?.value);
    const spdHistory = data.isGlobal ? "N/A" : resolveOtherOption(byId("sac-spd-history")?.value || "não", "Histórico SPD", missingManual, document.querySelector("[data-other-for='sac-spd-history']")?.value);
    return {
      ...callState,
      badMedia: byId("sac-bad-media")?.value || "não",
      personStatus,
      emailPhoneAddress: byId("sac-email")?.value || "de acordo",
      emailDivergenceDetails: data.fields.emailDivergenceDetails || [],
      emailDivergenceEmail: data.fields.emailDivergenceEmail || "",
      spdHistory,
      documentation: data.isGlobal ? "N/A" : (byId("sac-doc")?.value || "sem ressalvas"),
      statement: byId("sac-statement")?.value || "sem suspeitas",
      badMediaDetails: data.fields.badMediaDetails || [],
      __missingManual: missingManual
    };
  }
  function requiredConsole(data) {
    const base = [["CPF/CNPJ", data.cpfCnpj], ["Emissor", data.issuer], ["Data de cadastro", data.registrationDate]];
    const extra = data.flow === "card" && !data.isGlobal
      ? [["ID cartão", data.cardId], ["Final do cartão", data.cardLast4], ["Tipo do cartão", data.cardType], ["Status cartão", data.cardStatus]]
      : data.flow === "card" ? [] : [["Status conta", data.accountStatus]];
    return [...base, ...extra].filter(([, value]) => isMissing(value)).map(([label]) => label);
  }
  function requiredAnalysisFields(data) {
    if (data.flow !== "card") return [];
    return [
      ...(normalize(data.fields?.callMode) === "COM CHAMADA" ? [["Resultado da chamada", data.fields?.callResult]] : []),
      ["Histórico no estabelecimento", data.fields?.merchantHistory],
      ["Padrão de compra", data.fields?.purchasePattern]
    ].filter(([, value]) => isMissing(value)).map(([label]) => label);
  }
  function requiredWorkflow(data) {
    return Array.from(new Set([...requiredFalcon(data.falcon || {}), ...requiredConsole(data), ...requiredAnalysisFields(data)]));
  }

  // ========================= TABULADOR: JANELA ======================
  async function renderTabulator(existingData = null) {
    installTabulatorWriteGuard();
    window.__SAC_TABULATOR_DECISION_PANEL_ACTIVE__ = true;
    unlockTabulatorFieldLock();
    stopTabulatorWriting();
    const storedConsole = existingData ? null : await loadConsolePackage();
    const data = existingData || storedConsole || collectConsoleData(await loadFalconPackage() || emptyFalconData());
    await applyPendingMediaResult(data);
    loadIssuerDirectory();
    const missing = requiredWorkflow(data);
    const decisionButtons = DECISIONS.map((decision, index) => {
      const tone = ["danger", "success", "warning", "info"][index];
      return `<button class="sac-decision ${tone}" data-decision-index="${index}" data-decision="${escapeHtml(decision)}">${escapeHtml(decision.replace("NÃO FOI POSSÍVEL CONFIRMAR FRAUDE", "NÃO FOI POSSÍVEL\nCONFIRMAR FRAUDE").replace("NÃO FOI POSSÍVEL CONFIRMAR NÃO FRAUDE", "NÃO FOI POSSÍVEL\nCONFIRMAR NÃO FRAUDE"))}</button>`;
    }).join("");
    const body = section("Dados do Falcon", falconGrid(data.falcon), "análise")
      + section("Dados do Console", consoleGrid(data), "coletados")
      + section("Respostas dos dropdowns", consoleDropdownGrid(data), "escolhidas")
      + section("Motivo", `<textarea class="sac-textarea sac-motive" id="sac-decision-motive" placeholder="Escreva uma justificativa breve, se necessário."></textarea>`, "opcional")
      + section("Decisão", `<div class="sac-decision-grid">${decisionButtons}</div>`, "1-4");
    const panel = renderPanel({
      id: "sac-panel-tabulador",
      stage: "TABULADOR",
      flow: data.visualFlow,
      subtitle: "Dados para decisão",
      body,
      onEnter: () => showNotice("Escolha uma decisão para continuar.", "warn")
    });
    attachInvestigationLauncher(panel, "TABULADOR", data);
    if (!getSignatureName()) {
      panel.__sacKeys.openConfig?.();
      panel.querySelector(".sac-signature-editor")?.classList.add("open");
      panel.querySelector("[data-signature-name]")?.focus();
      showNotice("Informe sua assinatura antes de finalizar a tabulação.", "warn", 12000);
    }
    lockTabulatorFieldsUntilDecision();
    all("[data-decision]", panel).forEach((button) => {
      button.addEventListener("click", () => {
        if (!getSignatureName()) {
          panel.__sacKeys.openConfig?.();
          panel.querySelector(".sac-signature-editor")?.classList.add("open");
          panel.querySelector("[data-signature-name]")?.focus();
          showNotice("Salve sua assinatura para continuar com segurança.", "warn", 12000);
          return;
        }
        data.decisionReason = String(byId("sac-decision-motive")?.value || "").trim();
        applyDecisionAndShowFinal(data, button.dataset.decision, panel);
      });
    });
    enableManualGridEditing(panel, data);
    if (missing.length) showNotice(`Dados pendentes: ${missing.join(", ")}.`, "warn");
  }
  function consoleDropdownGrid(data) {
    const callGrid = () => {
      const result = normalize(data.fields?.callMode) === "COM CHAMADA" ? kv("Resultado da chamada", data.fields.callResult, dropdownAlert(data.fields.callResult, ["com sucesso"])) : "";
      const jira = data.jiraActive ? kv("JIRA", data.jiraReference || "não informado") : "";
      return kv("Chamada", data.fields?.callMode || "sem chamada") + result + jira;
    };
    if (data.flow === "card") {
      return `<div class="sac-grid">${callGrid()}${kv("Histórico no estabelecimento", data.fields.merchantHistory, cardReviewAlert(data.fields.merchantHistory))}${kv("Padrão de compra", data.fields.purchasePattern, cardReviewAlert(data.fields.purchasePattern))}</div>`;
    }
    const personStatusGrid = data.isGlobal ? "" : kv("Status Pessoa (SPD)", data.fields.personStatus, dropdownAlert(data.fields.personStatus, STATUS_OPTIONS));
    const spdHistoryGrid = data.isGlobal ? "" : kv("Histórico SPD", data.fields.spdHistory, dropdownAlert(data.fields.spdHistory, HISTORY_SPD));
    const documentationGrid = data.isGlobal ? "" : kv("Documentação", data.fields.documentation, dropdownAlert(data.fields.documentation, DOC_OPTIONS));
    return `<div class="sac-grid">${callGrid()}${personStatusGrid}${spdHistoryGrid}${kv("Mídia desabonadora", data.fields.badMedia, dropdownAlert(data.fields.badMedia, MEDIA_OPTIONS))}${kv("E-mail, DDD e Endereço", data.fields.emailPhoneAddress, dropdownAlert(data.fields.emailPhoneAddress, EMAIL_OPTIONS))}${documentationGrid}${kv("Extrato", data.fields.statement, dropdownAlert(data.fields.statement, STATEMENT_OPTIONS))}</div>`;
  }

  let activeTabulatorDecisionRun = 0;
  let tabulatorWriteEnabled = false;
  function canWriteTabulator(isActive = () => true) {
    return tabulatorWriteEnabled && isActive();
  }
  function startTabulatorWriting() {
    unlockTabulatorFieldLock();
    startTabulatorNavigationGuard();
    tabulatorWriteEnabled = true;
    window.__SAC_TABULATOR_DECISION_WRITE_ACTIVE__ = true;
  }
  function stopTabulatorWriting(panel) {
    tabulatorWriteEnabled = false;
    window.__SAC_TABULATOR_DECISION_WRITE_ACTIVE__ = false;
    if (panel) panel.dataset.decisionApplying = "false";
  }
  function setDecisionButtonsEnabled(panel, enabled) {
    all("[data-decision]", panel).forEach((button) => {
      button.disabled = !enabled;
      button.style.opacity = enabled ? "" : ".72";
    });
  }
  function setDecisionProgress(panel, message, type = "") {
    let status = panel.querySelector("#sac-decision-progress");
    if (!status) {
      status = document.createElement("div");
      status.id = "sac-decision-progress";
      panel.querySelector(".sac-body")?.appendChild(status);
    }
    status.className = `sac-apply-status ${type}`;
    status.textContent = message;
  }
  function setDecisionIssues(panel, labels = []) {
    let list = panel.querySelector("#sac-decision-issues");
    const unique = Array.from(new Set(labels.filter(Boolean)));
    if (!unique.length) {
      list?.remove();
      return;
    }
    if (!list) {
      list = document.createElement("div");
      list.id = "sac-decision-issues";
      list.className = "sac-issue-list";
      panel.querySelector("#sac-decision-progress")?.insertAdjacentElement("afterend", list)
        || panel.querySelector(".sac-body")?.appendChild(list);
    }
    list.innerHTML = unique.map((label) => `<span>${escapeHtml(label)}</span>`).join("");
  }
  function tabulatorIssueMessage(labels) {
    return labels.map((label) => `Tabulador > ${label}`).join("; ");
  }
  function workflowIssueMessage(data, labels) {
    const falconIssues = new Set(requiredFalcon(data.falcon || {}));
    const consoleIssues = new Set(requiredConsole(data));
    const analysisIssues = new Set(requiredAnalysisFields(data));
    return labels.map((label) => {
      if (analysisIssues.has(label)) return `Tabulador > ${label}`;
      if (consoleIssues.has(label)) return `Console > ${label}`;
      if (falconIssues.has(label)) return `Falcon > ${label}`;
      return `Tabulador > ${label}`;
    }).join("; ");
  }
  async function applyDecisionAndShowFinal(data, decision, panel) {
    const runId = ++activeTabulatorDecisionRun;
    const isCurrentRun = () => runId === activeTabulatorDecisionRun && panel.isConnected;
    const text = buildTabulation(data, decision);
    const analysisMissing = requiredAnalysisFields(data);
    if (data.flow === "card" && analysisMissing.length) {
      showNotice(`Não foi possível continuar. Inconsistência em: ${tabulatorIssueMessage(analysisMissing)}.`, "error", 12000);
      return;
    }
    setDecisionButtonsEnabled(panel, false);
    panel.dataset.decisionApplying = "true";
    const missing = requiredWorkflow(data);
    if (missing.length) {
      if (getSafeMode()) {
        const location = workflowIssueMessage(data, missing);
        showNotice(`Não foi possível aplicar a decisão. Inconsistência em: ${location}.`, "error", 15000);
        setDecisionProgress(panel, `Inconsistência encontrada em: ${location}.`, "error");
        setDecisionIssues(panel, missing.map((label) => workflowIssueMessage(data, [label])));
        setDecisionButtonsEnabled(panel, true);
        panel.dataset.decisionApplying = "false";
        return;
      }
      showNotice(`Atenção: inconsistência em ${workflowIssueMessage(data, missing)}, mas o modo seguro está desligado.`, "warn", 14000);
      setDecisionIssues(panel, missing.map((label) => workflowIssueMessage(data, [label])));
    }
    setDecisionProgress(panel, "");
    startTabulatorWriting();
    const application = applyTabulator(data, decision, text, isCurrentRun);
    const copied = copyText(text);
    await copied;
    if (!isCurrentRun()) {
      stopTabulatorWriting(panel);
      return;
    }
    const applied = await application;
    if (applied.cancelled || !isCurrentRun()) {
      stopTabulatorWriting(panel);
      return;
    }
    const criticalLabels = tabulatorPageProfile() === "falcon-prevencao"
      ? ["Tipo de documento", "CPF/CNPJ", "CPF", "CNPJ", "Valor da transação", "Fila", "Estabelecimento", "Decisão", "Motivo status", "Observações"]
      : ["Tabulador Falcon", "Data de entrada", "Hora de entrada", "Tipo de documento", "CPF/CNPJ", "CPF", "CNPJ", "Valor da transação", "Tipo de chamada", "Status chamada", "Número do caso", "Fila", "Estabelecimento", "Regra", "Decisão", "Motivo status", "Observações"];
    const criticalPending = applied.pending.filter((label) => criticalLabels.includes(label));
    if (criticalPending.length) {
      const location = tabulatorIssueMessage(criticalPending);
      showNotice(`Não foi possível confirmar: ${location}.`, "error", 15000);
      setDecisionProgress(panel, `Inconsistência obrigatória em: ${location}.`, "error");
      setDecisionIssues(panel, criticalPending.map((label) => `Tabulador > ${label}`));
      setDecisionButtonsEnabled(panel, true);
      stopTabulatorWriting(panel);
      return;
    }
    if (!applied.ok) {
      showNotice(`Ação necessária: confira ${tabulatorIssueMessage(applied.pending)}.`, "warn-pulse", 15000);
      setDecisionIssues(panel, applied.pending.map((label) => `Tabulador > ${label}`));
    } else {
      setDecisionIssues(panel, []);
    }
    fillObservationText(text);
    stopTabulatorWriting(panel);
    showFinalTabulation(
      data,
      decision,
      text,
      panel,
      applied.ok ? "Todos os campos foram aplicados e confirmados no Tabulador." : "Campos aplicados. Confira os itens sinalizados no Tabulador.",
    );
    setFinalCopyReady(panel, true);
    closeSidePanels(panel.id);
    delete data.investigationSnapshot;
    releaseInvestigationSession(data);
    showNotice("Tudo certo: decisão e motivo status aplicados. A tabulação está pronta.", "success");
  }
  function showFinalTabulation(data, decision, text, panel, status = "") {
    panel.dataset.finalLocked = "true";
    panel.querySelector(".sac-body").innerHTML =
      section("Tabulação pronta", `<textarea class="sac-textarea sac-final-textarea ${data.flow === "card" ? "sac-final-card" : ""}" id="sac-final-text" readonly>${escapeHtml(text)}</textarea>`, "final")
      + `<div class="sac-apply-status" id="sac-apply-status">${escapeHtml(status || "Tabulação pronta.")}</div>`
      + `<div class="sac-final-actions"><button class="sac-main" id="sac-copy-final" data-ready="false" disabled>Copiar</button><button class="sac-secondary" id="sac-change-decision">Mudar decisão</button></div>`;
    neutralizeAutomationButtons(panel);
    byId("sac-copy-final")?.addEventListener("click", async (event) => {
      if (event.currentTarget.dataset.ready !== "true") {
        return;
      }
      event.currentTarget.disabled = true;
      let queue = [];
      let stagedQueue = [];
      let history = [];
      let copied;
      try {
        // LISTAS e Histórico entram na memória no mesmo gesto do clique. Assim,
        // o envelope copiado para a próxima página nunca fica um caso atrasado.
        stagedQueue = stageListsForFinalDecision(data, decision);
        history = addHistory(data, decision, text);
        copied = copyText(text);
        [queue] = await Promise.all([
          updateListsForFinalDecision(data, decision, stagedQueue),
          copied
        ]);
      } catch (_err) {
        event.currentTarget.disabled = false;
        showNotice("Não confirmei a gravação deste caso em LISTAS. A janela foi mantida aberta para tentar novamente.", "error", 16000);
        return;
      }
      clearCompletedCaseState(data);
      if ((queue.length || history.length) && !clipboardEnvelopeReady) {
        showNotice("Tabulação copiada. LISTAS e Histórico foram mantidos na memória local da V12.", "warn", 11000);
      }
      showNotice("Tabulação copiada e fluxo finalizado.", "complete");
      panel.dataset.finalLocked = "false";
      closeAuxiliaryPanels(panel.id);
      closeSidePanels(panel.id);
      unlockTabulatorFieldLock();
      stopTabulatorWriting(panel);
      releaseTabulatorNavigationGuard(0);
      window.__SAC_TABULATOR_DECISION_PANEL_ACTIVE__ = false;
      panel.remove();
    });
    byId("sac-change-decision")?.addEventListener("click", () => {
      activeTabulatorDecisionRun += 1;
      panel.dataset.finalLocked = "false";
      closeAuxiliaryPanels(panel.id);
      closeSidePanels(panel.id);
      unlockTabulatorFieldLock();
      stopTabulatorWriting(panel);
      startTabulatorNavigationGuard();
      panel.remove();
      renderTabulator(data);
    });
  }
  function setFinalCopyReady(panel, ready) {
    const button = panel.querySelector("#sac-copy-final");
    if (!button) return;
    button.dataset.ready = ready ? "true" : "false";
    button.disabled = !ready;
    button.textContent = "Copiar";
  }
  function clearCompletedCaseState(data) {
    storageRemove("lastFalcon");
    storageRemove("lastConsole");
    if (typeof memory.transport.clearAll === "function") memory.transport.clearAll();
    else ["falcon", "console", "mediaRequest", "mediaResult"].forEach((stage) => memory.transport.clear(stage));
    releaseInvestigationSession(data);
  }
  function buildTabulation(data, decision) {
    const f = data.falcon || {};
    const motive = String(data.decisionReason || "").trim();
    const motiveLines = motive ? [`Motivo: ${motive}`] : [];
    const jiraLines = data.jiraActive && data.jiraReference ? [`JIRA: ${data.jiraReference}`] : [];
    const detailSuffix = (value, details) => {
      const list = Array.isArray(details) ? details.filter(Boolean) : [];
      return list.length ? `${clean(value, "")} - ${list.join("; ")}` : clean(value, "");
    };
    const emailDetails = [
      ...(Array.isArray(data.fields?.emailDivergenceDetails) ? data.fields.emailDivergenceDetails : []),
      data.fields?.emailDivergenceEmail ? `E-mail observado: ${data.fields.emailDivergenceEmail}` : ""
    ].filter(Boolean);
    if (data.flow === "card") {
      return [
        `Valor da transação: R$ ${clean(f.value, "")}`,
        `Regra: ${clean(f.rule, "")}`,
        `Estabelecimento: ${clean(f.merchant, "")}`,
        `Status do cartão: ${clean(data.cardStatus, "")}`,
        `Data de cadastro: ${clean(data.registrationDate, "")}`,
        `Histórico de compra no estabelecimento: ${clean(data.fields?.merchantHistory, "")}`,
        `Padrão de compra: ${clean(data.fields?.purchasePattern, "")}`,
        "",
        `Decisão: ${decision}`,
        ...jiraLines,
        ...motiveLines,
        "",
        signatureText()
      ].join("\n");
    }
    return [
      `Valor da transação: R$ ${clean(f.value, "")}`,
      `Regra: ${clean(f.rule, "")}`,
      `Histórico de Infrações: ${formatHistoryValue(f.history)}`,
      `Mídia desabonadora: ${detailSuffix(data.fields?.badMedia, data.fields?.badMediaDetails)}`,
      `Status conta: ${clean(data.accountStatus, "")}`,
      `Status Pessoa (SPD): ${clean(data.fields?.personStatus, "")}`,
      `Data de cadastro: ${clean(data.registrationDate, "")}`,
      `E-mail, DDD e Endereço: ${detailSuffix(data.fields?.emailPhoneAddress, emailDetails)}`,
      `Histórico SPD: ${clean(data.fields?.spdHistory, "")}`,
      `Documentação: ${clean(data.fields?.documentation, "")}`,
      `Extrato: ${clean(data.fields?.statement, "")}`,
      "",
      `Decisão: ${decision}`,
      ...jiraLines,
      ...motiveLines,
      "",
      signatureText()
    ].join("\n");
  }

  // ========================= TABULADOR: APLICAÇÃO ===================
  function runTargetPageFieldHooks(el) {
    if (!el) return;
    try {
      el.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: "Tab" }));
    } catch (_err) {
      el.dispatchEvent(new Event("keyup", { bubbles: true }));
    }
    try {
      const id = el.id || "";
      if (id && /_dctxt$/i.test(id) && typeof window.setValue === "function") {
        window.setValue(id, id.replace(/_dctxt$/i, "_dchdn"));
      }
    } catch (_err) {}
    try { if (typeof window.setDirty === "function") window.setDirty(); } catch (_err) {}
  }
  function setNativeValue(el, value, options = {}) {
    if (!el || (isMissing(value) && !options.allowEmpty)) return false;
    const next = String(value);
    const quiet = Boolean(options.quiet);
    const guard = window.__SAC_TABULATOR_WRITE_GUARD__ || {};
    const descriptor = el instanceof HTMLSelectElement
      ? guard.select || Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")
      : el instanceof HTMLTextAreaElement
        ? guard.textarea || Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")
        : guard.input || Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    return withTabulatorGuardBypass(() => {
      try { el.focus(); } catch (_err) {}
      try {
        if (descriptor?.set) descriptor.set.call(el, next);
        else el.value = next;
      } catch (_err) { el.value = next; }
      if (!quiet && el instanceof HTMLInputElement) {
        try { el.setAttribute("value", next); } catch (_err) {}
      }
      el.dispatchEvent(new Event("input", { bubbles: true }));
      if (!quiet) {
        el.dispatchEvent(new Event("change", { bubbles: true }));
        runTargetPageFieldHooks(el);
        el.dispatchEvent(new Event("blur", { bubbles: true }));
        try { el.blur(); } catch (_err) {}
      }
      return fieldValueMatches(el, next);
    });
  }
  const fillById = (id, value) => setNativeValue(byId(id), value);
  const elementByName = (name) => all("[name]").find((node) => node.getAttribute("name") === name);
  function fieldValueMatches(element, wanted) {
    if (!element) return false;
    if (element instanceof HTMLSelectElement) {
      const selected = element.options?.[element.selectedIndex];
      return Boolean(selected && optionMatches(selected, wanted));
    }
    const actual = String(element.value ?? "").trim();
    const expected = String(wanted ?? "").trim();
    if (normalize(actual) === normalize(expected)) return true;
    const actualAlnum = alnumOnly(actual);
    const expectedAlnum = alnumOnly(expected);
    return expectedAlnum.length >= 6 && actualAlnum === expectedAlnum;
  }
  function targetElement(target) {
    if (target.id) return byId(target.id);
    if (target.name) return elementByName(target.name);
    if (target.pattern) return all(target.selector || "input,textarea").find((element) => target.pattern.test(`${element.id || ""} ${element.name || ""}`));
    return null;
  }
  function anyTargetMatches(targets, value) {
    return targets.some((target) => fieldValueMatches(targetElement(target), value));
  }
  function fillAnyImmediate(targets, value) {
    if (!tabulatorWriteEnabled || isMissing(value)) return false;
    let ok = false;
    targets.forEach((target) => {
      const element = targetElement(target);
      if (element) ok = setNativeValue(element, value, { quiet: true }) || ok;
    });
    return ok;
  }
  async function forceFillAny(targets, value, tries = 10, delay = 35, isActive = () => true) {
    if (!canWriteTabulator(isActive) || isMissing(value)) return false;
    if (fillAnyImmediate(targets, value) && anyTargetMatches(targets, value)) return true;
    for (let attempt = 0; attempt < tries; attempt += 1) {
      if (!canWriteTabulator(isActive)) return false;
      if (anyTargetMatches(targets, value)) return true;
      for (const target of targets) {
        const element = targetElement(target);
        if (!element) continue;
        setNativeValue(element, value, { quiet: true });
        await wait(delay);
        if (!canWriteTabulator(isActive)) return false;
        if (anyTargetMatches(targets, value)) {
          await wait(8);
          if (anyTargetMatches(targets, value)) return true;
        }
      }
      await wait(delay);
    }
    return false;
  }
  async function waitForField(test, tries = 40, delay = 80) {
    for (let i = 0; i < tries; i += 1) {
      if (test()) return true;
      await wait(delay);
    }
    return false;
  }
  async function waitForTabulatorFields() {
    return waitForField(() => byId("txt_ValorTransacao") || byId("ddl_status") || elementByName("_partial_Falcon.NumeroCaso"), 45, 45);
  }
  const optionTargets = tabulatorEngine.optionTargets;
  const optionMatches = tabulatorEngine.optionMatches;
  const optionExactMatches = tabulatorEngine.optionExactMatches;
  const strictDropdownTarget = tabulatorEngine.strictDropdownTarget;
  function applySelectValue(select, option) {
    if (!select || !option) return false;
    return withTabulatorGuardBypass(() => {
      all("option", select).forEach((opt) => opt.selected = false);
      option.selected = true;
      const guard = window.__SAC_TABULATOR_WRITE_GUARD__ || {};
      const descriptor = guard.select || Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
      try {
        if (descriptor?.set) descriptor.set.call(select, option.value);
        else select.value = option.value;
      } catch (_err) {
        select.value = option.value;
      }
      select.dispatchEvent(new Event("input", { bubbles: true }));
      select.dispatchEvent(new Event("change", { bubbles: true }));
      try {
        if (window.jQuery?.fn?.selectpicker) {
          window.jQuery(select)
            .selectpicker("val", option.value)
            .selectpicker("render")
            .selectpicker("refresh")
            .trigger("changed.bs.select")
            .trigger("change");
        }
      } catch (_err) {}
      const selected = select.options?.[select.selectedIndex];
      return Boolean(selected && optionMatches(selected, option.value || option.textContent));
    });
  }
  function dropdownSelectionMatches(id, wanted) {
    const select = byId(id);
    const selected = select?.options?.[select.selectedIndex];
    if (selected && (optionExactMatches(selected, wanted) || optionMatches(selected, wanted))) return true;
    if (select?.value && optionTargets(wanted).some((target) => {
      const value = normalize(select.value);
      if (value === target) return true;
      return !strictDropdownTarget(target) && value.includes(target);
    })) return true;
    return false;
  }
  async function waitForDropdownSelection(id, wanted, tries = 10, delay = 55, isActive = () => true) {
    for (let attempt = 0; attempt < tries; attempt += 1) {
      if (!isActive()) return false;
      if (dropdownSelectionMatches(id, wanted)) return true;
      const select = byId(id);
      const selected = select?.options?.[select.selectedIndex];
      if (selected && optionMatches(selected, wanted)) {
        await wait(20);
        const confirmed = byId(id)?.options?.[byId(id)?.selectedIndex];
        if (dropdownSelectionMatches(id, wanted) || (confirmed && optionMatches(confirmed, wanted))) return true;
      }
      await wait(delay);
    }
    return false;
  }
  async function selectDropdown(id, wanted, tries = 18, isActive = () => true) {
    if (!canWriteTabulator(isActive) || isMissing(wanted)) return false;
    if (dropdownSelectionMatches(id, wanted)) return true;
    for (let attempt = 0; attempt < tries; attempt += 1) {
      if (!canWriteTabulator(isActive)) return false;
      if (dropdownSelectionMatches(id, wanted)) return true;
      const select = byId(id);
      if (select?.options?.length && tabulatorEngine.selectNow(id, wanted)) {
        await wait(8);
        if (!canWriteTabulator(isActive)) return false;
        if (await waitForDropdownSelection(id, wanted, 3, 18, isActive)) return true;
      }
      if (select?.options?.length) {
        const option = all("option", select).find((candidate) => optionExactMatches(candidate, wanted))
          || all("option", select).find((candidate) => optionMatches(candidate, wanted));
        if (option && applySelectValue(select, option)) {
          await wait(8);
          if (!canWriteTabulator(isActive)) return false;
          if (await waitForDropdownSelection(id, wanted, 3, 18, isActive)) return true;
        }
      }
      await wait(18);
    }
    return false;
  }
  async function selectDropdownByPattern(pattern, wanted, tries = 18, isActive = () => true) {
    if (!canWriteTabulator(isActive) || isMissing(wanted)) return false;
    for (let attempt = 0; attempt < tries; attempt += 1) {
      if (!canWriteTabulator(isActive)) return false;
      const select = all("select").find((element) => pattern.test(`${element.id || ""} ${element.name || ""}`));
      if (select?.options?.length) {
        const selected = select.options?.[select.selectedIndex];
        if (selected && (optionExactMatches(selected, wanted) || optionMatches(selected, wanted))) return true;
        const option = all("option", select).find((candidate) => optionExactMatches(candidate, wanted))
          || all("option", select).find((candidate) => optionMatches(candidate, wanted));
        if (option && applySelectValue(select, option)) {
          await wait(8);
          const selected = select.options?.[select.selectedIndex];
          if (selected && optionMatches(selected, wanted)) return true;
        }
      }
      await wait(18);
    }
    return false;
  }
  async function selectDependentDropdown(parentId, parentWanted, childId, childWanted, tries = 90, isActive = () => true) {
    if (!canWriteTabulator(isActive)) return false;
    if (isMissing(childWanted)) return true;
    await selectDropdown(parentId, parentWanted, 20, isActive);
    if (await selectDropdown(childId, childWanted, 2, isActive)) return true;
    return new Promise((resolve) => {
      let attempt = 0;
      let running = false;
      let done = false;
      let observer = null;
      let interval = 0;
      let timeout = 0;
      const finish = (ok) => {
        if (done) return;
        done = true;
        try { observer?.disconnect(); } catch (_err) {}
        clearInterval(interval);
        clearTimeout(timeout);
        resolve(ok);
      };
      const run = async () => {
        if (running || done) return;
        running = true;
        try {
          if (!canWriteTabulator(isActive)) return finish(false);
          if (dropdownSelectionMatches(childId, childWanted)) return finish(true);
          if (attempt % 6 === 0) await selectDropdown(parentId, parentWanted, 1, isActive);
          attempt += 1;
          if (await selectDropdown(childId, childWanted, 1, isActive)) return finish(true);
          if (attempt >= tries) return finish(false);
        } finally {
          running = false;
        }
      };
      try {
        observer = new MutationObserver(run);
        observer.observe(byId(childId) || document.documentElement, { childList: true, subtree: true, attributes: true });
      } catch (_err) {}
      interval = setInterval(run, 24);
      timeout = setTimeout(() => finish(false), Math.max(1200, tries * 55));
      run();
    });
  }
  async function selectIssuerDropdown(issuer, issuerId = "", isActive = () => true) {
    if (!canWriteTabulator(isActive)) return false;
    if (dropdownSelectionMatches("ddl_idemissor", issuer)) return true;
    const select = byId("ddl_idemissor");
    if (select?.options?.length) {
      const directName = all("option", select).find((candidate) => optionExactMatches(candidate, issuer))
        || all("option", select).find((candidate) => optionMatches(candidate, issuer));
      if (directName && applySelectValue(select, directName)) {
        if (await waitForDropdownSelection("ddl_idemissor", directName.value || directName.textContent, 4, 24, isActive)) return true;
      }
    }
    const resolvedId = issuerId || await issuerIdForName(issuer);
    if (resolvedId && byId("ddl_idemissor")?.options?.length) {
      const idOption = all("option", byId("ddl_idemissor")).find((candidate) => optionExactMatches(candidate, resolvedId))
        || all("option", byId("ddl_idemissor")).find((candidate) => optionMatches(candidate, resolvedId));
      if (idOption && applySelectValue(byId("ddl_idemissor"), idOption)) {
        if (await waitForDropdownSelection("ddl_idemissor", idOption.value || idOption.textContent, 4, 24, isActive)) return true;
      }
    }
    if (resolvedId && await selectDropdown("ddl_idemissor", resolvedId, 8, isActive)) return true;
    if (await selectDropdown("ddl_idemissor", issuer, 24, isActive)) return true;
    if (!select?.options?.length || !isActive()) return false;
    const target = normalize(issuer);
    const directory = await loadIssuerDirectory();
    const entry = directory
      .map((item) => ({ item, score: issuerEntryScore(item, issuer) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)[0]?.item;
    const names = [issuer, entry?.console, entry?.nome, entry?.falcon, entry?.outros]
      .flatMap((value) => String(value || "").split(/[\/,;|]+/))
      .map(normalize)
      .filter(Boolean);
    const option = all("option", select).find((opt) => {
      const text = normalize(opt.textContent || "");
      const value = normalize(opt.value || "");
      return names.some((name) => text === name || value === name || text.includes(name) || name.includes(text))
        || (target && text.includes(target.slice(0, Math.min(5, target.length))));
    });
    if (!option) return false;
    return applySelectValue(select, option)
      && await waitForDropdownSelection("ddl_idemissor", option.value || option.textContent, 8, 45, isActive);
  }
  async function prepareTabulatorFalconPartial(isActive = () => true) {
    if (!canWriteTabulator(isActive)) return false;
    if (tabulatorPageProfile() === "falcon-prevencao") {
      await waitForTabulatorFields();
      return canWriteTabulator(isActive);
    }
    const select = byId("ddl_tabulador");
    if (!select?.options?.length) return true;
    const options = all("option", select);
    const placeholder = options.find((option) => !String(option.value || "").trim())
      || options.find((option) => normalize(option.textContent).includes("TABULADOR"));
    const falcon = options.find((option) => optionMatches(option, "Falcon"))
      || options.find((option) => normalize(option.value).includes("PARTIAL_FALCON"))
      || options.find((option) => normalize(option.textContent) === "FALCON");
    if (!falcon) return false;
    if (placeholder) {
      applySelectValue(select, placeholder);
      await wait(70);
      if (!canWriteTabulator(isActive)) return false;
    }
    applySelectValue(select, falcon);
    const selected = await waitForDropdownSelection("ddl_tabulador", falcon.value || falcon.textContent || "Falcon", 10, 45, isActive)
      || await waitForDropdownSelection("ddl_tabulador", "Falcon", 8, 45, isActive);
    await waitForTabulatorFields();
    return selected;
  }
  async function applyStatusDropdown(decision, isActive = () => true) {
    if (!canWriteTabulator(isActive)) return { statusOk: false, cancelled: true };
    const statusOk = isActive() && await selectDropdown("ddl_status", decision, 28, isActive);
    if (!canWriteTabulator(isActive)) return { statusOk: false, cancelled: true };
    return { statusOk: statusOk && await waitForDropdownSelection("ddl_status", decision, 8, 45, isActive) };
  }
  async function applyReasonDropdown(data, decision, isActive = () => true) {
    if (!canWriteTabulator(isActive)) return { reasonOk: false, cancelled: true };
    const reason = reasonForDecision(data, decision);
    if (!reason) return { reasonOk: true };
    const reasonOk = await selectDependentDropdown("ddl_status", decision, "ddl_motivostatus", reason, 120, isActive);
    if (!canWriteTabulator(isActive)) return { reasonOk: false, cancelled: true };
    return { reasonOk: reasonOk && await waitForDropdownSelection("ddl_motivostatus", reason, 6, 35, isActive) };
  }
  function queueFor(data) {
    const f = data.falcon || {};
    if (data.visualFlow === "hold" || isHoldRule(f.rule)) return "HOLD";
    if (data.flow !== "card") return "BANKING";
    const decision = normalize(f.transactionDecision);
    if (/(APPROVE|APROVAD|AUTHORIZED|AUTORIZAD|APROV)/.test(decision)) return "CARTÕES APROVADAS";
    if (/(DECLINE|DECLIN|RECUSAD|REPROVAD|DENIED|NEGAD)/.test(decision)) return "CARTÕES RECUSADAS";
    return "";
  }
  function hasCardAutofinancing(data) {
    return [data?.fields?.merchantHistory, data?.fields?.purchasePattern]
      .some((value) => normalize(value) === "AUTOFINANCIAMENTO");
  }
  function reasonForDecision(flowOrData, decision) {
    const data = typeof flowOrData === "object" && flowOrData ? flowOrData : null;
    const flow = data?.flow || flowOrData;
    const d = normalize(decision);
    if (d === "FRAUDE") {
      if (flow === "card" && !hasCardAutofinancing(data)) return "CLIENTE SOFREU FRAUDE";
      return "FRAUDE TRANSACIONAL";
    }
    if (d === "NAO FRAUDE") return "SEM SUSPEITAS";
    if (flow === "card" && d === "NAO FOI POSSIVEL CONFIRMAR FRAUDE") return "CLIENTE NÃO ATENDE";
    if (d === "NAO FOI POSSIVEL CONFIRMAR FRAUDE") return "DADOS INSUFICIENTES PARA ANÁLISE";
    if (d === "NAO FOI POSSIVEL CONFIRMAR NAO FRAUDE") return "DADOS INSUFICIENTES PARA ANÁLISE";
    return "";
  }
  function tabulatorCallValues(data) {
    if (data.jiraActive && normalize(data.fields?.callMode) === "COM CHAMADA") {
      return { type: "RECEPTIVO", result: "COM SUCESSO" };
    }
    if (data.jiraActive) return { type: "SEM CONTATO - FILA", result: "SEM CHAMADA" };
    if (normalize(data.fields?.callMode) === "COM CHAMADA") {
      return {
        type: "ATIVA - PLANILHA",
        result: normalize(data.fields?.callResult) === "COM SUCESSO" ? "COM SUCESSO" : "SEM SUCESSO"
      };
    }
    return { type: "SEM CONTATO - PLANILHA", result: "SEM CHAMADA" };
  }
  function tabulatorPageProfile() {
    const selectedTabulator = byId("ddl_tabulador")?.selectedOptions?.[0]?.textContent
      || byId("ddl_tabulador")?.value
      || "";
    const systemName = byId("txt_Sistema")?.value || byId("txt_Sistema")?.textContent || "";
    const hasPreventionFields = Boolean(document.querySelector("[name^='_partial_Falcon_Prevencao.'],[id^='zpartial_Falcon_Prevencao_']"));
    return hasPreventionFields || normalize(`${selectedTabulator} ${systemName}`).includes("FALCON PREVENCAO")
      ? "falcon-prevencao"
      : "falcon";
  }
  function preventionObservationTargets() {
    return [
      { id: "zpartial_Falcon_Prevencao_Observacao" },
      { name: "_partial_Falcon_Prevencao.Observacao" },
      { pattern: /partial_Falcon_Prevencao.*Observacao/i, selector: "textarea,input" }
    ];
  }
  function defaultObservationTargets() {
    return [
      { id: "txt_obs" },
      { name: "_partial_Falcon.Observacao" },
      { pattern: /observa|descricao|comentario/i, selector: "textarea,input" }
    ];
  }
  function observationTargetsForPage() {
    return tabulatorPageProfile() === "falcon-prevencao" ? preventionObservationTargets() : defaultObservationTargets();
  }
  async function verifyDocumentAfterPageValidation(data, isActive = () => true) {
    const docKind = documentKind(data.cpfCnpj);
    const doc = documentFieldValue(data.cpfCnpj);
    if (!docKind || !doc) return ["CPF/CNPJ"];
    revealDocumentField(docKind);
    const prevention = tabulatorPageProfile() === "falcon-prevencao";
    const targets = docKind === "CNPJ"
      ? [{ id: "txt_cnpj" }, { name: prevention ? "_partial_Falcon_Prevencao.Cnpj" : "_partial_Falcon.Cnpj" }, { pattern: /cnpj/i }]
      : [{ id: "txt_cpf" }, { name: prevention ? "_partial_Falcon_Prevencao.Cpf" : "_partial_Falcon.Cpf" }, { pattern: /cpf/i }];
    if (!anyTargetMatches(targets, doc)) await forceFillAny(targets, doc, 6, 22, isActive);
    if (!canWriteTabulator(isActive)) return ["CPF/CNPJ"];
    targets.forEach((target) => {
      const activeField = targetElement(target);
      try { activeField?.dispatchEvent(new Event("blur", { bubbles: true })); } catch (_err) {}
    });
    await waitForField(() => anyTargetMatches(targets, doc), 8, 45);
    if (anyTargetMatches(targets, doc)) return [];
    return [docKind];
  }
  async function confirmTabulatorDropdowns(data, decision, isActive = () => true) {
    const missing = [];
    const checked = [];
    const addChecked = (label) => { if (label && !checked.includes(label)) checked.push(label); };
    const addMissing = (label) => { if (label && !missing.includes(label)) missing.push(label); };
    const confirmField = async (id, wanted, label, tries = 18) => {
      if (isMissing(wanted)) return;
      addChecked(label);
      if (!await waitForDropdownSelection(id, wanted, 3, 35, isActive)) await selectDropdown(id, wanted, tries, isActive);
      if (!await waitForDropdownSelection(id, wanted, 8, 50, isActive)) addMissing(label);
    };

    if (!canWriteTabulator(isActive)) return { checked, missing, cancelled: true };

    const docKind = documentKind(data.cpfCnpj);
    const callValues = tabulatorCallValues(data);
    const queue = queueFor(data);
    const reason = reasonForDecision(data, decision);
    const prevention = tabulatorPageProfile() === "falcon-prevencao";

    if (docKind) await confirmField("ddl_tipoDoc", docKind, "Tipo de documento", 24);
    if (!prevention && byId("ddl_tabulador")) await confirmField("ddl_tabulador", "Falcon", "Tabulador Falcon", 14);

    if (!prevention) {
      addChecked("Emissor");
      if (!await selectIssuerDropdown(data.issuer, data.issuerId, isActive)) addMissing("Emissor");

      await confirmField("ddl_TipoChamada", callValues.type, "Tipo de chamada", 22);
      await confirmField("ddl_ChamadaAtiva", callValues.result, "Status chamada", 22);
    }

    if (queue) await confirmField("ddl_Fila", queue, "Fila", 32);
    else {
      addChecked("Fila");
      addMissing(data.flow === "card" ? "Fila cartão/decisão da transação" : "Fila");
    }

    await confirmField("ddl_status", decision, "Decisão", 24);
    if (reason) {
      addChecked("Motivo status");
      if (!await waitForDropdownSelection("ddl_motivostatus", reason, 3, 45, isActive)) {
        await selectDependentDropdown("ddl_status", decision, "ddl_motivostatus", reason, 90, isActive);
      }
      if (!await waitForDropdownSelection("ddl_motivostatus", reason, 10, 55, isActive)) addMissing("Motivo status");
    }

    return { checked, missing, cancelled: !canWriteTabulator(isActive) };
  }
  function tabulatorTextFieldPlan(data, tabulationText = "") {
    const f = data.falcon || {};
    const ecValue = data.flow === "card" ? f.merchant : f.transactionType;
    const prevention = tabulatorPageProfile() === "falcon-prevencao";
    const transactionValue = clean(f.value, "").replace("R$", "").trim();
    if (prevention) {
      return [
        {
          label: "Valor da transação",
          value: transactionValue,
          targets: [{ id: "txt_ValorTransacao" }, { name: "_partial_Falcon_Prevencao.ValorTransacao" }, { pattern: /valor.*transa/i }]
        },
        {
          label: "Estabelecimento",
          value: ecValue,
          targets: [
            { id: "zpartial_Falcon_Prevencao_Estabelecimento" },
            { name: "_partial_Falcon_Prevencao.Estabelecimento" },
            { pattern: /partial_Falcon_Prevencao.*Estabelecimento/i }
          ]
        },
        { label: "Observações", value: tabulationText, targets: preventionObservationTargets() }
      ];
    }
    const fields = [
      {
        label: "Valor da transação",
        value: transactionValue,
        targets: [{ id: "txt_ValorTransacao" }, { name: "_partial_Falcon.ValorTransacao" }, { pattern: /valor.*transa/i }]
      },
      {
        label: "Número do caso",
        value: f.caseNumber,
        targets: [{ name: "_partial_Falcon.NumeroCaso" }, { id: "txt_NumeroCaso" }, { pattern: /numero.*caso|caso.*numero/i }]
      },
      {
        label: "Estabelecimento",
        value: ecValue,
        targets: [{ name: "_partial_Falcon.EcTransacao" }, { pattern: /ecTransacao|estabelecimento|tipoTransacao/i }]
      },
      {
        label: "Regra",
        value: f.rule,
        targets: [{ name: "_partial_Falcon.RegraListada" }, { pattern: /regra.*list/i }]
      },
      { label: "Observações", value: tabulationText, targets: defaultObservationTargets() }
    ];
    if (f.transactionDate?.includes("/")) {
      const [date, time] = f.transactionDate.split(/\s+/);
      if (date) fields.push({
        label: "Data de entrada",
        value: date.split("/").reverse().join("-"),
        targets: [{ id: "txt_data_entrada" }, { name: "_partial_Falcon.DataEntrada" }, { pattern: /data.*entrada/i }]
      });
      if (time) fields.push({
        label: "Hora de entrada",
        value: trimTimeToMinute(time),
        targets: [{ id: "txt_hora_entrada" }, { name: "_partial_Falcon.HoraEntrada" }, { pattern: /hora.*entrada/i }]
      });
    }
    return fields;
  }
  function primeTabulatorFields(data, decision, tabulationText) {
    if (!tabulatorWriteEnabled) return;
    tabulatorTextFieldPlan(data, tabulationText).forEach(({ targets, value }) => fillAnyImmediate(targets, value));
  }
  async function confirmTabulatorTextFields(data, tabulationText, isActive = () => true) {
    const checked = [];
    const missing = [];
    for (const field of tabulatorTextFieldPlan(data, tabulationText)) {
      if (isMissing(field.value)) continue;
      checked.push(field.label);
      if (!anyTargetMatches(field.targets, field.value)) {
        await forceFillAny(field.targets, field.value, 7, 16, isActive);
      }
      if (!canWriteTabulator(isActive)) return { checked, missing, cancelled: true };
      if (!anyTargetMatches(field.targets, field.value)) missing.push(field.label);
    }
    return { checked, missing, cancelled: false };
  }
  function fillObservationText(text) {
    if (!tabulatorWriteEnabled) return false;
    const targets = observationTargetsForPage();
    let ok = fillAnyImmediate(targets, text);
    targets.forEach((target) => {
      const element = targetElement(target);
      if (!element) return;
      ok = setNativeValue(element, text, { quiet: true }) || ok;
    });
    return ok;
  }
  async function applyPrimaryTabulatorFields(data, isActive = () => true) {
    if (!canWriteTabulator(isActive)) return { ok: false, pending: [], cancelled: true };
    const pending = [];
    const addPending = (label) => { if (label && !pending.includes(label)) pending.push(label); };
    const f = data.falcon || {};
    const prevention = tabulatorPageProfile() === "falcon-prevencao";
    await waitForTabulatorFields();
    if (!canWriteTabulator(isActive)) return { ok: false, pending, cancelled: true };
    const applyInput = (targets, value, label, tries = 5, delay = 10) =>
      forceFillAny(targets, value, tries, delay, isActive).then((ok) => {
        if (!ok) addPending(label);
        return ok;
      });

    primeTabulatorFields(data, "", "");
    const tasks = [];

    tasks.push((async () => {
      const docKind = documentKind(data.cpfCnpj);
      const doc = documentFieldValue(data.cpfCnpj);
      if (!docKind || !doc) {
        addPending("CPF/CNPJ");
        return false;
      }
      const typeApplied = await selectDropdown("ddl_tipoDoc", docKind, 30, isActive)
        || await selectDropdownByPattern(/tipo.*doc|document.*type/i, docKind, 24, isActive);
      if (!typeApplied) addPending("Tipo de documento");
      revealDocumentField(docKind);
      const targets = docKind === "CNPJ"
        ? [{ id: "txt_cnpj" }, { name: prevention ? "_partial_Falcon_Prevencao.Cnpj" : "_partial_Falcon.Cnpj" }, { pattern: /cnpj/i }]
        : [{ id: "txt_cpf" }, { name: prevention ? "_partial_Falcon_Prevencao.Cpf" : "_partial_Falcon.Cpf" }, { pattern: /cpf/i }];
      await waitForField(() => targets.some((target) => targetElement(target)), 12, 25);
      return applyInput(targets, doc, docKind, 14, 18);
    })());

    const queue = queueFor(data);
    if (!prevention) {
      const callValues = tabulatorCallValues(data);
      tasks.push(selectIssuerDropdown(data.issuer, data.issuerId, isActive).then((ok) => {
        if (!ok) addPending("Emissor");
        return ok;
      }));
      tasks.push(selectDependentDropdown("ddl_TipoChamada", callValues.type, "ddl_ChamadaAtiva", callValues.result, 70, isActive).then((ok) => {
        if (!ok) {
          addPending("Tipo de chamada");
          addPending("Status chamada");
        }
        return ok;
      }));
      if (queue) {
        tasks.push(selectDropdown("ddl_Fila", queue, 32, isActive).then((ok) => {
          if (!ok) addPending("Fila");
          return ok;
        }));
      }
    } else {
      const transactionValue = clean(f.value, "").replace("R$", "").trim();
      const establishment = data.flow === "card" ? f.merchant : f.transactionType;
      tasks.push(applyInput([
        { id: "txt_ValorTransacao" },
        { name: "_partial_Falcon_Prevencao.ValorTransacao" }
      ], transactionValue, "Valor da transação", 8, 14));
      tasks.push(applyInput([
        { id: "zpartial_Falcon_Prevencao_Estabelecimento" },
        { name: "_partial_Falcon_Prevencao.Estabelecimento" }
      ], establishment, "Estabelecimento", 8, 14));
      if (queue) {
        tasks.push(selectDropdown("ddl_Fila", queue, 28, isActive).then((ok) => {
          if (!ok) addPending("Fila");
          return ok;
        }));
      }
    }
    if (!queue) {
      addPending(data.flow === "card" ? "Fila cartão/decisão da transação" : "Fila");
    }

    await Promise.allSettled(tasks);
    if (!canWriteTabulator(isActive)) return { ok: false, pending, cancelled: true };
    primeTabulatorFields(data, "", "");
    return { ok: pending.length === 0, pending };
  }
  async function applyTabulator(data, decision, tabulationText = "", isActive = () => true) {
    if (!canWriteTabulator(isActive)) return { ok: false, pending: [], cancelled: true };
    const pending = [];
    const addPending = (label) => { if (label && !pending.includes(label)) pending.push(label); };
    const removePending = (label) => {
      const index = pending.indexOf(label);
      if (index >= 0) pending.splice(index, 1);
    };

    if (!await prepareTabulatorFalconPartial(isActive)) addPending("Tabulador Falcon");
    if (!canWriteTabulator(isActive)) return { ok: false, pending, cancelled: true };
    const primaryApplication = applyPrimaryTabulatorFields(data, isActive);
    const statusFields = await applyStatusDropdown(decision, isActive);
    if (statusFields.cancelled || !isActive()) return { ok: false, pending: [], cancelled: true };
    if (!statusFields.statusOk) addPending("Decisão"); else removePending("Decisão");
    const reasonApplication = statusFields.statusOk
      ? applyReasonDropdown(data, decision, isActive)
      : Promise.resolve({ reasonOk: false });

    const primary = await primaryApplication;
    if (primary?.cancelled || !isActive()) return { ok: false, pending: [], cancelled: true };
    (primary?.pending || []).forEach(addPending);

    primeTabulatorFields(data, decision, tabulationText);
    const observationTargets = observationTargetsForPage();
    if (!fillObservationText(tabulationText) && !await forceFillAny(observationTargets, tabulationText, 10, 25, isActive)) addPending("Observações");

    const reasonFields = await reasonApplication;
    if (reasonFields.cancelled || !isActive()) return { ok: false, pending: [], cancelled: true };
    if (!reasonFields.reasonOk) addPending("Motivo status"); else removePending("Motivo status");

    fillObservationText(tabulationText);
    const dropdownAudit = await confirmTabulatorDropdowns(data, decision, isActive);
    if (dropdownAudit.cancelled || !isActive()) return { ok: false, pending: [], cancelled: true };
    (dropdownAudit.checked || []).forEach(removePending);
    (dropdownAudit.missing || []).forEach(addPending);

    primeTabulatorFields(data, decision, tabulationText);
    fillObservationText(tabulationText);
    const textAudit = await confirmTabulatorTextFields(data, tabulationText, isActive);
    if (textAudit.cancelled || !isActive()) return { ok: false, pending: [], cancelled: true };
    (textAudit.checked || []).forEach(removePending);
    (textAudit.missing || []).forEach(addPending);

    const documentPending = await verifyDocumentAfterPageValidation(data, isActive);
    if (!documentPending.length) {
      removePending("CPF/CNPJ");
      removePending("CPF");
      removePending("CNPJ");
      removePending("Tipo de documento");
    }
    documentPending.forEach(addPending);
    return { ok: pending.length === 0, pending };
  }

  const ISSUER_ID_OVERRIDES = new Map([
    ["ONLYPAY", "104"],
    ["CONTA SIMPLES", "155"],
    ["CONTASIMPLES", "155"],
    ["BEMOL", "211"],
    ["AMIGOZ", "448"],
    ["SOFISA", "513"],
    ["IFOOD", "520"],
    ["JEITTODOCKONE", "10142"],
    ["JEITTO DOCK ONE", "10142"],
    ["JEITTO", "10142"],
    ["REDEFROTA", "266"],
    ["REDE FROTA", "266"],
    ["FROTABANK", "266"],
    ["FROTA BANK", "266"],
    ["LYON", "266"]
  ]);
  function issuerIdOverride(issuer) {
    const target = normalize(issuer);
    if (!target) return "";
    for (const [name, id] of ISSUER_ID_OVERRIDES.entries()) {
      const normalizedName = normalize(name);
      if (target === normalizedName || target.includes(normalizedName) || normalizedName.includes(target)) return id;
    }
    return "";
  }
  function splitIssuerNames(...values) {
    return values
      .flatMap((value) => String(value || "").split(/[\/,;|]+|\s+e\s+/i))
      .map((value) => normalize(value))
      .filter((value) => value && value !== "-");
  }
  function issuerNameScore(name, target, exactScore, partialScore) {
    if (!name || !target) return 0;
    if (name === target) return exactScore;
    if (target.length >= 5 && (name.includes(target) || target.includes(name))) return partialScore;
    return 0;
  }
  function issuerEntryScore(entry, issuer) {
    const target = normalize(issuer);
    if (!target) return 0;
    const primaryNames = splitIssuerNames(entry.console, entry.nome, entry.outros);
    const falconNames = splitIssuerNames(entry.falcon);
    const primaryScore = Math.max(0, ...primaryNames.map((name) => issuerNameScore(name, target, 100, 82)));
    if (primaryScore) return primaryScore;
    return Math.max(0, ...falconNames.map((name) => issuerNameScore(name, target, 42, 24)));
  }
  let issuerDirectoryCache = null;
  let issuerDirectoryPromise = null;
  async function loadIssuerDirectory() {
    if (issuerDirectoryCache) return issuerDirectoryCache;
    if (issuerDirectoryPromise) return issuerDirectoryPromise;
    issuerDirectoryPromise = (async () => {
      try {
        const url = new URL("issuer-directory.json", scriptUrl.href);
        const response = await fetch(url.href, { cache: "no-store" });
        issuerDirectoryCache = response.ok ? await response.json() : [];
      } catch (_err) {
        issuerDirectoryCache = [];
      }
      return issuerDirectoryCache;
    })();
    try {
      return await issuerDirectoryPromise;
    } finally {
      issuerDirectoryPromise = null;
    }
  }
  async function issuerIdForName(issuer) {
    const direct = digitsOnly(issuer);
    if (direct) return direct;
    const override = issuerIdOverride(issuer);
    if (override) return override;
    const directory = await loadIssuerDirectory();
    return directory
      .map((entry) => ({ entry, score: issuerEntryScore(entry, issuer) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)[0]?.entry?.id || "";
  }
  // ========================= LISTAS =================================
  function formatDateBr(date) {
    return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
  }
  function isNoFraudDecision(decision) { return normalize(decision) === "NAO FRAUDE"; }
  function isContainmentRule(rule) {
    const text = normalize(rule);
    return text.includes("CONTENCAO") || text.includes("CONTENSAO");
  }
  function isCashoutRule(rule) {
    const text = normalize(rule).replace(/[^A-Z0-9]+/g, "_");
    return text.includes("ISPB");
  }
  function hasBlockingOrSpdStatus(data) {
    const accountStatus = normalize(data?.accountStatus);
    const personStatus = normalize(data?.fields?.personStatus);
    const spdHistory = normalize(data?.fields?.spdHistory);
    const blockedAccount = accountStatus && !["NORMAL", "ATIVA", "ATIVO"].includes(accountStatus);
    const spdStatus = [accountStatus, personStatus, spdHistory].some((value) => /\bSPD\s*\d+\b/.test(value));
    return blockedAccount || spdStatus;
  }
  function isContaSimplesIssuer(data) {
    const issuerId = digitsOnly(data?.issuerId);
    const issuer = normalize(data?.issuer).replace(/[^A-Z0-9]/g, "");
    return issuerId === "155" || issuer.includes("CONTASIMPLES");
  }
  function isJiraCase(data) {
    const enabled = (value) => value === true || ["1", "TRUE", "ON", "SIM", "LIGADO"].includes(normalize(value));
    const jiraReference = normalize(data?.jiraReference || data?.fields?.jiraReference);
    return enabled(data?.jiraActive)
      || enabled(data?.fields?.jiraActive)
      || /(?:SERVICOS?|INCIDENTES?)[\s_-]*\d+/.test(jiraReference);
  }
  function hasRecentContaSimplesRegistration(data) {
    return isContaSimplesIssuer(data) && isRecentRegistration(data?.registrationDate);
  }
  function listTypesFor(data) {
    if (normalize(data.flow) !== "BANKING" || normalize(data.visualFlow) === "HOLD") {
      return { allowlist: false, contencao: false, cashout: false };
    }
    const jira = isJiraCase(data);
    const cashout = isCashoutRule(data.falcon?.rule);
    const allowlist = cashout || jira || (!hasBlockingOrSpdStatus(data) && !hasRecentContaSimplesRegistration(data));
    return {
      allowlist,
      contencao: isContainmentRule(data.falcon?.rule),
      cashout
    };
  }
  function listExpiryDays(item, listType) {
    const issuer = normalize(item?.issuer);
    if (issuer.includes("ONLYPAY")) return 5;
    if (issuer.includes("SOFISA") && listType === "contencao") return 3;
    return 2;
  }

  let listMutationChain = Promise.resolve();
  let activeListTabSession = "allowlist";
  const LIST_TYPES = Object.freeze(["allowlist", "contencao", "cashout"]);
  function enqueueListMutation(task) {
    const run = listMutationChain.catch(() => undefined).then(task);
    listMutationChain = run.catch(() => undefined);
    return run;
  }
  async function waitForListMutations() {
    await listMutationChain.catch(() => undefined);
  }
  function listItemKey(item, listType = "") {
    const type = listType || (item?.lists?.contencao ? "contencao" : item?.lists?.cashout ? "cashout" : "allowlist");
    const caseKey = alnumOnly(item?.caseNumber);
    const subjectKey = type === "contencao"
      ? alnumOnly(item?.documentValue || item?.document || "")
      : alnumOnly(item?.account);
    return `${type.toUpperCase()}:${caseKey}:${subjectKey}`;
  }
  function splitPendingQueueEntries(item) {
    return LIST_TYPES.flatMap((listType) => {
      if (!item?.lists?.[listType] || item?.applied?.[listType]) return [];
      return [{
        ...item,
        id: `${String(item?.id || listItemKey(item, listType)).replace(/:(allowlist|contencao|cashout)$/i, "")}:${listType}`,
        lists: Object.fromEntries(LIST_TYPES.map((type) => [type, type === listType])),
        applied: Object.fromEntries(LIST_TYPES.map((type) => [type, type !== listType]))
      }];
    });
  }
  function validPendingListItems(items) {
    const byKey = new Map();
    (Array.isArray(items) ? items : []).flatMap(splitPendingQueueEntries).forEach((item) => {
      if (!item || Date.now() - Number(item.savedAt || 0) >= EXECUTION_TTL_MS) return;
      const pendingAllowlist = item.lists?.allowlist && !item.applied?.allowlist;
      const pendingContencao = item.lists?.contencao && !item.applied?.contencao;
      const pendingCashout = item.lists?.cashout && !item.applied?.cashout;
      if (!pendingAllowlist && !pendingContencao && !pendingCashout) return;
      const keyValue = listItemKey(item);
      const previous = byKey.get(keyValue);
      if (!previous || Number(item.updatedAt || item.savedAt || 0) >= Number(previous.updatedAt || previous.savedAt || 0)) {
        byKey.set(keyValue, item);
      }
    });
    return Array.from(byKey.values())
      .sort((a, b) => Number(b.updatedAt || b.savedAt || 0) - Number(a.updatedAt || a.savedAt || 0))
      .slice(0, 300);
  }
  async function readListQueue(options = {}) {
    if (options.waitForPending !== false) await waitForListMutations();
    memory.state?.get?.() || memory.mergeCurrentMirrors?.();
    const merged = validPendingListItems(memory.lists.all());
    memory.lists.reconcile(validPendingListItems(merged));
    return validPendingListItems(memory.lists.all());
  }
  function hasPendingListApplication(item) {
    return LIST_TYPES.some((listType) => item?.lists?.[listType] && !item?.applied?.[listType]);
  }
  function pendingListType(item) {
    return LIST_TYPES.find((listType) => item?.lists?.[listType] && !item?.applied?.[listType])
      || (item?.lists?.contencao ? "contencao" : item?.lists?.cashout ? "cashout" : "allowlist");
  }
  async function writeListQueue(list) {
    const expected = validPendingListItems(list);
    memory.lists.reconcile(expected);
    let persisted = validPendingListItems(memory.lists.all());
    const missing = expected.filter((item) => {
      const listType = pendingListType(item);
      return !persisted.some((entry) => listItemKey(entry, listType) === listItemKey(item, listType));
    });
    // Confirma individualmente qualquer item que não tenha persistido no lote.
    if (missing.length) {
      missing.forEach((item) => memory.lists.upsert(item));
      memory.mergeCurrentMirrors?.();
      persisted = validPendingListItems(memory.lists.all());
    }
    return persisted;
  }
  function listIdentityToken(value) {
    const token = alnumOnly(value);
    return ["", "NA", "NULL", "UNDEFINED", "AUSENCIADEDADOS"].includes(token) ? "" : token;
  }
  function sameCaseIdentity(item, data) {
    const itemCase = listIdentityToken(item?.caseNumber);
    const dataCase = listIdentityToken(data?.falcon?.caseNumber);
    if (itemCase && dataCase) return itemCase === dataCase;
    const itemAccount = listIdentityToken(item?.account);
    const dataAccount = listIdentityToken(data?.account);
    return Boolean(itemAccount && dataAccount && itemAccount === dataAccount);
  }
  function sameCompositeListIdentity(item, data, listType) {
    const caseKey = alnumOnly(data?.falcon?.caseNumber);
    const subjectKey = listType === "contencao"
      ? alnumOnly(documentFieldValue(data?.cpfCnpj))
      : alnumOnly(data?.account);
    return listItemKey(item, listType) === `${listType.toUpperCase()}:${caseKey}:${subjectKey}`;
  }
  function markCurrentCaseListsDone(queue, data) {
    const currentItems = queue.filter((item) => sameCaseIdentity(item, data));
    currentItems.forEach((item) => {
      if (item.lists?.allowlist) memory.lists.markDone?.(item, "allowlist");
      if (item.lists?.contencao) memory.lists.markDone?.(item, "contencao");
      if (item.lists?.cashout) memory.lists.markDone?.(item, "cashout");
    });
    return queue.filter((item) => !sameCaseIdentity(item, data));
  }
  function nextListRevision(queue = []) {
    const tombstones = memory.lists.tombstones?.() || [];
    const latestItem = queue.reduce((latest, item) => Math.max(latest, Number(item?.updatedAt || item?.savedAt || 0)), 0);
    const latestRemoval = tombstones.reduce((latest, item) => Math.max(latest, Number(item?.removedAt || 0)), 0);
    return Math.max(Date.now(), latestItem, latestRemoval) + 1;
  }
  function listItemsForDecision(data, lists, savedAt) {
    const issuerId = data.issuerId || issuerIdOverride(data.issuer) || digitsOnly(data.issuer) || "";
    const account = clean(data.account, "");
    const documentValue = documentFieldValue(data.cpfCnpj);
    const baseItem = {
      caseNumber: data.falcon?.caseNumber || "N/A",
      issuer: clean(data.issuer, "N/A"),
      account,
      documentValue,
      sourceFlow: data.flow,
      visualFlow: data.visualFlow,
      treatmentKind: data.treatmentKind || "brasil",
      issuerId,
      savedAt,
      updatedAt: savedAt
    };
    return [
      ...(lists.allowlist ? [{
        ...baseItem,
        id: `allowlist:${alnumOnly(baseItem.caseNumber)}:${alnumOnly(account)}`,
        lists: { allowlist: true, contencao: false, cashout: false },
        applied: { allowlist: false, contencao: true, cashout: true }
      }] : []),
      ...(lists.contencao ? [{
        ...baseItem,
        id: `contencao:${alnumOnly(baseItem.caseNumber)}:${alnumOnly(documentValue)}`,
        lists: { allowlist: false, contencao: true, cashout: false },
        applied: { allowlist: true, contencao: false, cashout: true }
      }] : []),
      ...(lists.cashout ? [{
        ...baseItem,
        id: `cashout:${alnumOnly(baseItem.caseNumber)}:${alnumOnly(account)}`,
        lists: { allowlist: false, contencao: false, cashout: true },
        applied: { allowlist: true, contencao: true, cashout: false }
      }] : [])
    ];
  }
  function stageListsForFinalDecision(data, decision) {
    memory.mergeCurrentMirrors?.();
    const queue = validPendingListItems(memory.lists.all());
    const withoutCurrentCase = markCurrentCaseListsDone(queue, data);
    if (!isNoFraudDecision(decision)) {
      return validPendingListItems(memory.lists.reconcile(withoutCurrentCase));
    }
    const lists = listTypesFor(data);
    if (!lists.allowlist && hasRecentContaSimplesRegistration(data) && !isJiraCase(data)) {
      showNotice("Conta Simples com menos de 90 dias não entra em LISTAS sem JIRA.", "warn", 12000);
    }
    if (!lists.allowlist && hasBlockingOrSpdStatus(data) && !isJiraCase(data)) {
      showNotice("Conta bloqueada ou com SPD: o caso não foi adicionado à permissiva.", "warn", 10000);
    }
    if (!lists.allowlist && !lists.contencao && !lists.cashout) {
      return validPendingListItems(memory.lists.reconcile(withoutCurrentCase));
    }
    const savedAt = nextListRevision(queue);
    const listItems = listItemsForDecision(data, lists, savedAt);
    if (!clean(data.account, "")) {
      showNotice("Caso guardado em LISTAS, mas falta o ID da conta para concluir a inclusão.", "warn", 12000);
    }
    if (lists.contencao && !documentFieldValue(data.cpfCnpj)) {
      showNotice("Caso guardado nas abas elegíveis, mas falta CPF/CNPJ para concluir a Contenção.", "warn", 12000);
    }
    let persisted = validPendingListItems(memory.lists.reconcile([...listItems, ...withoutCurrentCase]));
    listItems.forEach((item) => {
      const listType = pendingListType(item);
      const found = persisted.some((entry) => sameCompositeListIdentity(entry, data, listType));
      if (!found) memory.lists.upsert(item);
    });
    persisted = validPendingListItems(memory.lists.all());
    return persisted;
  }
  async function updateListsForFinalDecision(data, decision, stagedQueue = null) {
    return enqueueListMutation(async () => {
      const persisted = validPendingListItems(stagedQueue || stageListsForFinalDecision(data, decision));
      if (!isNoFraudDecision(decision)) return persisted;
      const lists = listTypesFor(data);
      const expectedTypes = LIST_TYPES.filter((listType) => lists[listType]);
      const confirmed = expectedTypes.every((listType) => persisted.some((entry) => (
        sameCompositeListIdentity(entry, data, listType)
        && entry.lists?.[listType]
        && !entry.applied?.[listType]
      )));
      if (!confirmed) throw new Error("LISTAS_PERSISTENCE_NOT_CONFIRMED");
      return persisted;
    });
  }
  function hotlistInputs() {
    return all("input,textarea").filter((field) => {
      if (field.disabled || field.readOnly) return false;
      const type = String(field.type || "").toLowerCase();
      if (["hidden", "button", "submit", "checkbox", "radio", "image"].includes(type)) return false;
      return /hotlisrEditorGridView|gridItemNameInput|hotlist|allow|list|client|case|conta|account|documento|cpf|cnpj/i.test(field.id || field.name || "");
    });
  }
  function listRowIndex(element) {
    const descriptor = `${element?.id || ""} ${element?.name || ""}`;
    const match = descriptor.match(/(?:gridItemNameInput\d*|itemValueInput\d*|commentInput\d*|activeHeaderInput\d*|activeFromInput\d*|activeToInput\d*|clientIdInput)_(\d+)/i);
    return match ? Number(match[1]) : null;
  }
  function listRowInputs(rowIndex, selector = "input,textarea") {
    return all(selector).filter((field) => listRowIndex(field) === rowIndex);
  }
  function exactListControl(base, rowIndex, selector = "input,textarea,select") {
    const candidates = [
      `f33:hotlisrEditorGridView:${base}_${rowIndex}`,
      `f33:hotlisrEditorGridView:${base}1_${rowIndex}`,
      `f33:hotlisrEditorGridView:${base}Input_${rowIndex}`,
      `f33:hotlisrEditorGridView:${base}Input1_${rowIndex}`
    ];
    for (const id of candidates) {
      const node = byId(id);
      if (!node) continue;
      if (node.matches?.(selector)) return node;
      const inner = node.querySelector?.(selector);
      if (inner) return inner;
    }
    return candidates.map((id) => byId(`${id}_dctxt`)).find((node) => node?.matches?.(selector))
      || all(selector).find((field) => listRowIndex(field) === rowIndex && new RegExp(base, "i").test(`${field.id || ""} ${field.name || ""}`));
  }
  function nextEmptyListRow() {
    const fields = hotlistInputs().filter((input) => /gridItemNameInput|itemValueInput|itemName|nameInput/i.test(input.id || input.name || ""));
    const indices = Array.from(new Set(fields.map(listRowIndex).filter(Number.isInteger))).sort((a, b) => a - b);
    return indices.find((index) => {
      const name = listRowInputs(index).find((input) => /gridItemNameInput|itemName|nameInput/i.test(input.id || input.name || ""));
      const value = listRowInputs(index).find((input) => /itemValueInput|valueInput/i.test(input.id || input.name || ""));
      const identifiers = listRowInputs(index).filter((input) => /gridItemNameInput|itemValueInput|itemName|nameInput|valueInput/i.test(input.id || input.name || ""));
      const emptyIdentifiers = identifiers.filter((input) => !String(input.value || "").trim());
      return Boolean((name && value && !String(name.value || "").trim() && !String(value.value || "").trim()) || emptyIdentifiers.length >= 2);
    });
  }
  function fillListDateField(kind, rowIndex, date) {
    const field = exactListControl(`${kind}1`, rowIndex) || exactListControl(kind, rowIndex)
      || listRowInputs(rowIndex).find((input) => new RegExp(kind, "i").test(input.id || input.name || ""));
    if (!field) return false;
    const value = formatDateBr(date);
    setNativeValue(field, value);
    try {
      const id = field.id || "";
      const hiddenId = id.replace("_dctxt", "_dchdn");
      if (typeof window.setValue === "function" && id) window.setValue(id, hiddenId);
      const hidden = byId(hiddenId);
      if (hidden && !String(hidden.value || "").trim()) setNativeValue(hidden, value, { allowEmpty: true });
    } catch (_err) {}
    return fieldValueMatches(field, value);
  }
  function fillFirstMatchingInput(patterns, value) {
    return fillMatchingInputs(patterns, value, 1) > 0;
  }
  function fillMatchingInputs(patterns, value, limit = 1, rowIndex = null) {
    if (isMissing(value)) return 0;
    let filled = 0;
    const fields = hotlistInputs().filter((field) => rowIndex === null || listRowIndex(field) === rowIndex);
    for (const field of fields) {
      const descriptor = `${field.id || ""} ${field.name || ""} ${field.placeholder || ""}`;
      if (!patterns.some((pattern) => pattern.test(descriptor))) continue;
      if (setNativeValue(field, value)) filled += 1;
      if (filled >= limit) break;
    }
    return filled;
  }
  function fillFallbackInfoInputs(values, rowIndex) {
    const dateIds = /activeFromInput|activeToInput|dctxt|dchdn/i;
    const used = new Set();
    const fields = listRowInputs(rowIndex).filter((input) => !dateIds.test(input.id || "") && !/clientIdInput|activeHeaderInput/i.test(input.id || "") && !input.dataset.sacListFilled);
    values.forEach((value) => {
      const field = fields.find((input) => !used.has(input));
      if (field) {
        setNativeValue(field, value);
        used.add(field);
      }
    });
    return used.size;
  }
  function listInfoInputs(rowIndex) {
    const excluded = /activeFromInput|activeToInput|dctxt|dchdn|clientIdInput/i;
    const preferred = /gridItemNameInput|itemValueInput|itemName|nameInput|valueInput|activeHeaderInput|commentInput|comments|observ/i;
    return listRowInputs(rowIndex)
      .filter((input) => !excluded.test(`${input.id || ""} ${input.name || ""}`))
      .filter((input) => preferred.test(`${input.id || ""} ${input.name || ""} ${input.placeholder || ""}`));
  }
  function fillListIdentifierInputs(value, rowIndex) {
    const exactFields = [
      exactListControl("gridItemNameInput", rowIndex),
      exactListControl("itemValueInput", rowIndex)
    ].filter(Boolean);
    const fields = (exactFields.length >= 2 ? exactFields : listInfoInputs(rowIndex).filter((input) => /gridItemNameInput|itemValueInput|itemName|nameInput|valueInput/i.test(input.id || input.name || "")).slice(0, 2));
    let count = 0;
    fields.forEach((field) => {
      if (setNativeValue(field, value)) {
        field.dataset.sacListFilled = "identifier";
        count += 1;
      }
    });
    return count;
  }
  function fillListCaseInput(value, rowIndex) {
    const exactComment = exactListControl("commentInput", rowIndex);
    const fields = exactComment ? [exactComment] : listRowInputs(rowIndex).filter((input) => /commentInput|comments|observ|activeHeaderInput|case|caso/i.test(`${input.id || ""} ${input.name || ""} ${input.placeholder || ""}`) && !input.dataset.sacListFilled);
    const fallback = listInfoInputs(rowIndex).find((input) => !input.dataset.sacListFilled);
    const field = fields[0];
    const target = field || fallback;
    if (!target || !setNativeValue(target, value)) return 0;
    target.dataset.sacListFilled = "case";
    return 1;
  }
  function fillListActiveStatus(rowIndex) {
    const select = exactListControl("activeHeaderInput", rowIndex, "select");
    if (!select) return false;
    const option = all("option", select).find((candidate) => optionExactMatches(candidate, "Active") || optionExactMatches(candidate, "Ativo"))
      || all("option", select).find((candidate) => normalize(candidate.value) === "ACTIVE" || normalize(candidate.textContent) === "ATIVO");
    return option ? applySelectValue(select, option) : setNativeValue(select, "Active");
  }
  async function applyIssuerToAllowlist(issuerId, rowIndex) {
    if (!issuerId) return false;
    const issuerPattern = /clientIdInput|emissor|issuer|client|codigo|c[oó]digo/i;
    const select = all("select").find((item) => listRowIndex(item) === rowIndex && issuerPattern.test(`${item.id || ""} ${item.name || ""}`))
      || byId(`f33:hotlisrEditorGridView:clientIdInput_${rowIndex}`)
      || all("select").find((item) => issuerPattern.test(`${item.id || ""} ${item.name || ""}`));
    if (select) {
      const targetId = normalize(issuerId);
      const option = all("option", select).find((opt) => normalize(opt.value) === targetId || normalize(opt.textContent) === targetId)
        || all("option", select).find((opt) => optionExactMatches(opt, issuerId))
        || all("option", select).find((opt) => targetId.length >= 2 && normalize(opt.value).includes(targetId));
      if (option) {
        applySelectValue(select, option);
        return true;
      }
    }
    const rowInput = listRowInputs(rowIndex).find((input) => issuerPattern.test(`${input.id || ""} ${input.name || ""}`));
    return setNativeValue(rowInput, issuerId)
      || fillById(`f33:hotlisrEditorGridView:clientIdInput_${rowIndex}`, issuerId)
      || fillFirstMatchingInput([/clientIdInput/i, /emissor/i, /issuer/i, /codigo|c[oó]digo/i], issuerId);
  }
  function listIdentifier(item, listType) {
    return clean(listType === "contencao" ? item.documentValue : item.account, "");
  }
  function listLabel(listType) {
    if (listType === "contencao") return "Contenção";
    if (listType === "cashout") return "Cashout";
    return "Allowlist";
  }
  async function applyListItem(item, listType) {
    hotlistInputs().forEach((field) => delete field.dataset.sacListFilled);
    const rowIndex = nextEmptyListRow();
    if (!Number.isInteger(rowIndex)) return { ok: false, missing: ["Linha vazia para inclusão"] };
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + listExpiryDays(item, listType));
    const missing = [];
    if (!fillListDateField("activeFromInput", rowIndex, today)) missing.push("Data inicial");
    if (!fillListDateField("activeToInput", rowIndex, endDate)) {
      const dateFields = listRowInputs(rowIndex).filter((input) => /activeToInput|activeUntil|activeEnd|toInput/i.test(input.id || input.name || ""));
      if (!dateFields.some((field) => setNativeValue(field, formatDateBr(endDate)))) missing.push("Data final");
    }
    const identifier = listIdentifier(item, listType);
    const explicitIdentifierCount = fillListIdentifierInputs(identifier, rowIndex);
    const identifierPatterns = listType === "contencao" ? [/documento/i, /cpf|cnpj/i, /tax/i] : [/conta/i, /account/i];
    const identifierDirectCount = explicitIdentifierCount || fillMatchingInputs(identifierPatterns, identifier, 2, rowIndex);
    const caseDirectCount = fillListCaseInput(item.caseNumber, rowIndex)
      || fillMatchingInputs([/caso/i, /case/i, /ocorrencia/i, /observ/i, /descr/i], item.caseNumber, 1, rowIndex);
    const missingIdentifierCount = Math.max(0, 2 - identifierDirectCount);
    const missingCaseCount = caseDirectCount ? 0 : 1;
    const fallbackValues = [
      ...Array.from({ length: missingIdentifierCount }, () => identifier),
      ...Array.from({ length: missingCaseCount }, () => item.caseNumber)
    ].filter(Boolean);
    const fallbackCount = fallbackValues.length ? fillFallbackInfoInputs(fallbackValues, rowIndex) : 0;
    const fallbackIdentifierCount = Math.min(fallbackCount, missingIdentifierCount);
    const fallbackCaseCount = Math.max(0, fallbackCount - missingIdentifierCount);
    const identifierApplied = identifierDirectCount + fallbackIdentifierCount >= 1;
    if (!identifierApplied) missing.push(listType === "contencao" ? "CPF/CNPJ" : "Conta");
    const secondIdentifierApplied = identifierDirectCount + fallbackIdentifierCount >= 2;
    if (!secondIdentifierApplied) missing.push(listType === "contencao" ? "Segundo CPF/CNPJ" : "Segunda conta");
    const caseApplied = caseDirectCount > 0 || fallbackCaseCount >= 1;
    if (!caseApplied) missing.push("Número do caso");
    if (!fillListActiveStatus(rowIndex)) missing.push("Status ativo");
    const issuerId = item.issuerId || await issuerIdForName(item.issuer);
    if (!await applyIssuerToAllowlist(issuerId, rowIndex)) missing.push("Emissor");
    try { if (typeof window.setDirty === "function") window.setDirty(); } catch (_err) {}
    await wait(30);
    return { ok: missing.length === 0, missing, rowIndex };
  }
  async function markListDone(id, listType) {
    return enqueueListMutation(async () => {
      const original = await readListQueue({ waitForPending: false });
      const target = original.find((item) => item.id === id);
      if (!target) return true;
      memory.lists.markDone?.(target, listType);
      const list = memory.lists.all().filter(hasPendingListApplication);
      await writeListQueue(list);
      const stillPending = (await readListQueue({ waitForPending: false })).some((item) => item.id === id && item.lists?.[listType] && !item.applied?.[listType]);
      return !stillPending;
    });
  }
  async function removeListItem(id, listType) {
    return markListDone(id, listType);
  }

  async function removeListIssuerGroup(issuerKey, listType) {
    return enqueueListMutation(async () => {
      const queue = await readListQueue({ waitForPending: false });
      const targets = queue.filter((item) => normalize(item.issuer) === issuerKey && item.lists?.[listType] && !item.applied?.[listType]);
      targets.forEach((item) => memory.lists.markDone?.(item, listType));
      await writeListQueue(memory.lists.all().filter(hasPendingListApplication));
      const remaining = await readListQueue({ waitForPending: false });
      return { ok: !remaining.some((item) => targets.some((target) => target.id === item.id) && item.lists?.[listType] && !item.applied?.[listType]), count: targets.length };
    });
  }
  function listTabFromFalconPage() {
    const dropdown = byId("f33:hotlist_DropDown");
    const selectedText = normalize(dropdown?.selectedOptions?.[0]?.textContent || dropdown?.value || "");
    if (selectedText.includes("CASHOUT_LIMITE_ISPB_CRYPTO")) return "cashout";
    if (selectedText.includes("CONTENCAO")) return "contencao";
    if (selectedText.includes("ALLOWLIST")) return "allowlist";
    return "";
  }
  function listEditableField(label, listType) {
    const normalized = normalize(label);
    if (normalized === "EMISSOR") return "issuer";
    if (normalized === "ID CONTA" && ["allowlist", "cashout"].includes(listType)) return "account";
    if (normalized === "CPF/CNPJ" && listType === "contencao") return "documentValue";
    if (normalized === "NUMERO DO CASO") return "caseNumber";
    if (normalized === "ID EMISSOR") return "issuerId";
    return "";
  }
  function editedListItem(item, listType, field, value) {
    const updatedAt = nextListRevision([item]);
    const next = {
      ...item,
      [field]: field === "documentValue" ? alnumOnly(value) : clean(value, ""),
      savedAt: updatedAt,
      updatedAt
    };
    if (field === "issuer") next.issuerId = "";
    const caseKey = listIdentityToken(next.caseNumber);
    const subjectKey = listType === "contencao" ? listIdentityToken(next.documentValue) : listIdentityToken(next.account);
    next.id = `${listType}:${caseKey}:${subjectKey}:${listType}`;
    return next;
  }
  function enableListGridEditing(panel) {
    enableGridCopy(panel);
    panel.addEventListener("dblclick", (event) => {
      const cell = event.target.closest(".sac-kv");
      const itemElement = event.target.closest("[data-list-id]");
      if (!cell || !itemElement || cell.querySelector("input")) return;
      if (getSafeMode()) {
        showNotice("Desligue o modo seguro para editar este item de LISTAS.", "warn");
        return;
      }
      const listType = itemElement.dataset.listType;
      const field = listEditableField(textOf(cell.querySelector(".sac-kv-label")), listType);
      if (!field) return;
      const valueNode = cell.querySelector(".sac-kv-value");
      const input = document.createElement("input");
      input.value = isMissing(valueNode?.textContent) ? "" : textOf(valueNode);
      input.style.cssText = "width:100%;height:25px;border:1px solid var(--sac-border);border-radius:4px;background:var(--sac-input);color:var(--sac-text);font-weight:850";
      valueNode.replaceChildren(input);
      input.focus();
      let committed = false;
      const save = async () => {
        if (committed) return;
        committed = true;
        const queue = await readListQueue();
        const target = queue.find((entry) => entry.id === itemElement.dataset.listId);
        if (!target) return renderLists(listType);
        memory.lists.markDone?.(target, listType);
        const edited = editedListItem(target, listType, field, input.value.trim());
        const remaining = queue.filter((entry) => entry.id !== target.id);
        await writeListQueue([edited, ...remaining]);
        showNotice("Item de LISTAS atualizado.", "success");
        return renderLists(listType);
      };
      input.addEventListener("keydown", (keyEvent) => {
        if (keyEvent.key === "Enter") save();
        if (keyEvent.key === "Escape") {
          committed = true;
          valueNode.textContent = input.defaultValue || "N/A";
        }
      });
      input.addEventListener("blur", save, { once: true });
    });
  }
  async function renderLists(activeTab = "") {
    closePidPanel();
    closeSidePanels();
    activeTab = activeTab || listTabFromFalconPage() || activeListTabSession;
    activeTab = LIST_TYPES.includes(activeTab) ? activeTab : "allowlist";
    activeListTabSession = activeTab;
    // A memória já reconciliou os espelhos e o envelope no início da execução.
    const queue = await readListQueue();
    const items = await Promise.all(queue.map(async (item) => ({ ...item, issuerId: item.issuerId || await issuerIdForName(item.issuer) })));
    const visible = items
      .filter((item) => item.lists?.[activeTab] && !item.applied?.[activeTab])
      .sort((left, right) => clean(left.issuer, "").localeCompare(clean(right.issuer, ""), "pt-BR", { sensitivity: "base" })
        || Number(left.savedAt || 0) - Number(right.savedAt || 0));
    const groups = new Map();
    visible.forEach((item) => {
      const keyValue = normalize(item.issuer) || "SEM EMISSOR";
      if (!groups.has(keyValue)) groups.set(keyValue, { issuer: clean(item.issuer, "Sem emissor"), items: [] });
      groups.get(keyValue).items.push(item);
    });
    const listItemHtml = (item) => `
      <div class="sac-allowlist-item" data-list-id="${escapeHtml(item.id)}" data-list-type="${escapeHtml(activeTab)}">
        <div class="sac-allowlist-row">
          ${kvNoHelp("Emissor", item.issuer)}
          ${kvNoHelp(activeTab === "contencao" ? "CPF/CNPJ" : "Id Conta", listIdentifier(item, activeTab))}
          ${kvNoHelp("Número do caso", item.caseNumber)}
          ${kvNoHelp("ID emissor", item.issuerId || "N/A")}
        </div>
        <div class="sac-allowlist-actions">
          <button data-list-apply>INSERIR</button>
          <button data-list-remove>REMOVER</button>
        </div>
      </div>`;
    const groupedHtml = Array.from(groups.entries()).map(([issuerKey, group]) => `
      <div class="sac-list-issuer-group">
        <div class="sac-list-issuer-head"><strong>${escapeHtml(group.issuer)} · ${group.items.length} caso${group.items.length === 1 ? "" : "s"}</strong><div class="sac-list-group-actions"><button data-list-apply-issuer="${escapeHtml(issuerKey)}">INSERIR GRUPO</button><button data-list-remove-issuer="${escapeHtml(issuerKey)}">EXCLUIR GRUPO</button></div></div>
        ${group.items.map(listItemHtml).join("")}
      </div>`).join("");
    const body = section("Listas", `
      <div class="sac-list-tabs">
        <button class="${activeTab === "allowlist" ? "active" : ""}" data-list-tab="allowlist">ALLOWLIST (${items.filter((item) => item.lists?.allowlist && !item.applied?.allowlist).length})</button>
        <button class="${activeTab === "contencao" ? "active" : ""}" data-list-tab="contencao">CONTENÇÃO (${items.filter((item) => item.lists?.contencao && !item.applied?.contencao).length})</button>
        <button class="${activeTab === "cashout" ? "active" : ""}" data-list-tab="cashout">CASHOUT (${items.filter((item) => item.lists?.cashout && !item.applied?.cashout).length})</button>
      </div>
      <div class="sac-allowlist-list">
        ${visible.length ? groupedHtml : `<div class="sac-history-empty">Nenhum caso pendente nesta aba.</div>`}
      </div>
    `, "pendentes");
    const panel = renderPanel({
      id: "sac-panel-listas",
      stage: "LISTAS",
      flow: "banking",
      subtitle: "Allowlist, Contenção e Cashout",
      body
    });
    enableListGridEditing(panel);
    panel.addEventListener("click", async (event) => {
      const tab = event.target.closest("[data-list-tab]");
      if (tab) return renderLists(tab.dataset.listTab);
      const issuerRemove = event.target.closest("[data-list-remove-issuer]");
      if (issuerRemove) {
        issuerRemove.disabled = true;
        const result = await removeListIssuerGroup(issuerRemove.dataset.listRemoveIssuer, activeTab);
        if (!result.ok) {
          showNotice("Não consegui confirmar a exclusão do grupo na memória de LISTAS.", "error", 15000);
          return renderLists(activeTab);
        }
        showNotice(`${result.count} caso${result.count === 1 ? "" : "s"} removido${result.count === 1 ? "" : "s"} deste grupo.`, "warn");
        return renderLists(activeTab);
      }
      const issuerBatch = event.target.closest("[data-list-apply-issuer]");
      if (issuerBatch) {
        issuerBatch.disabled = true;
        const queueNow = await readListQueue();
        const targets = queueNow.filter((item) => normalize(item.issuer) === issuerBatch.dataset.listApplyIssuer && item.lists?.[activeTab] && !item.applied?.[activeTab]);
        let completed = 0;
        for (const target of targets) {
          const result = await applyListItem(target, activeTab);
          if (!result.ok) {
            issuerBatch.disabled = false;
            showNotice(`O lote parou no caso ${target.caseNumber}: ${result.missing.join(", ")}.`, "error", 15000);
            return renderLists(activeTab);
          }
          if (!await markListDone(target.id, activeTab)) {
            issuerBatch.disabled = false;
            showNotice(`O caso ${target.caseNumber} foi aplicado, mas a memória não confirmou sua baixa.`, "error", 15000);
            return renderLists(activeTab);
          }
          completed += 1;
        }
        if (!completed) {
          issuerBatch.disabled = false;
          return renderLists(activeTab);
        }
        showNotice(`${completed} caso${completed === 1 ? "" : "s"} do emissor foram inseridos.`, "success");
        return renderLists(activeTab);
      }
      const itemEl = event.target.closest("[data-list-id]");
      if (!itemEl) return;
      const id = itemEl.dataset.listId;
      const listType = itemEl.dataset.listType;
      const item = (await readListQueue()).find((entry) => entry.id === id);
      if (!item) return;
      if (event.target.closest("[data-list-remove]")) {
        if (!await removeListItem(id, listType)) {
          showNotice("Não consegui confirmar a remoção na memória de LISTAS. O item foi mantido.", "error", 14000);
          return renderLists(listType);
        }
        showNotice(`Item removido da aba ${listLabel(listType)}.`, "warn");
        return renderLists(listType);
      }
      if (event.target.closest("[data-list-apply]")) {
        const result = await applyListItem(item, listType);
        if (!result.ok) {
          showNotice(`Não consegui inserir ainda: ${result.missing.join(", ")}. Confira a página e tente novamente.`, "error");
          return;
        }
        if (!await markListDone(id, listType)) {
          showNotice("Os campos foram aplicados, mas a memória não confirmou a remoção. O item continuará em LISTAS.", "error", 14000);
          return renderLists(listType);
        }
        showNotice(`${listLabel(listType)} preenchida. Removi o caso desta aba.`, "success");
        return renderLists(listType);
      }
    });
  }

  // ========================= HISTÓRICO ===============================
  function readHistory() {
    memory.mergeCurrentMirrors?.();
    return memory.history.all();
  }
  function addHistory(data, decision, tabulation) {
    const caseNumber = data.falcon?.caseNumber || "N/A";
    const account = clean(data.account, "N/A");
    const identity = `${alnumOnly(caseNumber)}:${alnumOnly(account)}`;
    const item = {
      id: `case:${identity}`,
      caseNumber,
      issuer: clean(data.issuer, "N/A"),
      account,
      flow: data.visualFlow || data.flow,
      decision,
      tabulation: redactSensitiveDocuments(tabulation),
      savedAt: Date.now()
    };
    return memory.history.upsert(item);
  }
  async function renderHistory() {
    ensureStyles();
    await memory.hydrateFromClipboard();
    closeSidePanels();
    const previousHistory = byId("sac-history-panel");
    previousHistory?.__sacDragDispose?.();
    previousHistory?.remove();
    const panel = document.createElement("div");
    panel.id = "sac-history-panel";
    panel.className = `sac-history-panel sac-${getTheme()}`;
    panel.style.setProperty("--sac-history-tone", "#64748b");
    panel.style.setProperty("--sac-font-scale", String(getFontScale()));
    const history = readHistory();
    const issuerOptions = Array.from(new Set(history.map((item) => clean(item.issuer, "")).filter(Boolean)))
      .sort((left, right) => left.localeCompare(right, "pt-BR"));
    panel.innerHTML = `
      <div class="sac-history-head"><span>Histórico</span><button class="sac-icon close" data-close>×</button></div>
      <div class="sac-history-tools">
        <input data-history-search placeholder="Pesquisar caso ou conta" />
        <select data-history-flow>
          <option value="">Todos os fluxos</option>
          <option value="banking">BANKING</option>
          <option value="card">CARTÃO</option>
          <option value="hold">HOLD</option>
        </select>
        <select data-history-issuer>
          <option value="">Todos os emissores</option>
          ${issuerOptions.map((issuer) => `<option value="${escapeHtml(issuer)}">${escapeHtml(issuer)}</option>`).join("")}
        </select>
        <select data-history-decision>
          <option value="">Todas as decisões</option>
          ${DECISIONS.map((decision) => `<option value="${escapeHtml(decision)}">${escapeHtml(decision)}</option>`).join("")}
        </select>
      </div>
      <div class="sac-history-body">
        <div class="sac-history-list"></div>
        <div class="sac-history-detail">
          <div class="sac-grid sac-history-identifiers">
            <div data-history-detail="caseNumber">${kvNoHelp("Número do caso", history[0]?.caseNumber || "N/A")}</div>
            <div data-history-detail="account">${kvNoHelp("ID da conta", history[0]?.account || "N/A")}</div>
          </div>
          <textarea class="sac-textarea" readonly>${escapeHtml(history[0]?.tabulation || "")}</textarea>
        </div>
      </div>
    `;
    document.body.appendChild(panel);
    enableDrag(panel, ".sac-history-head");
    enableGridCopy(panel);
    const listEl = panel.querySelector(".sac-history-list");
    const detailEl = panel.querySelector("textarea");
    const queryEl = panel.querySelector("[data-history-search]");
    const flowEl = panel.querySelector("[data-history-flow]");
    const issuerEl = panel.querySelector("[data-history-issuer]");
    const decisionEl = panel.querySelector("[data-history-decision]");
    const showHistoryDetail = (item) => {
      detailEl.value = item?.tabulation || "";
      ["caseNumber", "account"].forEach((name) => {
        const value = item?.[name] || "N/A";
        const target = panel.querySelector(`[data-history-detail="${name}"] .sac-kv-value`);
        if (target) target.textContent = value;
      });
    };
    const filteredHistory = () => {
      const query = normalize(queryEl?.value || "");
      const flow = normalize(flowEl?.value || "");
      const issuer = normalize(issuerEl?.value || "");
      const decision = normalize(decisionEl?.value || "");
      return readHistory().filter((item) => {
        const text = normalize(`${item.caseNumber || ""} ${item.issuer || ""} ${item.account || ""}`);
        return (!flow || normalize(item.flow) === flow)
          && (!issuer || normalize(item.issuer) === issuer)
          && (!decision || normalize(item.decision) === decision)
          && (!query || text.includes(query));
      });
    };
    const historyLabel = (item) => {
      const flowLabel = (FLOW[item.flow] || FLOW.banking).label;
      return `<span>${escapeHtml(item.caseNumber || "N/A")}</span><small>${escapeHtml(item.issuer || "N/A")} · Conta ${escapeHtml(item.account || "N/A")} · ${escapeHtml(flowLabel)} · ${escapeHtml(item.decision || "N/A")}</small>`;
    };
    const refreshList = () => {
      const items = filteredHistory();
      listEl.innerHTML = items.length
        ? items.map((item, index) => `<button data-history-id="${escapeHtml(item.id)}" class="${index === 0 ? "active" : ""}">${historyLabel(item)}</button>`).join("")
        : `<div class="sac-history-empty">Nenhum histórico encontrado.</div>`;
      showHistoryDetail(items[0]);
    };
    refreshList();
    panel.querySelector("[data-close]")?.addEventListener("click", () => {
      panel.__sacDragDispose?.();
      panel.remove();
    });
    queryEl?.addEventListener("input", refreshList);
    flowEl?.addEventListener("change", refreshList);
    issuerEl?.addEventListener("change", refreshList);
    decisionEl?.addEventListener("change", refreshList);
    panel.querySelector(".sac-history-list")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-history-id]");
      if (!button) return;
      const item = readHistory().find((entry) => entry.id === button.dataset.historyId);
      if (!item) return;
      all("[data-history-id]", listEl).forEach((entry) => entry.classList.toggle("active", entry === button));
      showHistoryDetail(item);
    });
  }

  function detectStage() {
    if (mediaEngine.isBigDataPage?.(document) || mediaEngine.canScanPage(document)) return "bigdata";
    if (byId("f33:hotlisrEditorGridView:activeFromInput1_0_dctxt") || /hotlisrEditorGridView/i.test(bodyText())) return "listas";
    if (byId("txt_obs") || byId("ddl_status") || byId("ddl_tabulador")) return "tabulador";
    if (document.querySelector(".userGuide-company-menu") || document.querySelector(".account-data") || document.querySelector("[data-testid='column_0_0']")) return "console";
    return "falcon";
  }
  async function runStage(stage) {
    if (stage === "falcon") return renderFalcon();
    if (stage === "console") return renderConsole();
    if (stage === "tabulador") return renderTabulator();
    if (stage === "allowlist") return renderLists("allowlist");
    if (stage === "contencao" || stage === "contenção") return renderLists("contencao");
    if (stage === "cashout") return renderLists("cashout");
    if (stage === "listas") return renderLists();
    if (stage === "bigdata") return renderBigDataMedia();
    return runStage(detectStage());
  }

  await runStage(STAGE);
})();


