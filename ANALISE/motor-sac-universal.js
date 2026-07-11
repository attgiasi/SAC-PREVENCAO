(async function SacPrevencaoUniversalV9() {
  "use strict";

  const VERSION = "9.16.0";
  const FILES = [
    "V9/sac-memory-v9.js",
    "V9/sac-tabulator-v9.js",
    "V9/sac-prevencao-v9.js"
  ];

  const current = (() => {
    try { return new URL(document.currentScript?.src || location.href); }
    catch (_error) { return new URL(location.href); }
  })();

  try {
    document.querySelectorAll("script[data-sac-universal]").forEach((script) => script.remove());
    Object.keys(window)
      .filter((name) => /^SAC(Memory|Tabulator)V\d+$/i.test(name))
      .forEach((name) => { try { delete window[name]; } catch (_error) {} });
  } catch (_error) {}

  for (const file of FILES) {
    await new Promise((resolve, reject) => {
      const url = new URL(file, current);
      url.searchParams.set("v", VERSION);
      url.searchParams.set("cache", String(Date.now()));
      const script = document.createElement("script");
      script.dataset.sacUniversal = "v9";
      script.src = url.href;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Não foi possível carregar ${file}.`));
      document.documentElement.appendChild(script);
    });
  }
})();
