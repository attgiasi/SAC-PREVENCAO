const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function storageMock() {
  const values = new Map();
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    has: (key) => values.has(key)
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
memory.settings.set("theme", "light");
memory.settings.set("investigationMode", "on");
memory.settings.set("flowTone:banking", "#22c55e");
assert.deepEqual(
  { ...memory.settings.all() },
  { theme: "light", investigationMode: "on", "flowTone:banking": "#22c55e" },
  "configurações precisam compartilhar a mesma memória entre as etapas"
);
assert.equal(memory.snapshot().settings.investigationMode.value, "on");
assert.equal(context.window.localStorage.has("sac_prevencao_V11:state"), false, "estado completo não deve duplicar a memória local");
assert.equal(context.window.sessionStorage.has("sac_prevencao_V11:state_session"), false, "estado completo não deve duplicar a sessão");

memory.transport.set("falcon", { type: "SAC_FALCON", savedAt: Date.now() });
assert.equal(memory.transport.get("falcon").type, "SAC_FALCON");
assert.equal(memory.transport.set("consultaTemporaria", { savedAt: Date.now() }), null, "o transporte deve aceitar somente etapas mapeadas");
memory.transport.clearAll();
assert.equal(memory.transport.get("falcon"), null, "o caso concluído precisa liberar o transporte temporário");
memory.transport.set("console", { type: "SAC_CONSOLE", savedAt: Date.now() });
const completedEnvelope = { ...memory.snapshot(), savedAt: Date.now() + 10, transport: {} };
memory.mergeSnapshot(completedEnvelope);
assert.equal(memory.transport.get("console"), null, "um envelope de finalização mais novo deve limpar pacotes antigos em outra etapa");

const base = {
  id: "case-49373570",
  caseNumber: "49373570",
  account: "ACC-100",
  issuer: "BEMOL",
  lists: { allowlist: true, contencao: false, cashout: false },
  applied: { allowlist: false, contencao: true, cashout: true },
  savedAt: Date.now()
};

memory.lists.upsert(base);
memory.lists.upsert({ ...base, id: "duplicate", issuer: "BEMOL ATUALIZADO", savedAt: Date.now() + 10 });
assert.equal(memory.lists.all().length, 1);
assert.equal(memory.lists.all()[0].issuer, "BEMOL ATUALIZADO");

memory.lists.upsert({ ...base, id: "same-case-other-account", account: "ACC-200", savedAt: Date.now() + 15 });
assert.equal(memory.lists.all().length, 2, "caso igual com conta diferente não pode ser tratado como duplicado");

memory.lists.replace([{ ...base, documentValue: "11122233344", lists: { allowlist: true, contencao: true, cashout: true }, applied: { allowlist: false, contencao: false, cashout: false }, savedAt: Date.now() + 20 }]);
assert.equal(memory.lists.all().length, 3, "ALLOWLIST, CONTENÇÃO e CASHOUT devem ter registros lógicos independentes");
assert.equal(memory.lists.all().filter((entry) => entry.lists.allowlist).length, 1);
assert.equal(memory.lists.all().filter((entry) => entry.lists.contencao).length, 1);
assert.equal(memory.lists.all().filter((entry) => entry.lists.cashout).length, 1);

const allowlistItem = memory.lists.all().find((entry) => entry.lists.allowlist);
memory.lists.markDone(allowlistItem, "allowlist");
assert.equal(memory.lists.all().length, 2);
memory.lists.markDone(memory.lists.all().find((entry) => entry.lists.contencao), "contencao");
assert.equal(memory.lists.all().length, 1);
assert.equal(memory.lists.all()[0].lists.cashout, true);
memory.lists.markDone(memory.lists.all().find((entry) => entry.lists.cashout), "cashout");
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
for (let index = 0; index < 8; index += 1) memory.lists.all();
assert.ok(memory.lists.all().every((entry) => !/:allowlist:allowlist$/i.test(entry.id)), "o ID da fila deve permanecer estável após várias leituras");

const removed = memory.lists.all()[4];
const staleSnapshot = memory.snapshot();
memory.lists.markDone(removed, "allowlist");
assert.equal(memory.lists.all().length, 9);
memory.mergeSnapshot(staleSnapshot);
assert.equal(memory.lists.all().length, 9, "um registro removido não pode reaparecer por uma cópia antiga");
assert.equal(memory.lists.all().some((entry) => entry.caseNumber === removed.caseNumber), false);

const latestRemoval = Math.max(...memory.lists.tombstones().map((item) => Number(item.removedAt || 0)));
memory.lists.upsert({
  ...removed,
  savedAt: latestRemoval + 1,
  updatedAt: latestRemoval + 1,
  applied: { allowlist: false, contencao: true, cashout: true }
});
assert.equal(memory.lists.all().some((entry) => entry.caseNumber === removed.caseNumber), true, "uma nova decisão NÃO FRAUDE posterior à baixa deve recolocar o caso em LISTAS");

memory.lists.replace([
  { ...base, id: "missing-a", caseNumber: "N/A", account: "N/A", issuer: "BEMOL", savedAt: Date.now() + 300 },
  { ...base, id: "missing-b", caseNumber: "N/A", account: "ACC-VALIDA", issuer: "BEMOL", savedAt: Date.now() + 301 }
]);
assert.equal(memory.lists.all().length, 2, "valores ausentes não podem colidir com uma identidade válida");

const historySavedAt = Date.now();
memory.history.upsert({ id: "history-1", caseNumber: "49373570", account: "ACC-100", issuer: "BEMOL", tabulation: "Tabulação", savedAt: historySavedAt });
memory.history.upsert({ id: "history-1", caseNumber: "49373570", account: "ACC-100", issuer: "BEMOL ATUALIZADO", tabulation: "Tabulação atualizada", savedAt: historySavedAt + 1 });
assert.equal(memory.history.all().length, 1, "o mesmo caso deve atualizar o Histórico em vez de criar uma duplicata por mudança de emissor");
assert.equal(memory.history.all()[0].issuer, "BEMOL ATUALIZADO");
assert.ok(context.window.localStorage.getItem("sac_prevencao_V11:history"), "o Histórico deve permanecer disponível no espelho estável");
const reloadContext = {
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
    name: context.window.name,
    localStorage: context.window.localStorage,
    sessionStorage: context.window.sessionStorage
  }
};
reloadContext.window.window = reloadContext.window;
reloadContext.window.navigator = reloadContext.navigator;
vm.createContext(reloadContext);
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "sac-memory-v11.js"), "utf8"), reloadContext, { filename: "sac-memory-v11-reload.js" });
assert.equal(reloadContext.window.SACMemoryV11.settings.get("theme"), "light", "configuração deve sobreviver à troca de etapa");
assert.equal(reloadContext.window.SACMemoryV11.lists.all().length, 2, "LISTAS devem sobreviver à troca de etapa");
assert.equal(reloadContext.window.SACMemoryV11.history.all().length, 1, "Histórico deve sobreviver à troca de etapa");

const crossOriginContext = {
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
    name: context.window.name,
    localStorage: storageMock(),
    sessionStorage: storageMock()
  }
};
crossOriginContext.window.window = crossOriginContext.window;
crossOriginContext.window.navigator = crossOriginContext.navigator;
vm.createContext(crossOriginContext);
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "sac-memory-v11.js"), "utf8"), crossOriginContext, { filename: "sac-memory-v11-cross-origin.js" });
assert.equal(crossOriginContext.window.SACMemoryV11.lists.all().length, 2, "LISTAS devem aparecer imediatamente em outra etapa/origem pelo cofre de window.name");

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
  const encoded = copiedTypes.get("text/html").match(/SAC_PREVENCAO_MEMORY_V11:([^]+?)-->/)?.[1];
  const portable = JSON.parse(decodeURIComponent(encoded));
  assert.deepEqual(portable.lists, [], "o envelope não deve duplicar LISTAS e cofre no mesmo payload");
  assert.ok(portable.listsVault.length > 0, "o cofre compacto deve continuar transportando pendências de LISTAS");
  assert.equal(portable.history.length, 1, "o commit deve transportar o Histórico já persistido sem exigir uma segunda gravação");
  console.log("OK - memória unificada de LISTAS V11 validada");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
