const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "sac-prevencao-v12.js"), "utf8");
const start = source.indexOf("  function isNoFraudDecision(");
const end = source.indexOf("  async function updateListsForFinalDecision(", start);
assert.ok(start >= 0 && end > start, "bloco de LISTAS não localizado");

let queue = [];
const notices = [];
const memory = {
  mergeCurrentMirrors() {},
  lists: {
    all: () => queue,
    tombstones: () => [],
    reconcile(items) {
      queue = Array.isArray(items) ? items.slice() : [];
      return queue;
    },
    upsert(item) {
      const index = queue.findIndex((entry) => entry.id === item.id);
      if (index >= 0) queue[index] = item;
      else queue.push(item);
      return item;
    },
    markDone(item) {
      queue = queue.filter((entry) => entry.id !== item.id);
    }
  }
};

const clean = (value, fallback = "N/A") => String(value ?? "").trim() || fallback;
const normalize = (value) => clean(value, "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
const digitsOnly = (value) => String(value ?? "").replace(/\D/g, "");
const alnumOnly = (value) => String(value ?? "").toUpperCase().replace(/[^0-9A-Z]/g, "");
const sandbox = {
  Date,
  EXECUTION_TTL_MS: 12 * 60 * 60 * 1000,
  memory,
  clean,
  normalize,
  digitsOnly,
  alnumOnly,
  documentFieldValue: digitsOnly,
  issuerIdOverride: () => "155",
  isRecentRegistration: (value) => value === "RECENTE",
  showNotice: (message) => notices.push(message)
};
vm.createContext(sandbox);
vm.runInContext(`${source.slice(start, end)}\nthis.stageListsForFinalDecision = stageListsForFinalDecision;`, sandbox);

function contaSimples(index, overrides = {}) {
  return {
    flow: "banking",
    visualFlow: "banking",
    issuer: index % 2 ? "CONTA_SIMPLES (155)" : "Conta Simples",
    issuerId: index % 2 ? "155 - CONTA SIMPLES" : "155",
    account: `ACC-${1000 + index}`,
    accountStatus: "Ativa",
    registrationDate: "ANTIGA",
    cpfCnpj: `11122233${String(index).padStart(3, "0")}`,
    jiraActive: true,
    jiraReference: `SERVICO-${9000 + index}`,
    falcon: { caseNumber: String(49376000 + index), rule: "REGRA COMUM" },
    fields: { personStatus: "normal", spdHistory: "não" },
    ...overrides
  };
}

for (let index = 0; index < 10; index += 1) {
  sandbox.stageListsForFinalDecision(contaSimples(index), "NÃO FRAUDE");
}
assert.equal(queue.length, 10, "dez casos Conta Simples com JIRA devem aparecer imediatamente em LISTAS");
assert.ok(queue.every((item) => item.lists.allowlist && !item.applied.allowlist));

sandbox.stageListsForFinalDecision(contaSimples(4), "NÃO FRAUDE");
assert.equal(queue.length, 10, "repetir o mesmo caso não pode duplicar a pendência");

sandbox.stageListsForFinalDecision(contaSimples(4), "FRAUDE");
assert.equal(queue.length, 9, "mudar a decisão deve retirar somente o caso correspondente");
assert.equal(queue.some((item) => item.caseNumber === "49376004"), false);

sandbox.stageListsForFinalDecision(contaSimples(20, { jiraActive: false, jiraReference: "" }), "NÃO FRAUDE");
assert.equal(queue.length, 10, "Conta Simples normal e elegível deve entrar sem JIRA");

sandbox.stageListsForFinalDecision(contaSimples(21, { jiraActive: false, jiraReference: "", registrationDate: "RECENTE" }), "NÃO FRAUDE");
assert.equal(queue.length, 10, "Conta Simples recente deve ficar fora sem JIRA");
assert.ok(notices.some((message) => message.includes("menos de 90 dias")));

sandbox.stageListsForFinalDecision(contaSimples(22, { registrationDate: "RECENTE", accountStatus: "Bloqueada" }), "NÃO FRAUDE");
assert.equal(queue.length, 11, "JIRA deve liberar Conta Simples recente e bloqueada");

console.log("OK - Conta Simples normal e JIRA seguem as regras de LISTAS");
