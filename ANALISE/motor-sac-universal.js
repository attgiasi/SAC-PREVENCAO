(async function SacPrevencaoUniversalV10() {
  "use strict";

  const VERSION = "10.2.0";
  const FILES = [
    "V10/sac-memory-v10.js",
    "V10/sac-tabulator-v10.js",
    "V10/sac-prevencao-v10.js"
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
      script.dataset.sacUniversal = "v10";
      script.src = url.href;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Não foi possível carregar ${file}.`));
      document.documentElement.appendChild(script);
    });
  }
})();
