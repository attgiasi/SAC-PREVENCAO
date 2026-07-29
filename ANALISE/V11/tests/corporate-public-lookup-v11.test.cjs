const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function storageMock() {
  const values = new Map();
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value))
  };
}

const cnpj = "42040830000192";
const context = {
  URL,
  Date,
  AbortController,
  setTimeout,
  clearTimeout,
  fetch: async (url) => {
    if (String(url).includes("rfb-cnpj-registry")) {
      return { ok: true, json: async () => ({ schemaVersion: 1, version: "empty-test", updatedAt: "2026-07-16", records: [] }) };
    }
    if (String(url).includes("brasilapi.com.br")) {
      return {
        ok: true,
        json: async () => ({
          cnpj,
          razao_social: "TRANSPORTE E GARCIA LTDA",
          nome_fantasia: "GARCIA TRANSPORTES",
          descricao_situacao_cadastral: "ATIVA",
          data_inicio_atividade: "2022-05-18",
          data_situacao_cadastral: "2022-05-18",
          descricao_porte: "DEMAIS",
          cnae_fiscal: 4930202,
          cnae_fiscal_descricao: "Transporte rodoviário"
        })
      };
    }
    throw new Error("URL_INESPERADA");
  },
  window: {
    localStorage: storageMock(),
    location: { href: "https://falcon.example.test/" },
    SACCounterpartyV11: { validateCnpj: (value) => value === cnpj }
  }
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "sac-corporate-v11.js"), "utf8"), context, { filename: "sac-corporate-v11.js" });

(async () => {
  const result = await context.window.SACCorporateV11.lookup(cnpj);
  assert.equal(result.found, true);
  assert.equal(result.tradeName, "GARCIA TRANSPORTES");
  assert.equal(result.openedAt, "2022-05-18");
  assert.equal(result.registrationStatus, "ATIVA");
  assert.equal(result.companySize, "DEMAIS");
  assert.equal(result.source.label, "BrasilAPI / dados públicos da Receita Federal");
  context.window.SACCorporateV11.useProvider({ load: async () => { throw new Error("REGISTRY_UNAVAILABLE"); } });
  const fallback = await context.window.SACCorporateV11.lookup(cnpj, { forceRefresh: true });
  assert.equal(fallback.found, true, "a consulta pública deve continuar quando a base de apoio falhar");
  assert.equal(fallback.lookupSource, "BRASIL_API");
  console.log("OK - consulta cadastral automática V11 validada");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
