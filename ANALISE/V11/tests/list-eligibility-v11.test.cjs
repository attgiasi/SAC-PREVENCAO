const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "sac-prevencao-v11.js"), "utf8");
const preview = fs.readFileSync(path.join(__dirname, "..", "preview.html"), "utf8");
assert.match(source, /data-list-tab="cashout"/);
assert.match(source, /ALLOWLIST_CASHOUT_LIMITE_ISPB_CRYPTO/);
assert.match(source, /if \(selectedText\.includes\("CASHOUT_LIMITE_ISPB_CRYPTO"\)\) return "cashout"/);
assert.match(preview, /data-list-tab="cashout"/);
assert.match(preview, /type:"cashout"/);
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
assert.deepEqual(JSON.parse(JSON.stringify(sandbox.listTypesFor(eligible))), { allowlist: true, contencao: true, cashout: false });
assert.deepEqual(JSON.parse(JSON.stringify(sandbox.listTypesFor({ ...eligible, accountStatus: "bloqueado" }))), { allowlist: false, contencao: true, cashout: false });
assert.deepEqual(JSON.parse(JSON.stringify(sandbox.listTypesFor({ ...eligible, fields: { personStatus: "spd 21", spdHistory: "não" } }))), { allowlist: false, contencao: true, cashout: false });
assert.deepEqual(JSON.parse(JSON.stringify(sandbox.listTypesFor({ ...eligible, falcon: { rule: "REGRA COMUM" }, fields: { personStatus: "normal", spdHistory: "spd 8" } }))), { allowlist: false, contencao: false, cashout: false });
assert.deepEqual(JSON.parse(JSON.stringify(sandbox.listTypesFor({ ...eligible, issuer: "Conta Simples", issuerId: "155", jiraActive: false }))), { allowlist: false, contencao: true, cashout: false });
assert.deepEqual(JSON.parse(JSON.stringify(sandbox.listTypesFor({ ...eligible, issuer: "Conta Simples", issuerId: "155", jiraActive: true }))), { allowlist: true, contencao: true, cashout: false });

const cashout = {
  ...eligible,
  falcon: { rule: "Alto_Risco_NEGA_CASHOUT_LIMITE_ISPB" },
  fields: { personStatus: "normal", spdHistory: "não" }
};
assert.deepEqual(JSON.parse(JSON.stringify(sandbox.listTypesFor(cashout))), { allowlist: true, contencao: false, cashout: true });
assert.deepEqual(JSON.parse(JSON.stringify(sandbox.listTypesFor({ ...cashout, accountStatus: "bloqueado" }))), { allowlist: false, contencao: false, cashout: false });

console.log("OK - permissiva, contenção e Cashout seguem elegibilidade independente");
