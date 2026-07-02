(() => {
  'use strict';

  const ACTIVE_VERSION = 'V1';
  const ATTR = 'data-sac-universal';
  const BASE = 'https://cdn.jsdelivr.net/gh/attgiasi/SAC-PREVENCAO@main/ANALISE/';
  const FILES = [
    `${ACTIVE_VERSION}/sac-memory-v1.js`,
    `${ACTIVE_VERSION}/sac-tabulator-v1.js`,
    `${ACTIVE_VERSION}/sac-prevencao-v1.js`
  ];

  const cleanup = () => {
    try {
      if (window.SACPrevencao && typeof window.SACPrevencao.destroy === 'function') {
        window.SACPrevencao.destroy();
      }
    } catch (error) {
      console.warn('[SAC] Falha ao finalizar motor anterior', error);
    }

    document.querySelectorAll(`script[${ATTR}]`).forEach((script) => script.remove());
    document.querySelectorAll('[data-sac-root="true"]').forEach((node) => node.remove());

    try {
      delete window.SACMemory;
      delete window.SACTabulator;
      delete window.SACPrevencao;
    } catch (error) {
      window.SACMemory = undefined;
      window.SACTabulator = undefined;
      window.SACPrevencao = undefined;
    }
  };

  const loadScript = (file) => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `${BASE}${file}?cache=${Date.now()}`;
    script.async = false;
    script.setAttribute(ATTR, ACTIVE_VERSION);
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Falha ao carregar ${file}`));
    document.documentElement.appendChild(script);
  });

  cleanup();

  const current = document.currentScript;
  if (current) {
    current.setAttribute(ATTR, 'motor');
  }

  FILES.reduce((chain, file) => chain.then(() => loadScript(file)), Promise.resolve())
    .then(() => {
      window.SAC_ACTIVE_VERSION = ACTIVE_VERSION;
    })
    .catch((error) => {
      console.error('[SAC] Motor universal interrompido', error);
      const detail = error && error.message ? error.message : 'Falha ao carregar automação SAC Prevenção.';
      const event = new CustomEvent('sac:universal-error', { detail });
      window.dispatchEvent(event);
    });
})();
