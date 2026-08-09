const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "sac-prevencao-v12.js"), "utf8");

assert.match(source, /if \(enabled && !jira\) openPidPanel\(data\);\s*else closePidPanel\(\);/);
assert.doesNotMatch(source, /data\.flow === ["']card["'] && enabled/);
assert.match(source, /PID - \$\{issuer \|\| ["']PADRÃO["']\}/);
assert.match(source, /pid\.motherName/);
assert.match(source, /pid\.birthDate/);
assert.match(source, /pid\.address/);
assert.match(source, /pid\.phone/);
assert.match(source, /data-pid-reload/);
assert.match(source, /class="sac-pid-reload sac-pid-reload-control"/);
assert.match(source, /data-tooltip="Atualizar dado"/);
assert.match(source, /aria-busy="false"/);
assert.match(source, /button\.classList\.add\("error"\)/);
assert.match(source, /Não encontrado\. Tentar novamente/);
assert.match(source, /collectConsolePidField/);
assert.doesNotMatch(source, /Vencimento da fatura/);
assert.match(source, /const pasted = await readClipboardText\(\);/);
assert.match(source, /panel\.dataset\.flow = pidFlow;/);
assert.match(source, /getFlowTone\(pidFlow\)/);
assert.doesNotMatch(source, /panel\.style\.setProperty\("--sac-primary", getFlowTone\("card"\)\)/);
assert.match(source, /Análise transacional de cartão/);
assert.match(source, /Estabelecimentos/);
assert.match(source, /sac-transaction-view/);
assert.match(source, /placePidPanel\(\);/);
assert.match(source, /const launcherReserve = anchor === host && host\.querySelector\("\.sac-investigation-launcher"\) \? 100 : 0;/);
assert.match(source, /const leftOfAnchor = rect\.left - width - launcherReserve - 8;/);
assert.match(source, /id="sac-call-mode-toggle" class="sac-toggle/);
assert.match(source, /byId\("sac-call-mode-toggle"\)\?\.addEventListener\("click"/);
assert.match(source, /button\.dataset\.active = button\.dataset\.active === "true" \? "false" : "true"/);
assert.doesNotMatch(source, /id="sac-call-mode-toggle"[^>]*type="checkbox"/);
assert.match(source, /:not\(\.sac-pid-panel\)/);
assert.match(source, /const RUNTIME_SLOT = "__SAC_PREVENCAO_V12_RUNTIME__"/);
assert.match(source, /runtimeController\.abort\(\)/);
assert.match(source, /addRuntimeEvent\(document, "keydown"/);
assert.match(source, /placeAuxiliaryPanel\(host, panel\)/);
assert.match(source, /return panel;/);
assert.match(source, /\.sac-pid-grid\{[^}]*grid-template-columns:minmax\(0,1fr\)/);
assert.doesNotMatch(source, /\.sac-pid-grid\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
assert.doesNotMatch(source, /\.sac-pid-panel\{width:min\(360px/);
assert.equal((source.match(/\.sac-pid-panel\{width:min\(420px/g) || []).length, 1);
assert.match(source, /const oppositeOfSide = side/);
assert.match(source, /panel\.classList\.toggle\("sac-minimized", Boolean\(owner\?\.classList\.contains\("sac-minimized"\)\)\)/);
assert.match(source, /\["display", "visibility", "opacity", "pointer-events"\]\.forEach\(\(property\) => panel\.style\.removeProperty\(property\)\)/);
assert.match(source, /panel\.classList\.contains\("sac-minimized"\) \|\| host\.classList\.contains\("sac-minimized"\)/);

const preview = fs.readFileSync(path.join(__dirname, "..", "preview.html"), "utf8");
assert.match(preview, /investigation:false,help:false/);
assert.match(preview, /callMode:"com chamada",callResult:"com sucesso"/);
assert.match(preview, /norm\(data\.fields\.callMode\)==="COM CHAMADA"&&!data\.jiraActive/);
assert.match(preview, /if\(active&&!jira\)openPid\(data\);else closePid\(\)/);
assert.match(preview, /\.pid-grid\{[^}]*grid-template-columns:minmax\(0,1fr\)/);
assert.doesNotMatch(preview, /\.pid-grid\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
assert.doesNotMatch(preview, /\.pid\{[^}]*width:360px/);
assert.match(preview, /class="pid-reload-control"/);
assert.match(preview, /pid-reload-icon/);
assert.match(preview, /Dado do PID atualizado/);
assert.match(preview, /data-owner="console"/);
assert.match(preview, /if\(!minimized&&stage==="console"\)placePid\(\)/);

const functionStart = source.indexOf("  function openPidPanel(data, options = {}) {");
const functionEnd = source.indexOf("  function ensureStyles()", functionStart);
assert.ok(functionStart >= 0 && functionEnd > functionStart);
const elements = new Map();
let appendCount = 0;
const host = { id: "sac-panel-console", isConnected: true };
elements.set(host.id, host);
const sandbox = {
  elements,
  placed: 0,
  document: {
    body: {
      appendChild(panel) {
        appendCount += 1;
        panel.isConnected = true;
        elements.set(panel.id, panel);
      }
    },
    createElement() {
      const style = { setProperty(name, value) { this[name] = value; } };
      return {
        dataset: {},
        style,
        className: "",
        innerHTML: "",
        isConnected: false,
        remove() { this.isConnected = false; elements.delete(this.id); }
      };
    }
  }
};
vm.createContext(sandbox);
vm.runInContext(`
  const BUILD_VERSION = "12.4";
  const ensureStyles = () => {};
  const byId = (id) => elements.get(id) || null;
  const normalize = (value) => String(value || "").toUpperCase();
  const documentKind = () => "CPF";
  const documentFieldValue = (value) => String(value || "").replace(/\\D/g, "");
  const clean = (value, fallback = "") => String(value || "").trim() || fallback;
  const all = () => [];
  const pidProfileFor = () => ({ title: "PID TESTE", required: [], complementary: [], note: "" });
  const getTheme = () => "dark";
  const getFontScale = () => 1;
  const getFlowTone = (flow) => flow === "hold" ? "#ff2d00" : "#22c55e";
  const forcePidPanelVisible = (panel) => { panel.hidden = false; panel.style.setProperty("display", "grid"); };
  const escapeHtml = (value) => String(value || "");
  const trimTimeToMinute = (value) => String(value || "");
  const isMissing = () => false;
  const placePidPanel = () => { placed += 1; };
  const placeAuxiliaryPanel = () => {};
  const requestAnimationFrame = (callback) => callback();
  const collectConsolePidField = () => ({ key: "", value: "" });
  const showNotice = () => {};
  ${source.slice(functionStart, functionEnd)}
  globalThis.openPidPanelForTest = openPidPanel;
`, sandbox);
const opened = sandbox.openPidPanelForTest({ flow: "hold", issuer: "SOFISA", caseNumber: "49373744", pidData: {} });
assert.ok(opened);
assert.equal(opened.id, "sac-pid-panel");
assert.equal(opened.dataset.flow, "hold");
assert.equal(opened.style["--sac-primary"], "#ff2d00");
assert.equal(appendCount, 1);
const reopened = sandbox.openPidPanelForTest({ flow: "hold", issuer: "SOFISA", caseNumber: "49373744", pidData: {} });
assert.equal(reopened, opened);
assert.equal(appendCount, 1);
assert.equal(sandbox.placed, 3);

console.log("OK - painel PID ligado à chamada e aos dados do Console");
