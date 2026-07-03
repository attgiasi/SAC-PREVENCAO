(async function SacPrevencaoV8() {
  "use strict";

  const APP = "sac_prevencao_v8_20260625";
  const BUILD = "ANALISE/V8";
  const BUILD_FAMILY = "8";
  const BUILD_VERSION = "8.15";
  const NOTICE_MS = 7600;
  const PACKAGE_TTL_MS = 12 * 60 * 60 * 1000;
  const EXECUTION_TTL_MS = 12 * 60 * 60 * 1000;
  const EXPORT_FALCON = "SAC_FALCON";
  const EXPORT_CONSOLE = "SAC_CONSOLE";
  const DEFAULT_SIGNATURE_NAME = "";
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
  const CARD_REVIEW = ["não", "sim", "autofinanciamento", "ausência de dados"];
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
    "Vencimento da fatura",
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
  const memory = window.SACMemoryV8;
  const tabulatorEngine = window.SACTabulatorV8;
  if (!memory || !tabulatorEngine) throw new Error("Motores da V8 não foram carregados.");
  await memory.hydrateFromClipboard();

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
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
  const cssEscape = (value) => window.CSS?.escape ? CSS.escape(String(value)) : String(value).replace(/["\\]/g, "\\$&");

  const SETTINGS_WINDOW_NAME_KEY = "__SAC_PREVENCAO_V8_SETTINGS__=";
  const SHARED_SETTING_NAMES = new Set([
    "activeBuild", "activeBuildFamily", "theme", "safeMode", "helpMode", "fontScale", "signatureName", "signatureSector",
    "flowTone:banking", "flowTone:card", "flowTone:hold"
  ]);
  const key = (name) => `${APP}:${name}`;
  function readSharedSettings() {
    try {
      const name = String(window.name || "");
      const index = name.indexOf(SETTINGS_WINDOW_NAME_KEY);
      if (index < 0) return {};
      return JSON.parse(decodeURIComponent(name.slice(index + SETTINGS_WINDOW_NAME_KEY.length).split("\n")[0])) || {};
    } catch (_err) {
      return {};
    }
  }
  function writeSharedSettings(settings) {
    try {
      const name = String(window.name || "");
      const cleanName = name.includes(SETTINGS_WINDOW_NAME_KEY)
        ? name.slice(0, name.indexOf(SETTINGS_WINDOW_NAME_KEY)).replace(/\n+$/, "")
        : name;
      const encoded = encodeURIComponent(JSON.stringify(settings || {}));
      window.name = `${cleanName}${cleanName ? "\n" : ""}${SETTINGS_WINDOW_NAME_KEY}${encoded}`;
      return true;
    } catch (_err) {
      return false;
    }
  }
  const storageGet = (name) => {
    const shared = SHARED_SETTING_NAMES.has(name) ? readSharedSettings()[name] : "";
    if (typeof shared === "string" && shared) return shared;
    try { return localStorage.getItem(key(name)) || sessionStorage.getItem(key(name)) || ""; }
    catch (_err) { return ""; }
  };
  const storageSet = (name, value) => {
    if (SHARED_SETTING_NAMES.has(name)) {
      const settings = readSharedSettings();
      settings[name] = String(value ?? "");
      writeSharedSettings(settings);
    }
    try { localStorage.setItem(key(name), value); }
    catch (_err) {
      try { sessionStorage.setItem(key(name), value); } catch (_err2) {}
    }
  };
  const storageRemove = (name) => {
    if (SHARED_SETTING_NAMES.has(name)) {
      const settings = readSharedSettings();
      delete settings[name];
      writeSharedSettings(settings);
    }
    try { localStorage.removeItem(key(name)); sessionStorage.removeItem(key(name)); } catch (_err) {}
  };
  const readJson = (name) => {
    try { return JSON.parse(storageGet(name) || "null"); } catch (_err) { return null; }
  };
  const writeJson = (name, value) => storageSet(name, JSON.stringify(value));
  const previousBuildFamily = storageGet("activeBuildFamily");
  if (previousBuildFamily && previousBuildFamily !== BUILD_FAMILY) {
    ["lastFalcon", "lastConsole"].forEach(storageRemove);
  }
  storageSet("activeBuildFamily", BUILD_FAMILY);
  storageSet("activeBuild", BUILD_VERSION);
  function clearPreviousRuntime() {
    all("[id^='sac-style'],.sac-panel,.sac-history-panel,.sac-choice-popover,.sac-side-panel,#sac-notices").forEach((node) => node.remove());
    if (window.__SAC_PREVENCAO_KEYS) document.removeEventListener("keydown", window.__SAC_PREVENCAO_KEYS);
    if (window.__SAC_PREVENCAO_V6_KEYS) document.removeEventListener("keydown", window.__SAC_PREVENCAO_V6_KEYS);
    if (window.__SAC_PREVENCAO_V7_KEYS) document.removeEventListener("keydown", window.__SAC_PREVENCAO_V7_KEYS);
    if (window.__SAC_PREVENCAO_V8_KEYS) document.removeEventListener("keydown", window.__SAC_PREVENCAO_V8_KEYS);
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
  function installTabulatorWriteGuard() {
    const guard = window.__SAC_TABULATOR_WRITE_GUARD__ || {};
    if (guard.installed) {
      window.__SAC_TABULATOR_DECISION_WRITE_ACTIVE__ = false;
      return;
    }
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
    window.__SAC_TABULATOR_WRITE_GUARD__ = {
      installed: true,
      input: patchValue(HTMLInputElement.prototype),
      textarea: patchValue(HTMLTextAreaElement.prototype),
      select: patchValue(HTMLSelectElement.prototype),
      option: optionDescriptor
    };
    window.__SAC_TABULATOR_DECISION_WRITE_ACTIVE__ = false;
  }
  installTabulatorWriteGuard();

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
    document.addEventListener("click", (event) => {
      const button = event.target?.closest?.(".sac-panel button,.sac-side-panel button,.sac-history-panel button,.sac-media-panel button,.sac-pid-panel button,.sac-notice button");
      if (button && !button.hasAttribute("type")) button.setAttribute("type", "button");
    }, true);
  }

  let tabulatorNavigationGuardInstalled = false;
  let tabulatorNavigationGuardActive = false;
  let tabulatorNavigationGuardUntil = 0;
  let lastNavigationBlockNotice = 0;
  function isTabulatorNavigationGuardActive() {
    return tabulatorNavigationGuardActive
      || Boolean(window.__SAC_TABULATOR_DECISION_WRITE_ACTIVE__)
      || Date.now() < tabulatorNavigationGuardUntil;
  }
  function notifyNavigationBlocked() {
    if (Date.now() - lastNavigationBlockNotice < 4000) return;
    lastNavigationBlockNotice = Date.now();
    showNotice("Atualização da página bloqueada durante a aplicação no Tabulador.", "info", 6000);
  }
  function blockTabulatorNavigation(event) {
    if (!isTabulatorNavigationGuardActive()) return false;
    event?.preventDefault?.();
    event?.stopImmediatePropagation?.();
    event?.stopPropagation?.();
    notifyNavigationBlocked();
    return true;
  }
  function ensureTabulatorNavigationGuard() {
    if (tabulatorNavigationGuardInstalled) return;
    tabulatorNavigationGuardInstalled = true;
    document.addEventListener("submit", (event) => {
      if (blockTabulatorNavigation(event)) return false;
      return true;
    }, true);
    document.addEventListener("click", (event) => {
      if (!isTabulatorNavigationGuardActive()) return;
      const submitter = event.target?.closest?.('button[type="submit"],input[type="submit"],input[type="image"]');
      if (submitter) blockTabulatorNavigation(event);
    }, true);
    const proto = window.HTMLFormElement?.prototype;
    if (!proto || proto.__sacSubmitGuardInstalled) return;
    const nativeSubmit = proto.submit;
    const nativeRequestSubmit = proto.requestSubmit;
    Object.defineProperty(proto, "__sacSubmitGuardInstalled", { value: true, configurable: true });
    if (typeof nativeSubmit === "function") {
      proto.submit = function sacGuardedSubmit(...args) {
        if (isTabulatorNavigationGuardActive()) {
          notifyNavigationBlocked();
          return undefined;
        }
        return nativeSubmit.apply(this, args);
      };
    }
    if (typeof nativeRequestSubmit === "function") {
      proto.requestSubmit = function sacGuardedRequestSubmit(...args) {
        if (isTabulatorNavigationGuardActive()) {
          notifyNavigationBlocked();
          return undefined;
        }
        return nativeRequestSubmit.apply(this, args);
      };
    }
  }
  function startTabulatorNavigationGuard() {
    ensureTabulatorNavigationGuard();
    tabulatorNavigationGuardActive = true;
    tabulatorNavigationGuardUntil = Date.now() + 60000;
  }
  function releaseTabulatorNavigationGuard(cooldownMs = 20000) {
    tabulatorNavigationGuardActive = false;
    tabulatorNavigationGuardUntil = Date.now() + cooldownMs;
  }

  const getTheme = () => storageGet("theme") === "light" ? "light" : "dark";
  const getSafeMode = () => storageGet("safeMode") !== "off";
  const setSafeMode = (enabled) => storageSet("safeMode", enabled ? "on" : "off");
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
    all(".sac-panel").forEach((panel) => panel.style.setProperty("--sac-font-scale", String(next)));
    all("[data-font-value]").forEach((node) => node.textContent = `${Math.round(next * 100)}%`);
  };
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
    if (type === "info") return;
    ensureStyles();
    let host = byId("sac-notices");
    if (!host) {
      host = document.createElement("div");
      host.id = "sac-notices";
      document.body.appendChild(host);
    }
    const node = document.createElement("div");
    const classes = type === "warn-pulse" ? "warn warn-pulse" : type;
    node.className = `sac-notice ${classes} sac-${getTheme()}`;
    node.textContent = message;
    while (host.children.length >= 2) host.firstElementChild?.remove();
    host.appendChild(node);
    setTimeout(() => node.remove(), duration);
  }

  let clipboardEnvelopeReady = true;
  async function copyText(text, lists = null, history = null) {
    if (Array.isArray(lists)) memory.lists.replace(lists);
    if (Array.isArray(history)) memory.history.replace(history);
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

  function openChoicePopover({ id, title, options, selected = [], extraInput = null, onSave }) {
    ensureStyles();
    byId(id)?.remove();
    const panel = document.createElement("div");
    panel.id = id;
    panel.className = `sac-choice-popover sac-${getTheme()}`;
    panel.style.setProperty("--sac-primary", getFlowTone("banking"));
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
  function closeAuxiliaryPanels(ownerId = "") {
    const scoped = ownerId ? `[data-owner="${cssEscape(ownerId)}"]` : "";
    all(`.sac-side-panel${scoped},.sac-choice-popover${scoped}`).forEach((panel) => panel.remove());
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
    const width = 292;
    const preferredLeft = rect.left - width - 8;
    const rightFallback = Math.min(window.innerWidth - width - 8, rect.right + 8);
    configPanel.style.left = `${preferredLeft >= 8 ? preferredLeft : Math.max(8, rightFallback)}px`;
    configPanel.style.top = `${Math.max(8, rect.top)}px`;
  }
  function placePidPanel() {
    const panel = byId("sac-pid-panel");
    const host = byId("sac-panel-console");
    if (!panel || !host) return;
    placeAuxiliaryPanel(host, panel);
  }
  function pidProfileFor(data) {
    const issuer = clean(data?.issuer || data?.falcon?.issuer, "");
    const isAmigoz = normalize(issuer).includes("AMIGOZ");
    return {
      issuer: issuer || "N/A",
      title: isAmigoz ? "PID - AMIGOZ" : "PID - CARTÃO",
      required: isAmigoz ? PID_AMIGOZ_REQUIRED : PID_DEFAULT_REQUIRED,
      complementary: isAmigoz ? PID_AMIGOZ_COMPLEMENTARY : PID_DEFAULT_COMPLEMENTARY,
      note: isAmigoz
        ? "AMIGOZ possui PID próprio. Não aplicar bloqueio sem tentativa de contato, salvo fraude crítica evidente."
        : "Tempo mínimo de espera no ativo: 30 segundos. Não revele ao cliente quais respostas divergiram."
    };
  }
  function openPidPanel(data) {
    ensureStyles();
    closePidPanel();
    const profile = pidProfileFor(data);
    const panel = document.createElement("div");
    panel.id = "sac-pid-panel";
    panel.className = `sac-choice-popover sac-pid-panel sac-${getTheme()}`;
    panel.dataset.owner = "sac-panel-console";
    panel.style.setProperty("--sac-primary", getFlowTone("card"));
    const cards = (items) => items.map((item, index) => `<div class="sac-pid-card"><b>${index + 1}</b><span>${escapeHtml(item)}</span></div>`).join("");
    panel.innerHTML = `
      <div class="sac-choice-head">
        <strong>${escapeHtml(profile.title)}</strong>
      </div>
      <div class="sac-pid-note">${escapeHtml(profile.note)}</div>
      <div class="sac-pid-groups">
        <div class="sac-pid-group"><strong>Dados obrigatórios</strong><div class="sac-pid-grid">${cards(profile.required)}</div></div>
        ${profile.complementary.length ? `<div class="sac-pid-group"><strong>Dados complementares</strong><div class="sac-pid-grid">${cards(profile.complementary)}</div></div>` : ""}
      </div>
    `;
    document.body.appendChild(panel);
    const host = byId("sac-panel-console");
    if (!host) return panel.remove();
    placePidPanel();
  }

  function ensureStyles() {
    if (byId("sac-style-v8")) return;
    const style = document.createElement("style");
    style.id = "sac-style-v8";
    style.textContent = `
      .sac-panel{--sac-font-scale:1;--sac-primary:#14b8a6;--sac-panel-width:420px;position:fixed;top:8px;right:8px;z-index:2147483647;box-sizing:border-box!important;inline-size:var(--sac-panel-width)!important;width:var(--sac-panel-width)!important;min-inline-size:var(--sac-panel-width)!important;min-width:var(--sac-panel-width)!important;max-inline-size:var(--sac-panel-width)!important;max-width:var(--sac-panel-width)!important;border:1px solid var(--sac-border);border-top:3px solid var(--sac-primary);border-radius:8px;background:var(--sac-bg);color:var(--sac-text);font-family:Inter,Segoe UI,Arial,sans-serif;box-shadow:0 18px 44px rgba(0,0,0,.30);overflow:visible;text-align:left}
      .sac-panel,.sac-panel *{box-sizing:border-box!important}.sac-panel .sac-body,.sac-panel .sac-section,.sac-panel .sac-grid,.sac-panel .sac-field-grid,.sac-panel .sac-decision-grid,.sac-panel .sac-final-actions,.sac-panel textarea{min-width:0!important;max-width:100%!important}
      .sac-panel.sac-listas-panel{--sac-panel-width:min(720px,calc(100vw - 16px));max-height:calc(100vh - 16px)}
      .sac-dark{--sac-bg:#121a26;--sac-panel:#1b2635;--sac-card:#111927;--sac-border:#465a73;--sac-text:#edf3fb;--sac-muted:#b9c7d9;--sac-input:#0f1724}.sac-light{--sac-bg:#fff;--sac-panel:#f3f6fa;--sac-card:#fff;--sac-border:#c9d6e6;--sac-text:#172033;--sac-muted:#5b697f;--sac-input:#fff}
      .sac-head{position:relative;z-index:4;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 8px;background:var(--sac-primary);color:#fff;cursor:grab;user-select:none;touch-action:none}.sac-head:active,.sac-history-head:active{cursor:grabbing}.sac-panel.sac-minimized .sac-body,.sac-panel.sac-minimized .sac-config{display:none!important}.sac-title{display:flex;align-items:center;gap:6px;font-size:calc(12px * var(--sac-font-scale));font-weight:950;line-height:1.1}.sac-flow-dot{width:10px;height:10px;border-radius:999px;background:var(--sac-primary);border:2px solid rgba(255,255,255,.72);box-shadow:0 0 0 1px rgba(0,0,0,.2)}.sac-subtitle{font-size:calc(9px * var(--sac-font-scale));opacity:.9;font-weight:800;max-width:260px;line-height:1.15}
      .sac-actions{display:flex;gap:4px}.sac-icon{width:25px;height:25px;border:1px solid rgba(255,255,255,.35);border-radius:5px;background:rgba(255,255,255,.14);color:#fff;cursor:pointer;font-weight:950;display:grid;place-items:center;padding:0}.sac-icon.close{background:#dc2626;border-color:#fecaca;color:#fff}
      .sac-config{position:fixed;left:auto;top:8px;width:360px;max-width:calc(100vw - 16px);z-index:2147483647;display:none;gap:7px;padding:8px;border:1px solid var(--sac-border);border-radius:8px;background:var(--sac-bg);box-shadow:0 14px 34px rgba(0,0,0,.28)}.sac-config.open{display:grid}.sac-config-title{font-size:11px;font-weight:950;color:var(--sac-muted);text-transform:uppercase}.sac-config-preview{border:1px solid var(--sac-border);border-radius:7px;background:var(--sac-card);padding:7px;color:var(--sac-text);font-size:11px;font-weight:900;overflow-wrap:anywhere}.sac-config input,.sac-config select,.sac-config button{width:100%;border:1px solid var(--sac-border);border-radius:6px;background:var(--sac-input);color:var(--sac-text);padding:7px;font-weight:850}.sac-config input:hover,.sac-config select:hover,.sac-config button:hover,.sac-config input:focus,.sac-config select:focus,.sac-config button:focus{border-color:#38bdf8;background:#12314a;color:#edf3fb;box-shadow:0 0 0 2px rgba(56,189,248,.22);outline:none;filter:brightness(1.08)}.sac-light .sac-config input:hover,.sac-light .sac-config select:hover,.sac-light .sac-config button:hover,.sac-light .sac-config input:focus,.sac-light .sac-config select:focus,.sac-light .sac-config button:focus{background:#eef7ff;color:#172033}.sac-config-row{display:grid;grid-template-columns:1fr auto 1fr;gap:0;align-items:stretch}.sac-config-row button:first-child{border-radius:6px 0 0 6px}.sac-config-row button:last-child{border-radius:0 6px 6px 0;border-left:0}.sac-font-value{display:grid;place-items:center;border-top:1px solid var(--sac-border);border-bottom:1px solid var(--sac-border);background:var(--sac-card);color:var(--sac-muted);font-size:11px;font-weight:950;padding:0 8px}.sac-flow-legend{display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px}.sac-flow-legend span{display:flex;align-items:center;gap:4px;border:1px solid var(--sac-border);border-radius:6px;background:var(--sac-card);padding:5px 4px;font-size:9px;font-weight:950;color:var(--sac-muted)}.sac-flow-legend i{width:10px;height:10px;border-radius:999px;display:inline-block}.sac-signature-editor,.sac-color-editor{display:none;gap:6px}.sac-signature-editor.open,.sac-color-editor.open{display:grid}.sac-color-row{display:grid;grid-template-columns:62px minmax(0,1fr);gap:6px;align-items:center}.sac-color-row strong{font-size:10px;color:var(--sac-muted);font-weight:950}.sac-color-swatches{display:flex;gap:5px;flex-wrap:nowrap;align-items:center}.sac-color-swatch{width:20px!important;height:20px!important;min-width:20px;border-radius:999px!important;padding:0!important;border:2px solid var(--sac-border)!important;background:var(--swatch)!important;cursor:pointer}.sac-color-swatch.active{border-color:#fff!important;box-shadow:0 0 0 2px var(--swatch)}.sac-light .sac-color-swatch.active{border-color:#172033!important}.sac-signature-custom[hidden]{display:none!important}.sac-toggle{display:grid!important;grid-template-columns:34px minmax(0,1fr) auto;align-items:center;justify-items:start;gap:7px;text-align:left}.sac-toggle span:not(.sac-switch),.sac-toggle b{justify-self:start;text-align:left}.sac-toggle b{font-size:10px;color:var(--sac-muted)}.sac-switch{position:relative;width:32px;height:18px;border-radius:999px;background:#64748b;box-shadow:inset 0 0 0 1px rgba(255,255,255,.18)}.sac-switch:after{content:"";position:absolute;left:3px;top:3px;width:12px;height:12px;border-radius:999px;background:#fff;transition:.15s}.sac-toggle.on .sac-switch{background:#16a34a}.sac-toggle.on .sac-switch:after{left:17px}.sac-toggle.on b{color:#86efac}
      .sac-body{padding:5px;display:grid;gap:5px}.sac-section{border:1px solid var(--sac-border);border-radius:6px;background:var(--sac-panel);padding:5px}.sac-section-title{display:flex;align-items:center;justify-content:space-between;gap:8px;color:var(--sac-muted);font-size:calc(9px * var(--sac-font-scale));font-weight:950;text-transform:uppercase;margin-bottom:4px}.sac-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:3px}.sac-grid.two{grid-template-columns:repeat(2,minmax(0,1fr))}.sac-grid.three{grid-template-columns:repeat(3,minmax(0,1fr))}.sac-single-alert{grid-column:1/-1;min-height:50px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:calc(13px * var(--sac-font-scale));font-weight:950;letter-spacing:.02em}
      .sac-kv{position:relative;min-width:0;min-height:34px;margin-top:7px;border:1px solid var(--sac-border);border-radius:5px;background:var(--sac-card);padding:7px 4px 4px;transition:border-color .15s,background .15s,box-shadow .15s,color .15s;cursor:pointer}.sac-kv:hover,.sac-field:hover{border-color:#38bdf8;background:#10263a;box-shadow:0 0 0 2px rgba(56,189,248,.12)}.sac-kv.sac-copied{border-color:#22c55e!important;box-shadow:0 0 0 2px rgba(34,197,94,.28)!important}.sac-light .sac-kv:hover,.sac-light .sac-field:hover{background:#eef7ff;color:#172033}.sac-kv-label{position:absolute;top:-8px;left:4px;max-width:calc(100% - 8px);padding:1px 3px;border-radius:3px;background:var(--sac-panel);font-size:calc(8px * var(--sac-font-scale));font-weight:900;color:var(--sac-muted);line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sac-kv-value{display:flex;align-items:center;min-height:23px;font-size:calc(11px * var(--sac-font-scale));font-weight:800;color:var(--sac-text);line-height:1.08;overflow-wrap:anywhere}.sac-light .sac-kv:hover .sac-kv-label,.sac-light .sac-kv:hover .sac-kv-value{color:#172033}.sac-missing{border-color:#f59e0b!important;background:#3a230b!important;animation:sacPulseOrange 1s ease-in-out infinite}.sac-light .sac-missing{background:#fff7ed!important}.sac-history-ok{background:#052e1a;border-color:#15803d}.sac-history-warn,.sac-alert-warn{background:#3a230b;border-color:#c2410c}.sac-history-danger,.sac-alert-danger{background:#3a0d0d;border-color:#ef4444;animation:sacPulseRed 1s ease-in-out infinite}.sac-light .sac-history-ok{background:#ecfdf5;border-color:#86efac}.sac-light .sac-history-warn,.sac-light .sac-alert-warn{background:#fff7ed;border-color:#fdba74}.sac-light .sac-history-danger,.sac-light .sac-alert-danger{background:#fef2f2}@keyframes sacPulseRed{0%,100%{box-shadow:0 0 0 rgba(239,68,68,0);filter:saturate(1)}50%{box-shadow:0 0 12px rgba(239,68,68,.65);filter:saturate(1.35)}}@keyframes sacPulseOrange{0%,100%{box-shadow:0 0 0 rgba(245,158,11,0)}50%{box-shadow:0 0 12px rgba(245,158,11,.70)}}
      .sac-pix-grid{border-color:#06b6d4!important;background:#073342!important;box-shadow:inset 3px 0 #22d3ee}.sac-pix-grid .sac-kv-value{color:#cffafe;font-weight:950}.sac-light .sac-pix-grid{background:#ecfeff!important;border-color:#0891b2!important}.sac-light .sac-pix-grid .sac-kv-value{color:#164e63}
      .sac-field-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px}.sac-console-flags{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px}.sac-console-flags .sac-toggle{min-height:34px;border:1px solid var(--sac-border);border-radius:6px;background:var(--sac-card);padding:6px 5px;cursor:pointer;grid-template-columns:28px minmax(0,1fr)!important}.sac-console-flags .sac-toggle b{display:none}.sac-console-flags .sac-toggle span:not(.sac-switch){font-size:calc(9.4px * var(--sac-font-scale));font-weight:950;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sac-console-flags .sac-toggle[aria-disabled="true"]{opacity:.52;cursor:not-allowed}.sac-console-flags .sac-toggle:hover{border-color:#38bdf8;background:#10263a;box-shadow:0 0 0 2px rgba(56,189,248,.12)}.sac-light .sac-console-flags .sac-toggle:hover{background:#eef7ff;color:#172033}.sac-field{display:grid;gap:2px;min-width:0;border:1px solid var(--sac-border);border-radius:6px;background:var(--sac-card);padding:4px;transition:border-color .15s,box-shadow .15s,background .15s}.sac-field span{display:block;font-size:calc(8.4px * var(--sac-font-scale));font-weight:900;color:var(--sac-muted);line-height:1.05}.sac-field select,.sac-field input{width:100%;height:28px;border:1px solid var(--sac-border);border-radius:5px;background:var(--sac-input);color:var(--sac-text);font-size:calc(10.6px * var(--sac-font-scale));font-weight:800;padding:3px}.sac-field select:hover,.sac-field select:focus,.sac-field input:hover,.sac-field input:focus{border-color:#38bdf8;background:#10263a;color:#edf3fb;outline:none;box-shadow:0 0 0 2px rgba(56,189,248,.16)}.sac-light .sac-field select:hover,.sac-light .sac-field select:focus,.sac-light .sac-field input:hover,.sac-light .sac-field input:focus{background:#eef7ff;color:#172033}.sac-other-input[hidden]{display:none!important}
      .sac-main{width:100%;border:0;border-radius:6px;background:var(--sac-primary);color:#fff;font-size:calc(11.5px * var(--sac-font-scale));font-weight:950;padding:9px 7px;line-height:1.12;cursor:pointer;white-space:normal;overflow-wrap:anywhere}.sac-main:hover,.sac-secondary:hover,.sac-decision:hover,.sac-icon:hover{filter:brightness(1.12);box-shadow:0 0 0 2px rgba(255,255,255,.14)}.sac-secondary{width:100%;border:1px solid var(--sac-border);border-radius:6px;background:transparent;color:var(--sac-text);font-size:calc(11px * var(--sac-font-scale));font-weight:950;padding:8px 7px;line-height:1.12;cursor:pointer;white-space:normal}.sac-decision-grid,.sac-final-actions{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:4px}.sac-decision{min-height:52px;border:0;border-radius:6px;color:#fff;font-size:calc(10.2px * var(--sac-font-scale));font-weight:950;line-height:1.08;white-space:pre-line;cursor:pointer;padding:7px 5px;overflow-wrap:anywhere}.sac-decision.danger{background:#dc2626}.sac-decision.success{background:#16a34a}.sac-decision.warning{background:#d97706}.sac-decision.info{background:#2563eb}
      .sac-textarea{width:100%;height:232px;border:1px solid var(--sac-border);border-radius:6px;background:var(--sac-input);color:var(--sac-text);font:700 calc(10.5px * var(--sac-font-scale))/1.08 Consolas,Menlo,monospace;padding:6px;resize:none;overflow:hidden;white-space:pre-wrap}.sac-motive{height:62px;font:800 calc(11px * var(--sac-font-scale))/1.2 Inter,Segoe UI,Arial,sans-serif}.sac-final-textarea{height:286px;font-size:calc(10.8px * var(--sac-font-scale));line-height:1.12}.sac-final-textarea.sac-final-card{height:214px}
      #sac-notices{position:fixed;left:50%;right:auto;bottom:16px;transform:translateX(-50%);z-index:2147483647;display:grid;gap:6px;justify-items:center;pointer-events:none}.sac-notice{width:min(360px,calc(100vw - 36px));border:1px solid #38506c;border-left:4px solid #2563eb;border-radius:8px;background:#101722;color:#f8fbff;padding:8px 10px;font:800 11.5px/1.22 Inter,Segoe UI,Arial,sans-serif;box-shadow:0 10px 26px rgba(0,0,0,.24);opacity:.96;text-align:left;pointer-events:auto}.sac-notice.success{border-left-color:#16a34a;background:#062e1b;color:#ecfdf5}.sac-notice.warn{border-left-color:#d97706;background:#351f05;color:#fff7ed}.sac-notice.warn-pulse{animation:sacPulseOrange 1.15s ease-in-out infinite}.sac-notice.error{border-left-color:#dc2626;background:#3a0d0d;color:#fef2f2}.sac-notice.info{border-left-color:#2563eb;background:#0b2442;color:#eff6ff}.sac-notice.sac-light{background:#fff;color:#172033;border-color:#cbd5e1}.sac-notice.sac-light.success{background:#ecfdf5;color:#064e3b}.sac-notice.sac-light.warn{background:#fff7ed;color:#7c2d12}.sac-notice.sac-light.error{background:#fef2f2;color:#7f1d1d}.sac-notice.sac-light.info{background:#eff6ff;color:#1e3a8a}
      .sac-choice-popover{position:fixed;right:14px;top:72px;z-index:2147483647;width:min(354px,calc(100vw - 28px));display:grid;gap:6px;padding:0 8px 8px;border:1px solid var(--sac-border);border-top:3px solid var(--sac-primary);border-radius:8px;background:var(--sac-bg);color:var(--sac-text);box-shadow:0 18px 44px rgba(0,0,0,.32);font-family:Inter,Segoe UI,Arial,sans-serif;box-sizing:border-box!important}.sac-choice-popover.sac-minimized{display:none!important}.sac-choice-popover *{box-sizing:border-box!important}.sac-choice-head{margin:0 -8px;padding:7px 8px;background:var(--sac-primary);color:#fff;display:flex;justify-content:space-between;align-items:center;border-radius:6px 6px 0 0}.sac-choice-head strong{font-size:12px}.sac-choice-head button{width:24px;height:24px;padding:0;border-color:#fecaca;background:#dc2626;color:#fff}.sac-choice-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:4px}.sac-choice-popover label{display:flex;gap:5px;align-items:flex-start;min-width:0;min-height:34px;border:1px solid var(--sac-border);border-radius:5px;background:var(--sac-card);padding:5px;font-size:9.5px;font-weight:850;line-height:1.15;cursor:pointer;word-break:normal;overflow-wrap:normal;hyphens:none;white-space:normal}.sac-choice-popover label>span{display:block;min-width:0;white-space:normal;word-break:normal;overflow-wrap:normal;hyphens:none}.sac-choice-popover label:hover{border-color:#38bdf8;background:#10263a;color:#edf3fb}.sac-light.sac-choice-popover label:hover{background:#eef7ff;color:#172033}.sac-choice-popover input[type="checkbox"]{flex:0 0 auto;margin:1px 0 0}.sac-choice-extra{display:grid!important;gap:4px;min-height:0!important;font-size:10.5px!important}.sac-choice-extra input{width:100%;height:30px;border:1px solid var(--sac-border);border-radius:6px;background:var(--sac-input);color:var(--sac-text);padding:5px;font-weight:850}.sac-choice-popover .sac-choice-actions{display:grid;grid-template-columns:1fr;gap:6px}.sac-choice-popover button{border:1px solid var(--sac-border);border-radius:6px;background:var(--sac-primary);color:#fff;padding:8px;font-weight:950;cursor:pointer}.sac-choice-popover button.secondary{background:transparent;color:var(--sac-text)}.sac-pid-panel{width:360px!important;min-width:360px!important;max-width:360px!important;padding:0 10px 10px!important}.sac-pid-panel .sac-choice-head{margin:0 -10px}.sac-pid-groups{display:grid;gap:7px}.sac-pid-group{display:grid;gap:4px}.sac-pid-group strong{font-size:10px;color:var(--sac-muted);text-transform:uppercase}.sac-pid-grid{display:grid;grid-template-columns:1fr;gap:4px}.sac-pid-card{border:1px solid var(--sac-border);border-radius:6px;background:var(--sac-card);padding:5px 7px;min-height:31px;font-size:10.5px;font-weight:850;line-height:1.12;display:grid;grid-template-columns:22px 1fr;align-items:center;gap:5px}.sac-pid-card b{display:grid;place-items:center;width:20px;height:20px;border-radius:4px;background:var(--sac-primary);color:#fff;font-size:9px}.sac-pid-note{border:1px solid #f59e0b;border-radius:6px;background:#3a230b;color:#fff7ed;padding:6px;font-size:10.5px;font-weight:900;line-height:1.18}.sac-light .sac-pid-note{background:#fff7ed;color:#7c2d12}
      .sac-apply-status{border:1px solid var(--sac-border);border-left:4px solid #2563eb;border-radius:6px;background:var(--sac-card);color:var(--sac-text);padding:7px;font-size:calc(10.5px * var(--sac-font-scale));font-weight:900;line-height:1.15}.sac-apply-status.ok{border-left-color:#16a34a}.sac-apply-status.warn{border-left-color:#d97706}.sac-apply-status.error{border-left-color:#dc2626}
      .sac-history-panel{--sac-history-tone:#64748b;position:fixed;left:10px;top:10px;z-index:2147483647;width:min(780px,calc(100vw - 20px));max-height:min(720px,calc(100vh - 20px));border:1px solid var(--sac-border);border-top:3px solid var(--sac-history-tone);border-radius:8px;background:var(--sac-bg);color:var(--sac-text);font-family:Inter,Segoe UI,Arial,sans-serif;box-shadow:0 18px 44px rgba(0,0,0,.30);overflow:hidden}.sac-history-head{display:flex;justify-content:space-between;align-items:center;gap:8px;background:var(--sac-history-tone);color:#fff;padding:8px;font-weight:950;cursor:grab;user-select:none;touch-action:none}.sac-history-tools{display:grid;grid-template-columns:1fr 126px;gap:6px;padding:7px;border-bottom:1px solid var(--sac-border);background:var(--sac-panel)}.sac-history-tools input,.sac-history-tools select{min-width:0;height:34px;border:1px solid var(--sac-border);border-radius:7px;background:var(--sac-input);color:var(--sac-text);padding:7px 9px;font-weight:900;outline:none}.sac-history-tools input:hover,.sac-history-tools select:hover,.sac-history-tools input:focus,.sac-history-tools select:focus{border-color:#38bdf8;background:#12314a;color:#edf3fb;box-shadow:0 0 0 2px rgba(56,189,248,.18)}.sac-light .sac-history-tools input:hover,.sac-light .sac-history-tools select:hover,.sac-light .sac-history-tools input:focus,.sac-light .sac-history-tools select:focus{background:#eef7ff;color:#172033}.sac-history-body{display:grid;grid-template-columns:236px 1fr;gap:6px;padding:6px}.sac-history-list{display:grid;gap:4px;align-content:start;max-height:560px;overflow:auto;padding-right:3px}.sac-history-list button{text-align:left;border:1px solid var(--sac-border);border-radius:6px;background:var(--sac-card);color:var(--sac-text);padding:7px;font-weight:900;line-height:1.1;cursor:pointer}.sac-history-list button:hover,.sac-history-list button.active{border-color:#38bdf8;background:#10263a;color:#edf3fb;box-shadow:0 0 0 2px rgba(56,189,248,.12);transform:translateY(-1px)}.sac-light .sac-history-list button:hover,.sac-light .sac-history-list button.active{background:#eef7ff;color:#172033}.sac-history-list small{display:block;color:var(--sac-muted);font-size:10px;margin-top:2px}.sac-history-empty{color:var(--sac-muted);font-weight:850;padding:8px}.sac-history-detail textarea{height:520px;overflow:auto;resize:none}.sac-list-tabs{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:6px}.sac-list-tabs button{border:1px solid var(--sac-border);border-radius:6px;background:var(--sac-card);color:var(--sac-text);padding:8px 6px;font-size:11px;font-weight:950;cursor:pointer}.sac-list-tabs button:hover,.sac-list-tabs button.active{border-color:#38bdf8;background:#12314a;color:#edf3fb;box-shadow:0 0 0 2px rgba(56,189,248,.14)}.sac-light .sac-list-tabs button:hover,.sac-light .sac-list-tabs button.active{background:#eef7ff;color:#172033}.sac-allowlist-list{display:grid;gap:5px;max-height:min(560px,calc(100vh - 210px));overflow:auto;padding-right:3px}.sac-allowlist-item{border:1px solid var(--sac-border);border-radius:7px;background:var(--sac-card);padding:6px;display:grid;grid-template-columns:1fr 72px;gap:6px;align-items:stretch}.sac-allowlist-item:hover{border-color:#38bdf8;box-shadow:0 0 0 2px rgba(56,189,248,.14)}.sac-allowlist-row{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:3px}.sac-allowlist-actions{display:grid;grid-template-rows:1fr 1fr;gap:4px}.sac-allowlist-actions button{border:0;border-radius:6px;color:#fff;font-size:10px;font-weight:950;cursor:pointer}.sac-allowlist-actions [data-list-apply]{background:#16a34a}.sac-allowlist-actions [data-list-remove]{background:#dc2626}
      .sac-help-btn{position:absolute;top:3px;right:3px;width:18px;height:18px;border:1px solid var(--sac-border);border-radius:999px;background:var(--sac-primary);color:#fff;font-size:11px;font-weight:950;line-height:1;display:grid;place-items:center;padding:0;cursor:pointer}.sac-help-btn:hover{filter:brightness(1.14);box-shadow:0 0 0 2px rgba(56,189,248,.20)}
      .sac-side-panel{position:fixed;z-index:2147483647;width:320px;max-height:min(560px,calc(100vh - 16px));overflow:hidden;border:1px solid var(--sac-border);border-top:3px solid var(--sac-primary);border-radius:8px;background:var(--sac-bg);color:var(--sac-text);box-shadow:0 18px 44px rgba(0,0,0,.32);font-family:Inter,Segoe UI,Arial,sans-serif}.sac-side-panel.sac-minimized{display:none!important}.sac-side-head{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:7px 8px;background:var(--sac-primary);color:#fff;font-size:12px;font-weight:950}.sac-side-body{display:grid;gap:5px;padding:7px;overflow:hidden}.sac-side-group{display:grid;gap:4px;min-width:0}.sac-side-group-title{border-left:3px solid var(--sac-primary);padding-left:6px;color:var(--sac-text);font-size:10px;font-weight:950;text-transform:uppercase;line-height:1.1}.sac-side-card{display:grid;gap:3px;min-height:32px;border:1px solid var(--sac-border);border-radius:6px;background:var(--sac-card);padding:5px 6px}.sac-side-card span{font-size:10px;line-height:1.16;color:var(--sac-muted);font-weight:800;white-space:normal;word-break:normal;overflow-wrap:break-word}
      @media (max-width:460px){.sac-grid.three,.sac-grid,.sac-field-grid{grid-template-columns:1fr}.sac-history-body{grid-template-columns:1fr}.sac-pid-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  const ISSUER_HELP = [
    { match: ["ONLYPAY"], title: "ONLYPAY", items: ["Cliente premiado pode usar allowlist por 5 dias quando aplicável.", "Casos BANKING não fraude entram em LISTAS."] },
    { match: ["SOFISA"], title: "SOFISA", items: ["Regra de contenção usa prazo de 3 dias.", "Quando for não fraude com contenção, entra em Allowlist e Contenção."] },
    { match: ["CONTA SIMPLES"], title: "CONTA SIMPLES", items: ["Não adicionar em LISTAS quando a conta for menor que 3 meses.", "Validar sinais de risco antes de liberar."] },
    { match: ["AMIGOZ"], title: "AMIGOZ", items: ["Possui PID próprio no fluxo de cartão.", "Confirmar identidade antes da decisão."] },
    { match: ["TIPCARD"], title: "TIPCARD", items: ["SPD 29 é estratégico.", "Não remover bloqueio sem orientação correta."] }
  ];
  const RULE_HELP = [
    { match: ["DENYLIST_EC"], title: "DENYLIST_EC", items: ["Regra ligada ao estabelecimento comercial.", "Reforce validação do EC, recorrência, MCC e histórico de contestação.", "Se houver decisão de cartão, a fila segue aprovada/recusada pela decisão da transação."] },
    { match: ["DENYLIST_CCS"], title: "DENYLIST_CCS", items: ["Regra ligada à conta/cliente no CCS.", "Cruze status da conta, SPD, documentação e extrato antes da decisão.", "Sinais adicionais fora do padrão devem pesar na análise."] },
    { match: ["DENYLIST"], title: "DENYLIST", items: ["Regra de lista restritiva.", "Não tratar como liberação automática; validar histórico, vínculo e demais alertas.", "Se houver outros alertas em vermelho, priorize a consistência do risco."] },
    { match: ["HOLD"], title: "HOLD", items: ["Fluxo de alerta quente.", "Seleciona somente linhas cuja regra contenha HOLD.", "Direciona fila HOLD no Tabulador."] },
    { match: ["CONTENCAO", "CONTENÇÃO", "CONTENSAO", "CONTENSÃO"], title: "CONTENÇÃO", items: ["Caso BANKING não fraude entra em Allowlist.", "Também entra na aba Contenção usando CPF/CNPJ limpo."] },
    { match: ["AUTO_FRAUDE", "AUTO FRAUDE", "AUTOFRAUDE"], title: "AUTO FRAUDE", items: ["Atenção a indícios de autofraude.", "Verifique histórico, documentação, mídia desabonadora e padrão transacional.", "Não confundir com autofinanciamento no dropdown de Extrato."] },
    { match: ["CAPITAL_DE_GIRO", "CAPITAL DE GIRO"], title: "CAPITAL DE GIRO", items: ["Analisar compatibilidade com perfil e atividade.", "Verificar recorrência, valor, origem/destino e sinais de triangulação.", "Conta nova ou status divergente aumenta o risco."] },
    { match: ["P2P"], title: "P2P", items: ["Verificar destino, vínculo, dispositivo e perfil transacional."] },
    { match: ["CASHOUT", "CHASHOUT"], title: "Cashout", items: ["Avaliar saída de saldo, triangulação, velocidade e histórico."] },
    { match: ["3DS"], title: "3DS", items: ["Compra online autenticada exige leitura do contexto e padrão de compra."] }
  ];
  function closeSidePanels(ownerId = "") {
    const selector = ownerId ? `.sac-side-panel[data-owner="${cssEscape(ownerId)}"]` : ".sac-side-panel";
    all(selector).forEach((panel) => panel.remove());
  }
  function placeSidePanel(ownerPanel, sidePanel) {
    const rect = ownerPanel.getBoundingClientRect();
    const width = sidePanel.offsetWidth || 292;
    const preferredLeft = rect.left - width - 8;
    const rightFallback = Math.min(window.innerWidth - width - 8, rect.right + 8);
    sidePanel.style.left = `${preferredLeft >= 8 ? preferredLeft : Math.max(8, rightFallback)}px`;
    sidePanel.style.top = `${Math.max(8, rect.top)}px`;
  }
  function syncSidePanels(ownerPanel) {
    all(`.sac-side-panel[data-owner="${cssEscape(ownerPanel.id)}"]`).forEach((panel) => {
      panel.classList.toggle("sac-minimized", ownerPanel.classList.contains("sac-minimized"));
      if (!ownerPanel.classList.contains("sac-minimized")) placeSidePanel(ownerPanel, panel);
    });
    all(`.sac-choice-popover[data-owner="${cssEscape(ownerPanel.id)}"]`).forEach((panel) => {
      panel.classList.toggle("sac-minimized", ownerPanel.classList.contains("sac-minimized"));
      if (!ownerPanel.classList.contains("sac-minimized")) placeAuxiliaryPanel(ownerPanel, panel);
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
    return entry.items.filter((item) => !repeatedLabels.includes(normalize(item)));
  }
  function hasHelpEntry(kind, value) {
    const source = kind === "issuer" ? ISSUER_HELP : RULE_HELP;
    return matchedHelpEntries(source, value).length > 0;
  }
  function openContextHelp(kind, value, ownerPanel) {
    if (!getHelpMode()) return;
    const entries = matchedHelpEntries(kind === "issuer" ? ISSUER_HELP : RULE_HELP, value);
    if (!entries.length) return;
    closeSidePanels(ownerPanel.id);
    const panel = document.createElement("div");
    panel.className = `sac-side-panel sac-${getTheme()}`;
    panel.dataset.owner = ownerPanel.id;
    panel.style.setProperty("--sac-primary", ownerPanel.style.getPropertyValue("--sac-primary") || "#64748b");
    const groups = entries.map((entry) => `
      <div class="sac-side-group">
        <div class="sac-side-group-title">${escapeHtml(entry.title)}</div>
        ${compactHelpItems(entry, value).map((item) => `<div class="sac-side-card"><span>${escapeHtml(item)}</span></div>`).join("")}
      </div>
    `).join("");
    panel.innerHTML = `<div class="sac-side-head"><span>${kind === "issuer" ? "Ajuda do emissor" : "Ajuda da regra"}</span></div><div class="sac-side-body">${groups}</div>`;
    document.body.appendChild(panel);
    placeSidePanel(ownerPanel, panel);
    panel.addEventListener("mouseleave", () => closeSidePanels(ownerPanel.id));
  }

  function renderPanel({ id, stage, flow = "banking", subtitle = "", body = "", footer = "", onEnter, onSignature }) {
    ensureStyles();
    ensureAutomationButtonGuard();
    byId(id)?.remove();
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
          <button class="sac-icon" data-action="config" aria-label="Configurações">⚙</button>
          <button class="sac-icon" data-action="history" aria-label="Histórico">H</button>
          <button class="sac-icon" data-action="reload" aria-label="Recarregar">↻</button>
          <button class="sac-icon" data-action="minimize" aria-label="Minimizar">_</button>
          <button class="sac-icon close" data-action="close" aria-label="Fechar">×</button>
        </div>
        <div class="sac-config" hidden>
          <div class="sac-config-title">Configurações</div>
          <button data-action="theme">${getTheme() === "dark" ? "☀ Tema claro" : "☾ Tema escuro"}</button>
          <div class="sac-config-row">
            <button data-action="font-minus" aria-label="Diminuir fonte">A−</button>
            <span class="sac-font-value" data-font-value>${Math.round(getFontScale() * 100)}%</span>
            <button data-action="font-plus" aria-label="Aumentar fonte">A+</button>
          </div>
          <button class="sac-toggle ${getSafeMode() ? "on" : ""}" data-action="safe-mode" aria-pressed="${getSafeMode() ? "true" : "false"}"><span class="sac-switch"></span><span>Modo seguro</span><b>${getSafeMode() ? "Ligado" : "Desligado"}</b></button>
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
    enableDrag(panel, ".sac-head");

    const config = panel.querySelector(".sac-config");
    const close = () => {
      if (panel.dataset.decisionApplying === "true") {
        showNotice("Aguarde a aplicação da decisão no Tabulador terminar.", "info", 9000);
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
      panel.style.right = "8px";
      panel.style.left = "";
      panel.style.transform = "";
      panel.classList.remove("sac-minimized");
      syncSidePanels(panel);
    };
    const openConfig = () => {
      panel.classList.remove("sac-minimized");
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
      config.hidden = !config.hidden;
      config.classList.toggle("open", !config.hidden);
      panel.style.zIndex = config.hidden ? "" : "2147483646";
      placeConfigPanel(panel, config);
    });
    panel.querySelector("[data-action='theme']")?.addEventListener("click", () => {
      setTheme(getTheme() === "dark" ? "light" : "dark");
      reload();
    });
    panel.querySelector("[data-action='font-minus']")?.addEventListener("click", () => setFontScale(getFontScale() - 0.05));
    panel.querySelector("[data-action='font-plus']")?.addEventListener("click", () => setFontScale(getFontScale() + 0.05));
    panel.querySelector("[data-action='safe-mode']")?.addEventListener("click", (event) => {
      const next = !getSafeMode();
      setSafeMode(next);
      event.currentTarget.classList.toggle("on", next);
      event.currentTarget.setAttribute("aria-pressed", next ? "true" : "false");
      const state = event.currentTarget.querySelector("b");
      if (state) state.textContent = next ? "Ligado" : "Desligado";
    });
    panel.querySelector("[data-action='help-mode']")?.addEventListener("click", (event) => {
      const next = !getHelpMode();
      setHelpMode(next);
      event.currentTarget.classList.toggle("on", next);
      event.currentTarget.setAttribute("aria-pressed", next ? "true" : "false");
      const state = event.currentTarget.querySelector("b");
      if (state) state.textContent = next ? "Ligado" : "Desligado";
      closeSidePanels(panel.id);
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
    panel.addEventListener("mouseover", (event) => {
      const help = event.target.closest("[data-help-kind]");
      if (!help) return;
      openContextHelp(help.dataset.helpKind, help.dataset.helpValue, panel);
    });
    panel.addEventListener("mouseout", (event) => {
      const help = event.target.closest("[data-help-kind]");
      if (!help) return;
      const next = event.relatedTarget;
      if (next?.closest?.(`.sac-side-panel[data-owner="${cssEscape(panel.id)}"]`)) return;
      setTimeout(() => {
        const hoveredHelp = panel.matches(":hover") && panel.querySelector("[data-help-kind]:hover");
        const hoveredPanel = document.querySelector(`.sac-side-panel[data-owner="${cssEscape(panel.id)}"]:hover`);
        if (!hoveredHelp && !hoveredPanel) closeSidePanels(panel.id);
      }, 80);
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
      side.remove();
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
      historyPanel.remove();
      return true;
    }
    const panel = all(".sac-panel").at(-1);
    if (panel?.__sacKeys) return panel.__sacKeys.close();
    return false;
  }

  window.__SAC_PREVENCAO_V8_KEYS = (event) => {
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
    if (event.key === "Enter") { panel.__sacKeys.onEnter?.(); event.preventDefault(); }
    if (["1", "2", "3", "4"].includes(event.key)) {
      panel.querySelector(`[data-decision-index="${Number(event.key) - 1}"]`)?.click();
      event.preventDefault();
    }
  };
  document.addEventListener("keydown", window.__SAC_PREVENCAO_V8_KEYS);

  function section(title, content, meta = "") {
    const metaText = clean(meta, "");
    const metaHtml = metaText && normalize(metaText) !== normalize(title) ? `<span>${escapeHtml(metaText)}</span>` : "";
    return `<section class="sac-section"><div class="sac-section-title"><span>${escapeHtml(title)}</span>${metaHtml}</div>${content}</section>`;
  }
  function kv(label, value, cls = "") {
    const missing = isMissing(value);
    const possibleKind = getHelpMode() && normalize(label) === "REGRA" ? "rule" : getHelpMode() && normalize(label) === "EMISSOR" ? "issuer" : "";
    const kind = possibleKind && hasHelpEntry(possibleKind, value) ? possibleKind : "";
    const icon = kind === "rule" ? "!" : "i";
    const title = kind === "rule" ? "Passe o mouse para ver orientação da regra" : "Passe o mouse para ver particularidades do emissor";
    const help = kind ? `<button class="sac-help-btn" data-help-kind="${kind}" data-help-value="${escapeHtml(clean(value, ""))}" aria-label="${escapeHtml(title)}" title="${escapeHtml(title)}">${icon}</button>` : "";
    return `<div class="sac-kv ${missing ? "sac-missing" : ""} ${cls}">${help}<div class="sac-kv-label">${escapeHtml(label)}</div><div class="sac-kv-value">${escapeHtml(clean(value))}</div></div>`;
  }
  function kvOptional(label, value, cls = "") {
    const possibleKind = getHelpMode() && normalize(label) === "REGRA" ? "rule" : getHelpMode() && normalize(label) === "EMISSOR" ? "issuer" : "";
    const kind = possibleKind && hasHelpEntry(possibleKind, value) ? possibleKind : "";
    const icon = kind === "rule" ? "!" : "i";
    const title = kind === "rule" ? "Passe o mouse para ver orientação da regra" : "Passe o mouse para ver particularidades do emissor";
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
  function enableManualGridEditing(panel, data) {
    panel.addEventListener("click", async (event) => {
      const cell = event.target.closest(".sac-kv");
      if (!cell || cell.querySelector("input")) return;
      if (!getSafeMode()) return;
      const value = textOf(cell.querySelector(".sac-kv-value"));
      const label = textOf(cell.querySelector(".sac-kv-label")) || "Dado";
      if (!value) return;
      await copyText(value);
      cell.classList.add("sac-copied");
      setTimeout(() => cell.classList.remove("sac-copied"), 650);
      showNotice(`${label} copiado.`, "info", 2600);
    });
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
      startWidth = panel.classList.contains("sac-listas-panel") ? rect.width : 420;
      if (!panel.classList.contains("sac-listas-panel")) {
        panel.style.setProperty("--sac-panel-width", "420px", "important");
        ["inline-size", "width", "min-inline-size", "min-width", "max-inline-size", "max-width"]
          .forEach((property) => panel.style.setProperty(property, "420px", "important"));
      }
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
      panel.style.left = `${clamp(startLeft + dx, 0, maxLeft)}px`;
      panel.style.top = `${clamp(startTop + dy, 0, maxTop)}px`;
      if (panel.id === "sac-panel-console") placePidPanel();
      syncSidePanels(panel);
      event.preventDefault();
    };
    const stop = (event) => {
      armed = false;
      dragging = false;
      document.body.style.userSelect = previousUserSelect;
      try { handle.releasePointerCapture?.(event?.pointerId); } catch (_err) {}
    };
    if (window.PointerEvent) {
      handle.addEventListener("pointerdown", start);
      document.addEventListener("pointermove", move, true);
      document.addEventListener("pointerup", stop, true);
      document.addEventListener("pointercancel", stop, true);
    } else {
      handle.addEventListener("mousedown", start);
      document.addEventListener("mousemove", move, true);
      document.addEventListener("mouseup", stop, true);
      handle.addEventListener("touchstart", start, { passive: false });
      document.addEventListener("touchmove", move, { passive: false });
      document.addEventListener("touchend", stop, true);
    }
  }

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
  function normalizeStatusOption(value) {
    const text = clean(value);
    const status = normalize(text);
    if (status === "ATIVA" || status === "ATIVO") return "ativo";
    if (status === "NORMAL") return "normal";
    if (status === "CANCELADO" || status === "CANCELADA") return "cancelada";
    if (status === "BLOQUEIO PREVENCAO" || status === "BLOQUEIO PREVENTIVO FALCON" || status === "BLOQUEIO PREVENTIVO FALCON 254") return "bloqueio preventivo falcon 254";
    const mapped = STATUS_OPTIONS.find((option) => normalize(option) === status);
    return mapped || text.toLowerCase();
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
  function falconCaseNumber() {
    const label = byId("csOvwFrm:TabView:CaSmLbCaseNumber");
    if (label && !normalize(textOf(label)).includes("NUMERO DO CASO")) return "";
    return numericCase(idText("csOvwFrm:TabView:CaSmDtCaseNumber"));
  }
  function idPrefixText(prefix, preferredSuffix = "", sourceRows = []) {
    const nodes = all("[id]").filter((node) => String(node.id || "").startsWith(prefix));
    if (preferredSuffix) {
      const exact = nodes.find((node) => node.id.endsWith(`_${preferredSuffix}`));
      if (exact) return textOf(exact);
    }
    for (const row of sourceRows.filter(Boolean)) {
      const inRow = all("[id]", row).find((node) => String(node.id || "").startsWith(prefix) && textOf(node));
      if (inRow) return textOf(inRow);
    }
    return textOf(nodes.find((node) => textOf(node)));
  }
  function rowElementLooksOrange(row) {
    if (!row) return false;
    const exact = all("td", row).some((td) => td.style.backgroundColor === "rgb(239, 130, 0)");
    if (exact) return true;
    const nodes = [row, ...all("td,div,span", row).slice(0, 16)];
    return nodes.some((node) => {
      const rgb = getComputedStyle(node).backgroundColor.match(/\d+(\.\d+)?/g)?.map(Number) || [];
      return rgb.length >= 3 && rgb[0] >= 180 && rgb[1] >= 70 && rgb[1] <= 190 && rgb[2] <= 130;
    });
  }
  function selectFalconTransactionCheckbox() {
    const orange = orangeFalconRow();
    if (!orange) return all("input[id*='caseTranGridVwColSelCheckBox']:checked")[0] || null;
    const inputs = all("input[id*='caseTranGridVwColSelCheckBox']", orange);
    const candidate = inputs.find((input) => input.checked) || inputs[0];
    if (candidate && !candidate.checked) {
      try { candidate.click(); } catch (_err) {}
      if (!candidate.checked) {
        candidate.checked = true;
        candidate.dispatchEvent(new Event("input", { bubbles: true }));
        candidate.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
    return candidate;
  }
  function selectHoldActionCheckbox() {
    const checkbox = all("input[type='checkbox']").find((input) => {
      const descriptor = `${input.name || ""} ${input.value || ""} ${input.id || ""}`;
      return normalize(descriptor).includes("HOLD") && normalize(descriptor).includes("ACTION");
    });
    if (!checkbox) return { found: false, selected: false };
    if (!checkbox.checked) {
      try { checkbox.click(); } catch (_err) {}
      if (!checkbox.checked) {
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event("input", { bubbles: true }));
        checkbox.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
    return { found: true, selected: checkbox.checked };
  }
  function selectHoldRowsCheckboxes() {
    let selected = 0;
    let found = 0;
    all("tr,[role='row']").forEach((row) => {
      const checkbox = all("input[id*='caseTranGridVwColSelCheckBox']", row)[0];
      if (!checkbox) return;
      const ruleNode = all("[id*='RULESTEXT_VALUE'],[id*='RULES_TEXT'],[data-column*='rule']", row)[0];
      const rule = clean(textOf(ruleNode), "");
      const isHoldRow = Boolean(rule) && normalize(rule).includes("HOLD");
      if (!isHoldRow && checkbox.checked) {
        try { checkbox.click(); } catch (_err) {}
        if (checkbox.checked) {
          checkbox.checked = false;
          checkbox.dispatchEvent(new Event("input", { bubbles: true }));
          checkbox.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
      if (!isHoldRow) return;
      found += 1;
      if (!checkbox.checked) {
        try { checkbox.click(); } catch (_err) {}
        if (!checkbox.checked) {
          checkbox.checked = true;
          checkbox.dispatchEvent(new Event("input", { bubbles: true }));
          checkbox.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
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
    const exactCell = all("td").find((td) => td.style.backgroundColor === "rgb(239, 130, 0)");
    const exactRow = exactCell?.parentElement || null;
    return exactRow || all("tr,[role='row']").find(rowElementLooksOrange) || null;
  }
  function falconHistoryNode() {
    return all("[id]").find((node) => String(node.id || "").startsWith("csInvFrm:csInvTbVw:resultGrid:USER_DATA_20_STRG_VALUE") && textOf(node));
  }
  function falconRowContext() {
    const checkbox = selectFalconTransactionCheckbox();
    const orangeRow = orangeFalconRow();
    const row = orangeRow || closestGridRow(checkbox);
    const historyRow = closestGridRow(falconHistoryNode());
    const rows = uniqueNodes([row, historyRow]);
    return {
      checkbox,
      orangeRow,
      row,
      rows,
      rowIndex: checkbox?.id?.match(/_(\d+)$/)?.[1] || "",
      text: rows.map(textOf).filter(Boolean).join(" ")
    };
  }
  function textByPrefixes(prefixes, context) {
    for (const prefix of prefixes) {
      const value = clean(idPrefixText(prefix, context.rowIndex, context.rows), "");
      if (value) return value;
    }
    return "";
  }
  function valueFromFalconRow(context) {
    return clean(context.text.match(/(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})\b/)?.[1], "");
  }
  function dateFromFalconRow(context) {
    return clean(context.text.match(/\b\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2}\b/)?.[0] || context.text.match(/\b\d{2}\/\d{2}\/\d{4}\b/)?.[0], "");
  }
  function ruleFromFalconRow(context) {
    return clean(context.text.match(/\b[A-Z0-9]{2,}(?:_[A-Z0-9]{2,})+\b/)?.[0], "");
  }
  function historyFromFalconPage(context) {
    const candidates = [];
    const pushHistoryNodes = (root) => {
      all("[id*='USER_DATA_20']", root).forEach((node) => {
        const code = extractHistoryCode(textOf(node));
        if (code) candidates.push(code);
      });
    };
    if (context.orangeRow) pushHistoryNodes(context.orangeRow);
    context.rows.forEach(pushHistoryNodes);
    pushHistoryNodes(document);
    return candidates.find(Boolean) || "";
  }
  function readOriginalOrangeRowData(context) {
    const data = { value: "", rule: "", date: "", history: "", historyFound: false, merchant: "", decision: "", payment: "" };
    const row = context.orangeRow || context.row;
    if (!row) return data;
    all("td,span,label", row).forEach((el) => {
      const text = textOf(el);
      const id = el.id || "";
      if (!data.date && /\d{2}\/\d{2}\/\d{4}.*:/.test(text)) data.date = text;
      if (!data.value && /^[0-9]{1,3}(\.[0-9]{3})*,[0-9]{2}$/.test(text) && !id.includes("RULE")) data.value = text;
      if (!data.rule && (id.includes("RULESTEXT") || /Nega_|Lista/.test(text) || /\b[A-Z0-9]{2,}(?:_[A-Z0-9]{2,})+\b/.test(text))) data.rule = text;
      if (!data.history && id.includes("USER_DATA_20")) {
        data.history = text;
        data.historyFound = true;
      }
      if (!data.merchant && id.includes("MERCHANT_NAME")) data.merchant = text;
      if (!data.decision && id.includes("FALCON_DECISION_CODE")) data.decision = text;
      if (!data.payment && id.includes("TRANSACTION_POSTING_ENTRY_XFLG")) data.payment = text;
    });
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

  // ========================= FALCON: COLETA =========================
  function collectFalconData() {
    const context = falconRowContext();
    const orangeData = readOriginalOrangeRowData(context);
    const caseNumber = falconCaseNumber();
    const overviewType = idText("csOvwFrm:TabView:CaSmDtTranType");
    const panelTransactionType = falconPanelLabelValue("Tipo de transação");
    const cardNumber = idText("ServiceNumLink");
    const cardLast4 = last4(cardNumber);
    const transactionTypeText = overviewType || panelTransactionType;
    const cardByTransactionType = isCardTransactionType(transactionTypeText);
    const rule = clean(
      orangeData.rule
      || textByPrefixes(["csInvFrm:csInvTbVw:resultGrid:RULESTEXT_VALUE1", "csInvFrm:csInvTbVw:resultGrid:RULES_TEXT"], context)
      || ruleFromFalconRow(context)
    );
    const holdByRule = isHoldRule(rule);
    const flow = (cardByTransactionType || cardLast4) ? "card" : "banking";
    const visualFlow = flow === "banking" && holdByRule ? "hold" : flow;
    const historyRaw = flow === "card" ? "" : (orangeData.history || historyFromFalconPage(context) || textByPrefixes(["csInvFrm:csInvTbVw:resultGrid:USER_DATA_20_STRG_VALUE"], context));
    const paymentCode = orangeData.payment || textByPrefixes(["csInvFrm:csInvTbVw:resultGrid:TRANSACTION_POSTING_ENTRY_XFLG_VALUE"], context);
    const transactionDecision = orangeData.decision || textByPrefixes(["csInvFrm:csInvTbVw:resultGrid:FALCON_DECISION_CODE_VALUE"], context) || clean(context.text.match(/\b(approve|decline)\b/i)?.[0], "");
    const merchant = orangeData.merchant || textByPrefixes(["csInvFrm:csInvTbVw:resultGrid:MERCHANT_NAME_VALUE"], context);
    const value = orangeData.value || textByPrefixes(["csInvFrm:csInvTbVw:resultGrid:TRANSACTION_AMT_VALUE", "csInvFrm:csInvTbVw:resultGrid:TRANSACTION_AMOUNT_VALUE"], context) || valueFromFalconRow(context);
    const transactionDate = orangeData.date || textByPrefixes(["csInvFrm:csInvTbVw:resultGrid:TRANSACTION_DTTM_VALUE", "csInvFrm:csInvTbVw:resultGrid:TRANSACTION_DATE_VALUE"], context) || dateFromFalconRow(context);
    const data = {
      type: EXPORT_FALCON,
      flow,
      visualFlow,
      orangeFound: Boolean(context.orangeRow),
      holdByRule,
      cardByTransactionType,
      sourceTransactionType: clean(transactionTypeText),
      caseNumber,
      rowIndex: context.rowIndex,
      cardNumber: flow === "card" ? cardNumber : "N/A",
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
      cardNumber: "N/A",
      cardLast4: "",
      transactionType: "N/A",
      transactionDecision: "N/A",
      merchant: "N/A",
      value: "N/A",
      rule: "N/A",
      history: "0000000000",
      historyFound: false,
      transactionDate: "N/A"
    };
  }

  function findIssuer() {
    const menu = document.querySelector(".userGuide-company-menu button");
    if (menu && textOf(menu)) return clean(textOf(menu));
    for (const button of all("button")) {
      const text = textOf(button);
      if (button.querySelector("svg") && text && !/Backoffice/i.test(text) && text.length < 60) return clean(text);
    }
    return "N/A";
  }
  // ========================= CONSOLE: COLETA ========================
  function findTreatment() {
    const labels = all("button").map(textOf).map(normalize);
    if (labels.includes("GLOBAL BACKOFFICE")) return TREATMENT.global.label;
    if (labels.includes("BACKOFFICE BRASIL")) return TREATMENT.brasil.label;
    const text = all("button,a,.c-breadcrumb__li").map(textOf).find((item) => /^(Backoffice\s+Global|Global\s+Backoffice)$/i.test(item)) || "";
    const globalStructure = document.querySelector(
      ".global-backoffice-home-container,[class*='global-backoffice'],.accounts-details-registration-date,[data-testid='sub-account-details-box-base']"
    );
    if (/global-backoffice/i.test(location.pathname) || globalStructure || normalize(text).includes("GLOBAL")) return TREATMENT.global.label;
    return TREATMENT.brasil.label;
  }
  function treatmentKindOf(value) {
    const globalStructure = document.querySelector(
      ".global-backoffice-home-container,[class*='global-backoffice'],.accounts-details-registration-date,[data-testid='sub-account-details-box-base']"
    );
    return normalize(value).includes("GLOBAL") || /global-backoffice/i.test(location.pathname) || globalStructure ? "global" : "brasil";
  }
  function findConsoleCpfCnpj() {
    return clean(findDocumentInText(bodyText()));
  }
  function findValueAfterLabel(label) {
    const wanted = normalize(label);
    for (const container of all(".grid-container-info,.c-grid--container,div,section,li")) {
      const children = Array.from(container.children || []);
      if (children.length < 2) continue;
      const labelIndex = children.findIndex((child) => normalize(textOf(child)) === wanted);
      if (labelIndex >= 0) {
        const value = children.slice(labelIndex + 1).map(textOf).find(Boolean);
        if (value && normalize(value) !== wanted) return clean(value, "");
      }
    }
    for (const node of all("p,span,label,div")) {
      if (normalize(textOf(node)) !== wanted) continue;
      const value = textOf(node.parentElement?.nextElementSibling) || textOf(node.nextElementSibling);
      if (value && normalize(value) !== wanted) return clean(value, "");
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
    const text = bodyText();
    return clean(text.match(/\b\d{2}\/\d{2}\/\d{4}\b/)?.[0] || text.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0]);
  }
  function findAccountNumber() {
    return clean(textOf(document.querySelector(".account-data")) || all("[data-testid^='cropped-id']").map((node) => node.dataset.testid || "").find(Boolean)?.replace(/^cropped-id-/, ""));
  }
  function findAccountStatus() {
    const global = all("div[data-state='closed'][type='button']").map(textOf).find((text) => /Ativa|Bloque|Normal|Cancel/i.test(text));
    const chip = textOf(document.querySelector(".c-chip__label"));
    return clean(global || chip);
  }
  function tableColumn(row, columnIndex) {
    return all("[data-testid]", row).find((node) => {
      const id = node.getAttribute("data-testid") || "";
      return id === `column_0_${columnIndex}` || new RegExp(`^column_\\d+_${columnIndex}$`).test(id);
    }) || null;
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
    return all("tbody tr.c-table__row,tbody tr", table).filter((row) => tableColumn(row, 0) && tableColumn(row, 1) && tableColumn(row, 2) && tableColumn(row, 3));
  }
  async function ensureCardGridOpen() {
    if (consoleCardRows().length) return true;
    const accordion = document.querySelector("[data-testid='cards-accordion'],.accordion-cards")
      || all(".c-accordion").find((node) => normalize(node.getAttribute("title") || textOf(node.querySelector(".accordion-summary"))) === "CARTOES");
    const trigger = accordion?.querySelector(".c-accordion__summary,[data-testid='cards-accordion-summary']")
      || all("button,a,[role='button']").find((node) => normalize(textOf(node)) === "CARTOES");
    if (!trigger) return false;
    try { trigger.click(); } catch (_err) {}
    return waitForField(() => consoleCardRows().length > 0, 24, 100);
  }
  function findCardConsoleData(lastDigits) {
    const rows = consoleCardRows();
    const targetLast4 = clean(lastDigits, "");
    if (!targetLast4 || targetLast4.length !== 4) {
      return { cardId: "N/A", cardNumber: "N/A", cardLast4: "N/A", cardType: "N/A", cardStatus: "N/A", matched: false };
    }
    const matchedRow = rows.find((tr) => {
      const cardText = digitsOnly(textOf(tableColumn(tr, 1)));
      return cardText.endsWith(targetLast4);
    });
    if (!matchedRow) {
      return { cardId: "N/A", cardNumber: "N/A", cardLast4: targetLast4, cardType: "N/A", cardStatus: "N/A", matched: false };
    }
    const cardNumber = clean(textOf(tableColumn(matchedRow, 1)));
    const statusCell = tableColumn(matchedRow, 3);
    return {
      cardId: clean(textOf(tableColumn(matchedRow, 0))),
      cardNumber,
      cardLast4: last4(cardNumber) || targetLast4,
      cardType: clean(textOf(tableColumn(matchedRow, 2))),
      cardStatus: clean(textOf(statusCell?.querySelector(".c-chip__label")) || textOf(statusCell)),
      matched: true
    };
  }

  async function loadFalconPackage() {
    const stored = readJson("lastFalcon");
    const shared = memory.transport.get("falcon");
    let clipboardPackage = null;
    const pasted = await navigator.clipboard?.readText?.().catch(() => "");
    if (pasted?.startsWith(`${EXPORT_FALCON}::`)) {
      try {
        const data = JSON.parse(pasted.slice(`${EXPORT_FALCON}::`.length));
        if (isCurrentPackage(data, EXPORT_FALCON)) clipboardPackage = data;
      } catch (_err) {}
    }
    const selected = [stored, shared, clipboardPackage]
      .filter((data) => isCurrentPackage(data, EXPORT_FALCON))
      .sort((a, b) => Number(b.savedAt || 0) - Number(a.savedAt || 0))[0] || null;
    if (selected) writeJson("lastFalcon", selected);
    else if (stored) storageRemove("lastFalcon");
    return selected;
  }
  async function loadConsolePackage() {
    const stored = readJson("lastConsole");
    const shared = memory.transport.get("console");
    let clipboardPackage = null;
    const pasted = await navigator.clipboard?.readText?.().catch(() => "");
    if (pasted?.startsWith(`${EXPORT_CONSOLE}::`)) {
      try {
        const data = JSON.parse(pasted.slice(`${EXPORT_CONSOLE}::`.length));
        if (isCurrentPackage(data, EXPORT_CONSOLE)) clipboardPackage = data;
      } catch (_err) {}
    }
    const selected = [stored, shared, clipboardPackage]
      .filter((data) => isCurrentPackage(data, EXPORT_CONSOLE))
      .sort((a, b) => Number(b.savedAt || 0) - Number(a.savedAt || 0))[0] || null;
    if (selected) writeJson("lastConsole", selected);
    else if (stored) storageRemove("lastConsole");
    return selected;
  }
  function isCurrentPackage(data, type) {
    if (!data || data.type !== type) return false;
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
    const data = collectFalconData();
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
    const save = async () => {
      if (missing.length) {
        if (getSafeMode()) {
          showNotice(`Ainda faltam dados: ${missing.join(", ")}. Veja os grids em laranja e tente novamente.`, "error");
          return;
        }
        showNotice(`Atenção: faltam dados (${missing.join(", ")}), mas o modo seguro está desligado.`, "warn");
      }
      const packageData = { ...data, buildFamily: BUILD_FAMILY, buildVersion: BUILD_VERSION, savedAt: Date.now() };
      writeJson("lastFalcon", packageData);
      storageRemove("lastConsole");
      memory.transport.set("falcon", packageData);
      memory.transport.clear("console");
      await copyText(`${EXPORT_FALCON}::${JSON.stringify(packageData)}`);
      showNotice("Falcon finalizado. Abra o Console para continuar.", "success");
      closeAuxiliaryPanels("sac-panel-falcon");
      closeSidePanels("sac-panel-falcon");
      byId("sac-panel-falcon")?.remove();
    };
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
  function falconGrid(data, options = {}) {
    const common = kv("Caso", data.caseNumber) + kv("Valor", `R$ ${data.value}`) + kv("Regra", data.rule) + kv("Data/Hora", trimTimeToMinute(data.transactionDate));
    const historyGrid = data.flow === "card" ? "" : kv("Histórico de infrações", formatHistoryValue(data.history), historyLevel(data.history, data.historyFound));
    if (data.flow === "card") {
      const cardIdentity = data.cardByTransactionType ? kv("Tipo transação", data.sourceTransactionType) : kv("Cartão", data.cardNumber);
      return `<div class="sac-grid three">${cardIdentity}${kv("Estabelecimento", data.merchant)}${kvOptional("Tipo compra cartão", data.transactionType)}${kv("Decisão transação", data.transactionDecision)}${common}</div>`;
    }
    const transactionClass = options.enhancePix && normalize(data.transactionType).includes("PIX") ? "sac-pix-grid" : "";
    return `<div class="sac-grid three">${kv("Tipo transação", data.transactionType, transactionClass)}${common}${historyGrid}</div>`;
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
    return {
      type: EXPORT_CONSOLE,
      flow,
      visualFlow: falcon?.visualFlow || flow,
      falcon,
      treatment,
      treatmentKind,
      treatmentLabel: TREATMENT[treatmentKind].label,
      isGlobal,
      account: findAccountNumber(),
      accountStatus: normalizeStatusOption(findAccountStatus()),
      cpfCnpj: findConsoleCpfCnpj(),
      registrationDate: findRegistrationDate(),
      issuer: findIssuer(),
      cardId: card.cardId || "N/A",
      cardNumber: card.cardNumber || "N/A",
      cardLast4: card.cardLast4 || "N/A",
      cardType: card.cardType || "N/A",
      cardStatus: card.cardStatus || "N/A",
      cardMatched: card.matched !== false,
      cardDataOptional: globalCardWithoutData,
      fields: defaultConsoleFields(flow, isGlobal)
    };
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

  // ========================= CONSOLE: JANELA ========================
  async function renderConsole() {
    const falcon = await loadFalconPackage();
    if (falcon?.flow === "card") await ensureCardGridOpen();
    const data = collectConsoleData(falcon || emptyFalconData());
    const isCard = data.flow === "card";
    const fields = isCard ? cardFields(data) : bankingFields(data);
    const save = async () => {
      data.jiraActive = Boolean(byId("sac-jira-flag")?.checked);
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
      const packageData = { ...data, buildFamily: BUILD_FAMILY, buildVersion: BUILD_VERSION, savedAt: Date.now() };
      writeJson("lastConsole", packageData);
      memory.transport.set("console", packageData);
      await copyText(`${EXPORT_CONSOLE}::${JSON.stringify(packageData)}`);
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
        body: section("Dados do Falcon", falconGrid(data.falcon, { enhancePix: true }), "recebidos")
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
    const body = section("Dados do Falcon", falconGrid(data.falcon, { enhancePix: true }), "recebidos")
      + section("Dados do Console", consoleGrid(data), "coletados")
      + section("Chamada", consoleFlagControls(data), "opcional")
      + section("Dropdowns de análise", `<div class="sac-field-grid">${fields}</div>`, "padrão V1");
    const panel = renderPanel({
      id: "sac-panel-console",
      stage: "CONSOLE",
      flow: data.visualFlow,
      subtitle: "Conferência e análise",
      body,
      footer: `<button class="sac-main" id="sac-save-console">Finalizar etapa</button>`,
      onEnter: save
    });
    byId("sac-save-console")?.addEventListener("click", save);
    byId("sac-jira-flag")?.addEventListener("change", (event) => {
      data.jiraActive = Boolean(event.currentTarget.checked);
      const label = event.currentTarget.closest(".sac-jira-toggle");
      label?.classList.toggle("on", data.jiraActive);
      const state = label?.querySelector("b");
      if (state) state.textContent = data.jiraActive ? "Ligado" : "Desligado";
    });
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
      const enabled = Boolean(modeToggle?.checked);
      if (resultToggle) {
        resultToggle.disabled = !enabled;
        if (!enabled) resultToggle.checked = false;
      }
      const modeLabel = modeToggle?.closest(".sac-toggle");
      const resultLabel = resultToggle?.closest(".sac-toggle");
      modeLabel?.classList.toggle("on", enabled);
      modeLabel?.setAttribute("aria-pressed", enabled ? "true" : "false");
      modeLabel?.querySelector("b") && (modeLabel.querySelector("b").textContent = enabled ? "Ligado" : "Desligado");
      const success = Boolean(resultToggle?.checked);
      resultLabel?.classList.toggle("on", enabled && success);
      resultLabel?.setAttribute("aria-disabled", enabled ? "false" : "true");
      resultLabel?.setAttribute("aria-pressed", enabled && success ? "true" : "false");
      resultLabel?.querySelector("b") && (resultLabel.querySelector("b").textContent = enabled ? (success ? "Com sucesso" : "Sem sucesso") : "Sem chamada");
      data.fields.callMode = enabled ? "com chamada" : "sem chamada";
      data.fields.callResult = enabled ? (success ? "com sucesso" : "sem sucesso") : "";
      if (data.flow === "card" && enabled) openPidPanel(data);
      else closePidPanel();
    };
    all("#sac-call-mode-toggle,#sac-call-result-toggle", panel).forEach((input) => input.addEventListener("change", syncCallToggles));
    syncCallToggles();
    enableManualGridEditing(panel, data);
    if (data.cardDataOptional) {
      showNotice("Global Backoffice sem dados de cartão: os campos foram preenchidos como ausência de dados e o fluxo pode continuar.", "info", 11000);
    }
    if (!falcon) showNotice("Sem pacote salvo do Falcon. Alguns campos podem ficar N/A.", "warn");
  }
  function consoleGrid(data, options = {}) {
    const includeAccountStatus = options.includeAccountStatus !== false;
    if (data.flow === "card") {
      if (data.cardMatched === false) {
        return `<div class="sac-grid">${kv("Cartões", "ACESSE CARTÕES", "sac-missing sac-single-alert")}</div>`;
      }
      return `<div class="sac-grid three">${kv("CPF/CNPJ", data.cpfCnpj)}${kv("Emissor", data.issuer)}${kv("ID cartão", data.cardId)}${kv("Final cartão", data.cardLast4)}${kv("Tipo cartão", data.cardType)}${kv("Status cartão", data.cardStatus)}${kv("Cadastro", data.registrationDate, alertIf(isRecentRegistration(data.registrationDate)))}</div>`;
    }
    return `<div class="sac-grid three">${kv("CPF/CNPJ", data.cpfCnpj)}${kv("Emissor", data.issuer)}${kv("Conta", data.account)}${includeAccountStatus ? kv("Status conta", data.accountStatus, accountStatusAlert(data.accountStatus)) : ""}${kv("Cadastro", data.registrationDate, alertIf(isRecentRegistration(data.registrationDate)))}</div>`;
  }
  function consoleFlagControls(data) {
    const mode = normalize(data.fields.callMode) === "COM CHAMADA" ? "com chamada" : "sem chamada";
    const result = normalize(data.fields.callResult) === "COM SUCESSO" ? "com sucesso" : normalize(data.fields.callResult) === "SEM SUCESSO" ? "sem sucesso" : "";
    const callEnabled = mode === "com chamada";
    const success = result === "com sucesso";
    return `
      <div class="sac-console-flags">
        <label class="sac-toggle sac-jira-toggle ${data.jiraActive ? "on" : ""}" aria-pressed="${data.jiraActive ? "true" : "false"}"><input type="checkbox" id="sac-jira-flag" ${data.jiraActive ? "checked" : ""} hidden><span class="sac-switch"></span><span>JIRA</span><b>${data.jiraActive ? "Ligado" : "Desligado"}</b></label>
        <label class="sac-toggle ${callEnabled ? "on" : ""}" aria-pressed="${callEnabled ? "true" : "false"}"><input type="checkbox" id="sac-call-mode-toggle" ${callEnabled ? "checked" : ""} hidden><span class="sac-switch"></span><span>Com chamada</span><b>${callEnabled ? "Ligado" : "Desligado"}</b></label>
        <label class="sac-toggle ${callEnabled && success ? "on" : ""}" aria-disabled="${callEnabled ? "false" : "true"}" aria-pressed="${callEnabled && success ? "true" : "false"}"><input type="checkbox" id="sac-call-result-toggle" ${success ? "checked" : ""} ${callEnabled ? "" : "disabled"} hidden><span class="sac-switch"></span><span>Com sucesso</span><b>${callEnabled ? (success ? "Ligado" : "Desligado") : "Sem chamada"}</b></label>
      </div>`;
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
    const callState = {
      callMode: byId("sac-call-mode-toggle")?.checked ? "com chamada" : "sem chamada",
      callResult: byId("sac-call-mode-toggle")?.checked ? (byId("sac-call-result-toggle")?.checked ? "com sucesso" : "sem sucesso") : ""
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

  // ========================= TABULADOR ==============================
  async function renderTabulator(existingData = null) {
    window.__SAC_TABULATOR_DECISION_PANEL_ACTIVE__ = true;
    unlockTabulatorFieldLock();
    stopTabulatorWriting();
    const storedConsole = existingData ? null : await loadConsolePackage();
    const data = existingData || storedConsole || collectConsoleData(await loadFalconPackage() || emptyFalconData());
    loadIssuerDirectory();
    const missing = requiredWorkflow(data);
    const decisionButtons = DECISIONS.map((decision, index) => {
      const tone = ["danger", "success", "warning", "info"][index];
      return `<button class="sac-decision ${tone}" data-decision-index="${index}" data-decision="${escapeHtml(decision)}">${escapeHtml(decision.replace("NÃO FOI POSSÍVEL CONFIRMAR FRAUDE", "NÃO FOI POSSÍVEL\nCONFIRMAR FRAUDE").replace("NÃO FOI POSSÍVEL CONFIRMAR NÃO FRAUDE", "NÃO FOI POSSÍVEL\nCONFIRMAR NÃO FRAUDE"))}</button>`;
    }).join("");
    const body = section("Dados do Falcon", falconGrid(data.falcon, { enhancePix: true }), "análise")
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
      return kv("Chamada", data.fields?.callMode || "sem chamada") + result;
    };
    if (data.flow === "card") {
      return `<div class="sac-grid">${callGrid()}${kv("Histórico no estabelecimento", data.fields.merchantHistory, cardReviewAlert(data.fields.merchantHistory))}${kv("Padrão de compra", data.fields.purchasePattern, cardReviewAlert(data.fields.purchasePattern))}</div>`;
    }
    const personStatusGrid = data.isGlobal ? "" : kv("Status Pessoa (SPD)", data.fields.personStatus, dropdownAlert(data.fields.personStatus, STATUS_OPTIONS));
    const spdHistoryGrid = data.isGlobal ? "" : kv("Histórico SPD", data.fields.spdHistory, dropdownAlert(data.fields.spdHistory, HISTORY_SPD));
    const documentationGrid = data.isGlobal ? "" : kv("Documentação", data.fields.documentation, dropdownAlert(data.fields.documentation, DOC_OPTIONS));
    return `<div class="sac-grid three">${callGrid()}${personStatusGrid}${spdHistoryGrid}${kv("Mídia desabonadora", data.fields.badMedia, dropdownAlert(data.fields.badMedia, MEDIA_OPTIONS))}${kv("E-mail, DDD e Endereço", data.fields.emailPhoneAddress, dropdownAlert(data.fields.emailPhoneAddress, EMAIL_OPTIONS))}${documentationGrid}${kv("Extrato", data.fields.statement, dropdownAlert(data.fields.statement, STATEMENT_OPTIONS))}</div>`;
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
        setDecisionButtonsEnabled(panel, true);
        panel.dataset.decisionApplying = "false";
        return;
      }
      showNotice(`Atenção: inconsistência em ${workflowIssueMessage(data, missing)}, mas o modo seguro está desligado.`, "warn", 14000);
    }
    setDecisionProgress(panel, "Aplicando todos os campos no Tabulador. Apenas Motivo Status pode aguardar carregamento.");
    startTabulatorWriting();
    const application = applyTabulator(data, decision, text, isCurrentRun);
    const copied = copyText(text);
    await copied;
    if (!isCurrentRun()) {
      stopTabulatorWriting(panel);
      return;
    }
    showNotice("Decisão copiada. Aplicando os campos no Tabulador.", "info", 9000);
    setDecisionProgress(panel, "Campos aplicados. Aguardando apenas Motivo Status.");
    const applied = await application;
    if (applied.cancelled || !isCurrentRun()) {
      stopTabulatorWriting(panel);
      return;
    }
    const criticalPending = applied.pending.filter((label) => ["Fila", "Decisão", "Motivo status"].includes(label));
    if (criticalPending.length) {
      const location = tabulatorIssueMessage(criticalPending);
      showNotice(`Não foi possível confirmar: ${location}.`, "error", 15000);
      setDecisionProgress(panel, `Inconsistência obrigatória em: ${location}.`, "error");
      setDecisionButtonsEnabled(panel, true);
      stopTabulatorWriting(panel);
      return;
    }
    if (!applied.ok) {
      if (getSafeMode()) {
        const location = tabulatorIssueMessage(applied.pending);
        showNotice(`Revise a aplicação em: ${location}.`, "warn-pulse", 15000);
        setDecisionProgress(panel, `Inconsistência encontrada em: ${location}.`, "warn");
        setDecisionButtonsEnabled(panel, true);
        stopTabulatorWriting(panel);
        return;
      }
      showNotice(`Ação necessária: confira ${tabulatorIssueMessage(applied.pending)}.`, "warn-pulse", 15000);
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
    showNotice("Tudo certo: decisão e motivo status aplicados. A tabulação está pronta.", "success");
  }
  function showFinalTabulation(data, decision, text, panel, status = "") {
    panel.dataset.finalLocked = "true";
    panel.__sacListQueuePromise = updateListsForFinalDecision(data, decision);
    panel.querySelector(".sac-body").innerHTML =
      section("Tabulação pronta", `<textarea class="sac-textarea sac-final-textarea ${data.flow === "card" ? "sac-final-card" : ""}" id="sac-final-text" readonly>${escapeHtml(text)}</textarea>`, "final")
      + `<div class="sac-apply-status" id="sac-apply-status">${escapeHtml(status || "Tabulação pronta.")}</div>`
      + `<div class="sac-final-actions"><button class="sac-main" id="sac-copy-final" data-ready="false" disabled>Aguarde...</button><button class="sac-secondary" id="sac-change-decision">Mudar decisão</button></div>`;
    neutralizeAutomationButtons(panel);
    byId("sac-copy-final")?.addEventListener("click", async (event) => {
      if (event.currentTarget.dataset.ready !== "true") {
        showNotice("Ainda estou confirmando Fila, Decisão e Motivo Status no Tabulador.", "info");
        return;
      }
      event.currentTarget.disabled = true;
      const queue = await (panel.__sacListQueuePromise || updateListsForFinalDecision(data, decision));
      const history = addHistory(data, decision, text);
      await copyText(text, queue, history);
      if ((queue.length || history.length) && !clipboardEnvelopeReady) {
        showNotice("Tabulação copiada. LISTAS e Histórico foram mantidos na memória local da V8.", "warn", 11000);
      }
      showNotice("Tabulação copiada e fluxo finalizado.", "success");
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
    button.textContent = ready ? "Copiar" : "Aguarde...";
  }
  function updateFinalStatus(panel, message, type = "") {
    const status = panel.querySelector("#sac-apply-status");
    if (!status) return;
    status.textContent = message;
    status.className = `sac-apply-status ${type}`;
  }
  function buildTabulation(data, decision) {
    const f = data.falcon || {};
    const motive = String(data.decisionReason || "").trim();
    const motiveLines = motive ? [`Motivo: ${motive}`] : [];
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
      ...motiveLines,
      "",
      signatureText()
    ].join("\n");
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
      el.dispatchEvent(new Event("input", { bubbles: true }));
      if (!quiet) {
        el.dispatchEvent(new Event("change", { bubbles: true }));
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
    for (let attempt = 0; attempt < tries; attempt += 1) {
      if (!canWriteTabulator(isActive)) return false;
      for (const target of targets) {
        const element = targetElement(target);
        if (!element) continue;
        setNativeValue(element, value, { quiet: true });
        await wait(delay);
        if (!canWriteTabulator(isActive)) return false;
        if (fieldValueMatches(targetElement(target), value)) {
          await wait(20);
          if (fieldValueMatches(targetElement(target), value)) return true;
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
  function optionTargets(wanted) {
    const target = normalize(wanted);
    const aliases = new Map([
      ["CARTOES APROVADAS", ["CARTOES APROVADOS", "CARTAO APROVADO", "APROVADAS", "APPROVE", "APROVADA"]],
      ["CARTOES RECUSADAS", ["CARTOES REPROVADAS", "CARTOES RECUSADOS", "CARTOES REPROVADOS", "CARTAO RECUSADO", "DECLINE", "DECLINADA", "RECUSADA", "REPROVADA"]],
      ["ATIVA - PLANILHA", ["ATIVO - PLANILHA", "ATIVA PLANILHA", "ATIVO PLANILHA"]],
      ["SEM CONTATO - PLANILHA", ["SEM CONTATO PLANILHA", "SEM CHAMADA - PLANILHA"]],
      ["SEM CHAMADA", ["SEM CONTATO", "SEM CONTATO - PLANILHA", "SEM CONTATO PLANILHA", "AUSENCIA DE CHAMADA"]],
      ["COM SUCESSO", ["SUCESSO"]],
      ["SEM SUCESSO", ["INSUCESSO", "SEM EXITO"]],
      ["DADOS INSUFICIENTES PARA ANALISE", ["DADOS INSUFICIENTES", "DADOS INSUFICIENTES PARA DECISAO"]],
      ["CLIENTE NAO ATENDE", ["CLIENTE NAO ATENDEU"]],
      ["FRAUDE TRANSACIONAL", []],
      ["SEM SUSPEITAS", ["SEM SUSPEITA"]]
    ]);
    return Array.from(new Set([target, ...(aliases.get(target) || [])].filter(Boolean)));
  }
  function optionMatches(option, wanted) {
    const targets = optionTargets(wanted);
    const text = normalize(option.textContent || "");
    const value = normalize(option.value || "");
    return targets.some((target) => text === target || value === target || text.includes(target) || value.includes(target));
  }
  function optionExactMatches(option, wanted) {
    const targets = optionTargets(wanted);
    const text = normalize(option.textContent || "");
    const value = normalize(option.value || "");
    return targets.some((target) => text === target || value === target);
  }
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
    return Boolean(selected && optionExactMatches(selected, wanted));
  }
  async function selectDropdown(id, wanted, tries = 18, isActive = () => true) {
    if (!canWriteTabulator(isActive) || isMissing(wanted)) return false;
    for (let attempt = 0; attempt < tries; attempt += 1) {
      if (!canWriteTabulator(isActive)) return false;
      const select = byId(id);
      if (select?.options?.length && tabulatorEngine.selectNow(id, wanted)) {
        await wait(35);
        if (!canWriteTabulator(isActive)) return false;
        const selected = byId(id)?.options?.[byId(id)?.selectedIndex];
        if (selected && optionMatches(selected, wanted)) {
          await wait(35);
          const confirmed = byId(id)?.options?.[byId(id)?.selectedIndex];
          if (confirmed && optionMatches(confirmed, wanted)) return true;
        }
      }
      if (select?.options?.length) {
        const option = all("option", select).find((candidate) => optionExactMatches(candidate, wanted))
          || all("option", select).find((candidate) => optionMatches(candidate, wanted));
        if (option && applySelectValue(select, option)) {
          await wait(35);
          if (!canWriteTabulator(isActive)) return false;
          const selected = byId(id)?.options?.[byId(id)?.selectedIndex];
          if (selected && optionMatches(selected, wanted)) return true;
        }
      }
      await wait(45);
    }
    return false;
  }
  async function selectDropdownByPattern(pattern, wanted, tries = 18, isActive = () => true) {
    if (!canWriteTabulator(isActive) || isMissing(wanted)) return false;
    for (let attempt = 0; attempt < tries; attempt += 1) {
      if (!canWriteTabulator(isActive)) return false;
      const select = all("select").find((element) => pattern.test(`${element.id || ""} ${element.name || ""}`));
      if (select?.options?.length) {
        const option = all("option", select).find((candidate) => optionExactMatches(candidate, wanted))
          || all("option", select).find((candidate) => optionMatches(candidate, wanted));
        if (option && applySelectValue(select, option)) {
          await wait(35);
          const selected = select.options?.[select.selectedIndex];
          if (selected && optionMatches(selected, wanted)) return true;
        }
      }
      await wait(45);
    }
    return false;
  }
  async function selectDependentDropdown(parentId, parentWanted, childId, childWanted, tries = 90, isActive = () => true) {
    if (!canWriteTabulator(isActive)) return false;
    if (isMissing(childWanted)) return true;
    await selectDropdown(parentId, parentWanted, 20, isActive);
    for (let attempt = 0; attempt < tries; attempt += 1) {
      if (!canWriteTabulator(isActive)) return false;
      if (attempt % 10 === 0) await selectDropdown(parentId, parentWanted, 1, isActive);
      if (await selectDropdown(childId, childWanted, 1, isActive)) return true;
      await wait(70);
    }
    return false;
  }
  async function selectIssuerDropdown(issuer, issuerId = "", isActive = () => true) {
    if (!canWriteTabulator(isActive)) return false;
    const resolvedId = issuerId || await issuerIdForName(issuer);
    if (resolvedId && await selectDropdown("ddl_idemissor", resolvedId, 24, isActive)) return true;
    if (await selectDropdown("ddl_idemissor", issuer, 24, isActive)) return true;
    const select = byId("ddl_idemissor");
    if (!select?.options?.length || !isActive()) return false;
    const target = normalize(issuer);
    const directory = await loadIssuerDirectory();
    const entry = directory.find((item) => issuerEntryMatches(item, issuer));
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
    return applySelectValue(select, option);
  }
  async function applyStatusDropdown(decision, isActive = () => true) {
    if (!canWriteTabulator(isActive)) return { statusOk: false, cancelled: true };
    const statusOk = isActive() && await selectDropdown("ddl_status", decision, 28, isActive);
    if (!canWriteTabulator(isActive)) return { statusOk: false, cancelled: true };
    return { statusOk: statusOk && dropdownSelectionMatches("ddl_status", decision) };
  }
  async function applyReasonDropdown(data, decision, isActive = () => true) {
    if (!canWriteTabulator(isActive)) return { reasonOk: false, cancelled: true };
    const reason = reasonForDecision(data.flow, decision);
    if (!reason) return { reasonOk: true };
    const reasonOk = await selectDependentDropdown("ddl_status", decision, "ddl_motivostatus", reason, 120, isActive);
    if (!canWriteTabulator(isActive)) return { reasonOk: false, cancelled: true };
    return { reasonOk: reasonOk && dropdownSelectionMatches("ddl_motivostatus", reason) };
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
  function reasonForDecision(flow, decision) {
    const d = normalize(decision);
    if (d === "FRAUDE") return "FRAUDE TRANSACIONAL";
    if (d === "NAO FRAUDE") return "SEM SUSPEITAS";
    if (flow === "card" && d === "NAO FOI POSSIVEL CONFIRMAR FRAUDE") return "CLIENTE NÃO ATENDE";
    if (d === "NAO FOI POSSIVEL CONFIRMAR FRAUDE") return "DADOS INSUFICIENTES PARA ANÁLISE";
    if (d === "NAO FOI POSSIVEL CONFIRMAR NAO FRAUDE") return "DADOS INSUFICIENTES PARA ANÁLISE";
    return "";
  }
  function tabulatorCallValues(data) {
    if (data.jiraActive) return { type: "RECEPTIVO", result: "COM SUCESSO" };
    if (normalize(data.fields?.callMode) === "COM CHAMADA") {
      return {
        type: "ATIVA - PLANILHA",
        result: normalize(data.fields?.callResult) === "COM SUCESSO" ? "COM SUCESSO" : "SEM SUCESSO"
      };
    }
    return { type: "SEM CONTATO - PLANILHA", result: "SEM CHAMADA" };
  }
  async function verifyDocumentAfterPageValidation(data, isActive = () => true) {
    const docKind = documentKind(data.cpfCnpj);
    const doc = documentFieldValue(data.cpfCnpj);
    if (!docKind || !doc) return ["CPF/CNPJ"];
    revealDocumentField(docKind);
    const targets = docKind === "CNPJ"
      ? [{ id: "txt_cnpj" }, { name: "_partial_Falcon.Cnpj" }, { pattern: /cnpj/i }]
      : [{ id: "txt_cpf" }, { name: "_partial_Falcon.Cpf" }, { pattern: /cpf/i }];
    const field = targetElement(targets[0]);
    if (!fieldValueMatches(field, doc)) await forceFillAny(targets, doc, 4, 18, isActive);
    if (!canWriteTabulator(isActive)) return ["CPF/CNPJ"];
    const activeField = targetElement(targets[0]);
    try { activeField?.dispatchEvent(new Event("blur", { bubbles: true })); } catch (_err) {}
    await wait(30);
    if (fieldValueMatches(targetElement(targets[0]), doc)) return [];
    return [docKind];
  }
  async function selectAndConfirmDropdown(id, wanted, label, missing, tries, isActive) {
    const selected = await selectDropdown(id, wanted, tries, isActive);
    const confirmed = selected && dropdownSelectionMatches(id, wanted);
    if (!confirmed) missing.push(label);
    return confirmed;
  }
  async function confirmTabulatorDropdowns(data, decision, isActive = () => true) {
    const missing = [];
    const checked = [];
    const addChecked = (label) => { if (label && !checked.includes(label)) checked.push(label); };
    const addMissing = (label) => { if (label && !missing.includes(label)) missing.push(label); };
    const confirm = async (id, wanted, label, tries = 18) => {
      if (isMissing(wanted)) return;
      addChecked(label);
      if (!dropdownSelectionMatches(id, wanted)) await selectDropdown(id, wanted, tries, isActive);
      if (!dropdownSelectionMatches(id, wanted)) addMissing(label);
    };

    if (!canWriteTabulator(isActive)) return { checked, missing, cancelled: true };

    const docKind = documentKind(data.cpfCnpj);
    const callValues = tabulatorCallValues(data);
    const queue = queueFor(data);
    const reason = reasonForDecision(data.flow, decision);

    if (docKind) await confirm("ddl_tipoDoc", docKind, "Tipo de documento", 24);
    if (byId("ddl_tabulador")) await confirm("ddl_tabulador", "Falcon", "Tabulador Falcon", 14);

    addChecked("Emissor");
    if (!await selectIssuerDropdown(data.issuer, data.issuerId, isActive)) addMissing("Emissor");

    await confirm("ddl_TipoChamada", callValues.type, "Tipo de chamada", 22);
    await confirm("ddl_ChamadaAtiva", callValues.result, "Status chamada", 22);

    if (queue) await confirm("ddl_Fila", queue, "Fila", 32);
    else {
      addChecked("Fila");
      addMissing(data.flow === "card" ? "Fila cartão/decisão da transação" : "Fila");
    }

    await confirm("ddl_status", decision, "Decisão", 24);
    if (reason) {
      addChecked("Motivo status");
      if (!dropdownSelectionMatches("ddl_motivostatus", reason)) {
        await selectDependentDropdown("ddl_status", decision, "ddl_motivostatus", reason, 90, isActive);
      }
      if (!dropdownSelectionMatches("ddl_motivostatus", reason)) addMissing("Motivo status");
    }

    return { checked, missing, cancelled: !canWriteTabulator(isActive) };
  }
  function primeTabulatorFields(data, decision, tabulationText) {
    if (!tabulatorWriteEnabled) return;
    const f = data.falcon || {};
    const ecValue = data.flow === "card" ? f.merchant : f.transactionType;
    fillAnyImmediate([{ id: "txt_ValorTransacao" }, { name: "_partial_Falcon.ValorTransacao" }, { pattern: /valor.*transa/i }], clean(f.value, "").replace("R$", "").trim());
    fillAnyImmediate([{ name: "_partial_Falcon.NumeroCaso" }, { id: "txt_NumeroCaso" }, { pattern: /numero.*caso|caso.*numero/i }], f.caseNumber);
    fillAnyImmediate([{ name: "_partial_Falcon.EcTransacao" }, { pattern: /ecTransacao|estabelecimento|tipoTransacao/i }], ecValue);
    fillAnyImmediate([{ name: "_partial_Falcon.RegraListada" }, { pattern: /regra.*list/i }], f.rule);
    fillAnyImmediate([{ id: "txt_obs" }, { name: "_partial_Falcon.Observacao" }, { pattern: /observa|descricao|comentario/i, selector: "textarea,input" }], tabulationText);
    if (f.transactionDate?.includes("/")) {
      const [date, time] = f.transactionDate.split(/\s+/);
      if (date) fillAnyImmediate([{ id: "txt_data_entrada" }, { name: "_partial_Falcon.DataEntrada" }, { pattern: /data.*entrada/i }], date.split("/").reverse().join("-"));
      if (time) fillAnyImmediate([{ id: "txt_hora_entrada" }, { name: "_partial_Falcon.HoraEntrada" }, { pattern: /hora.*entrada/i }], trimTimeToMinute(time));
    }
  }
  function fillObservationText(text) {
    if (!tabulatorWriteEnabled) return false;
    const targets = [{ id: "txt_obs" }, { name: "_partial_Falcon.Observacao" }, { pattern: /observa|descricao|comentario/i, selector: "textarea,input" }];
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
    await waitForTabulatorFields();
    if (!canWriteTabulator(isActive)) return { ok: false, pending, cancelled: true };
    const applyInput = (targets, value, label, tries = 5, delay = 18) =>
      forceFillAny(targets, value, tries, delay, isActive).then((ok) => {
        if (!ok) addPending(label);
        return ok;
      });

    primeTabulatorFields(data, "", "");
    const tasks = [
      applyInput([{ id: "txt_ValorTransacao" }, { name: "_partial_Falcon.ValorTransacao" }, { pattern: /valor.*transa/i }], clean(f.value, "").replace("R$", "").trim(), "Valor da transação"),
      applyInput([{ name: "_partial_Falcon.NumeroCaso" }, { id: "txt_NumeroCaso" }, { pattern: /numero.*caso|caso.*numero/i }], f.caseNumber, "Número do caso"),
      applyInput([{ name: "_partial_Falcon.EcTransacao" }, { pattern: /ecTransacao|estabelecimento|tipoTransacao/i }], data.flow === "card" ? f.merchant : f.transactionType, data.flow === "card" ? "Estabelecimento" : "Tipo de transação"),
      applyInput([{ name: "_partial_Falcon.RegraListada" }, { pattern: /regra.*list/i }], f.rule, "Regra")
    ];

    if (f.transactionDate?.includes("/")) {
      const [date, time] = f.transactionDate.split(/\s+/);
      if (date) tasks.push(applyInput([{ id: "txt_data_entrada" }, { name: "_partial_Falcon.DataEntrada" }, { pattern: /data.*entrada/i }], date.split("/").reverse().join("-"), "Data"));
      if (time) tasks.push(applyInput([{ id: "txt_hora_entrada" }, { name: "_partial_Falcon.HoraEntrada" }, { pattern: /hora.*entrada/i }], trimTimeToMinute(time), "Hora"));
    }

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
        ? [{ id: "txt_cnpj" }, { name: "_partial_Falcon.Cnpj" }, { pattern: /cnpj/i }]
        : [{ id: "txt_cpf" }, { name: "_partial_Falcon.Cpf" }, { pattern: /cpf/i }];
      return applyInput(targets, doc, docKind, 7, 18);
    })());

    const callValues = tabulatorCallValues(data);
    const queue = queueFor(data);
    tasks.push((async () => {
      if (byId("ddl_tabulador") && !await selectDropdown("ddl_tabulador", "Falcon", 20, isActive)) addPending("Tabulador Falcon");
    })());
    tasks.push(selectIssuerDropdown(data.issuer, data.issuerId, isActive).then((ok) => {
      if (!ok) addPending("Emissor");
      return ok;
    }));
    tasks.push(selectDropdown("ddl_TipoChamada", callValues.type, 26, isActive).then((ok) => {
      if (!ok || !dropdownSelectionMatches("ddl_TipoChamada", callValues.type)) addPending("Tipo de chamada");
      return ok;
    }));
    tasks.push(selectDropdown("ddl_ChamadaAtiva", callValues.result, 26, isActive).then((ok) => {
      if (!ok || !dropdownSelectionMatches("ddl_ChamadaAtiva", callValues.result)) addPending("Status chamada");
      return ok;
    }));
    if (!queue) {
      addPending(data.flow === "card" ? "Fila cartão/decisão da transação" : "Fila");
    } else {
      tasks.push((async () => {
        let ok = await selectDropdown("ddl_Fila", queue, 40, isActive);
        if (!ok) ok = await selectDropdown("ddl_Fila", queue, 20, isActive);
        if (!ok || !dropdownSelectionMatches("ddl_Fila", queue)) addPending("Fila");
      })());
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
    const observationTargets = [{ id: "txt_obs" }, { name: "_partial_Falcon.Observacao" }, { pattern: /observa|descricao|comentario/i, selector: "textarea,input" }];
    if (!fillObservationText(tabulationText) && !await forceFillAny(observationTargets, tabulationText, 10, 25, isActive)) addPending("Observações");

    const reasonFields = await reasonApplication;
    if (reasonFields.cancelled || !isActive()) return { ok: false, pending: [], cancelled: true };
    if (!reasonFields.reasonOk) addPending("Motivo status"); else removePending("Motivo status");

    fillObservationText(tabulationText);
    const dropdownAudit = await confirmTabulatorDropdowns(data, decision, isActive);
    if (dropdownAudit.cancelled || !isActive()) return { ok: false, pending: [], cancelled: true };
    (dropdownAudit.checked || []).forEach(removePending);
    (dropdownAudit.missing || []).forEach(addPending);

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

  let issuerDirectoryCache = null;
  async function loadIssuerDirectory() {
    if (issuerDirectoryCache) return issuerDirectoryCache;
    try {
      const url = new URL("issuer-directory.json", scriptUrl.href);
      const response = await fetch(url.href, { cache: "no-store" });
      issuerDirectoryCache = response.ok ? await response.json() : [];
    } catch (_err) {
      issuerDirectoryCache = [];
    }
    return issuerDirectoryCache;
  }
  function issuerEntryMatches(entry, issuer) {
    const target = normalize(issuer);
    if (!target) return false;
    const names = [entry.console, entry.nome, entry.outros, entry.falcon]
      .flatMap((value) => String(value || "").split(/[\/,;|]+/))
      .map((value) => normalize(value))
      .filter(Boolean);
    return names.some((name) => name === target || name.includes(target) || target.includes(name));
  }
  async function issuerIdForName(issuer) {
    const direct = digitsOnly(issuer);
    if (direct) return direct;
    const directory = await loadIssuerDirectory();
    return directory.find((entry) => issuerEntryMatches(entry, issuer))?.id || "";
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
  function listTypesFor(data) {
    if (data.flow !== "banking" || data.visualFlow === "hold") {
      return { allowlist: false, contencao: false };
    }
    return {
      allowlist: true,
      contencao: isContainmentRule(data.falcon?.rule)
    };
  }
  function listExpiryDays(item, listType) {
    const issuer = normalize(item?.issuer);
    const sourceFlow = item?.sourceFlow || item?.flow || "banking";
    if (issuer.includes("ONLYPAY")) return 5;
    if (issuer.includes("SOFISA") && listType === "contencao") return 3;
    if (sourceFlow === "card") return issuer.includes("SOFISA") ? 3 : 7;
    return 2;
  }
  async function readListQueue() {
    const byItemId = new Map();
    memory.lists.all().forEach((item) => {
      if (item?.id && !byItemId.has(item.id)) byItemId.set(item.id, item);
    });
    const list = Array.from(byItemId.values());
    const filtered = list.filter((item) => {
      if (Date.now() - Number(item.savedAt || 0) >= EXECUTION_TTL_MS) return false;
      const pendingAllowlist = item.lists?.allowlist && !item.applied?.allowlist;
      const pendingContencao = item.lists?.contencao && !item.applied?.contencao;
      return pendingAllowlist || pendingContencao;
    });
    memory.lists.replace(filtered);
    return filtered;
  }
  async function writeListQueue(list) {
    const next = list.slice(0, 300);
    memory.lists.replace(next);
    const result = await memory.commitCurrentText();
    clipboardEnvelopeReady = result.memoryCopied;
    return true;
  }
  function sameListIdentity(item, data) {
    return alnumOnly(item?.caseNumber) === alnumOnly(data?.falcon?.caseNumber)
      && alnumOnly(item?.account) === alnumOnly(data?.account);
  }
  async function updateListsForFinalDecision(data, decision) {
    const queue = await readListQueue();
    const withoutCurrentCase = queue.filter((item) => !sameListIdentity(item, data));
    if (!isNoFraudDecision(decision)) {
      if (withoutCurrentCase.length !== queue.length) {
        showNotice("O caso foi retirado de LISTAS porque a decisão final não é NÃO FRAUDE.", "info");
      }
      await writeListQueue(withoutCurrentCase);
      return withoutCurrentCase;
    }
    const lists = listTypesFor(data);
    if (!lists.allowlist && !lists.contencao) {
      await writeListQueue(withoutCurrentCase);
      return withoutCurrentCase;
    }
    const issuerId = await issuerIdForName(data.issuer);
    if ((issuerId === "155" || normalize(data.issuer).includes("CONTA SIMPLES")) && isRecentRegistration(data.registrationDate)) {
      showNotice("Conta Simples 155 com cadastro menor que 3 meses não foi enviada para LISTAS.", "info", 10000);
      await writeListQueue(withoutCurrentCase);
      return withoutCurrentCase;
    }
    const account = clean(data.account, "");
    const documentValue = documentFieldValue(data.cpfCnpj);
    if (!account || (lists.contencao && !documentValue)) {
      showNotice(lists.contencao && !documentValue ? "Regra de contenção detectada, mas faltou CPF/CNPJ para a LISTAS." : "Caso não fraude salvo, mas faltou ID da conta para a LISTAS.", "warn");
      await writeListQueue(withoutCurrentCase);
      return withoutCurrentCase;
    }
    const item = {
      id: `${data.falcon?.caseNumber || Date.now()}-${Date.now()}`,
      lists,
      applied: { allowlist: false, contencao: !lists.contencao },
      caseNumber: data.falcon?.caseNumber || "N/A",
      issuer: clean(data.issuer, "N/A"),
      account,
      documentValue,
      sourceFlow: data.flow,
      visualFlow: data.visualFlow,
      treatmentKind: data.treatmentKind || "brasil",
      savedAt: Date.now()
    };
    showNotice(lists.contencao ? "Caso finalizado e guardado em LISTAS com CPF/CNPJ." : "Caso finalizado e guardado em LISTAS com ID da conta.", "info");
    const next = [{ ...item, issuerId }, ...withoutCurrentCase];
    await writeListQueue(next);
    return next;
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
    const field = listRowInputs(rowIndex).find((input) => new RegExp(kind, "i").test(input.id || input.name || ""));
    if (!field) return false;
    const value = formatDateBr(date);
    setNativeValue(field, value);
    try {
      const id = field.id || "";
      const hiddenId = id.replace("_dctxt", "_dchdn");
      if (typeof window.setValue === "function" && id) window.setValue(id, hiddenId);
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
    const fields = listInfoInputs(rowIndex).filter((input) => /gridItemNameInput|itemValueInput|itemName|nameInput|valueInput/i.test(input.id || input.name || "")).slice(0, 2);
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
    const fields = listRowInputs(rowIndex).filter((input) => /commentInput|comments|observ|activeHeaderInput|case|caso/i.test(`${input.id || ""} ${input.name || ""} ${input.placeholder || ""}`) && !input.dataset.sacListFilled);
    const fallback = listInfoInputs(rowIndex).find((input) => !input.dataset.sacListFilled);
    const field = fields[0];
    const target = field || fallback;
    if (!target || !setNativeValue(target, value)) return 0;
    target.dataset.sacListFilled = "case";
    return 1;
  }
  async function applyIssuerToAllowlist(issuerId, rowIndex) {
    if (!issuerId) return false;
    const issuerPattern = /clientIdInput|emissor|issuer|client|codigo|c??digo|c?digo/i;
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
      || fillFirstMatchingInput([/clientIdInput/i, /emissor/i, /issuer/i, /codigo|c??digo|c?digo/i], issuerId);
  }
  function listIdentifier(item, listType) {
    return clean(listType === "contencao" ? item.documentValue : item.account, "");
  }
  function listLabel(listType) {
    return listType === "contencao" ? "Contenção" : "Allowlist";
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
    const issuerId = item.issuerId || await issuerIdForName(item.issuer);
    if (!await applyIssuerToAllowlist(issuerId, rowIndex)) missing.push("Emissor");
    try { if (typeof window.setDirty === "function") window.setDirty(); } catch (_err) {}
    return { ok: missing.length === 0, missing, rowIndex };
  }
  async function markListDone(id, listType) {
    const original = await readListQueue();
    const list = original.map((item) => {
      if (item.id !== id) return item;
      return { ...item, applied: { ...(item.applied || {}), [listType]: true }, updatedAt: Date.now() };
    });
    await writeListQueue(list);
    return true;
  }
  async function removeListItem(id, listType) {
    return markListDone(id, listType);
  }
  async function renderLists(activeTab = storageGet("activeListTab") || "allowlist") {
    closePidPanel();
    closeSidePanels();
    activeTab = activeTab === "contencao" ? "contencao" : "allowlist";
    storageSet("activeListTab", activeTab);
    const queue = await readListQueue();
    const items = await Promise.all(queue.map(async (item) => ({ ...item, issuerId: item.issuerId || await issuerIdForName(item.issuer) })));
    memory.lists.replace(items);
    const visible = items.filter((item) => item.lists?.[activeTab] && !item.applied?.[activeTab]);
    const body = section("Listas", `
      <div class="sac-list-tabs">
        <button class="${activeTab === "allowlist" ? "active" : ""}" data-list-tab="allowlist">ALLOWLIST (${items.filter((item) => item.lists?.allowlist && !item.applied?.allowlist).length})</button>
        <button class="${activeTab === "contencao" ? "active" : ""}" data-list-tab="contencao">CONTENÇÃO (${items.filter((item) => item.lists?.contencao && !item.applied?.contencao).length})</button>
      </div>
      <div class="sac-allowlist-list">
        ${visible.length ? visible.map((item) => `
          <div class="sac-allowlist-item" data-list-id="${escapeHtml(item.id)}" data-list-type="${escapeHtml(activeTab)}">
            <div class="sac-allowlist-row">
              ${kv("Emissor", item.issuer)}
              ${kv(activeTab === "contencao" ? "CPF/CNPJ" : "Id Conta", listIdentifier(item, activeTab))}
              ${kv("Número do caso", item.caseNumber)}
              ${kv("ID emissor", item.issuerId || "N/A")}
            </div>
            <div class="sac-allowlist-actions">
              <button data-list-apply>INSERIR</button>
              <button data-list-remove>REMOVER</button>
            </div>
          </div>
        `).join("") : `<div class="sac-history-empty">Nenhum caso pendente nesta aba.</div>`}
      </div>
    `, "pendentes");
    const panel = renderPanel({
      id: "sac-panel-listas",
      stage: "LISTAS",
      flow: "banking",
      subtitle: "Allowlist e Contenção",
      body
    });
    panel.addEventListener("click", async (event) => {
      const tab = event.target.closest("[data-list-tab]");
      if (tab) return renderLists(tab.dataset.listTab);
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
    byId("sac-history-panel")?.remove();
    const panel = document.createElement("div");
    panel.id = "sac-history-panel";
    panel.className = `sac-history-panel sac-${getTheme()}`;
    panel.style.setProperty("--sac-history-tone", "#64748b");
    const history = readHistory();
    panel.innerHTML = `
      <div class="sac-history-head"><span>Histórico</span><button class="sac-icon close" data-close>×</button></div>
      <div class="sac-history-tools">
        <input data-history-search placeholder="Pesquisar caso, emissor ou conta" />
        <select data-history-flow>
          <option value="">Todos</option>
          <option value="banking">BANKING</option>
          <option value="card">CARTÃO</option>
          <option value="hold">HOLD</option>
        </select>
      </div>
      <div class="sac-history-body">
        <div class="sac-history-list"></div>
        <div class="sac-history-detail"><textarea class="sac-textarea" readonly>${escapeHtml(history[0]?.tabulation || "")}</textarea></div>
      </div>
    `;
    document.body.appendChild(panel);
    enableDrag(panel, ".sac-history-head");
    const listEl = panel.querySelector(".sac-history-list");
    const detailEl = panel.querySelector("textarea");
    const queryEl = panel.querySelector("[data-history-search]");
    const flowEl = panel.querySelector("[data-history-flow]");
    const filteredHistory = () => {
      const query = normalize(queryEl?.value || "");
      const flow = flowEl?.value || "";
      return readHistory().filter((item) => {
        const text = normalize(`${item.caseNumber || ""} ${item.issuer || ""} ${item.account || ""}`);
        return (!flow || item.flow === flow) && (!query || text.includes(query));
      });
    };
    const historyLabel = (item) => {
      const flowLabel = (FLOW[item.flow] || FLOW.banking).label;
      return `<span>${escapeHtml(item.caseNumber || "N/A")}</span><small>${escapeHtml(item.issuer || "N/A")} · Conta ${escapeHtml(item.account || "N/A")} · ${escapeHtml(flowLabel)}</small>`;
    };
    const refreshList = () => {
      const items = filteredHistory();
      listEl.innerHTML = items.length
        ? items.map((item, index) => `<button data-history-id="${escapeHtml(item.id)}" class="${index === 0 ? "active" : ""}">${historyLabel(item)}</button>`).join("")
        : `<div class="sac-history-empty">Nenhum histórico encontrado.</div>`;
      detailEl.value = items[0]?.tabulation || "";
    };
    refreshList();
    panel.querySelector("[data-close]")?.addEventListener("click", () => panel.remove());
    queryEl?.addEventListener("input", refreshList);
    flowEl?.addEventListener("change", refreshList);
    panel.querySelector(".sac-history-list")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-history-id]");
      if (!button) return;
      const item = readHistory().find((entry) => entry.id === button.dataset.historyId);
      if (item) detailEl.value = item.tabulation || "";
    });
  }

  function detectStage() {
    if (byId("f33:hotlisrEditorGridView:activeFromInput1_0_dctxt") || /hotlisrEditorGridView/i.test(bodyText())) return "listas";
    if (byId("txt_obs") || byId("ddl_status") || byId("ddl_tabulador")) return "tabulador";
    if (document.querySelector(".userGuide-company-menu") || document.querySelector(".account-data") || document.querySelector("[data-testid='column_0_0']")) return "console";
    return "falcon";
  }
  async function runStage(stage) {
    if (stage === "falcon") return renderFalcon();
    if (stage === "console") return renderConsole();
    if (stage === "tabulador") return renderTabulator();
    if (["allowlist", "permissiva", "listas", "contencao", "contenção"].includes(stage)) return renderLists(stage === "contencao" || stage === "contenção" ? "contencao" : "allowlist");
    return runStage(detectStage());
  }

  if (typeof window.setDirty !== "function") window.setDirty = () => {};
  if (typeof window.setValue !== "function") window.setValue = () => {};

  await runStage(STAGE);
})();

