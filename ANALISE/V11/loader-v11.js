(async function SACPrevencaoV11Loader() {
  "use strict";

  const REPOSITORY = "attgiasi/SAC-PREVENCAO";
  const BRANCH = "main";
  const BUILD_PATH = "ANALISE/V11";
  const LOADER_VERSION = "11.13.0";
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

  async function latestCommit() {
    try {
      const response = await fetch(`https://api.github.com/repos/${REPOSITORY}/commits/${BRANCH}?cache=${Date.now()}`, {
        cache: "no-store",
        headers: { Accept: "application/vnd.github+json" }
      });
      if (!response.ok) return BRANCH;
      const payload = await response.json();
      return /^[a-f0-9]{40}$/i.test(payload?.sha || "") ? payload.sha : BRANCH;
    } catch (_error) {
      return BRANCH;
    }
  }

  function loadScript(file, ref) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.dataset.sacV11Runtime = LOADER_VERSION;
      script.src = `https://cdn.jsdelivr.net/gh/${REPOSITORY}@${ref}/${BUILD_PATH}/${file}?v=${LOADER_VERSION}&cache=${Date.now()}`;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Falha ao carregar ${file}.`));
      document.documentElement.appendChild(script);
    });
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
    for (const file of FILES) await loadScript(file, ref);
  } catch (error) {
    showLoaderError(error);
  }
})();
