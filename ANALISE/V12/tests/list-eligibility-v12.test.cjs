const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "sac-prevencao-v12.js"), "utf8");
const preview = fs.readFileSync(path.join(__dirname, "..", "preview.html"), "utf8");
assert.match(source, /data-list-tab="cashout"/);
assert.match(source, /ALLOWLIST_CASHOUT_LIMITE_ISPB_CRYPTO/);
assert.match(source, /return text\.includes\("ISPB"\)/);
assert.match(preview, /data-list-tab="cashout"/);
assert.match(preview, /type:"cashout"/);
const start = source.indexOf("  function isNoFraudDecision(");
const end = source.indexOf("  function listExpiryDays(", start);
assert.ok(start >= 0 && end > start, "regras de elegibilidade de LISTAS não encontradas");

const sandbox = {
  digitsOnly: (value) => String(value || "").replace(/\D/g, ""),
  isRecentRegistration: (value) => value === "RECENTE",
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
assert.deepEqual(JSON.parse(JSON.stringify(sandbox.listTypesFor({ ...eligible, issuer: "Conta Simples", issuerId: "155", registrationDate: "ANTIGA", jiraActive: false }))), { allowlist: true, contencao: true, cashout: false });
assert.deepEqual(JSON.parse(JSON.stringify(sandbox.listTypesFor({ ...eligible, issuer: "Conta Simples", issuerId: "155", registrationDate: "RECENTE", jiraActive: false }))), { allowlist: false, contencao: true, cashout: false });
assert.deepEqual(JSON.parse(JSON.stringify(sandbox.listTypesFor({ ...eligible, issuer: "Conta Simples", issuerId: "155", registrationDate: "RECENTE", jiraActive: true }))), { allowlist: true, contencao: true, cashout: false });
assert.deepEqual(JSON.parse(JSON.stringify(sandbox.listTypesFor({ ...eligible, issuer: "Conta Simples", issuerId: "155", jiraActive: true }))), { allowlist: true, contencao: true, cashout: false });
assert.deepEqual(JSON.parse(JSON.stringify(sandbox.listTypesFor({ ...eligible, issuer: "CONTA_SIMPLES (155)", issuerId: "155 - CONTA SIMPLES", jiraActive: "ligado" }))), { allowlist: true, contencao: true, cashout: false });
assert.deepEqual(JSON.parse(JSON.stringify(sandbox.listTypesFor({ ...eligible, issuer: "Conta-Simples", issuerId: "", jiraReference: "SERVICO-12345" }))), { allowlist: true, contencao: true, cashout: false });
assert.deepEqual(JSON.parse(JSON.stringify(sandbox.listTypesFor({ ...eligible, issuer: "Conta-Simples", issuerId: "", jiraReference: "SERVICOS-975709" }))), { allowlist: true, contencao: true, cashout: false });
assert.deepEqual(JSON.parse(JSON.stringify(sandbox.listTypesFor({ ...eligible, accountStatus: "bloqueado", jiraActive: true }))), { allowlist: true, contencao: true, cashout: false });

for (let index = 0; index < 10; index += 1) {
  const contaSimples = {
    ...eligible,
    falcon: { rule: "REGRA COMUM", caseNumber: String(49375000 + index) },
    issuer: index % 2 ? "CONTA_SIMPLES (155)" : "Conta Simples",
    issuerId: index % 2 ? "155 - CONTA SIMPLES" : "155",
    jiraActive: true
  };
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.listTypesFor(contaSimples))), { allowlist: true, contencao: false, cashout: false });
}

const cashout = {
  ...eligible,
  falcon: { rule: "Alto_Risco_NEGA_CASHOUT_LIMITE_ISPB" },
  fields: { personStatus: "normal", spdHistory: "não" }
};
assert.deepEqual(JSON.parse(JSON.stringify(sandbox.listTypesFor(cashout))), { allowlist: true, contencao: false, cashout: true });
assert.deepEqual(JSON.parse(JSON.stringify(sandbox.listTypesFor({ ...cashout, accountStatus: "bloqueado" }))), { allowlist: true, contencao: false, cashout: true });
assert.deepEqual(JSON.parse(JSON.stringify(sandbox.listTypesFor({ ...cashout, falcon: { rule: "REGRA_ISPB_TESTE" } }))), { allowlist: true, contencao: false, cashout: true });

console.log("OK - permissiva, JIRA, contenção e qualquer regra ISPB seguem a elegibilidade da V12");
