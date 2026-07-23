const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "sac-prevencao-v11.js"), "utf8");
const start = source.indexOf("  function isNoFraudDecision(");
const end = source.indexOf("  function listExpiryDays(", start);
assert.ok(start >= 0 && end > start, "regras de elegibilidade de LISTAS não encontradas");

const sandbox = {
  normalize: (value) => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
};
vm.createContext(sandbox);
vm.runInContext(`${source.slice(start, end)}\nthis.listTypesFor = listTypesFor;`, sandbox);

const eligible = {
  flow: "banking",
  visualFlow: "banking",
  accountStatus: "ativa",
  falcon: { rule: "REGRA CONTENÇÃO" },
  fields: { personStatus: "normal", spdHistory: "não" }
};
assert.deepEqual(JSON.parse(JSON.stringify(sandbox.listTypesFor(eligible))), { allowlist: true, contencao: true });
assert.deepEqual(JSON.parse(JSON.stringify(sandbox.listTypesFor({ ...eligible, accountStatus: "bloqueado" }))), { allowlist: false, contencao: true });
assert.deepEqual(JSON.parse(JSON.stringify(sandbox.listTypesFor({ ...eligible, fields: { personStatus: "spd 21", spdHistory: "não" } }))), { allowlist: false, contencao: true });
assert.deepEqual(JSON.parse(JSON.stringify(sandbox.listTypesFor({ ...eligible, falcon: { rule: "REGRA COMUM" }, fields: { personStatus: "normal", spdHistory: "spd 8" } }))), { allowlist: false, contencao: false });

console.log("OK - permissiva bloqueia conta com bloqueio ou SPD");
