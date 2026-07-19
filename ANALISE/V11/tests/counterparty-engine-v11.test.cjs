const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function storageMock() {
  const values = new Map();
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key)
  };
}

function cnpjFromBase(base) {
  const value = (character) => character.charCodeAt(0) - 48;
  const digit = (text, weights) => {
    const remainder = text.split("").reduce((sum, character, index) => sum + value(character) * weights[index], 0) % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  const first = digit(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = digit(`${base}${first}`, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return `${base}${first}${second}`;
}

const context = {
  console,
  Date,
  URL,
  CustomEvent: class CustomEvent { constructor(type, options) { this.type = type; this.detail = options?.detail; } },
  window: {
    localStorage: storageMock(),
    location: { href: "https://console.example.test/" },
    dispatchEvent() {}
  },
  fetch: async () => { throw new Error("NETWORK_DISABLED_IN_TEST"); }
};
context.window.window = context.window;

const source = fs.readFileSync(path.join(__dirname, "..", "sac-counterparty-v11.js"), "utf8");
vm.runInNewContext(source, context, { filename: "sac-counterparty-v11.js" });

const engine = context.window.SACCounterpartyV11;
const cnpj = cnpjFromBase("123456780001");
const secondBranch = cnpjFromBase("123456780002");
const alphanumericCnpj = cnpjFromBase("A23456780001");

engine.loadSnapshot({
  schemaVersion: 1,
  version: "test-1",
  updatedAt: "2026-07-16T12:00:00-03:00",
  records: [
    {
      id: "global-trusted",
      cnpj,
      classification: "TRUSTED",
      directions: ["ORIGIN"],
      issuers: ["GLOBAL"],
      reason: "Origem conhecida.",
      source: { type: "INTERNAL", label: "Teste" },
      active: true,
      priority: 10
    },
    {
      id: "issuer-untrusted",
      cnpj,
      classification: "UNTRUSTED",
      directions: ["ORIGIN"],
      issuers: ["EMISSOR TESTE"],
      reason: "Exceção do emissor.",
      source: { type: "ISSUER", label: "Teste" },
      active: true,
      priority: 10
    },
    {
      id: "root-destination",
      root: cnpj.slice(0, 8),
      scope: "ROOT",
      classification: "REVIEW",
      directions: ["DESTINATION"],
      issuers: ["GLOBAL"],
      reason: "Revisar grupo empresarial.",
      source: { type: "INTERNAL", label: "Teste" },
      active: true
    },
    {
      id: "invalid-record",
      cnpj: "00000000000000",
      classification: "UNTRUSTED",
      directions: ["BOTH"],
      issuers: ["GLOBAL"],
      reason: "Este registro deve ser descartado.",
      source: { type: "INTERNAL", label: "Teste" },
      active: true
    }
  ]
}, { persist: false });

assert.equal(engine.validateCnpj(cnpj), true);
assert.equal(engine.validateCnpj(alphanumericCnpj), true);
assert.equal(engine.validateCnpj("00000000000000"), false);
assert.deepEqual(
  { ...engine.selectFalconCounterparty({ transactionType: "Depósito bancário de varejo", debitCustomerId: "11111111111", creditCustomerId: cnpj }) },
  {
    transactionType: "DEPOSITO BANCARIO DE VAREJO",
    direction: "ORIGIN",
    sourceField: "CREDIT_CUSTOMER_XID_VALUE",
    sourceLabel: "ID do cliente de crédito",
    document: cnpj,
    cnpj,
    cpf: ""
  }
);
assert.equal(engine.selectFalconCounterparty({ transactionType: "Pagamento bancário de varejo", debitCustomerId: cnpj, creditCustomerId: "11111111111" }).document, cnpj);
assert.equal(engine.selectFalconCounterparty({ transactionType: "Pagamento bancário de varejo", debitCustomerId: secondBranch }).cnpj, secondBranch);
assert.equal(engine.selectFalconCounterparty({ transactionType: "Transferência Pix", debitCustomerId: cnpj, creditCustomerId: secondBranch }).document, "");
assert.equal(engine.getState().recordCount, 3);
assert.equal(engine.classifyFromRegistry({ cnpj, issuer: "Outro", direction: "crédito" }).classification, "TRUSTED");
assert.equal(engine.classifyFromRegistry({ cnpj, issuer: "Emissor Teste", direction: "origem" }).classification, "UNTRUSTED");
assert.equal(engine.classifyFromRegistry({ cnpj: secondBranch, issuer: "Outro", direction: "destino" }).classification, "REVIEW");
assert.equal(engine.classifyFromRegistry({ cnpj: "111.111.111-11", issuer: "Outro", direction: "origem" }).classification, "NOT_APPLICABLE");
assert.equal(engine.classifyFromRegistry({ cnpj: cnpjFromBase("987654320001"), issuer: "Outro", direction: "origem" }).classification, "UNKNOWN");

engine.loadSnapshot({
  schemaVersion: 1,
  version: "test-conflict",
  updatedAt: "2026-07-16T12:00:00-03:00",
  records: [
    {
      id: "conflict-trusted",
      cnpj,
      classification: "TRUSTED",
      directions: ["BOTH"],
      issuers: ["GLOBAL"],
      reason: "Sinal favorável.",
      source: { type: "INTERNAL", label: "Teste" },
      active: true,
      priority: 50
    },
    {
      id: "conflict-untrusted",
      cnpj,
      classification: "UNTRUSTED",
      directions: ["BOTH"],
      issuers: ["GLOBAL"],
      reason: "Sinal desfavorável.",
      source: { type: "INTERNAL", label: "Teste" },
      active: true,
      priority: 50
    }
  ]
}, { persist: false });
assert.equal(engine.classifyFromRegistry({ cnpj, issuer: "Outro", direction: "origem" }).classification, "REVIEW");

const operationalRegistry = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "counterparty-registry-v11.json"), "utf8"));
engine.loadSnapshot(operationalRegistry, { persist: false });
assert.equal(engine.getState().recordCount, 102);
assert.equal(operationalRegistry.records.every((record) => engine.validateCnpj(record.cnpj)), true);
assert.equal(operationalRegistry.records.filter((record) => record.cnpj === "56195099000189").length, 2);
assert.equal(operationalRegistry.records.some((record) => record.aliases?.includes("MARCAS")), false);
assert.equal(engine.classifyFromRegistry({ cnpj: "42040830000192", issuer: "Outro", direction: "origem" }).classification, "TRUSTED");
assert.equal(engine.classifyFromRegistry({ cnpj: "42040830000192", issuer: "Outro", direction: "destino" }).classification, "UNKNOWN");
assert.equal(engine.classifyFromRegistry({ cnpj: "65629658000102", issuer: "Outro", direction: "origem" }).classification, "UNTRUSTED");
assert.equal(engine.classifyFromRegistry({ cnpj: "65629658000102", issuer: "Outro", direction: "destino" }).classification, "UNTRUSTED");
assert.equal(engine.classifyFromRegistry({ cnpj: "46786961000174", issuer: "Outro", direction: "destino" }).classification, "TRUSTED");
assert.equal(engine.classifyFromRegistry({ cnpj: "55997392000105", issuer: "Outro", direction: "origem" }).classification, "REVIEW");
assert.equal(engine.classifyFromRegistry({ cnpj: "56195099000189", issuer: "Outro", direction: "origem" }).classification, "REVIEW");

engine.upsertLocalClassification({ cnpj, issuer: "Emissor Teste", direction: "origem", classification: "TRUSTED" });
assert.equal(engine.classifyFromRegistry({ cnpj, issuer: "Emissor Teste", direction: "origem" }).classification, "TRUSTED");
assert.equal(engine.exportLocalRecords().length, 1);
assert.equal(engine.removeLocalClassification({ cnpj, issuer: "Emissor Teste", direction: "origem" }), true);
assert.equal(engine.exportLocalRecords().length, 0);

console.log("OK - motor de contrapartes V11 validado");
