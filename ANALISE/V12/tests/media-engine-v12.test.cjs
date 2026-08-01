const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const context = { window: {}, document: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "sac-media-v12.js"), "utf8"), context);

const engine = context.window.SACMediaV12;
assert.equal(typeof engine.collectPidData, "function");
assert.equal(typeof engine.collectCustomerIdentity, "function");
assert.equal(engine.isBigDataPage({ querySelector: (selector) => selector.includes("#inputCPF") ? {} : null }), true);
assert.equal(engine.isBigDataPage({ querySelector: () => null }), false);
assert.equal(engine.isCpf("111.111.111-11"), true);
assert.equal(engine.isCpf("11.111.111/0001-11"), false);
assert.equal(engine.eligibleParties({ holderDocument: "111.111.111-11", originDocument: "11111111111" }).length, 1);
const request = engine.createRequest({ caseNumber: "49373570", holderDocument: "111.111.111-11" });
const noMedia = engine.createResult(request, { found: false, mediaTypes: [] });
assert.equal(noMedia.classification, "SEM MÍDIA");
assert.equal(Object.keys(noMedia.pidData).length, 0);
assert.equal(engine.resultMatches(request, noMedia), true);

(async () => {
  const unmapped = await engine.scanPage({ holderDocument: "111.111.111-11" });
  assert.equal(unmapped.code, "BIGDATA_PAGE_NOT_MAPPED");

  const classified = engine.classifyProcessRecords([{
    processNumber: "0001",
    subject: "Estelionato",
    type: "Processo criminal",
    parties: [{ document: "11111111111", role: "REU", polarity: "PASSIVE" }]
  }, {
    processNumber: "0002",
    subject: "Ação trabalhista",
    parties: [{ document: "11111111111", role: "REU" }]
  }], [{ document: "11111111111" }]);
  assert.equal(classified.found, true);
  assert.deepEqual(Array.from(classified.mediaTypes), ["Estelionato"]);
  assert.equal(classified.defendants.length, 1);

  const tolerant = engine.classifyProcessRecords([{
    processNumber: "0003",
    subject: "Uso de documentos falsificados em operação eletrônica",
    type: "Ação penal",
    parties: [{ document: "111.111.111-11", role: "recorrido", polarity: "passiva" }]
  }, {
    processNumber: "0004",
    subject: "Tráfico ilícito de substância entorpecente",
    parties: [{ document: "22222222222", role: "réu" }]
  }], [{ document: "11111111111" }]);
  assert.equal(tolerant.found, true);
  assert.deepEqual(Array.from(tolerant.mediaTypes), ["Crimes contra a fé pública"]);
  assert.equal(tolerant.defendants.length, 1, "processo de outro CPF não pode contaminar o resultado");

  const drugDistinction = engine.classifyProcessRecords([{
    processNumber: "0005",
    subject: "Posse de drogas para consumo pessoal - artigo 28",
    parties: [{ document: "11111111111", role: "réu" }]
  }, {
    processNumber: "0006",
    subject: "Tráfico ilícito de substância entorpecente",
    parties: [{ document: "11111111111", role: "réu" }]
  }], [{ document: "11111111111" }]);
  assert.deepEqual(Array.from(drugDistinction.mediaTypes), ["Tráfico de drogas"]);
  assert.equal(drugDistinction.defendants.length, 1, "posse para consumo não pode ser marcada como tráfico");

  const possessionOnly = engine.classifyProcessRecords([{
    processNumber: "0007",
    subject: "Porte e posse de entorpecentes para uso pessoal",
    parties: [{ document: "11111111111", role: "acusado" }]
  }], [{ document: "11111111111" }]);
  assert.equal(possessionOnly.found, false);
  assert.deepEqual(Array.from(possessionOnly.mediaTypes), []);

  const articleDistinction = engine.classifyProcessRecords([{
    processNumber: "0008",
    subject: "Artigo 33 do Código Penal",
    parties: [{ document: "11111111111", role: "réu" }]
  }, {
    processNumber: "0009",
    subject: "Artigo 33 da Lei 11.343",
    parties: [{ document: "11111111111", role: "réu" }]
  }], [{ document: "11111111111" }]);
  assert.deepEqual(Array.from(articleDistinction.mediaTypes), ["Tráfico de drogas"]);
  assert.equal(articleDistinction.defendants.length, 1, "artigo 33 sem vínculo com a Lei de Drogas não pode ser classificado");

  engine.useProvider({
    canScan: () => true,
    scan: async () => ({ found: true, mediaTypes: ["Estelionato", "Não cadastrada"], source: "teste" })
  });
  const result = await engine.scanPage({ holderDocument: "111.111.111-11" });
  assert.equal(result.found, true);
  assert.deepEqual(Array.from(result.mediaTypes), ["Estelionato"]);

  engine.useProvider({
    canScan: () => true,
    scan: async () => ({ identityMismatch: true, found: false, mediaTypes: [], pid: { document: "22222222222" }, source: "teste" })
  });
  const mismatch = await engine.scanPage({ holderDocument: "111.111.111-11" });
  assert.equal(mismatch.code, "BIGDATA_IDENTITY_MISMATCH");
  assert.equal(mismatch.found, false);
  console.log("OK - motor de mídia desabonadora V12 validado");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
