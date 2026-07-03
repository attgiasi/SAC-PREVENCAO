(async function SacPrevencaoV3() {
  "use strict";

  const APP = "sac_prevencao_v3_2_20260617";
  const BUILD = "ANALISE/V3";
  const BUILD_VERSION = "3.2";
  const NOTICE_MS = 7600;
  const PACKAGE_TTL_MS = 12 * 60 * 60 * 1000;
  const HISTORY_TTL_MS = 12 * 60 * 60 * 1000;
  const ALLOWLIST_TTL_MS = 12 * 60 * 60 * 1000;
  const EXPORT_FALCON = "SAC_FALCON";
  const EXPORT_CONSOLE = "SAC_CONSOLE";
  const DEFAULT_SIGNATURE_NAME = "Giasi Mandela";
  const DEFAULT_SIGNATURE_SECTOR = "Backoffice Prevenção";
  const SIGNATURE_SECTORS = ["SAC Prevenção", "Dock Teck Prevenção", "Backoffice Prevenção"];

  const FLOW = {
    banking: { label: "BANKING", tone: "#00856f" },
    card: { label: "CARTÃO", tone: "#2563eb" },
    hold: { label: "HOLD", tone: "#ff5a1f" }
  };

  const FLOW_COLOR_OPTIONS = [
    ["#ef4444", "vermelho"],
    ["#ff5a1f", "laranja vibrante"],
    ["#f59e0b", "amarelo"],
    ["#22c55e", "verde"],
    ["#14b8a6", "turquesa"],
    ["#2563eb", "azul"],
    ["#7c3aed", "violeta"]
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
  const YES_NO = ["não", "sim"];
  const HISTORY_SPD = ["não", "sim", "spd 1", "spd 2", "spd 8", "spd 15", "spd 17", "spd 21", "spd 25", "spd 33", "outro"];
  const CARD_REVIEW = ["não", "sim", "autofinanciamento", "ausência de dados"];
  const EMAIL_OPTIONS = ["de acordo", "divergente", "sem informação"];
  const DOC_OPTIONS = ["sem ressalvas", "com ressalvas", "baixa qualidade", "foto de tela", "editado", "falsificado", "ilegível", "danificado", "sem arquivos"];
  const STATEMENT_OPTIONS = ["sem suspeitas", "com suspeitas", "triangulação", "autofinanciamento", "sem histórico"];
  const EMAIL_DIVERGENCE_OPTIONS = ["E-mail não se refere ao nome", "DDD diferente da região do endereço"];
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

  const scriptUrl = (() => {
    try { return new URL(document.currentScript?.src || location.href); }
    catch (_err) { return new URL(location.href); }
  })();
  const STAGE = (scriptUrl.searchParams.get("stage") || window.__SAC_PREVENCAO_STAGE || "auto").toLowerCase();

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
    .toUpperCase();
  const isMissing = (value) => ["", "N/A", "NA", "NULL", "UNDEFINED"].includes(normalize(value));
  const bodyText = () => textOf(document.body);
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
  const cssEscape = (value) => window.CSS?.escape ? CSS.escape(String(value)) : String(value).replace(/["\\]/g, "\\$&");

  const key = (name) => `${APP}:${name}`;
  const storageGet = (name) => {
    try { return localStorage.getItem(key(name)) || sessionStorage.getItem(key(name)) || ""; }
    catch (_err) { return ""; }
  };
  const storageSet = (name, value) => {
    try { localStorage.setItem(key(name), value); }
    catch (_err) {
      try { sessionStorage.setItem(key(name), value); } catch (_err2) {}
    }
  };
  const storageRemove = (name) => {
    try { localStorage.removeItem(key(name)); sessionStorage.removeItem(key(name)); } catch (_err) {}
  };
  const readJson = (name) => {
    try { return JSON.parse(storageGet(name) || "null"); } catch (_err) { return null; }
  };
  const writeJson = (name, value) => storageSet(name, JSON.stringify(value));
  const purgeLegacyState = () => {
    const legacyPrefixes = ["sac_prevencao_v1", "sac_prevencao_v2", "sac_prevencao_v3_20260617"];
    try {
      const remove = [];
      for (let index = 0; index < localStorage.length; index += 1) {
        const itemKey = localStorage.key(index) || "";
        if (legacyPrefixes.some((prefix) => itemKey.startsWith(prefix))) remove.push(itemKey);
      }
      remove.forEach((itemKey) => localStorage.removeItem(itemKey));
    } catch (_err) {}
    try {
      const remove = [];
      for (let index = 0; index < sessionStorage.length; index += 1) {
        const itemKey = sessionStorage.key(index) || "";
        if (legacyPrefixes.some((prefix) => itemKey.startsWith(prefix))) remove.push(itemKey);
      }
      remove.forEach((itemKey) => sessionStorage.removeItem(itemKey));
    } catch (_err) {}
  };
  purgeLegacyState();

  const getTheme = () => storageGet("theme") === "light" ? "light" : "dark";
  const getSafeMode = () => storageGet("safeMode") === "on";
  const setSafeMode = (enabled) => storageSet("safeMode", enabled ? "on" : "off");
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
  const getSignatureName = () => clean(storageGet("signatureName"), DEFAULT_SIGNATURE_NAME);
  const getSignatureSector = () => {
    const value = clean(storageGet("signatureSector"), DEFAULT_SIGNATURE_SECTOR);
    if (value === "Dock Tech Prevenção") return "Dock Teck Prevenção";
    return value;
  };
  const signatureText = () => `${getSignatureName()} | ${getSignatureSector()}`;

  function showNotice(message, type = "info", duration = NOTICE_MS) {
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
    host.appendChild(node);
    setTimeout(() => node.remove(), duration);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_err) {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    }
  }

  function openChoicePopover({ id, title, options, selected = [], onSave }) {
    ensureStyles();
    byId(id)?.remove();
    const panel = document.createElement("div");
    panel.id = id;
    panel.className = `sac-choice-popover sac-${getTheme()}`;
    panel.style.setProperty("--sac-primary", getFlowTone("banking"));
    const selectedSet = new Set((selected || []).map(normalize));
    panel.innerHTML = `
      <strong>${escapeHtml(title)}</strong>
      ${options.map((option, index) => `
        <label>
          <input type="checkbox" value="${escapeHtml(option)}" ${selectedSet.has(normalize(option)) ? "checked" : ""}>
          <span>${escapeHtml(option)}</span>
        </label>
      `).join("")}
      <div class="sac-choice-actions">
        <button data-save>Salvar</button>
        <button class="secondary" data-close>Fechar</button>
      </div>
    `;
    document.body.appendChild(panel);
    const host = byId("sac-panel-console") || byId("sac-panel-tabulador") || document.querySelector(".sac-panel");
    if (host) {
      const rect = host.getBoundingClientRect();
      panel.style.left = `${Math.max(8, rect.left - 338)}px`;
      panel.style.right = "auto";
      panel.style.top = `${Math.max(8, rect.top + 36)}px`;
    }
    panel.querySelector("[data-close]")?.addEventListener("click", () => panel.remove());
    panel.querySelector("[data-save]")?.addEventListener("click", () => {
      const values = all("input:checked", panel).map((input) => input.value);
      onSave?.(values);
      panel.remove();
      showNotice("Detalhes salvos para a tabulação.", "success");
    });
  }

  function ensureStyles() {
    if (byId("sac-style")) return;
    const style = document.createElement("style");
    style.id = "sac-style";
    style.textContent = `
      .sac-panel{--sac-font-scale:1;--sac-primary:#00856f;position:fixed;top:8px;right:8px;z-index:2147483647;width:min(390px,calc(100vw - 16px));border:1px solid var(--sac-border);border-top:3px solid var(--sac-primary);border-radius:8px;background:var(--sac-bg);color:var(--sac-text);font-family:Inter,Segoe UI,Arial,sans-serif;box-shadow:0 18px 44px rgba(0,0,0,.30);overflow:visible;text-align:left}
      .sac-dark{--sac-bg:#121a26;--sac-panel:#1b2635;--sac-card:#111927;--sac-border:#465a73;--sac-text:#edf3fb;--sac-muted:#b9c7d9;--sac-input:#0f1724}.sac-light{--sac-bg:#fff;--sac-panel:#f3f6fa;--sac-card:#fff;--sac-border:#c9d6e6;--sac-text:#172033;--sac-muted:#5b697f;--sac-input:#fff}
      .sac-head{position:relative;z-index:4;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 8px;background:var(--sac-primary);color:#fff;cursor:grab;user-select:none;touch-action:none}.sac-head:active,.sac-history-head:active{cursor:grabbing}.sac-panel.sac-minimized .sac-body,.sac-panel.sac-minimized .sac-config{display:none!important}.sac-title{font-size:calc(12px * var(--sac-font-scale));font-weight:950;line-height:1.1}.sac-subtitle{font-size:calc(9px * var(--sac-font-scale));opacity:.88;font-weight:800}
      .sac-actions{display:flex;gap:4px}.sac-icon{width:25px;height:25px;border:1px solid rgba(255,255,255,.35);border-radius:5px;background:rgba(255,255,255,.14);color:#fff;cursor:pointer;font-weight:950;display:grid;place-items:center;padding:0}.sac-icon.close{background:rgba(127,29,29,.32)}
      .sac-config{position:absolute;left:8px;top:38px;width:268px;z-index:2;display:none;gap:7px;padding:8px;border:1px solid var(--sac-border);border-radius:8px;background:var(--sac-bg);box-shadow:0 14px 34px rgba(0,0,0,.28)}.sac-config.open{display:grid}.sac-config-title{font-size:11px;font-weight:950;color:var(--sac-muted);text-transform:uppercase}.sac-config-preview{border:1px solid var(--sac-border);border-radius:7px;background:var(--sac-card);padding:7px;color:var(--sac-text);font-size:11px;font-weight:900;overflow-wrap:anywhere}.sac-config input,.sac-config select,.sac-config button{width:100%;border:1px solid var(--sac-border);border-radius:6px;background:var(--sac-input);color:var(--sac-text);padding:7px;font-weight:850}.sac-config input:hover,.sac-config select:hover,.sac-config button:hover,.sac-config input:focus,.sac-config select:focus,.sac-config button:focus{border-color:#38bdf8;background:#12314a;color:#edf3fb;box-shadow:0 0 0 2px rgba(56,189,248,.22);outline:none;filter:brightness(1.08)}.sac-light .sac-config input:hover,.sac-light .sac-config select:hover,.sac-light .sac-config button:hover,.sac-light .sac-config input:focus,.sac-light .sac-config select:focus,.sac-light .sac-config button:focus{background:#eef7ff;color:#172033}.sac-config-row{display:grid;grid-template-columns:1fr auto 1fr;gap:0;align-items:stretch}.sac-config-row button:first-child{border-radius:6px 0 0 6px}.sac-config-row button:last-child{border-radius:0 6px 6px 0;border-left:0}.sac-font-value{display:grid;place-items:center;border-top:1px solid var(--sac-border);border-bottom:1px solid var(--sac-border);background:var(--sac-card);color:var(--sac-muted);font-size:11px;font-weight:950;padding:0 8px}.sac-signature-editor,.sac-color-editor{display:none;gap:6px}.sac-signature-editor.open,.sac-color-editor.open{display:grid}.sac-color-editor label{display:grid;gap:3px;color:var(--sac-muted);font-size:10px;font-weight:950}.sac-signature-custom[hidden]{display:none!important}.sac-safe-toggle{display:flex!important;align-items:center;justify-content:center;gap:6px}
      .sac-body{padding:5px;display:grid;gap:5px}.sac-section{border:1px solid var(--sac-border);border-radius:6px;background:var(--sac-panel);padding:5px}.sac-section-title{display:flex;align-items:center;justify-content:space-between;gap:8px;color:var(--sac-muted);font-size:calc(9px * var(--sac-font-scale));font-weight:950;text-transform:uppercase;margin-bottom:4px}.sac-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:3px}.sac-grid.two{grid-template-columns:repeat(2,minmax(0,1fr))}.sac-grid.three{grid-template-columns:repeat(3,minmax(0,1fr))}
      .sac-kv{position:relative;min-width:0;min-height:34px;margin-top:7px;border:1px solid var(--sac-border);border-radius:5px;background:var(--sac-card);padding:7px 4px 4px;transition:border-color .15s,background .15s,box-shadow .15s,color .15s}.sac-kv:hover,.sac-field:hover{border-color:#38bdf8;background:#10263a;box-shadow:0 0 0 2px rgba(56,189,248,.12)}.sac-light .sac-kv:hover,.sac-light .sac-field:hover{background:#eef7ff;color:#172033}.sac-kv-label{position:absolute;top:-8px;left:4px;max-width:calc(100% - 8px);padding:1px 3px;border-radius:3px;background:var(--sac-panel);font-size:calc(8px * var(--sac-font-scale));font-weight:900;color:var(--sac-muted);line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sac-kv-value{display:flex;align-items:center;min-height:23px;font-size:calc(11px * var(--sac-font-scale));font-weight:800;color:var(--sac-text);line-height:1.08;overflow-wrap:anywhere}.sac-light .sac-kv:hover .sac-kv-label,.sac-light .sac-kv:hover .sac-kv-value{color:#172033}.sac-missing{border-color:#f59e0b!important;background:#3a230b!important;animation:sacPulseOrange 1s ease-in-out infinite}.sac-light .sac-missing{background:#fff7ed!important}.sac-history-ok{background:#052e1a;border-color:#15803d}.sac-history-warn,.sac-alert-warn{background:#3a230b;border-color:#c2410c}.sac-history-danger,.sac-alert-danger{background:#3a0d0d;border-color:#ef4444;animation:sacPulseRed 1s ease-in-out infinite}.sac-light .sac-history-ok{background:#ecfdf5;border-color:#86efac}.sac-light .sac-history-warn,.sac-light .sac-alert-warn{background:#fff7ed;border-color:#fdba74}.sac-light .sac-history-danger,.sac-light .sac-alert-danger{background:#fef2f2}@keyframes sacPulseRed{0%,100%{box-shadow:0 0 0 rgba(239,68,68,0);filter:saturate(1)}50%{box-shadow:0 0 12px rgba(239,68,68,.65);filter:saturate(1.35)}}@keyframes sacPulseOrange{0%,100%{box-shadow:0 0 0 rgba(245,158,11,0)}50%{box-shadow:0 0 12px rgba(245,158,11,.70)}}
      .sac-field-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px}.sac-field{display:grid;gap:2px;min-width:0;border:1px solid var(--sac-border);border-radius:6px;background:var(--sac-card);padding:4px;transition:border-color .15s,box-shadow .15s,background .15s}.sac-field span{display:block;font-size:calc(8.4px * var(--sac-font-scale));font-weight:900;color:var(--sac-muted);line-height:1.05}.sac-field select,.sac-field input{width:100%;height:28px;border:1px solid var(--sac-border);border-radius:5px;background:var(--sac-input);color:var(--sac-text);font-size:calc(10.6px * var(--sac-font-scale));font-weight:800;padding:3px}.sac-field select:hover,.sac-field select:focus,.sac-field input:hover,.sac-field input:focus{border-color:#38bdf8;background:#10263a;color:#edf3fb;outline:none;box-shadow:0 0 0 2px rgba(56,189,248,.16)}.sac-light .sac-field select:hover,.sac-light .sac-field select:focus,.sac-light .sac-field input:hover,.sac-light .sac-field input:focus{background:#eef7ff;color:#172033}.sac-other-input[hidden]{display:none!important}
      .sac-main{width:100%;border:0;border-radius:6px;background:var(--sac-primary);color:#fff;font-size:calc(11.5px * var(--sac-font-scale));font-weight:950;padding:9px 7px;line-height:1.12;cursor:pointer;white-space:normal;overflow-wrap:anywhere}.sac-main:hover,.sac-secondary:hover,.sac-decision:hover,.sac-icon:hover{filter:brightness(1.12);box-shadow:0 0 0 2px rgba(255,255,255,.14)}.sac-secondary{width:100%;border:1px solid var(--sac-border);border-radius:6px;background:transparent;color:var(--sac-text);font-size:calc(11px * var(--sac-font-scale));font-weight:950;padding:8px 7px;line-height:1.12;cursor:pointer;white-space:normal}.sac-decision-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px}.sac-decision{min-height:48px;border:0;border-radius:6px;color:#fff;font-size:calc(8.4px * var(--sac-font-scale));font-weight:950;line-height:1.06;white-space:pre-line;cursor:pointer;padding:6px 5px;overflow-wrap:anywhere}.sac-decision.danger{background:#dc2626}.sac-decision.success{background:#16a34a}.sac-decision.warning{background:#d97706}.sac-decision.info{background:#2563eb}
      .sac-textarea{width:100%;height:232px;border:1px solid var(--sac-border);border-radius:6px;background:var(--sac-input);color:var(--sac-text);font:700 calc(10.5px * var(--sac-font-scale))/1.08 Consolas,Menlo,monospace;padding:6px;resize:none;overflow:hidden;white-space:pre-wrap}.sac-final-textarea{height:286px;font-size:calc(10.8px * var(--sac-font-scale));line-height:1.12}.sac-final-textarea.sac-final-card{height:214px}
      #sac-notices{position:fixed;right:14px;bottom:14px;z-index:2147483647;display:grid;gap:8px}.sac-notice{min-width:260px;max-width:420px;border:1px solid #38506c;border-left:4px solid #2563eb;border-radius:8px;background:#101722;color:#f8fbff;padding:10px 12px;font:800 12px Inter,Segoe UI,Arial,sans-serif;box-shadow:0 14px 34px rgba(0,0,0,.30)}.sac-notice.success{border-left-color:#16a34a;background:#062e1b;color:#ecfdf5}.sac-notice.warn{border-left-color:#d97706;background:#351f05;color:#fff7ed}.sac-notice.warn-pulse{animation:sacPulseOrange 1.15s ease-in-out infinite}.sac-notice.error{border-left-color:#dc2626;background:#3a0d0d;color:#fef2f2}.sac-notice.info{border-left-color:#2563eb;background:#0b2442;color:#eff6ff}.sac-notice.sac-light{background:#fff;color:#172033;border-color:#cbd5e1}.sac-notice.sac-light.success{background:#ecfdf5;color:#064e3b}.sac-notice.sac-light.warn{background:#fff7ed;color:#7c2d12}.sac-notice.sac-light.error{background:#fef2f2;color:#7f1d1d}.sac-notice.sac-light.info{background:#eff6ff;color:#1e3a8a}
      .sac-choice-popover{position:fixed;right:14px;top:72px;z-index:2147483647;width:min(330px,calc(100vw - 28px));display:grid;gap:7px;padding:10px;border:1px solid var(--sac-border);border-top:3px solid var(--sac-primary);border-radius:8px;background:var(--sac-bg);color:var(--sac-text);box-shadow:0 18px 44px rgba(0,0,0,.32);font-family:Inter,Segoe UI,Arial,sans-serif}.sac-choice-popover strong{font-size:12px}.sac-choice-popover label{display:flex;gap:7px;align-items:flex-start;font-size:11px;font-weight:850;line-height:1.2}.sac-choice-popover input{margin-top:1px}.sac-choice-popover .sac-choice-actions{display:grid;grid-template-columns:1fr 1fr;gap:6px}.sac-choice-popover button{border:1px solid var(--sac-border);border-radius:6px;background:var(--sac-primary);color:#fff;padding:8px;font-weight:950;cursor:pointer}.sac-choice-popover button.secondary{background:transparent;color:var(--sac-text)}
      .sac-history-panel{--sac-history-tone:#64748b;position:fixed;left:10px;top:10px;z-index:2147483647;width:min(660px,calc(100vw - 20px));max-height:min(620px,calc(100vh - 20px));border:1px solid var(--sac-border);border-top:3px solid var(--sac-history-tone);border-radius:8px;background:var(--sac-bg);color:var(--sac-text);font-family:Inter,Segoe UI,Arial,sans-serif;box-shadow:0 18px 44px rgba(0,0,0,.30);overflow:hidden}.sac-history-head{display:flex;justify-content:space-between;align-items:center;gap:8px;background:var(--sac-history-tone);color:#fff;padding:8px;font-weight:950;cursor:grab;user-select:none;touch-action:none}.sac-history-tools{display:grid;grid-template-columns:1fr 126px;gap:6px;padding:7px;border-bottom:1px solid var(--sac-border);background:var(--sac-panel)}.sac-history-tools input,.sac-history-tools select{min-width:0;height:34px;border:1px solid var(--sac-border);border-radius:7px;background:var(--sac-input);color:var(--sac-text);padding:7px 9px;font-weight:900;outline:none}.sac-history-tools input:hover,.sac-history-tools select:hover,.sac-history-tools input:focus,.sac-history-tools select:focus{border-color:#38bdf8;background:#12314a;color:#edf3fb;box-shadow:0 0 0 2px rgba(56,189,248,.18)}.sac-light .sac-history-tools input:hover,.sac-light .sac-history-tools select:hover,.sac-light .sac-history-tools input:focus,.sac-light .sac-history-tools select:focus{background:#eef7ff;color:#172033}.sac-history-body{display:grid;grid-template-columns:218px 1fr;gap:6px;padding:6px}.sac-history-list{display:grid;gap:4px;align-content:start;max-height:430px;overflow:auto;padding-right:3px}.sac-history-list button{text-align:left;border:1px solid var(--sac-border);border-radius:6px;background:var(--sac-card);color:var(--sac-text);padding:7px;font-weight:900;line-height:1.1;cursor:pointer}.sac-history-list button:hover,.sac-history-list button.active{border-color:#38bdf8;background:#10263a;color:#edf3fb;box-shadow:0 0 0 2px rgba(56,189,248,.12);transform:translateY(-1px)}.sac-light .sac-history-list button:hover,.sac-light .sac-history-list button.active{background:#eef7ff;color:#172033}.sac-history-list small{display:block;color:var(--sac-muted);font-size:10px;margin-top:2px}.sac-history-empty{color:var(--sac-muted);font-weight:850;padding:8px}.sac-history-detail textarea{height:250px}.sac-list-tabs{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:6px}.sac-list-tabs button{border:1px solid var(--sac-border);border-radius:6px;background:var(--sac-card);color:var(--sac-text);padding:8px 6px;font-size:11px;font-weight:950;cursor:pointer}.sac-list-tabs button:hover,.sac-list-tabs button.active{border-color:#38bdf8;background:#12314a;color:#edf3fb;box-shadow:0 0 0 2px rgba(56,189,248,.14)}.sac-light .sac-list-tabs button:hover,.sac-light .sac-list-tabs button.active{background:#eef7ff;color:#172033}.sac-allowlist-list{display:grid;gap:5px}.sac-allowlist-item{border:1px solid var(--sac-border);border-radius:7px;background:var(--sac-card);padding:6px;display:grid;grid-template-columns:1fr 72px;gap:6px;align-items:stretch}.sac-allowlist-item:hover{border-color:#38bdf8;box-shadow:0 0 0 2px rgba(56,189,248,.14)}.sac-allowlist-row{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:3px}.sac-allowlist-actions{display:grid;grid-template-rows:1fr 1fr;gap:4px}.sac-allowlist-actions button{border:0;border-radius:6px;color:#fff;font-size:10px;font-weight:950;cursor:pointer}.sac-allowlist-actions [data-list-apply]{background:#16a34a}.sac-allowlist-actions [data-list-remove]{background:#dc2626}
      @media (max-width:760px){.sac-panel{left:8px;right:8px;width:auto}.sac-grid.three,.sac-grid,.sac-field-grid{grid-template-columns:1fr}.sac-history-body{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function renderPanel({ id, stage, flow = "banking", subtitle = "", body = "", footer = "", onEnter, onSignature }) {
    ensureStyles();
    byId(id)?.remove();
    const cfg = flowConfig(flow);
    const panel = document.createElement("div");
    panel.id = id;
    panel.className = `sac-panel sac-${getTheme()}`;
    panel.style.setProperty("--sac-primary", cfg.tone);
    panel.style.setProperty("--sac-font-scale", String(getFontScale()));
    const currentSector = getSignatureSector();
    const sectorPreset = SIGNATURE_SECTORS.includes(currentSector) ? currentSector : "custom";
    const customSector = sectorPreset === "custom" ? currentSector : "";
    const allowSignatureConfig = stage === "TABULADOR";
    const panelTitle = stage === "LISTAS" ? "LISTAS" : `${stage} - ${cfg.label}`;
    const signatureConfig = allowSignatureConfig ? `
          <button data-action="toggle-signature">✎ Assinatura</button>
          <div class="sac-signature-editor">
            <div class="sac-config-preview" data-signature-preview>${escapeHtml(signatureText())}</div>
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
    const flowColorOptions = (selected) => FLOW_COLOR_OPTIONS
      .map(([color, label]) => `<option value="${color}" ${color === selected ? "selected" : ""}>${escapeHtml(label)}</option>`)
      .join("");
    const colorConfig = `
          <button data-action="toggle-colors">Cores dos fluxos</button>
          <div class="sac-color-editor">
            <label>Banking<select data-flow-color="banking">${flowColorOptions(getFlowTone("banking"))}</select></label>
            <label>Cartão<select data-flow-color="card">${flowColorOptions(getFlowTone("card"))}</select></label>
            <label>HOLD<select data-flow-color="hold">${flowColorOptions(getFlowTone("hold"))}</select></label>
          </div>`;
    panel.innerHTML = `
      <div class="sac-head">
        <div>
          <div class="sac-title">${escapeHtml(panelTitle)}</div>
          <div class="sac-subtitle">${escapeHtml(subtitle || BUILD)}</div>
        </div>
        <div class="sac-actions">
          <button class="sac-icon" data-action="config" title="Configurações">⚙</button>
          <button class="sac-icon" data-action="reload" title="Recarregar">↻</button>
          <button class="sac-icon" data-action="minimize" title="Minimizar">_</button>
          <button class="sac-icon close" data-action="close" title="Fechar">×</button>
        </div>
        <div class="sac-config" hidden>
          <div class="sac-config-title">Configurações</div>
          <button data-action="theme">${getTheme() === "dark" ? "☀ Tema claro" : "☾ Tema escuro"}</button>
          <div class="sac-config-row">
            <button data-action="font-minus" title="Diminuir fonte">A−</button>
            <span class="sac-font-value" data-font-value>${Math.round(getFontScale() * 100)}%</span>
            <button data-action="font-plus" title="Aumentar fonte">A+</button>
          </div>
          <button class="sac-safe-toggle" data-action="safe-mode">${getSafeMode() ? "🛡 Seguro ligado" : "⚠ Seguro desligado"}</button>
          ${signatureConfig}
          ${colorConfig}
          <button data-action="history">Histórico</button>
        </div>
      </div>
      <div class="sac-body">${body}</div>
      ${footer ? `<div class="sac-body">${footer}</div>` : ""}
    `;
    document.body.appendChild(panel);
    enableDrag(panel, ".sac-head");

    const config = panel.querySelector(".sac-config");
    const close = () => panel.remove();
    const reload = () => { close(); runStage(STAGE === "auto" ? detectStage() : STAGE); };
    const toggleMinimize = () => panel.classList.toggle("sac-minimized");
    const resetPosition = () => { panel.style.top = "8px"; panel.style.right = "8px"; panel.style.left = ""; panel.style.transform = ""; panel.classList.remove("sac-minimized"); };
    const openConfig = () => {
      panel.classList.remove("sac-minimized");
      config.hidden = false;
      config.classList.add("open");
    };
    panel.querySelector("[data-action='close']")?.addEventListener("click", close);
    panel.querySelector("[data-action='reload']")?.addEventListener("click", reload);
    panel.querySelector("[data-action='minimize']")?.addEventListener("click", toggleMinimize);
    panel.querySelector(".sac-head")?.addEventListener("dblclick", () => panel.classList.remove("sac-minimized"));
    panel.querySelector("[data-action='config']")?.addEventListener("click", () => {
      config.hidden = !config.hidden;
      config.classList.toggle("open", !config.hidden);
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
      event.currentTarget.textContent = next ? "🛡 Seguro ligado" : "⚠ Seguro desligado";
      showNotice(next ? "Modo seguro ligado. Dados obrigatórios bloqueiam o avanço." : "Modo seguro desligado. Vou avisar em amarelo se faltar informação.", next ? "success" : "warn");
    });
    const refreshSignaturePreview = () => {
      const selectedSector = panel.querySelector("[data-signature-sector]")?.value || DEFAULT_SIGNATURE_SECTOR;
      const custom = clean(panel.querySelector("[data-signature-custom]")?.value, "");
      const sector = selectedSector === "custom" ? (custom || "Personalizado") : selectedSector;
      const preview = `${clean(panel.querySelector("[data-signature-name]")?.value, DEFAULT_SIGNATURE_NAME)} | ${sector}`;
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
      storageSet("signatureName", clean(panel.querySelector("[data-signature-name]")?.value, DEFAULT_SIGNATURE_NAME));
      storageSet("signatureSector", selectedSector === "custom" ? custom : selectedSector);
      showNotice("Assinatura salva com carinho.", "success");
      onSignature?.();
    });
    panel.querySelector("[data-action='toggle-colors']")?.addEventListener("click", () => {
      panel.querySelector(".sac-color-editor")?.classList.toggle("open");
    });
    all("[data-flow-color]", panel).forEach((select) => {
      select.addEventListener("change", (event) => {
        const flowName = event.currentTarget.dataset.flowColor;
        const previous = getFlowTone(flowName);
        if (!setFlowTone(flowName, event.currentTarget.value)) {
          event.currentTarget.value = previous;
          showNotice("Cada fluxo precisa ter uma cor diferente.", "warn");
          return;
        }
        showNotice("Cor do fluxo atualizada.", "success");
        reload();
      });
    });
    panel.querySelector("[data-action='history']")?.addEventListener("click", renderHistory);
    all("[data-other-select]", panel).forEach((select) => {
      const input = panel.querySelector(`[data-other-for="${cssEscape(select.id)}"]`);
      const syncOther = () => { if (input) input.hidden = normalize(select.value) !== "OUTRO"; };
      select.addEventListener("change", syncOther);
      syncOther();
    });

    panel.__sacKeys = { close, reload, onEnter, toggleMinimize, resetPosition, openConfig };
    return panel;
  }

  if (window.__SAC_PREVENCAO_KEYS) document.removeEventListener("keydown", window.__SAC_PREVENCAO_KEYS);
  window.__SAC_PREVENCAO_KEYS = (event) => {
    const tag = event.target?.tagName?.toLowerCase();
    if (["input", "select", "textarea"].includes(tag) && event.key !== "Escape") return;
    const panel = all(".sac-panel").at(-1);
    if (!panel?.__sacKeys) return;
    if (event.key === "Escape") { panel.__sacKeys.close(); event.preventDefault(); }
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
  document.addEventListener("keydown", window.__SAC_PREVENCAO_KEYS);

  function section(title, content, meta = "") {
    return `<section class="sac-section"><div class="sac-section-title"><span>${escapeHtml(title)}</span><span>${escapeHtml(meta)}</span></div>${content}</section>`;
  }
  function kv(label, value, cls = "") {
    const missing = isMissing(value);
    return `<div class="sac-kv ${missing ? "sac-missing" : ""} ${cls}"><div class="sac-kv-label">${escapeHtml(label)}</div><div class="sac-kv-value">${escapeHtml(clean(value))}</div></div>`;
  }
  function field(id, label, options, selected) {
    const selectedValue = options.find((opt) => normalize(opt) === normalize(selected)) || selected || options[0] || "";
    const opts = options.map((opt) => `<option value="${escapeHtml(opt)}" ${normalize(opt) === normalize(selectedValue) ? "selected" : ""}>${escapeHtml(opt)}</option>`).join("");
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
    else if (key === "CARTAO") data.cardNumber = value;
    else if (key.includes("STATUS PESSOA")) data.fields = { ...(data.fields || {}), personStatus: value };
    else if (key.includes("MIDIA")) data.fields = { ...(data.fields || {}), badMedia: value };
    else if (key.includes("HISTORICO SPD")) data.fields = { ...(data.fields || {}), spdHistory: value };
    else if (key.includes("E-MAIL")) data.fields = { ...(data.fields || {}), emailPhoneAddress: value };
    else if (key.includes("DOCUMENTACAO")) data.fields = { ...(data.fields || {}), documentation: value };
    else if (key.includes("EXTRATO")) data.fields = { ...(data.fields || {}), statement: value };
  }
  function enableManualGridEditing(panel, data) {
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
      const rect = panel.getBoundingClientRect();
      panel.style.position = "fixed";
      panel.style.left = `${startLeft}px`;
      panel.style.top = `${startTop}px`;
      panel.style.width = `${startWidth}px`;
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
      const maxLeft = Math.max(0, window.innerWidth - rect.width);
      const maxTop = Math.max(0, window.innerHeight - Math.min(rect.height, window.innerHeight));
      panel.style.left = `${clamp(startLeft + dx, 0, maxLeft)}px`;
      panel.style.top = `${clamp(startTop + dy, 0, maxTop)}px`;
      event.preventDefault();
    };
    const stop = () => {
      armed = false;
      dragging = false;
      document.body.style.userSelect = previousUserSelect;
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
    return ["SEM HISTORICO", "AUSENCIA DE DADOS", "SEM DOCUMENTOS", "SEM INFORMACAO", "SEM ARQUIVOS", "NAO APLICAVEL"].includes(status);
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
    if (!orange) return null;
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
    const row = context.orangeRow;
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
    const flow = holdByRule ? "banking" : (cardByTransactionType || cardLast4 ? "card" : "banking");
    const visualFlow = holdByRule ? "hold" : flow;
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
  function findTreatment() {
    const text = all("button").map(textOf).find((item) => /Backoffice/i.test(item)) || "";
    return clean(text, "Backoffice Brasil");
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
    const labeled = findValueAfterLabel("Data de cadastro");
    if (labeled) return clean(labeled.match(/\b\d{2}\/\d{2}\/\d{4}\b/)?.[0] || labeled.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0] || labeled);
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
  function consoleCardRows() {
    return all("tr.c-table__row,tr").filter((tr) => tableColumn(tr, 0) || tableColumn(tr, 1) || tr.querySelector(".c-chip__label"));
  }
  async function ensureCardGridOpen() {
    if (consoleCardRows().length) return true;
    const trigger = all("button,a,[role='button']").find((node) => {
      const label = normalize(textOf(node));
      return label === "CARTAO" || label === "CARTOES" || label.includes("DADOS DO CARTAO");
    });
    if (!trigger) return false;
    try { trigger.click(); } catch (_err) {}
    return waitForField(() => consoleCardRows().length > 0, 18, 140);
  }
  function findCardConsoleData(lastDigits) {
    const rows = consoleCardRows();
    const targetLast4 = clean(lastDigits, "");
    const matchedRow = rows.find((tr) => {
      const cardText = `${textOf(tableColumn(tr, 1))} ${textOf(tr)}`;
      return targetLast4 && new RegExp(`${targetLast4}(?!\\d)`).test(cardText);
    });
    const row = matchedRow || (!targetLast4 ? rows[0] : null);
    if (!row) {
      return { cardId: "N/A", cardNumber: "N/A", cardStatus: "N/A", matched: false };
    }
    const rowText = textOf(row);
    const cardNumber = clean(textOf(tableColumn(row, 1)) || rowText.match(/(?:\*{4,}|\d{4})[\s*.-]*\d{4}?[\s*.-]*\d{0,4}?[\s*.-]*(\d{4})\b/)?.[0] || (targetLast4 ? `************${targetLast4}` : ""));
    const statusText = textOf(row.querySelector(".c-chip__label")) || rowText.match(/\b(normal|ativo|ativa|bloqueado|bloqueada|cancelado|cancelada)\b/i)?.[0] || "";
    const numericCandidates = Array.from(rowText.matchAll(/\b\d{4,12}\b/g), (match) => match[0])
      .filter((candidate) => candidate !== targetLast4 && last4(candidate) !== targetLast4);
    const idCandidates = [
      textOf(tableColumn(row, 0)),
      row.querySelector("[data-testid*='cardId'],[data-testid*='card-id'],[id*='cardId'],[id*='card-id']") && textOf(row.querySelector("[data-testid*='cardId'],[data-testid*='card-id'],[id*='cardId'],[id*='card-id']")),
      numericCandidates[0]
    ].filter(Boolean);
    return {
      cardId: clean(idCandidates[0]),
      cardNumber,
      cardStatus: clean(statusText),
      matched: Boolean(matchedRow)
    };
  }

  async function loadFalconPackage() {
    const stored = readJson("lastFalcon");
    let clipboardPackage = null;
    const pasted = await navigator.clipboard?.readText?.().catch(() => "");
    if (pasted?.startsWith(`${EXPORT_FALCON}::`)) {
      try {
        const data = JSON.parse(pasted.slice(`${EXPORT_FALCON}::`.length));
        if (isCurrentPackage(data, EXPORT_FALCON)) clipboardPackage = data;
      } catch (_err) {}
    }
    const selected = [stored, clipboardPackage]
      .filter((data) => isCurrentPackage(data, EXPORT_FALCON))
      .sort((a, b) => Number(b.savedAt || 0) - Number(a.savedAt || 0))[0] || null;
    if (selected) writeJson("lastFalcon", selected);
    else if (stored) storageRemove("lastFalcon");
    return selected;
  }
  async function loadConsolePackage() {
    const stored = readJson("lastConsole");
    let clipboardPackage = null;
    const pasted = await navigator.clipboard?.readText?.().catch(() => "");
    if (pasted?.startsWith(`${EXPORT_CONSOLE}::`)) {
      try {
        const data = JSON.parse(pasted.slice(`${EXPORT_CONSOLE}::`.length));
        if (isCurrentPackage(data, EXPORT_CONSOLE)) clipboardPackage = data;
      } catch (_err) {}
    }
    const selected = [stored, clipboardPackage]
      .filter((data) => isCurrentPackage(data, EXPORT_CONSOLE))
      .sort((a, b) => Number(b.savedAt || 0) - Number(a.savedAt || 0))[0] || null;
    if (selected) writeJson("lastConsole", selected);
    else if (stored) storageRemove("lastConsole");
    return selected;
  }
  function isCurrentPackage(data, type) {
    if (!data || data.type !== type || data.buildVersion !== BUILD_VERSION) return false;
    const age = Date.now() - Number(data.savedAt || 0);
    return age >= 0 && age < PACKAGE_TTL_MS;
  }

  async function ensureFalconCaseTab() {
    const selected = all(".tabItemSelected").some((node) => normalize(textOf(node)) === "CASO");
    if (selected) return true;
    const tab = all("span,div,a,td,li").find((node) => normalize(textOf(node)) === "CASO");
    const clickable = tab?.closest?.("a,button,li,td,div") || tab;
    if (!clickable) return false;
    try { clickable.click(); } catch (_err) {}
    await wait(420);
    return all(".tabItemSelected").some((node) => normalize(textOf(node)) === "CASO");
  }
  function hasFalconCaseTab() {
    return all("span,div,a,td,li").some((node) => normalize(textOf(node)) === "CASO");
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

  async function renderFalcon() {
    const caseTabAvailable = hasFalconCaseTab();
    const caseTabReady = await ensureFalconCaseTab();
    if (caseTabAvailable && !caseTabReady) {
      const panel = renderPanel({
        id: "sac-panel-falcon",
        stage: "FALCON",
        flow: "banking",
        subtitle: "Aba necessária para a coleta",
        body: section("Atenção", `<div class="sac-grid">${kv("Aba Caso", "Não selecionada", "sac-missing")}</div>`, "ação necessária"),
        footer: `<button class="sac-main" id="sac-retry-case">Tentar novamente</button>`
      });
      panel.querySelector("#sac-retry-case")?.addEventListener("click", () => {
        panel.remove();
        renderFalcon();
      });
      showNotice("Selecione a aba Caso no Falcon para eu coletar o número do caso e a transação corretos.", "warn-pulse", 15000);
      return;
    }
    scrollFalconGridRight();
    await wait(600);
    const data = collectFalconData();
    if (data.visualFlow === "hold") {
      const holdAction = selectHoldActionCheckbox();
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
      const packageData = { ...data, buildVersion: BUILD_VERSION, savedAt: Date.now() };
      writeJson("lastFalcon", packageData);
      storageRemove("lastConsole");
      await copyText(`${EXPORT_FALCON}::${JSON.stringify(packageData)}`);
      showNotice("Falcon finalizado. Abra o Console para continuar.", "success");
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
      ? [[data.cardByTransactionType ? "" : "Cartão", data.cardNumber], ["Estabelecimento", data.merchant], ["Tipo compra cartão", data.transactionType], ["Decisão transação", data.transactionDecision]]
      : [["Tipo transação", data.transactionType]];
    const missing = [...base, ...extra].filter(([label, value]) => label && isMissing(value)).map(([label]) => label);
    if (data.visualFlow === "hold" && !data.holdActionSelected) missing.push("Ação HOLD");
    if (!data.orangeFound) missing.unshift("Linha laranja");
    return missing;
  }
  function falconGrid(data) {
    const common = kv("Caso", data.caseNumber) + kv("Valor", `R$ ${data.value}`) + kv("Regra", data.rule) + kv("Data/Hora", trimTimeToMinute(data.transactionDate));
    const historyGrid = data.flow === "card" ? "" : kv("Histórico de infrações", formatHistoryValue(data.history), historyLevel(data.history, data.historyFound));
    if (data.flow === "card") {
      const cardIdentity = data.cardByTransactionType ? kv("Tipo transação", data.sourceTransactionType) : kv("Cartão", data.cardNumber);
      return `<div class="sac-grid three">${cardIdentity}${kv("Estabelecimento", data.merchant)}${kv("Tipo compra cartão", data.transactionType)}${kv("Decisão transação", data.transactionDecision)}${common}</div>`;
    }
    return `<div class="sac-grid three">${kv("Tipo transação", data.transactionType)}${common}${historyGrid}</div>`;
  }

  function collectConsoleData(falcon) {
    const flow = falcon?.flow === "card" ? "card" : "banking";
    const treatment = findTreatment();
    const isGlobal = /global/i.test(treatment);
    const card = flow === "card" && !isGlobal
      ? findCardConsoleData(falcon.cardLast4)
      : { cardId: "ausência de dados", cardNumber: "ausência de dados", cardStatus: "ausência de dados", matched: true };
    return {
      type: EXPORT_CONSOLE,
      flow,
      visualFlow: falcon?.visualFlow || flow,
      falcon,
      treatment,
      isGlobal,
      account: findAccountNumber(),
      accountStatus: normalizeStatusOption(findAccountStatus()),
      cpfCnpj: findConsoleCpfCnpj(),
      registrationDate: findRegistrationDate(),
      issuer: findIssuer(),
      cardId: card.cardId || "N/A",
      cardNumber: card.cardNumber || "N/A",
      cardStatus: card.cardStatus || "N/A",
      cardMatched: card.matched !== false,
      fields: defaultConsoleFields(flow, isGlobal)
    };
  }
  function defaultConsoleFields(flow, isGlobal) {
    if (flow === "card") return isGlobal
      ? { merchantHistory: "ausência de dados", purchasePattern: "ausência de dados" }
      : { merchantHistory: "não", purchasePattern: "não" };
    return {
      badMedia: "não",
      accountStatus: "normal",
      personStatus: "normal",
      emailPhoneAddress: isGlobal ? "sem informação" : "de acordo",
      spdHistory: "não",
      documentation: isGlobal ? "sem arquivos" : "sem ressalvas",
      statement: "sem suspeitas"
    };
  }

  async function renderConsole() {
    const falcon = await loadFalconPackage();
    if (falcon?.flow === "card") await ensureCardGridOpen();
    const data = collectConsoleData(falcon || emptyFalconData());
    const isCard = data.flow === "card";
    const fields = isCard ? cardFields(data) : bankingFields(data);
    const save = async () => {
      data.fields = await readConsoleFields(data);
      if (data.fields.__missingManual?.length) {
        showNotice(`Falta preencher manualmente: ${data.fields.__missingManual.join(", ")}.`, "error");
        return;
      }
      delete data.fields.__missingManual;
      const missing = requiredWorkflow(data);
      if (missing.length) {
        if (getSafeMode()) {
          showNotice(`Ainda faltam dados: ${missing.join(", ")}. Veja os grids em laranja e tente novamente.`, "error");
          return;
        }
        showNotice(`Atenção: faltam dados (${missing.join(", ")}), mas o modo seguro está desligado.`, "warn");
      }
      const packageData = { ...data, buildVersion: BUILD_VERSION, savedAt: Date.now() };
      writeJson("lastConsole", packageData);
      await copyText(`${EXPORT_CONSOLE}::${JSON.stringify(packageData)}`);
      showNotice("Console finalizado. Abra o Tabulador para continuar.", "success");
      byId("sac-panel-console")?.remove();
    };
    const body = section("Dados do Falcon", falconGrid(data.falcon), "recebidos")
      + section("Dados do Console", consoleGrid(data), "coletados")
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
    byId("sac-bad-media")?.addEventListener("change", (event) => {
      if (normalize(event.target.value) !== "SIM") return;
      openChoicePopover({
        id: "sac-bad-media-details",
        title: "Tipo de mídia desabonadora",
        options: BAD_MEDIA_OPTIONS,
        selected: data.fields.badMediaDetails || [],
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
        onSave: (values) => { data.fields.emailDivergenceDetails = values; }
      });
    });
    enableManualGridEditing(panel, data);
    if (!falcon) showNotice("Sem pacote salvo do Falcon. Alguns campos podem ficar N/A.", "warn");
    if (isCard && !data.isGlobal && data.cardMatched === false) showNotice(`Não encontrei o cartão final ${falcon?.cardLast4 || "N/A"}. Abra a área de cartões do Console e execute novamente.`, "warn-pulse", 15000);
  }
  function consoleGrid(data, options = {}) {
    const includeAccountStatus = options.includeAccountStatus !== false;
    if (data.flow === "card") {
      return `<div class="sac-grid three">${kv("CPF/CNPJ", data.cpfCnpj)}${kv("Emissor", data.issuer)}${kv("Tratamento", data.treatment)}${kv("ID cartão", data.cardId)}${kv("Cartão", data.cardNumber)}${kv("Status cartão", data.cardStatus)}${kv("Cadastro", data.registrationDate, alertIf(isRecentRegistration(data.registrationDate)))}</div>`;
    }
    return `<div class="sac-grid three">${kv("CPF/CNPJ", data.cpfCnpj)}${kv("Emissor", data.issuer)}${kv("Tratamento", data.treatment)}${kv("Conta", data.account)}${includeAccountStatus ? kv("Status conta", data.accountStatus, accountStatusAlert(data.accountStatus)) : ""}${kv("Cadastro", data.registrationDate, alertIf(isRecentRegistration(data.registrationDate)))}</div>`;
  }
  function cardFields(data) {
    return field("sac-merchant-history", "Histórico no estabelecimento", CARD_REVIEW, data.fields.merchantHistory)
      + field("sac-purchase-pattern", "Padrão de compra", CARD_REVIEW, data.fields.purchasePattern);
  }
  function bankingFields(data) {
    const statusFields = field("sac-account-status", "Status conta", STATUS_OPTIONS, data.accountStatus || data.fields.accountStatus)
      + field("sac-person-status", "Status Pessoa (SPD)", STATUS_OPTIONS, data.fields.personStatus);
    const analysisFields = (data.isGlobal ? "" : field("sac-spd-history", "Histórico SPD", HISTORY_SPD, data.fields.spdHistory))
      + field("sac-bad-media", "Mídia desabonadora", YES_NO, data.fields.badMedia);
    if (data.isGlobal) return statusFields + analysisFields + field("sac-statement", "Extrato", STATEMENT_OPTIONS, data.fields.statement);
    return statusFields + analysisFields
      + field("sac-email", "E-mail, DDD e Endereço", EMAIL_OPTIONS, data.fields.emailPhoneAddress)
      + field("sac-doc", "Documentação", DOC_OPTIONS, data.fields.documentation)
      + field("sac-statement", "Extrato", STATEMENT_OPTIONS, data.fields.statement);
  }
  async function readConsoleFields(data) {
    if (data.flow === "card") {
      return {
        merchantHistory: byId("sac-merchant-history")?.value || "não",
        purchasePattern: byId("sac-purchase-pattern")?.value || "não"
      };
    }
    const missingManual = [];
    const accountStatus = resolveOtherOption(byId("sac-account-status")?.value || data.accountStatus || "normal", "Status conta", missingManual, document.querySelector("[data-other-for='sac-account-status']")?.value);
    const personStatus = resolveOtherOption(byId("sac-person-status")?.value || "normal", "Status Pessoa (SPD)", missingManual, document.querySelector("[data-other-for='sac-person-status']")?.value);
    const spdHistory = resolveOtherOption(byId("sac-spd-history")?.value || "não", "Histórico SPD", missingManual, document.querySelector("[data-other-for='sac-spd-history']")?.value);
    return {
      badMedia: byId("sac-bad-media")?.value || "não",
      accountStatus,
      personStatus,
      emailPhoneAddress: data.isGlobal ? "sem informação" : (byId("sac-email")?.value || "de acordo"),
      emailDivergenceDetails: data.fields.emailDivergenceDetails || [],
      spdHistory,
      documentation: data.isGlobal ? "sem arquivos" : (byId("sac-doc")?.value || "sem ressalvas"),
      statement: byId("sac-statement")?.value || "sem suspeitas",
      badMediaDetails: data.fields.badMediaDetails || [],
      __missingManual: missingManual
    };
  }
  function requiredConsole(data) {
    const base = [["CPF/CNPJ", data.cpfCnpj], ["Emissor", data.issuer], ["Data de cadastro", data.registrationDate]];
    const extra = data.flow === "card"
      ? (data.isGlobal ? [] : [["ID cartão", data.cardId], ["Status cartão", data.cardStatus]])
      : [["Status conta", data.accountStatus]];
    return [...base, ...extra].filter(([, value]) => isMissing(value)).map(([label]) => label);
  }
  function requiredWorkflow(data) {
    return Array.from(new Set([...requiredFalcon(data.falcon || {}), ...requiredConsole(data)]));
  }

  async function renderTabulator() {
    const storedConsole = await loadConsolePackage();
    const data = storedConsole || collectConsoleData(await loadFalconPackage() || emptyFalconData());
    const missing = requiredWorkflow(data);
    const decisionButtons = DECISIONS.map((decision, index) => {
      const tone = ["danger", "success", "warning", "info"][index];
      return `<button class="sac-decision ${tone}" data-decision-index="${index}" data-decision="${escapeHtml(decision)}">${escapeHtml(decision.replace("NÃO FOI POSSÍVEL CONFIRMAR FRAUDE", "NÃO FOI POSSÍVEL\nCONFIRMAR FRAUDE").replace("NÃO FOI POSSÍVEL CONFIRMAR NÃO FRAUDE", "NÃO FOI POSSÍVEL\nCONFIRMAR NÃO FRAUDE"))}</button>`;
    }).join("");
    const body = section("Dados do Falcon", falconGrid(data.falcon), "análise")
      + section("Dados do Console", consoleGrid(data, { includeAccountStatus: data.flow === "card" }), "coletados")
      + section("Respostas dos dropdowns", consoleDropdownGrid(data), "escolhidas")
      + section("Decisão", `<div class="sac-decision-grid">${decisionButtons}</div>`, "1-4");
    const panel = renderPanel({
      id: "sac-panel-tabulador",
      stage: "TABULADOR",
      flow: data.visualFlow,
      subtitle: "Dados para decisão",
      body,
      onEnter: () => showNotice("Escolha uma decisão para continuar.", "warn")
    });
    all("[data-decision]", panel).forEach((button) => {
      button.addEventListener("click", () => applyDecisionAndShowFinal(data, button.dataset.decision, panel));
    });
    enableManualGridEditing(panel, data);
    if (missing.length) showNotice(`Dados pendentes: ${missing.join(", ")}.`, "warn");
  }
  function consoleDropdownGrid(data) {
    if (data.flow === "card") {
      return `<div class="sac-grid">${kv("Histórico no estabelecimento", data.fields.merchantHistory, cardReviewAlert(data.fields.merchantHistory))}${kv("Padrão de compra", data.fields.purchasePattern, cardReviewAlert(data.fields.purchasePattern))}</div>`;
    }
    const spdHistoryGrid = data.isGlobal ? "" : kv("Histórico SPD", data.fields.spdHistory, dropdownAlert(data.fields.spdHistory, HISTORY_SPD));
    return `<div class="sac-grid three">${kv("Status conta", data.fields.accountStatus || data.accountStatus, accountStatusAlert(data.fields.accountStatus || data.accountStatus))}${kv("Status Pessoa (SPD)", data.fields.personStatus, dropdownAlert(data.fields.personStatus, STATUS_OPTIONS))}${spdHistoryGrid}${kv("Mídia desabonadora", data.fields.badMedia, dropdownAlert(data.fields.badMedia, YES_NO))}${kv("E-mail, DDD e Endereço", data.fields.emailPhoneAddress, dropdownAlert(data.fields.emailPhoneAddress, EMAIL_OPTIONS))}${kv("Documentação", data.fields.documentation, dropdownAlert(data.fields.documentation, DOC_OPTIONS))}${kv("Extrato", data.fields.statement, dropdownAlert(data.fields.statement, STATEMENT_OPTIONS))}</div>`;
  }

  async function applyDecisionAndShowFinal(data, decision, panel) {
    const text = buildTabulation(data, decision);
    const observationTargets = [{ id: "txt_obs" }, { name: "_partial_Falcon.Observacao" }, { pattern: /observa|descricao|comentario/i, selector: "textarea,input" }];
    await forceFillAny(observationTargets, text, 20, 120);
    const missing = requiredWorkflow(data);
    if (missing.length) {
      if (getSafeMode()) {
        showNotice(`Ainda faltam dados para decidir: ${missing.join(", ")}. Confira os grids em laranja.`, "error");
        return;
      }
      showNotice(`Atenção: faltam dados (${missing.join(", ")}), mas o modo seguro está desligado.`, "warn");
    }
    const applied = await applyTabulator(data, decision);
    if (!applied.ok) {
      if (getSafeMode()) {
        showNotice(`Revise o Tabulador: ${applied.pending.join(", ")}. A tabulação já foi colocada em Observações.`, "warn-pulse", 15000);
        return;
      }
      showNotice(`Ação necessária: confira no Tabulador os campos ${applied.pending.join(", ")}. O fluxo continuará porque o modo seguro está desligado.`, "warn-pulse", 15000);
    }
    const observationApplied = await forceFillAny(observationTargets, text, 20, 120);
    if (!observationApplied) showNotice("Não consegui confirmar a tabulação no campo Observações. Cole o texto copiado antes de concluir.", "warn-pulse", 15000);
    await copyText(text);
    addHistory(data, decision, text);
    await enqueueListsIfNeeded(data, decision);
    showNotice("Tudo certo: decisão aplicada e tabulação copiada.", "success");
    showFinalTabulation(data, decision, text, panel);
  }
  function showFinalTabulation(data, decision, text, panel) {
    panel.querySelector(".sac-body").innerHTML =
      section("Tabulação pronta", `<textarea class="sac-textarea sac-final-textarea ${data.flow === "card" ? "sac-final-card" : ""}" id="sac-final-text" readonly>${escapeHtml(text)}</textarea>`, "final")
      + `<div class="sac-grid"><button class="sac-main" id="sac-copy-final">Copiar</button><button class="sac-secondary" id="sac-change-decision">Mudar decisão</button></div>`;
    byId("sac-copy-final")?.addEventListener("click", async () => {
      await copyText(text);
      showNotice("Tabulação copiada e fluxo finalizado.", "success");
      panel.remove();
    });
    byId("sac-change-decision")?.addEventListener("click", () => {
      panel.remove();
      renderTabulator();
    });
  }
  function buildTabulation(data, decision) {
    const f = data.falcon || {};
    const detailSuffix = (value, details) => {
      const list = Array.isArray(details) ? details.filter(Boolean) : [];
      return list.length ? `${clean(value, "")} - ${list.join("; ")}` : clean(value, "");
    };
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
        "",
        signatureText()
      ].join("\n");
    }
    return [
      `Valor da transação: R$ ${clean(f.value, "")}`,
      `Regra: ${clean(f.rule, "")}`,
      `Histórico de Infrações: ${formatHistoryValue(f.history)}`,
      `Mídia desabonadora: ${detailSuffix(data.fields?.badMedia, data.fields?.badMediaDetails)}`,
      `Status conta: ${clean(data.fields?.accountStatus || data.accountStatus, "")}`,
      `Status Pessoa (SPD): ${clean(data.fields?.personStatus, "")}`,
      `Data de cadastro: ${clean(data.registrationDate, "")}`,
      `E-mail, DDD e Endereço: ${detailSuffix(data.fields?.emailPhoneAddress, data.fields?.emailDivergenceDetails)}`,
      `Histórico SPD: ${clean(data.fields?.spdHistory, "")}`,
      `Documentação: ${clean(data.fields?.documentation, "")}`,
      `Extrato: ${clean(data.fields?.statement, "")}`,
      "",
      `Decisão: ${decision}`,
      "",
      signatureText()
    ].join("\n");
  }

  function setNativeValue(el, value) {
    if (!el || isMissing(value)) return false;
    const next = String(value);
    const prototype = el instanceof HTMLSelectElement
      ? HTMLSelectElement.prototype
      : el instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    try { el.focus(); } catch (_err) {}
    try {
      if (setter) setter.call(el, next);
      else el.value = next;
    } catch (_err) { el.value = next; }
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new Event("blur", { bubbles: true }));
    try { el.blur(); } catch (_err) {}
    return fieldValueMatches(el, next);
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
  async function forceFillAny(targets, value, tries = 18, delay = 110) {
    if (isMissing(value)) return false;
    for (let attempt = 0; attempt < tries; attempt += 1) {
      for (const target of targets) {
        const element = targetElement(target);
        if (!element) continue;
        setNativeValue(element, value);
        await wait(delay);
        const current = targetElement(target);
        if (fieldValueMatches(current, value)) {
          await wait(90);
          if (fieldValueMatches(targetElement(target), value)) return true;
        }
      }
      await wait(delay);
    }
    return false;
  }
  async function waitForField(test, tries = 50, delay = 120) {
    for (let i = 0; i < tries; i += 1) {
      if (test()) return true;
      await wait(delay);
    }
    return false;
  }
  async function waitForTabulatorFields() {
    return waitForField(() => byId("txt_ValorTransacao") || byId("ddl_status") || elementByName("_partial_Falcon.NumeroCaso"), 60, 130);
  }

  function optionMatches(option, wanted) {
    const target = normalize(wanted);
    const text = normalize(option.textContent || "");
    const value = normalize(option.value || "");
    return Boolean(target && (text === target || value === target || text.includes(target) || value.includes(target)));
  }
  function optionExactMatches(option, wanted) {
    const target = normalize(wanted);
    const text = normalize(option.textContent || "");
    const value = normalize(option.value || "");
    return Boolean(target && (text === target || value === target));
  }
  async function applySelectValue(select, option) {
    all("option", select).forEach((opt) => opt.selected = false);
    option.selected = true;
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
    if (setter) setter.call(select, option.value);
    else select.value = option.value;
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
    await wait(110);
  }
  async function selectDropdown(id, wanted, tries = 15) {
    if (isMissing(wanted)) return false;
    for (let i = 0; i < tries; i += 1) {
      const select = byId(id);
      if (select?.options?.length) {
        const options = all("option", select);
        const option = options.find((opt) => optionExactMatches(opt, wanted)) || options.find((opt) => optionMatches(opt, wanted));
        if (option) {
          await applySelectValue(select, option);
          const current = byId(id);
          const selected = current?.options?.[current.selectedIndex];
          if (selected && optionMatches(selected, wanted)) {
            await wait(120);
            const confirmed = byId(id);
            const confirmedOption = confirmed?.options?.[confirmed.selectedIndex];
            if (confirmedOption && optionMatches(confirmedOption, wanted)) return true;
          }
        }
      }
      await wait(120);
    }
    return false;
  }
  async function selectDropdownByPattern(pattern, wanted, tries = 20) {
    if (isMissing(wanted)) return false;
    for (let attempt = 0; attempt < tries; attempt += 1) {
      const select = all("select").find((element) => pattern.test(`${element.id || ""} ${element.name || ""}`));
      if (select?.options?.length) {
        const options = all("option", select);
        const option = options.find((candidate) => optionExactMatches(candidate, wanted)) || options.find((candidate) => optionMatches(candidate, wanted));
        if (option) {
          await applySelectValue(select, option);
          const selected = select.options?.[select.selectedIndex];
          if (selected && optionMatches(selected, wanted)) return true;
        }
      }
      await wait(130);
    }
    return false;
  }
  async function selectDependentDropdown(parentId, parentWanted, childId, childWanted, tries = 80) {
    if (isMissing(childWanted)) return true;
    await selectDropdown(parentId, parentWanted, 35);
    for (let i = 0; i < tries; i += 1) {
      if (i % 8 === 0) await selectDropdown(parentId, parentWanted, 1);
      if (await selectDropdown(childId, childWanted, 1)) return true;
      await wait(160);
    }
    return false;
  }
  async function selectIssuerDropdown(issuer) {
    const issuerId = await issuerIdForName(issuer);
    if (issuerId && await selectDropdown("ddl_idemissor", issuerId, 20)) return true;
    if (await selectDropdown("ddl_idemissor", issuer, 25)) return true;
    const select = byId("ddl_idemissor");
    if (!select?.options?.length) return false;
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
      return names.some((name) => text.includes(name) || name.includes(text) || value === name) || (target && text.includes(target.slice(0, Math.min(5, target.length))));
    });
    if (!option) return false;
    await applySelectValue(select, option);
    return true;
  }
  function queueFor(data) {
    const f = data.falcon || {};
    if (data.visualFlow === "hold" || isHoldRule(f.rule)) return "HOLD";
    if (data.flow !== "card") return "BANKING";
    const decision = normalize(f.transactionDecision);
    if (decision.includes("APPROVE")) return "CARTÕES APROVADAS";
    if (decision.includes("DECLINE")) return "CARTÕES RECUSADAS";
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
  async function applyTabulator(data, decision) {
    const pending = [];
    const f = data.falcon || {};
    const addPending = (label) => { if (label && !pending.includes(label)) pending.push(label); };
    const fillAny = async (targets, value, label) => {
      if (isMissing(value)) {
        addPending(label);
        return false;
      }
      const ok = await forceFillAny(targets, value);
      if (!ok) addPending(label);
      return ok;
    };
    if (byId("ddl_tabulador") && !await selectDropdown("ddl_tabulador", "Falcon", 30)) addPending("Tabulador Falcon");
    await waitForTabulatorFields();
    const docKind = documentKind(data.cpfCnpj);
    const doc = documentFieldValue(data.cpfCnpj);
    if (docKind) {
      const docTypeApplied = await selectDropdown("ddl_tipoDoc", docKind, 35)
        || await selectDropdownByPattern(/tipo.*doc|document.*type/i, docKind, 25);
      if (!docTypeApplied) addPending("Tipo de documento");
      const documentTargets = docKind === "CNPJ"
        ? [{ id: "txt_cnpj" }, { name: "_partial_Falcon.Cnpj" }, { pattern: /cnpj/i }]
        : [{ id: "txt_cpf" }, { name: "_partial_Falcon.Cpf" }, { pattern: /cpf/i }];
      await fillAny(documentTargets, doc, docKind);
    } else {
      addPending("Tipo de documento");
    }
    await fillAny([{ id: "txt_ValorTransacao" }, { name: "_partial_Falcon.ValorTransacao" }, { pattern: /valor.*transa/i }], clean(f.value, "").replace("R$", "").trim(), "Valor da transação");
    await fillAny([{ name: "_partial_Falcon.NumeroCaso" }, { id: "txt_NumeroCaso" }, { pattern: /numero.*caso|caso.*numero/i }], f.caseNumber, "Número do caso");
    await fillAny([{ name: "_partial_Falcon.EcTransacao" }, { pattern: /ecTransacao|estabelecimento|tipoTransacao/i }], data.flow === "card" ? f.merchant : f.transactionType, data.flow === "card" ? "Estabelecimento" : "Tipo de transação");
    await fillAny([{ name: "_partial_Falcon.RegraListada" }, { pattern: /regra.*list/i }], f.rule, "Regra");
    if (f.transactionDate?.includes("/")) {
      const [date, time] = f.transactionDate.split(/\s+/);
      if (date) await fillAny([{ id: "txt_data_entrada" }, { name: "_partial_Falcon.DataEntrada" }, { pattern: /data.*entrada/i }], date.split("/").reverse().join("-"), "Data");
      if (time) await fillAny([{ id: "txt_hora_entrada" }, { name: "_partial_Falcon.HoraEntrada" }, { pattern: /hora.*entrada/i }], trimTimeToMinute(time), "Hora");
    }
    if (!await selectIssuerDropdown(data.issuer)) showNotice("Não localizei o emissor automaticamente no Tabulador. Confira esse campo antes de concluir.", "warn-pulse", 15000);
    if (!await selectDropdown("ddl_TipoChamada", "SEM CONTATO - PLANILHA", 30)) addPending("Tipo de chamada");
    if (!await selectDropdown("ddl_ChamadaAtiva", "SEM CHAMADA", 30)) addPending("Status chamada");
    const queue = queueFor(data);
    if (queue && !await selectDropdown("ddl_Fila", queue, 45)) addPending("Fila");
    if (!await selectDropdown("ddl_status", decision, 55)) addPending("Status");
    const reason = reasonForDecision(data.flow, decision);
    if (reason) {
      if (!await selectDependentDropdown("ddl_status", decision, "ddl_motivostatus", reason, 100)) addPending("Motivo status");
    }
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
  function formatDateBr(date) {
    return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
  }
  function isNoFraudDecision(decision) { return normalize(decision) === "NAO FRAUDE"; }
  function isContainmentRule(rule) { return normalize(rule).includes("CONTENSAO"); }
  function listTypesFor(data) {
    return {
      allowlist: true,
      contencao: isContainmentRule(data.falcon?.rule)
    };
  }
  function readListQueue() {
    const now = Date.now();
    const list = readJson("listas") || readJson("allowlist") || [];
    const filtered = list.filter((item) => {
      const fresh = now - Number(item.savedAt || 0) < ALLOWLIST_TTL_MS;
      const pendingAllowlist = item.lists?.allowlist && !item.applied?.allowlist;
      const pendingContencao = item.lists?.contencao && !item.applied?.contencao;
      return fresh && (pendingAllowlist || pendingContencao);
    });
    if (filtered.length !== list.length) writeJson("listas", filtered);
    return filtered;
  }
  function writeListQueue(list) {
    writeJson("listas", list.slice(0, 80));
  }
  async function enqueueListsIfNeeded(data, decision) {
    if (!isNoFraudDecision(decision)) return;
    const lists = listTypesFor(data);
    const account = clean(data.account, "");
    const documentValue = documentFieldValue(data.cpfCnpj);
    const identifier = lists.contencao ? documentValue : account;
    if (!identifier) {
      showNotice(lists.contencao ? "Regra de contenção detectada, mas faltou CPF/CNPJ para a LISTAS." : "Caso não fraude salvo, mas faltou ID da conta para a LISTAS.", "warn");
      return;
    }
    const issuerId = await issuerIdForName(data.issuer);
    const item = {
      id: `${data.falcon?.caseNumber || Date.now()}-${Date.now()}`,
      lists,
      applied: { allowlist: false, contencao: !lists.contencao },
      caseNumber: data.falcon?.caseNumber || "N/A",
      issuer: clean(data.issuer, "N/A"),
      account,
      documentValue,
      identifier,
      identifierKind: lists.contencao ? "document" : "account",
      savedAt: Date.now()
    };
    const queue = readListQueue().filter((entry) => entry.caseNumber !== item.caseNumber);
    writeListQueue([{ ...item, issuerId }, ...queue]);
    showNotice(lists.contencao ? "Caso não fraude enviado para LISTAS com CPF/CNPJ." : "Caso não fraude enviado para LISTAS com ID da conta.", "info");
  }
  function hotlistInputs() {
    return all("input,textarea").filter((field) => {
      if (field.disabled || field.readOnly) return false;
      const type = String(field.type || "").toLowerCase();
      if (["hidden", "button", "submit", "checkbox", "radio"].includes(type)) return false;
      return /hotlisrEditorGridView|gridItemNameInput|hotlist|allow|list|client|case|conta|account|documento|cpf|cnpj/i.test(field.id || field.name || "");
    });
  }
  function listRowIndex(element) {
    const descriptor = `${element?.id || ""} ${element?.name || ""}`;
    const match = descriptor.match(/(?:gridItemNameInput\d*|activeFromInput\d*|activeToInput\d*|clientIdInput)_(\d+)/i);
    return match ? Number(match[1]) : null;
  }
  function listRowInputs(rowIndex, selector = "input,textarea") {
    return all(selector).filter((field) => listRowIndex(field) === rowIndex);
  }
  function nextEmptyListRow() {
    const fields = hotlistInputs().filter((input) => /gridItemNameInput|itemName|nameInput/i.test(input.id || input.name || ""));
    const indices = Array.from(new Set(fields.map(listRowIndex).filter(Number.isInteger))).sort((a, b) => a - b);
    return indices.find((index) => {
      const identifiers = listRowInputs(index).filter((input) => /gridItemNameInput|itemName|nameInput/i.test(input.id || input.name || ""));
      return identifiers.length >= 2 && identifiers.every((input) => !String(input.value || "").trim());
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
    const fields = listRowInputs(rowIndex).filter((input) => !dateIds.test(input.id || "") && !/clientIdInput/i.test(input.id || "") && !input.dataset.sacListFilled);
    values.forEach((value) => {
      const field = fields.find((input) => !used.has(input));
      if (field) {
        setNativeValue(field, value);
        used.add(field);
      }
    });
    return used.size;
  }
  function fillListIdentifierInputs(value, rowIndex) {
    const fields = listRowInputs(rowIndex).filter((input) => /gridItemNameInput|itemName|nameInput/i.test(input.id || input.name || ""));
    let count = 0;
    fields.slice(0, 2).forEach((field) => {
      if (setNativeValue(field, value)) {
        field.dataset.sacListFilled = "identifier";
        count += 1;
      }
    });
    return count;
  }
  function fillListCaseInput(value, rowIndex) {
    const fields = listRowInputs(rowIndex).filter((input) => /gridItemNameInput|itemName|nameInput/i.test(input.id || input.name || "") && !input.dataset.sacListFilled);
    const field = fields[0];
    if (!field || !setNativeValue(field, value)) return 0;
    field.dataset.sacListFilled = "case";
    return 1;
  }
  async function applyIssuerToAllowlist(issuerId, rowIndex) {
    if (!issuerId) return false;
    const select = all("select").find((item) => listRowIndex(item) === rowIndex && /emissor|issuer|client|codigo|código/i.test(`${item.id || ""} ${item.name || ""}`))
      || all("select").find((item) => /emissor|issuer|client|codigo|código/i.test(`${item.id || ""} ${item.name || ""}`));
    if (select) {
      const option = all("option", select).find((opt) => optionMatches(opt, issuerId));
      if (option) {
        await applySelectValue(select, option);
        return true;
      }
    }
    const rowInput = listRowInputs(rowIndex).find((input) => /emissor|issuer|clientIdInput|codigo|código/i.test(`${input.id || ""} ${input.name || ""}`));
    return setNativeValue(rowInput, issuerId)
      || fillById(`f33:hotlisrEditorGridView:clientIdInput_${rowIndex}`, issuerId)
      || fillFirstMatchingInput([/emissor/i, /issuer/i, /clientIdInput/i, /codigo|código/i], issuerId);
  }
  function listIdentifier(item, listType) {
    return clean(item.identifier || (item.identifierKind === "document" ? item.documentValue : item.account), "");
  }
  function listLabel(listType) {
    return listType === "contencao" ? "Contenção" : "Allowlist";
  }
  async function applyListItem(item, listType) {
    hotlistInputs().forEach((field) => delete field.dataset.sacListFilled);
    const rowIndex = nextEmptyListRow();
    if (!Number.isInteger(rowIndex)) return { ok: false, missing: ["Linha vazia para inclusão"] };
    const today = new Date();
    const afterTwoDays = new Date();
    afterTwoDays.setDate(today.getDate() + 2);
    const missing = [];
    if (!fillListDateField("activeFromInput", rowIndex, today)) missing.push("Data inicial");
    if (!fillListDateField("activeToInput", rowIndex, afterTwoDays)) {
      const dateFields = listRowInputs(rowIndex).filter((input) => /activeToInput|activeUntil|activeEnd|toInput/i.test(input.id || input.name || ""));
      if (!dateFields.some((field) => setNativeValue(field, formatDateBr(afterTwoDays)))) missing.push("Data final");
    }
    const identifier = listIdentifier(item, listType);
    const explicitIdentifierCount = fillListIdentifierInputs(identifier, rowIndex);
    const identifierPatterns = item.identifierKind === "document" ? [/documento/i, /cpf|cnpj/i, /tax/i] : [/conta/i, /account/i];
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
  function markListDone(id, listType) {
    const list = readListQueue().map((item) => {
      if (item.id !== id) return item;
      return { ...item, applied: { ...(item.applied || {}), [listType]: true } };
    });
    writeListQueue(list);
  }
  function removeListItem(id, listType) {
    markListDone(id, listType);
  }
  async function renderLists(activeTab = storageGet("activeListTab") || "allowlist") {
    activeTab = activeTab === "contencao" ? "contencao" : "allowlist";
    storageSet("activeListTab", activeTab);
    const queue = readListQueue();
    const items = await Promise.all(queue.map(async (item) => ({ ...item, issuerId: item.issuerId || await issuerIdForName(item.issuer) })));
    writeListQueue(items);
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
              ${kv(item.identifierKind === "document" ? "CPF/CNPJ" : "Id Conta", listIdentifier(item, activeTab))}
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
      const item = readListQueue().find((entry) => entry.id === id);
      if (!item) return;
      if (event.target.closest("[data-list-remove]")) {
        removeListItem(id, listType);
        showNotice(`Item removido da aba ${listLabel(listType)}.`, "warn");
        return renderLists(listType);
      }
      if (event.target.closest("[data-list-apply]")) {
        const result = await applyListItem(item, listType);
        if (!result.ok) {
          showNotice(`Não consegui inserir ainda: ${result.missing.join(", ")}. Confira a página e tente novamente.`, "error");
          return;
        }
        markListDone(id, listType);
        showNotice(`${listLabel(listType)} preenchida. Removi o caso desta aba.`, "success");
        return renderLists(listType);
      }
    });
  }

  function readHistory() {
    const now = Date.now();
    const list = readJson("history") || [];
    const filteredList = list.filter((item) => now - Number(item.savedAt || 0) < HISTORY_TTL_MS);
    const cleanList = filteredList.map((item) => ({
      ...item,
      tabulation: redactSensitiveDocuments(item.tabulation || "")
    }));
    const changed = cleanList.length !== list.length || cleanList.some((item, index) => item.tabulation !== filteredList[index]?.tabulation);
    if (changed) writeJson("history", cleanList);
    return cleanList;
  }
  function addHistory(data, decision, tabulation) {
    const item = {
      id: `${data.falcon?.caseNumber || Date.now()}-${Date.now()}`,
      caseNumber: data.falcon?.caseNumber || "N/A",
      issuer: clean(data.issuer, "N/A"),
      account: clean(data.account, "N/A"),
      flow: data.visualFlow || data.flow,
      decision,
      tabulation: redactSensitiveDocuments(tabulation),
      savedAt: Date.now()
    };
    writeJson("history", [item, ...readHistory()].slice(0, 60));
  }
  function renderHistory() {
    ensureStyles();
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

  await runStage(STAGE);
})();
