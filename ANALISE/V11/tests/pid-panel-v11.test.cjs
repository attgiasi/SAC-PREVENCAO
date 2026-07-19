const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "sac-prevencao-v11.js"), "utf8");

assert.match(source, /if \(enabled\) openPidPanel\(data\);/);
assert.doesNotMatch(source, /data\.flow === ["']card["'] && enabled/);
assert.match(source, /PID - \$\{issuer \|\| ["']PADRÃO["']\}/);
assert.match(source, /pid\.motherName/);
assert.match(source, /pid\.birthDate/);
assert.match(source, /pid\.address/);
assert.match(source, /pid\.phone/);
assert.match(source, /data-pid-reload/);
assert.match(source, /collectConsolePidField/);
assert.doesNotMatch(source, /Vencimento da fatura/);
assert.match(source, /const pasted = await readClipboardText\(\);/);
assert.match(source, /panel\.dataset\.flow = pidFlow;/);
assert.match(source, /getFlowTone\(pidFlow\)/);
assert.doesNotMatch(source, /panel\.style\.setProperty\("--sac-primary", getFlowTone\("card"\)\)/);
assert.match(source, /Análise transacional de cartão/);
assert.match(source, /Leitura por estabelecimento e modo de entrada/);
assert.match(source, /sac-transaction-view/);
assert.match(source, /placePidPanel\(\);/);
assert.match(source, /id="sac-call-mode-toggle" class="sac-toggle/);
assert.match(source, /byId\("sac-call-mode-toggle"\)\?\.addEventListener\("click"/);
assert.match(source, /button\.dataset\.active = button\.dataset\.active === "true" \? "false" : "true"/);
assert.doesNotMatch(source, /id="sac-call-mode-toggle"[^>]*type="checkbox"/);
assert.match(source, /:not\(\.sac-pid-panel\)/);
assert.match(source, /const RUNTIME_SLOT = "__SAC_PREVENCAO_V11_RUNTIME__"/);
assert.match(source, /runtimeController\.abort\(\)/);
assert.match(source, /addRuntimeEvent\(document, "keydown"/);
assert.match(source, /placeAuxiliaryPanel\(host, panel\)/);
assert.match(source, /return panel;/);
assert.match(source, /\.sac-pid-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/);
assert.match(source, /const oppositeOfSide = side/);

const preview = fs.readFileSync(path.join(__dirname, "..", "preview.html"), "utf8");
assert.match(preview, /investigation:true/);
assert.match(preview, /callMode:"com chamada",callResult:"com sucesso"/);
assert.match(preview, /if\(norm\(data\.fields\.callMode\)==="COM CHAMADA"\)openPid\(data\)/);
assert.match(preview, /\.pid-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/);

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
  const BUILD_VERSION = "11.18";
  const ensureStyles = () => {};
  const byId = (id) => elements.get(id) || null;
  const normalize = (value) => String(value || "").toUpperCase();
  const clean = (value, fallback = "") => String(value || "").trim() || fallback;
  const all = () => [];
  const pidProfileFor = () => ({ title: "PID TESTE", required: [], complementary: [], note: "" });
  const getTheme = () => "dark";
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
