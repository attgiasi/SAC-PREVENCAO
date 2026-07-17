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
assert.match(source, /const pasted = await readClipboardText\(\);/);
assert.match(source, /panel\.dataset\.flow = pidFlow;/);
assert.match(source, /getFlowTone\(pidFlow\)/);
assert.doesNotMatch(source, /panel\.style\.setProperty\("--sac-primary", getFlowTone\("card"\)\)/);
assert.match(source, /Análise transacional de cartão/);
assert.match(source, /Leitura por estabelecimento e modo de entrada/);
assert.match(source, /sac-transaction-view/);
assert.match(source, /placePidPanel\(\);/);
assert.match(source, /input\.addEventListener\("input", syncCallToggles\)/);
assert.match(source, /input\.addEventListener\("change", syncCallToggles\)/);
assert.match(source, /placeAuxiliaryPanel\(host, panel\)/);
assert.match(source, /return panel;/);

const functionStart = source.indexOf("  function openPidPanel(data) {");
const functionEnd = source.indexOf("  function ensureStyles()", functionStart);
assert.ok(functionStart >= 0 && functionEnd > functionStart);
const elements = new Map();
let appendCount = 0;
const host = { id: "sac-panel-console" };
elements.set(host.id, host);
const sandbox = {
  elements,
  placed: 0,
  document: {
    body: {
      appendChild(panel) {
        appendCount += 1;
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
        remove() { elements.delete(this.id); }
      };
    }
  }
};
vm.createContext(sandbox);
vm.runInContext(`
  const ensureStyles = () => {};
  const byId = (id) => elements.get(id) || null;
  const normalize = (value) => String(value || "").toUpperCase();
  const pidProfileFor = () => ({ title: "PID TESTE", required: [], complementary: [], note: "" });
  const getTheme = () => "dark";
  const getFlowTone = (flow) => flow === "hold" ? "#ff2d00" : "#22c55e";
  const escapeHtml = (value) => String(value || "");
  const trimTimeToMinute = (value) => String(value || "");
  const isMissing = () => false;
  const placePidPanel = () => { placed += 1; };
  const placeAuxiliaryPanel = () => {};
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
assert.equal(sandbox.placed, 2);

console.log("OK - painel PID ligado à chamada e aos dados do BigData");
