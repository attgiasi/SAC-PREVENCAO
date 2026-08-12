(async function SACPrevencaoV12Loader() {
  "use strict";

  const REPOSITORY = "attgiasi/SAC-PREVENCAO";
  const BUILD_PATH = "ANALISE/V12";
  const LOADER_VERSION = "12.6.0";
  const EXPECTED_RUNTIME_BUILD = "12.6";
  const RUNTIME_REF = "dfa7aa9812eb0dcd0a62818a66763935a90227bd";
  const SCRIPT_TIMEOUT_MS = 9000;
  const RUNTIME_READY_TIMEOUT_MS = 6000;
  const LOAD_TOKEN = `${LOADER_VERSION}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const FILES = Object.freeze([
    "sac-memory-v12.js",
    "sac-counterparty-v12.js",
    "sac-corporate-v12.js",
    "sac-transaction-v12.js",
    "sac-media-v12.js",
    "sac-ddd-v12.js",
    "sac-tabulator-v12.js",
    "sac-prevencao-v12.js"
  ]);

  function removePreviousRuntime() {
    Object.getOwnPropertyNames(window)
      .filter((name) => /^__SAC_PREVENCAO_V\d+_RUNTIME__$/.test(name))
      .forEach((name) => {
        try { window[name]?.dispose?.(); } catch (_error) {}
        try { delete window[name]; } catch (_error) { window[name] = undefined; }
      });
    document.querySelectorAll([
      "script[data-sac-v12-runtime]",
      "[id^='sac-style']",
      ".sac-panel",
      ".sac-history-panel",
      ".sac-choice-popover",
      ".sac-side-panel",
      ".sac-pid-panel",
      "#sac-notices",
      "#sac-loader-v12-error"
    ].join(",")).forEach((node) => node.remove());

    Object.keys(window)
      .filter((name) => /^SAC(?:Memory|Tabulator|Counterparty|Corporate|Transaction|Media|Ddd)V\d+$/i.test(name))
      .forEach((name) => {
        try { delete window[name]; } catch (_error) { window[name] = undefined; }
      });

    ["__SAC_PREVENCAO_ACTIVE_BUILD__", "__SAC_PREVENCAO_ACTIVE_PATH__", "__SAC_PREVENCAO_V12_LOADER__"]
      .forEach((name) => {
        try { delete window[name]; } catch (_error) { window[name] = undefined; }
      });
  }

  const isCurrentLoad = () => window.__SAC_PREVENCAO_LOADING_TOKEN__ === LOAD_TOKEN;
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function appendScript(source, file) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      let settled = false;
      const finish = (error = null) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        script.remove();
        if (error) reject(error);
        else resolve();
      };
      script.dataset.sacV12Runtime = LOADER_VERSION;
      script.src = source;
      script.async = false;
      script.onload = () => finish(isCurrentLoad() ? null : new Error("Carregamento substituído por uma execução mais recente."));
      script.onerror = () => finish(new Error(`Falha ao carregar ${file}.`));
      const timer = setTimeout(() => finish(new Error(`Tempo excedido ao carregar ${file}.`)), SCRIPT_TIMEOUT_MS);
      document.documentElement.appendChild(script);
    });
  }

  async function loadScript(file) {
    const cacheKey = `${LOADER_VERSION}-${Date.now()}`;
    const sources = [
      `https://cdn.jsdelivr.net/gh/${REPOSITORY}@${RUNTIME_REF}/${BUILD_PATH}/${file}?v=${cacheKey}`,
      `https://fastly.jsdelivr.net/gh/${REPOSITORY}@${RUNTIME_REF}/${BUILD_PATH}/${file}?v=${cacheKey}`,
      `https://gcore.jsdelivr.net/gh/${REPOSITORY}@${RUNTIME_REF}/${BUILD_PATH}/${file}?v=${cacheKey}`
    ];
    let lastError;
    for (const source of sources) {
      try {
        await appendScript(source, file);
        return;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error(`Falha ao carregar ${file}.`);
  }

  async function loadRuntime() {
    for (const file of FILES) {
      if (!isCurrentLoad()) throw new Error("Carregamento substituído por uma execução mais recente.");
      await loadScript(file);
    }
  }

  function runtimeIsCurrent() {
    return String(window.__SAC_PREVENCAO_ACTIVE_BUILD__ || "") === EXPECTED_RUNTIME_BUILD;
  }

  async function waitForRuntimeReady() {
    const deadline = Date.now() + RUNTIME_READY_TIMEOUT_MS;
    while (isCurrentLoad() && Date.now() < deadline) {
      if (runtimeIsCurrent()) return true;
      await wait(50);
    }
    return runtimeIsCurrent();
  }

  function showLoaderError(error) {
    console.error("SAC Prevenção V12", error);
    const notice = document.createElement("div");
    notice.id = "sac-loader-v12-error";
    notice.textContent = "Não foi possível carregar a V12.6. Verifique a conexão e execute o favorito novamente.";
    Object.assign(notice.style, {
      position: "fixed", left: "50%", bottom: "16px", transform: "translateX(-50%)",
      zIndex: "2147483647", maxWidth: "360px", padding: "9px 12px",
      border: "1px solid #ef4444", borderLeftWidth: "4px", borderRadius: "8px",
      background: "#3a0d0d", color: "#fef2f2", font: "800 12px/1.25 Segoe UI,Arial,sans-serif",
      boxShadow: "0 12px 28px rgba(0,0,0,.3)"
    });
    document.getElementById(notice.id)?.remove();
    document.documentElement.appendChild(notice);
    setTimeout(() => notice.remove(), 12000);
  }

  window.__SAC_PREVENCAO_LOADING_TOKEN__ = LOAD_TOKEN;
  try {
    let ready = false;
    for (let attempt = 1; attempt <= 2 && !ready; attempt += 1) {
      removePreviousRuntime();
      await loadRuntime();
      ready = await waitForRuntimeReady();
      if (!ready && attempt < 2) await wait(180);
    }
    if (!ready) throw new Error(`A inicialização da V${EXPECTED_RUNTIME_BUILD} não foi concluída.`);
    window.__SAC_PREVENCAO_V12_LOADER__ = Object.freeze({ version: LOADER_VERSION, ref: RUNTIME_REF, build: EXPECTED_RUNTIME_BUILD });
  } catch (error) {
    if (isCurrentLoad()) showLoaderError(error);
  } finally {
    if (isCurrentLoad()) {
      try { delete window.__SAC_PREVENCAO_LOADING_TOKEN__; } catch (_error) { window.__SAC_PREVENCAO_LOADING_TOKEN__ = undefined; }
    }
  }
})();
