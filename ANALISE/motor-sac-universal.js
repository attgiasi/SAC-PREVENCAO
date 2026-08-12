(async function SacPrevencaoUniversalV12() {
  "use strict";

  const VERSION = "12.6.0";
  const LOADER_REF = "18e01541268f7222875a4f45b6ce9ca10bca56ca";
  const LOADER = `https://cdn.jsdelivr.net/gh/attgiasi/SAC-PREVENCAO@${LOADER_REF}/ANALISE/V12/loader-v12.js`;

  try {
    document.querySelectorAll("script[data-sac-universal]").forEach((script) => script.remove());
    Object.getOwnPropertyNames(window)
      .filter((name) => /^__SAC_PREVENCAO_V\d+_RUNTIME__$/.test(name))
      .forEach((name) => window[name]?.dispose?.());
  } catch (_error) {}

  const url = new URL(LOADER);
  url.searchParams.set("v", VERSION);
  url.searchParams.set("cache", String(Date.now()));
  const script = document.createElement("script");
  script.dataset.sacUniversal = "v12";
  script.src = url.href;
  script.async = false;
  document.documentElement.appendChild(script);
})();
