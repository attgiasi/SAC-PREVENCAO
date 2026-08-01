const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "sac-prevencao-v12.js"), "utf8");
const start = source.indexOf("  function queueFor(data) {");
const end = source.indexOf("  function tabulatorCallValues(data) {", start);
assert.ok(start >= 0 && end > start, "roteamento de fila e motivo status não encontrado");

const sandbox = {
  normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase();
  },
  isHoldRule(rule) {
    return /HOLD/i.test(String(rule || ""));
  }
};
vm.createContext(sandbox);
vm.runInContext(`${source.slice(start, end)}
this.queueFor = queueFor;
this.reasonForDecision = reasonForDecision;`, sandbox);

assert.equal(sandbox.queueFor({ flow: "banking", visualFlow: "banking", falcon: { rule: "REGRA COMUM" } }), "BANKING");
assert.equal(sandbox.queueFor({ flow: "banking", visualFlow: "hold", falcon: { rule: "REGRA HOLD" } }), "HOLD");
assert.equal(sandbox.queueFor({ flow: "card", visualFlow: "card", falcon: { transactionDecision: "approve" } }), "CARTÕES APROVADAS");
assert.equal(sandbox.queueFor({ flow: "card", visualFlow: "card", falcon: { transactionDecision: "decline" } }), "CARTÕES RECUSADAS");
assert.equal(sandbox.queueFor({ flow: "card", visualFlow: "card", falcon: { transactionDecision: "" } }), "");

assert.equal(sandbox.reasonForDecision({ flow: "banking", fields: {} }, "FRAUDE"), "FRAUDE TRANSACIONAL");
assert.equal(sandbox.reasonForDecision({ flow: "banking", fields: {} }, "NÃO FRAUDE"), "SEM SUSPEITAS");
assert.equal(sandbox.reasonForDecision({ flow: "banking", fields: {} }, "NÃO FOI POSSÍVEL CONFIRMAR FRAUDE"), "DADOS INSUFICIENTES PARA ANÁLISE");
assert.equal(sandbox.reasonForDecision({ flow: "card", fields: {} }, "FRAUDE"), "CLIENTE SOFREU FRAUDE");
assert.equal(sandbox.reasonForDecision({ flow: "card", fields: { purchasePattern: "autofinanciamento" } }, "FRAUDE"), "FRAUDE TRANSACIONAL");
assert.equal(sandbox.reasonForDecision({ flow: "card", fields: {} }, "NÃO FOI POSSÍVEL CONFIRMAR FRAUDE"), "CLIENTE NÃO ATENDE");
assert.equal(sandbox.reasonForDecision({ flow: "card", fields: {} }, "NÃO FOI POSSÍVEL CONFIRMAR NÃO FRAUDE"), "DADOS INSUFICIENTES PARA ANÁLISE");

console.log("OK - fila, decisão e motivo status seguem as regras da V12");
