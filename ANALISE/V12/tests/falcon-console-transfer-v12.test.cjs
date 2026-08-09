const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const memorySource = fs.readFileSync(path.join(root, "sac-memory-v12.js"), "utf8");
const runtimeSource = fs.readFileSync(path.join(root, "sac-prevencao-v12.js"), "utf8");

assert.match(runtimeSource, /if \(getInvestigationMode\(\)\) storeMediaRequest/);
assert.doesNotMatch(runtimeSource, /function storeMediaRequest\(data\)[\s\S]{0,260}commitCurrentText/);
assert.match(runtimeSource, /Não consegui transferir os dados do Falcon/);
assert.match(runtimeSource, /Não consegui transferir os dados do Console/);
assert.match(runtimeSource, /DADOS DO FALCON NÃO RECEBIDOS/);
assert.match(runtimeSource, /sac-retry-falcon-transfer/);
assert.doesNotMatch(runtimeSource, /collectConsoleData\(falcon \|\| emptyFalconData\(\)\)/);
assert.match(runtimeSource, /accountStatus: clean\(findAccountStatus\(\), ""\)/);
assert.match(runtimeSource, /map\(findValueAfterLabel\)\.find\(Boolean\)/);
assert.doesNotMatch(runtimeSource, /function normalizeStatusOption/);

function storageMock(initial = {}) {
  const values = new Map(Object.entries(initial).map(([key, value]) => [key, String(value)]));
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key)
  };
}

function memoryContext({ clipboardHtml = "", sessionInitial = {} } = {}) {
  const context = {
    console,
    Date,
    JSON,
    encodeURIComponent,
    decodeURIComponent,
    setTimeout,
    clearTimeout,
    document: {
      addEventListener() {},
      removeEventListener() {},
      execCommand: () => false
    },
    navigator: {
      clipboard: {
        read: async () => clipboardHtml ? [{
          types: ["text/html"],
          getType: async () => ({ text: async () => clipboardHtml })
        }] : []
      }
    },
    window: {
      name: "",
      localStorage: storageMock(),
      sessionStorage: storageMock(sessionInitial)
    }
  };
  context.window.window = context.window;
  context.window.navigator = context.navigator;
  vm.createContext(context);
  vm.runInContext(memorySource, context, { filename: "sac-memory-v12.js" });
  return context;
}

const now = Date.now();
const staleFalcon = {
  type: "SAC_FALCON",
  buildFamily: "12",
  buildVersion: "12.3",
  savedAt: now - 2_000,
  caseNumber: "CASO-ANTIGO",
  rule: "REGRA_ANTIGA"
};
const currentFalcon = {
  type: "SAC_FALCON",
  packageSchema: 1,
  buildFamily: "12",
  buildVersion: "12.3",
  savedAt: now,
  caseNumber: "49373570",
  rule: "TETO_PIX_PF_CCSB",
  value: "10511,48",
  transactionDate: "08/06/2026 07:29"
};
const portable = {
  schema: 1,
  savedAt: now,
  transport: { falcon: currentFalcon },
  settings: {},
  listTombstones: [],
  listsVault: [],
  lists: [],
  history: []
};
const clipboardHtml = `<div>SAC_FALCON</div><!--SAC_PREVENCAO_MEMORY_V12:${encodeURIComponent(JSON.stringify(portable))}-->`;
const destination = memoryContext({
  clipboardHtml,
  sessionInitial: {
    "sac_prevencao_V12:transport": JSON.stringify({ falcon: staleFalcon })
  }
});

(async () => {
  const beforeRead = destination.window.SACMemoryV12.snapshot().savedAt;
  destination.window.SACMemoryV12.mergeCurrentMirrors();
  assert.equal(
    destination.window.SACMemoryV12.snapshot().savedAt,
    beforeRead,
    "uma leitura da memória não pode se apresentar como gravação mais recente"
  );

  await destination.window.SACMemoryV12.hydrateFromClipboard({ timeoutMs: 100 });
  const received = destination.window.SACMemoryV12.transport.get("falcon");
  assert.equal(received.caseNumber, currentFalcon.caseNumber, "o pacote mais novo do Falcon deve vencer o pacote antigo do Console");
  assert.equal(received.rule, currentFalcon.rule);
  assert.equal(received.value, currentFalcon.value);

  const functionStart = runtimeSource.indexOf("  function isCurrentPackage(");
  const functionEnd = runtimeSource.indexOf("\n  function falconCaseTabSelected", functionStart);
  assert.ok(functionStart >= 0 && functionEnd > functionStart, "validador de pacote não encontrado");
  const packageContext = { Date, BUILD_FAMILY: "12", BUILD_VERSION: "12.3", PACKAGE_SCHEMA: 1, PACKAGE_TTL_MS: 12 * 60 * 60 * 1000 };
  vm.createContext(packageContext);
  vm.runInContext(`${runtimeSource.slice(functionStart, functionEnd)}\nthis.isCurrentPackage = isCurrentPackage;`, packageContext);
  assert.equal(packageContext.isCurrentPackage(currentFalcon, "SAC_FALCON"), true, "a build atual deve ser aceita");
  assert.equal(packageContext.isCurrentPackage({ ...currentFalcon, buildVersion: "12.3" }, "SAC_FALCON"), true, "subversões V12 compatíveis não podem perder o caso durante a troca de página");
  assert.equal(packageContext.isCurrentPackage({ ...currentFalcon, buildFamily: "10", buildVersion: "10.9" }, "SAC_FALCON"), false, "outra família deve ser rejeitada");
  assert.equal(packageContext.isCurrentPackage({ ...currentFalcon, packageSchema: 2 }, "SAC_FALCON"), false, "schema incompatível deve ser rejeitado");

  console.log("OK - transferência Falcon para Console preserva o pacote mais novo");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
