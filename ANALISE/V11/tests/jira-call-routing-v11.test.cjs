const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "sac-prevencao-v11.js"), "utf8");
const preview = fs.readFileSync(path.join(root, "preview.html"), "utf8");
const start = source.indexOf("  function tabulatorCallValues(data) {");
const end = source.indexOf("  async function verifyDocumentAfterPageValidation", start);

assert.ok(start >= 0 && end > start, "roteamento de chamada do Tabulador não encontrado");
assert.match(source, /if \(enabled && !jira\) openPidPanel\(data\);/);
assert.match(source, /syncCallToggles\(\);/);
assert.match(source, /const jiraCall = Boolean\(data\.jiraActive\) && callModeActive;/);
assert.match(source, /resultToggle\.disabled = !enabled \|\| jira;/);
assert.match(preview, /if\(active&&!jira\)openPid\(data\);else closePid\(\)/);
assert.match(preview, /JIRA sem chamada: SEM CONTATO - PLANILHA e SEM CHAMADA aplicados/);
assert.match(preview, /JIRA com chamada: RECEPTIVO e COM SUCESSO aplicados/);

const sandbox = {
  normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase();
  }
};
vm.createContext(sandbox);
vm.runInContext(`${source.slice(start, end)}\nthis.tabulatorCallValues = tabulatorCallValues;`, sandbox);

assert.deepEqual(JSON.parse(JSON.stringify(sandbox.tabulatorCallValues({ jiraActive: true, fields: { callMode: "sem chamada" } }))), {
  type: "SEM CONTATO - PLANILHA",
  result: "SEM CHAMADA"
});
assert.deepEqual(JSON.parse(JSON.stringify(sandbox.tabulatorCallValues({ jiraActive: true, fields: { callMode: "com chamada", callResult: "sem sucesso" } }))), {
  type: "RECEPTIVO",
  result: "COM SUCESSO"
});
assert.deepEqual(JSON.parse(JSON.stringify(sandbox.tabulatorCallValues({ jiraActive: false, fields: { callMode: "com chamada", callResult: "sem sucesso" } }))), {
  type: "ATIVA - PLANILHA",
  result: "SEM SUCESSO"
});
assert.deepEqual(JSON.parse(JSON.stringify(sandbox.tabulatorCallValues({ jiraActive: false, fields: { callMode: "sem chamada" } }))), {
  type: "SEM CONTATO - PLANILHA",
  result: "SEM CHAMADA"
});

console.log("OK - JIRA roteia chamada, PID e Tabulador sem conflito");
