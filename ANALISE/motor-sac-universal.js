(async function SacPrevencaoUniversalV12() {
  "use strict";

  const VERSION = "12.2.0";
  const LOADER = "V12/loader-v12.js";

  const current = (() => {
    try { return new URL(document.currentScript?.src || location.href); }
    catch (_error) { return new URL(location.href); }
  })();

  try {
    document.querySelectorAll("script[data-sac-universal]").forEach((script) => script.remove());
    Object.getOwnPropertyNames(window)
      .filter((name) => /^__SAC_PREVENCAO_V\d+_RUNTIME__$/.test(name))
      .forEach((name) => window[name]?.dispose?.());
  } catch (_error) {}

  const url = new URL(LOADER, current);
  url.searchParams.set("v", VERSION);
  url.searchParams.set("cache", String(Date.now()));
  const script = document.createElement("script");
  script.dataset.sacUniversal = "v12";
  script.src = url.href;
  script.async = false;
  document.documentElement.appendChild(script);
})();
