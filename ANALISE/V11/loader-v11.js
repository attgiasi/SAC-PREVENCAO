(async function SACPrevencaoV11Loader() {
  "use strict";

  const REPOSITORY = "attgiasi/SAC-PREVENCAO";
  const BRANCH = "main";
  const BUILD_PATH = "ANALISE/V11";
  const LOADER_VERSION = "11.29.0";
  const SAFE_FALLBACK_REF = "1a94977e928199b45c909ae6eae87c4c2b25aa0c";
  const RELEASE_MANIFEST = `https://raw.githubusercontent.com/${REPOSITORY}/${BRANCH}/${BUILD_PATH}/release-v11.json`;
  const FILES = Object.freeze([
    "sac-memory-v11.js",
    "sac-counterparty-v11.js",
    "sac-corporate-v11.js",
    "sac-transaction-v11.js",
    "sac-media-v11.js",
    "sac-ddd-v11.js",
    "sac-tabulator-v11.js",
    "sac-prevencao-v11.js"
  ]);

  function removePreviousRuntime() {
    try { window.__SAC_PREVENCAO_V11_RUNTIME__?.dispose?.(); } catch (_error) {}
    document.querySelectorAll([
      "script[data-sac-v11-runtime]",
      "[id^='sac-style']",
      ".sac-panel",
      ".sac-history-panel",
      ".sac-choice-popover",
      ".sac-side-panel",
      "#sac-notices",
      "#sac-loader-v11-error"
    ].join(",")).forEach((node) => node.remove());

    Object.keys(window)
      .filter((name) => /^SAC(?:Memory|Tabulator|Counterparty|Corporate|Transaction|Media|Ddd)V\d+$/i.test(name))
      .forEach((name) => {
        try { delete window[name]; } catch (_error) { window[name] = undefined; }
      });
  }

  function validCommit(value) {
    return /^[a-f0-9]{40}$/i.test(String(value || "")) ? String(value) : "";
  }

  function fetchJson(url, options = {}) {
    return new Promise((resolve, reject) => {
      const controller = typeof AbortController === "function" ? new AbortController() : null;
      const timer = setTimeout(() => {
        controller?.abort();
        reject(new Error("Tempo excedido ao consultar a versão."));
      }, 4500);
      fetch(url, { cache: "no-store", ...options, ...(controller ? { signal: controller.signal } : {}) })
        .then((response) => {
          if (!response.ok) throw new Error(`Consulta de versão falhou (${response.status}).`);
          return response.json();
        })
        .then((payload) => {
          clearTimeout(timer);
          resolve(payload);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  async function latestCommit() {
    const resolvers = [
      async () => {
        const payload = await fetchJson(`https://api.github.com/repos/${REPOSITORY}/commits/${BRANCH}?cache=${Date.now()}`, {
          headers: { Accept: "application/vnd.github+json" }
        });
        return validCommit(payload?.sha);
      },
      async () => {
        const payload = await fetchJson(`${RELEASE_MANIFEST}?cache=${Date.now()}`);
        return validCommit(payload?.commit);
      }
    ];

    for (const resolveCommit of resolvers) {
      try {
        const commit = await resolveCommit();
        if (commit) return commit;
      } catch (_error) {
        // Tenta a próxima fonte sem interromper a execução do favorito.
      }
    }
    return SAFE_FALLBACK_REF;
  }

  function appendScript(source, file) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.dataset.sacV11Runtime = LOADER_VERSION;
      script.src = source;
      script.async = false;
      script.onload = () => {
        script.remove();
        resolve();
      };
      script.onerror = () => {
        script.remove();
        reject(new Error(`Falha ao carregar ${file}.`));
      };
      document.documentElement.appendChild(script);
    });
  }

  async function loadScript(file, ref) {
    const cacheKey = `${LOADER_VERSION}-${Date.now()}`;
    const sources = [
      `https://cdn.jsdelivr.net/gh/${REPOSITORY}@${ref}/${BUILD_PATH}/${file}?v=${cacheKey}`,
      `https://raw.githubusercontent.com/${REPOSITORY}/${ref}/${BUILD_PATH}/${file}?v=${cacheKey}`
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

  function showLoaderError(error) {
    console.error("SAC Prevenção V11", error);
    const notice = document.createElement("div");
    notice.id = "sac-loader-v11-error";
    notice.textContent = "Não foi possível carregar a V11 atual. Execute o favorito novamente.";
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

  try {
    removePreviousRuntime();
    const ref = await latestCommit();
    window.__SAC_PREVENCAO_V11_LOADER__ = Object.freeze({ version: LOADER_VERSION, ref });
    const runtimeFiles = FILES.slice(0, -1);
    await Promise.all(runtimeFiles.map((file) => loadScript(file, ref)));
    await loadScript(FILES.at(-1), ref);
  } catch (error) {
    showLoaderError(error);
  }
})();
