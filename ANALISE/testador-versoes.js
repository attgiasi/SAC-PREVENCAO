(function SacPrevencaoVersionTester() {
  "use strict";

  const ID = "sac-version-tester";
  const VERSIONS = [
    { id: "V10.3", files: ["V10/sac-memory-v10.js", "V10/sac-tabulator-v10.js", "V10/sac-prevencao-v10.js"], preview: "V10/preview.html", note: "referência estável" },
    { id: "V11.33", files: ["V11/sac-memory-v11.js", "V11/sac-counterparty-v11.js", "V11/sac-corporate-v11.js", "V11/sac-transaction-v11.js", "V11/sac-media-v11.js", "V11/sac-ddd-v11.js", "V11/sac-tabulator-v11.js", "V11/sac-prevencao-v11.js"], preview: "V11/preview.html", note: "favorito universal" },
    { id: "V12.0", files: ["V12/sac-memory-v12.js", "V12/sac-counterparty-v12.js", "V12/sac-corporate-v12.js", "V12/sac-transaction-v12.js", "V12/sac-media-v12.js", "V12/sac-ddd-v12.js", "V12/sac-tabulator-v12.js", "V12/sac-prevencao-v12.js"], preview: "V12/preview.html", note: "homologação" }
  ];

  function currentBase() {
    const src = document.currentScript?.src || "";
    if (src) return new URL(".", src);
    return new URL("./", location.href);
  }

  const BASE = currentBase();

  function style() {
    if (document.getElementById(`${ID}-style`)) return;
    const el = document.createElement("style");
    el.id = `${ID}-style`;
    el.textContent = `
      #${ID}{position:fixed;z-index:2147483641;right:18px;top:18px;width:390px;max-height:calc(100vh - 36px);overflow:auto;border:1px solid #28405f;border-radius:10px;background:#0b1220;color:#eef5ff;font-family:Inter,Segoe UI,Arial,sans-serif;box-shadow:0 22px 48px rgba(0,0,0,.42)}
      #${ID} *{box-sizing:border-box;letter-spacing:0!important}
      .sact-head{height:40px;background:#2563eb;color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 10px;font-weight:900;text-transform:uppercase}
      .sact-close{width:26px;height:26px;border-radius:7px;border:1px solid #fecaca;background:#b91c1c;color:#fff;font-weight:900;cursor:pointer}
      .sact-body{padding:10px}.sact-info{font-size:12px;line-height:16px;color:#b8c4d6;margin:0 0 8px}
      .sact-tools{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px}
      .sact-btn{border:1px solid #2b405d;border-radius:7px;background:#111c32;color:#eef5ff;padding:7px 8px;font-weight:850;font-size:12px;cursor:pointer}.sact-btn:hover{background:#1d2c48;border-color:#60a5fa}.sact-btn.primary{background:#2563eb;border-color:#60a5fa;color:#fff}.sact-btn.warn{background:#92400e;border-color:#f59e0b;color:#fff}
      .sact-version{border:1px solid #263b58;background:#101a2e;border-radius:8px;padding:8px;margin-bottom:7px}
      .sact-top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:7px}.sact-name{font-weight:950;font-size:14px}.sact-note{color:#aab8cc;font-size:11px}
      .sact-actions{display:grid;grid-template-columns:1fr 1fr;gap:6px}.sact-flow{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-top:6px}.sact-flow .sact-btn{padding:6px 4px;font-size:11px}
      .sact-log{border:1px solid #33445f;background:#08111f;color:#dbeafe;border-radius:7px;padding:7px;font-size:11px;line-height:15px;white-space:pre-wrap;max-height:120px;overflow:auto}
    `;
    document.documentElement.appendChild(el);
  }

  function cleanupSacWindows() {
    document.querySelectorAll(
      ".sac-panel,.sac-history-panel,.sac-choice-popover,.sac-side-panel,#sac-notices"
    ).forEach((node) => node.remove());
    Object.keys(window).filter((name) => /^SAC(?:Memory|Tabulator|Counterparty|Corporate|Transaction|Media|Ddd)V\d+$/i.test(name)).forEach((name) => {
      try { delete window[name]; } catch (_err) { window[name] = undefined; }
    });
  }

  function log(message) {
    const box = document.querySelector(`#${ID} .sact-log`);
    if (!box) return;
    box.textContent = `${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} - ${message}\n${box.textContent}`.slice(0, 1800);
  }

  function url(path, extra) {
    const out = new URL(path, BASE);
    out.searchParams.set("cache", Date.now().toString());
    if (extra) Object.entries(extra).forEach(([key, value]) => out.searchParams.set(key, value));
    return out.href;
  }

  function openPreview(version, flow) {
    const preview = url(version.preview);
    const finalUrl = flow ? `${preview}#${flow}` : preview;
    window.open(finalUrl, `_sac_${version.id}_${flow || "preview"}`);
    log(`${version.id}: prévia aberta${flow ? ` em ${flow}` : ""}.`);
  }

  async function injectVersion(version) {
    cleanupSacWindows();
    if (!version.files.length) {
      openPreview(version);
      return;
    }
    for (const file of version.files) {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = url(file);
        script.onload = resolve;
        script.onerror = () => reject(new Error(file));
        document.documentElement.appendChild(script);
      });
      log(`${version.id}: carregado ${file}.`);
    }
    log(`${version.id}: execução solicitada nesta página.`);
  }

  function openAllPreviews() {
    VERSIONS.forEach((version) => openPreview(version));
    log("Todas as prévias foram solicitadas.");
  }

  function render() {
    style();
    document.getElementById(ID)?.remove();
    const panel = document.createElement("div");
    panel.id = ID;
    panel.innerHTML = `
      <div class="sact-head">
        <span>Testador de versões</span>
        <button class="sact-close" data-close="1">×</button>
      </div>
      <div class="sact-body">
        <p class="sact-info">Comparador isolado de V10, V11 e V12. Recarregue a página antes de trocar a versão executada para manter o teste previsível.</p>
        <div class="sact-tools">
          <button class="sact-btn primary" data-all="1">Abrir prévias</button>
          <button class="sact-btn warn" data-clean="1">Limpar janelas</button>
        </div>
        <div class="sact-list"></div>
        <div class="sact-log">Pronto para teste.</div>
      </div>
    `;
    panel.addEventListener("click", (event) => {
      if (event.target.closest("[data-close]")) panel.remove();
      if (event.target.closest("[data-clean]")) {
        cleanupSacWindows();
        log("Janelas SAC removidas da tela.");
      }
      if (event.target.closest("[data-all]")) openAllPreviews();
    });
    const list = panel.querySelector(".sact-list");
    VERSIONS.forEach((version) => {
      const row = document.createElement("div");
      row.className = "sact-version";
      row.innerHTML = `
        <div class="sact-top">
          <div class="sact-name">${version.id}</div>
          <div class="sact-note">${version.note}</div>
        </div>
        <div class="sact-actions">
          <button class="sact-btn primary" data-preview>Prévia</button>
          <button class="sact-btn" data-run>Executar aqui</button>
        </div>
        <div class="sact-flow">
          <button class="sact-btn" data-flow="banking">Banking</button>
          <button class="sact-btn" data-flow="card">Cartão</button>
          <button class="sact-btn" data-flow="hold">Hold</button>
        </div>
      `;
      row.querySelector("[data-preview]").onclick = () => openPreview(version);
      row.querySelector("[data-run]").onclick = () => injectVersion(version).catch((error) => log(`${version.id}: falha ao carregar ${error.message}.`));
      row.querySelectorAll("[data-flow]").forEach((button) => {
        button.onclick = () => openPreview(version, button.dataset.flow);
      });
      list.append(row);
    });
    document.body.appendChild(panel);
  }

  render();
})();
