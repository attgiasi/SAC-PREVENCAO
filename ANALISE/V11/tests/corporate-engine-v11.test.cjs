const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const context = {
  window: {
    localStorage: { getItem: () => null, setItem() {} },
    location: { href: "https://example.test/" },
    SACCounterpartyV11: { validateCnpj: (value) => /^[A-Z0-9]{12}[0-9]{2}$/.test(value) }
  },
  URL,
  fetch: async () => { throw new Error("offline"); }
};
vm.createContext(context);
const source = fs.readFileSync(path.join(__dirname, "..", "sac-corporate-v11.js"), "utf8");
vm.runInContext(source, context, { filename: "sac-corporate-v11.js" });

const engine = context.window.SACCorporateV11;
const cnpj = "42040830000192";
engine.loadSnapshot({
  schemaVersion: 1,
  version: "test",
  updatedAt: "2026-07-16",
  records: [{
    cnpj,
    legalName: "TRANSPORTE E GARCIA LTDA",
    tradeName: "GARCIA",
    registrationStatus: "02",
    statusDate: "2022-05-18",
    openedAt: "2022-05-18",
    primaryCnae: { code: "4930202", description: "Transporte rodoviário" },
    source: { type: "RFB_OPEN_DATA", label: "Receita Federal", referenceDate: "2026-07" }
  }]
}, { persist: false, source: "test" });

const active = engine.lookupFromRegistry(cnpj);
assert.equal(active.found, true);
assert.equal(active.registrationStatus, "ATIVA");
assert.equal(active.primaryCnae, "Transporte rodoviário");
assert.equal(engine.cross(active, { label: "SINAL FAVORÁVEL A NÃO FRAUDE", severity: "success" }).severity, "success");

const newBusiness = { ...active, openedAt: "01/07/2026", activityAge: engine.activityAge("01/07/2026", new Date(2026, 6, 16)) };
assert.equal(newBusiness.activityAge.underThreeMonths, true);
assert.equal(engine.cross(newBusiness, { label: "CONFIÁVEL", severity: "success" }).severity, "danger");

engine.loadSnapshot({ schemaVersion: 1, version: "test-2", records: [{ cnpj, registrationStatus: "04" }] }, { persist: false });
const inapt = engine.lookupFromRegistry(cnpj);
assert.equal(inapt.registrationStatus, "INAPTA");
assert.equal(engine.cross(inapt, { label: "CONFIÁVEL", severity: "success" }).severity, "danger");

const missing = engine.lookupFromRegistry("12345678000195");
assert.equal(missing.found, false);
assert.equal(engine.cross(missing, { label: "CONFIÁVEL", severity: "success" }).severity, "warning");
engine.releaseSession();
assert.equal(engine.getState().recordCount, 0, "a consulta cadastral precisa liberar a base carregada ao encerrar");

console.log("OK - motor cadastral Receita V11 validado");
