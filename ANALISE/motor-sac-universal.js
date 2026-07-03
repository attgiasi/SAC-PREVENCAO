(async function SacPrevencaoUniversalV8() {
  "use strict";

  const VERSION = "8.15.0";
  const FILES = [
    "V8/sac-memory-v8.js",
    "V8/sac-tabulator-v8.js",
    "V8/sac-prevencao-v8.js"
  ];

  const current = (() => {
    try { return new URL(document.currentScript?.src || location.href); }
    catch (_error) { return new URL(location.href); }
  })();

  try {
    document.querySelectorAll("script[data-sac-universal='v8']").forEach((script) => script.remove());
    delete window.SACMemoryV8;
    delete window.SACTabulatorV8;
  } catch (_error) {}

  for (const file of FILES) {
    await new Promise((resolve, reject) => {
      const url = new URL(file, current);
      url.searchParams.set("v", VERSION);
      url.searchParams.set("cache", String(Date.now()));
      const script = document.createElement("script");
      script.dataset.sacUniversal = "v8";
      script.src = url.href;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Não foi possível carregar ${file}.`));
      document.documentElement.appendChild(script);
    });
  }
})();


