(async function SacPrevencaoUniversalV11() {
  "use strict";

  const VERSION = "11.33.0";
  const LOADER = "V11/loader-v11.js";

  const current = (() => {
    try { return new URL(document.currentScript?.src || location.href); }
    catch (_error) { return new URL(location.href); }
  })();

  try {
    document.querySelectorAll("script[data-sac-universal]").forEach((script) => script.remove());
    window.__SAC_PREVENCAO_V11_RUNTIME__?.dispose?.();
  } catch (_error) {}

  const url = new URL(LOADER, current);
  url.searchParams.set("v", VERSION);
  url.searchParams.set("cache", String(Date.now()));
  const script = document.createElement("script");
  script.dataset.sacUniversal = "v11";
  script.src = url.href;
  script.async = false;
  document.documentElement.appendChild(script);
})();
