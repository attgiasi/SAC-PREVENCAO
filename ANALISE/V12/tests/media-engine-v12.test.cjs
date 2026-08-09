const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const context = { window: {}, document: {}, setTimeout };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "sac-media-v12.js"), "utf8"), context);

const engine = context.window.SACMediaV12;
assert.equal(typeof engine.collectPidData, "function");
assert.equal(typeof engine.collectCustomerIdentity, "function");
assert.equal(typeof engine.searchCpf, "function");
assert.equal(typeof engine.canSearchPage, "function");
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
  let resultReady = false;
  let searchClicks = 0;
  let queryRevision = 0;
  const fieldEvents = [];
  class TestEvent {
    constructor(type, options = {}) {
      this.type = type;
      this.bubbles = Boolean(options.bubbles);
    }
  }
  function resultCard(entries) {
    return {
      querySelectorAll(selector) {
        if (selector !== ".cd-block") return [];
        return entries.map(([label, value]) => ({
          querySelector(target) {
            if (target === ".cd-title") return { textContent: `${label}:` };
            if (target === ".cd-value") return { textContent: typeof value === "function" ? value() : value };
            return null;
          }
        }));
      }
    };
  }
  const cpfInput = {
    value: "",
    ownerDocument: { defaultView: { Event: TestEvent } },
    dispatchEvent(event) { fieldEvents.push(event.type); }
  };
  const searchButton = {
    disabled: false,
    getAttribute: () => null,
    click() {
      searchClicks += 1;
      queryRevision += 1;
      resultReady = true;
    }
  };
  const personCard = resultCard([
    ["Query ID", () => `query-${queryRevision}`],
    ["Nome", "Maria Teste"],
    ["Documento", "11111111111"],
    ["Nome da mãe", "Ana Teste"],
    ["Data de nascimento", "1990-01-02"]
  ]);
  const addressCard = resultCard([
    ["Endereço", "Rua Teste"],
    ["Complemento", "10"],
    ["Cidade", "Curitiba"],
    ["UF", "PR"],
    ["Endereço é principal", "Sim"]
  ]);
  const emailCard = resultCard([
    ["Email", "maria@example.com"],
    ["Email é principal", "Sim"]
  ]);
  const bigDataRoot = {
    querySelector(selector) {
      if (selector === "#inputCPF") return cpfInput;
      if (selector === "#SearchBtn") return searchButton;
      if (selector === "#queryResult_personData,#queryResult_judicialCasesHolderData") return resultReady ? {} : null;
      return null;
    },
    querySelectorAll(selector) {
      if (!resultReady) return [];
      if (selector === "#queryResult_personData .content-card") return [personCard];
      if (selector === "#queryResult_addressData .content-card") return [addressCard];
      if (selector === "#queryResult_emailData .content-card") return [emailCard];
      if (selector === "#queryResult_judicialCasesHolderData .content-card") return [];
      return [];
    }
  };

  assert.equal(engine.canSearchPage(bigDataRoot), true);
  const search = await engine.searchCpf({
    root: bigDataRoot,
    document: "111.111.111-11",
    timeoutMs: 1200,
    intervalMs: 50
  });
  assert.equal(search.ok, true);
  assert.equal(search.code, "BIGDATA_RESULT_READY");
  assert.equal(cpfInput.value, "11111111111");
  assert.equal(searchClicks, 1);
  assert.deepEqual(fieldEvents, ["input", "change"]);

  const refreshedSearch = await engine.searchCpf({
    root: bigDataRoot,
    document: "11111111111",
    timeoutMs: 1200,
    intervalMs: 50
  });
  assert.equal(refreshedSearch.ok, true, "uma consulta repetida deve aguardar uma nova revisão do resultado");
  assert.equal(searchClicks, 2);

  const pid = engine.collectPidData(bigDataRoot);
  assert.equal(pid.clientName, "Maria Teste");
  assert.equal(pid.clientCpf, "11111111111");
  assert.equal(pid.motherName, "Ana Teste");
  assert.equal(pid.birthDate, "1990-01-02");
  assert.equal(pid.address, "Rua Teste · 10 · Curitiba · PR");
  assert.equal(pid.email, "maria@example.com");

  const scannedBigData = await engine.scanPage({ root: bigDataRoot, holderDocument: "111.111.111-11" });
  assert.equal(scannedBigData.supported, true);
  assert.equal(scannedBigData.code, "NO_ADVERSE_MEDIA");
  assert.equal(scannedBigData.pidData.clientName, "Maria Teste");

  const missingSearch = await engine.searchCpf({ root: { querySelector: () => null }, document: "11111111111" });
  assert.equal(missingSearch.code, "BIGDATA_SEARCH_CONTROLS_NOT_FOUND");

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
