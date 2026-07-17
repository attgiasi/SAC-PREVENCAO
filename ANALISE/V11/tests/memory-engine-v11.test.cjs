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

let copyHandler = null;
const copiedTypes = new Map();
const documentMock = {
  addEventListener(type, handler) {
    if (type === "copy") copyHandler = handler;
  },
  removeEventListener(type, handler) {
    if (type === "copy" && copyHandler === handler) copyHandler = null;
  },
  execCommand(command) {
    if (command !== "copy" || !copyHandler) return false;
    const handler = copyHandler;
    copyHandler = null;
    handler({
      clipboardData: { setData: (type, value) => copiedTypes.set(type, String(value)) },
      preventDefault() {}
    });
    return true;
  }
};

const context = {
  console,
  Date,
  JSON,
  encodeURIComponent,
  decodeURIComponent,
  setTimeout,
  clearTimeout,
  document: documentMock,
  navigator: { clipboard: {} },
  window: {
    name: "",
    localStorage: storageMock(),
    sessionStorage: storageMock()
  }
};
context.window.window = context.window;
context.window.navigator = context.navigator;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "sac-memory-v11.js"), "utf8"), context, { filename: "sac-memory-v11.js" });

const memory = context.window.SACMemoryV11;
const base = {
  id: "case-49373570",
  caseNumber: "49373570",
  account: "ACC-100",
  issuer: "BEMOL",
  lists: { allowlist: true, contencao: false },
  applied: { allowlist: false, contencao: true },
  savedAt: Date.now()
};

memory.lists.upsert(base);
memory.lists.upsert({ ...base, id: "duplicate", issuer: "BEMOL ATUALIZADO", savedAt: Date.now() + 10 });
assert.equal(memory.lists.all().length, 1);
assert.equal(memory.lists.all()[0].issuer, "BEMOL ATUALIZADO");

memory.lists.upsert({ ...base, id: "same-case-other-account", account: "ACC-200", savedAt: Date.now() + 15 });
assert.equal(memory.lists.all().length, 2, "caso igual com conta diferente não pode ser tratado como duplicado");

memory.lists.replace([{ ...base, documentValue: "11122233344", lists: { allowlist: true, contencao: true }, applied: { allowlist: false, contencao: false }, savedAt: Date.now() + 20 }]);
assert.equal(memory.lists.all().length, 2, "ALLOWLIST e CONTENÇÃO devem ter registros lógicos independentes");
assert.equal(memory.lists.all().filter((entry) => entry.lists.allowlist).length, 1);
assert.equal(memory.lists.all().filter((entry) => entry.lists.contencao).length, 1);

const allowlistItem = memory.lists.all().find((entry) => entry.lists.allowlist);
memory.lists.markDone(allowlistItem, "allowlist");
assert.equal(memory.lists.all().length, 1);
assert.equal(memory.lists.all()[0].lists.contencao, true);
memory.lists.markDone(memory.lists.all().find((entry) => entry.lists.contencao), "contencao");
assert.equal(memory.lists.all().length, 0);

memory.lists.replace([]);
assert.equal(memory.lists.all().length, 0);

const tenCases = Array.from({ length: 10 }, (_, index) => ({
  ...base,
  id: `case-${index}`,
  caseNumber: String(49373600 + index),
  account: `ACC-${300 + index}`,
  savedAt: Date.now() + 100 + index
}));
memory.lists.replace(tenCases);
assert.equal(memory.lists.all().length, 10, "dez casos BANKING devem permanecer disponíveis sem atraso");

const removed = memory.lists.all()[4];
const staleSnapshot = memory.snapshot();
memory.lists.markDone(removed, "allowlist");
assert.equal(memory.lists.all().length, 9);
memory.mergeSnapshot(staleSnapshot);
assert.equal(memory.lists.all().length, 9, "um registro removido não pode reaparecer por uma cópia antiga");
assert.equal(memory.lists.all().some((entry) => entry.caseNumber === removed.caseNumber), false);

memory.lists.replace([
  { ...base, id: "missing-a", caseNumber: "N/A", account: "N/A", issuer: "BEMOL", savedAt: Date.now() + 300 },
  { ...base, id: "missing-b", caseNumber: "N/A", account: "ACC-VALIDA", issuer: "BEMOL", savedAt: Date.now() + 301 }
]);
assert.equal(memory.lists.all().length, 2, "valores ausentes não podem colidir com uma identidade válida");

(async () => {
  context.navigator.clipboard.read = () => new Promise(() => {});
  const startedAt = Date.now();
  const hydrated = await memory.hydrateFromClipboard({ timeoutMs: 25 });
  assert.ok(hydrated && typeof hydrated === "object");
  assert.ok(Date.now() - startedAt < 250, "clipboard sem resposta não pode bloquear a automação");

  const result = await memory.commit("Tabulação pronta");
  assert.equal(result.method, "copy-event");
  assert.equal(copiedTypes.get("text/plain"), "Tabulação pronta");
  assert.match(copiedTypes.get("text/html"), /SAC_PREVENCAO_MEMORY_V11/);
  console.log("OK - memória unificada de LISTAS V11 validada");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
