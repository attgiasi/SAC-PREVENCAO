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
    sessionStorage: storageMock(),
    __SAC_PREVENCAO_SHARED_MEMORY__: {
      savedAt: Date.now(),
      history: [{ id: "v11-stale", caseNumber: "11111111", savedAt: Date.now() }]
    }
  }
};
context.window.window = context.window;
context.window.navigator = context.navigator;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "sac-memory-v12.js"), "utf8"), context, { filename: "sac-memory-v12.js" });

const memory = context.window.SACMemoryV12;
assert.equal(memory.history.all().length, 0, "a V12 não pode herdar a memória global de uma versão anterior");
assert.ok(context.window.__SAC_PREVENCAO_V12_SHARED_MEMORY__, "a memória de partida precisa ser exclusiva da V12");
memory.settings.set("theme", "light");
memory.settings.set("investigationMode", "on");
memory.settings.set("flowTone:banking", "#22c55e");
assert.deepEqual(
  { ...memory.settings.all() },
  { theme: "light", investigationMode: "on", "flowTone:banking": "#22c55e" },
  "configurações precisam compartilhar a mesma memória entre as etapas"
);
assert.equal(memory.snapshot().settings.investigationMode.value, "on");
assert.equal(context.window.localStorage.has("sac_prevencao_V12:state"), false, "estado completo não deve duplicar a memória local");
assert.equal(context.window.sessionStorage.has("sac_prevencao_V12:state_session"), false, "estado completo não deve duplicar a sessão");

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
assert.ok(context.window.localStorage.getItem("sac_prevencao_V12:history"), "o Histórico deve permanecer disponível no espelho estável");
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
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "sac-memory-v12.js"), "utf8"), reloadContext, { filename: "sac-memory-v12-reload.js" });
assert.equal(reloadContext.window.SACMemoryV12.settings.get("theme"), "light", "configuração deve sobreviver à troca de etapa");
assert.equal(reloadContext.window.SACMemoryV12.lists.all().length, 2, "LISTAS devem sobreviver à troca de etapa");
assert.equal(reloadContext.window.SACMemoryV12.history.all().length, 1, "Histórico deve sobreviver à troca de etapa");

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
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "sac-memory-v12.js"), "utf8"), crossOriginContext, { filename: "sac-memory-v12-cross-origin.js" });
assert.equal(crossOriginContext.window.SACMemoryV12.lists.all().length, 2, "LISTAS devem aparecer imediatamente em outra etapa/origem pelo cofre de window.name");
assert.equal(crossOriginContext.window.SACMemoryV12.settings.get("theme"), "light", "Configurações devem acompanhar o pacote entre etapas/origens");
assert.equal(crossOriginContext.window.SACMemoryV12.history.all().length, 1, "Histórico deve ser o mesmo em qualquer etapa/origem");

const concurrentLocalStorage = storageMock();
function concurrentMemoryContext() {
  const next = {
    console,
    Date,
    JSON,
    encodeURIComponent,
    decodeURIComponent,
    setTimeout,
    clearTimeout,
    document: documentMock,
    navigator: { clipboard: {} },
    window: { name: "", localStorage: concurrentLocalStorage, sessionStorage: storageMock() }
  };
  next.window.window = next.window;
  next.window.navigator = next.navigator;
  vm.createContext(next);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "sac-memory-v12.js"), "utf8"), next, { filename: "sac-memory-v12-concurrent.js" });
  return next;
}
const concurrentA = concurrentMemoryContext();
const concurrentB = concurrentMemoryContext();
concurrentA.window.SACMemoryV12.lists.upsert({ ...base, id: "concurrent-a", caseNumber: "50000001", account: "ACC-A", savedAt: Date.now() + 500 });
concurrentB.window.SACMemoryV12.lists.upsert({ ...base, id: "concurrent-b", caseNumber: "50000002", account: "ACC-B", savedAt: Date.now() + 501 });
assert.equal(concurrentA.window.SACMemoryV12.lists.all().length, 2, "duas abas da mesma origem não podem sobrescrever casos de LISTAS");
assert.equal(concurrentB.window.SACMemoryV12.lists.all().length, 2, "LISTAS deve reconciliar o espelho estável antes de ler");
const concurrentSnapshot = concurrentA.window.SACMemoryV12.lists.all();
concurrentB.window.SACMemoryV12.lists.upsert({ ...base, id: "concurrent-c", caseNumber: "50000003", account: "ACC-C", savedAt: Date.now() + 502 });
concurrentA.window.SACMemoryV12.lists.reconcile(concurrentSnapshot);
assert.equal(concurrentA.window.SACMemoryV12.lists.all().length, 3, "reconciliar uma leitura antiga não pode apagar o caso recém-gravado por outra aba");
assert.equal(concurrentB.window.SACMemoryV12.lists.all().length, 3, "a fila concorrente deve permanecer igual em todas as abas da mesma origem");
concurrentA.window.SACMemoryV12.settings.set("theme", "dark");
concurrentB.window.SACMemoryV12.settings.set("safeMode", "off");
assert.equal(concurrentA.window.SACMemoryV12.settings.get("safeMode"), "off", "Configurações concorrentes devem ser reconciliadas antes da leitura");
assert.equal(concurrentB.window.SACMemoryV12.settings.get("theme"), "dark", "uma configuração não pode apagar outra definida em uma segunda aba");

const settingsRaceStorage = storageMock();
function settingsRaceContext() {
  const next = {
    console,
    Date,
    JSON,
    encodeURIComponent,
    decodeURIComponent,
    setTimeout,
    clearTimeout,
    document: documentMock,
    navigator: { clipboard: {} },
    window: { name: "", localStorage: settingsRaceStorage, sessionStorage: storageMock() }
  };
  next.window.window = next.window;
  next.window.navigator = next.navigator;
  vm.createContext(next);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "sac-memory-v12.js"), "utf8"), next, { filename: "sac-memory-v12-settings-race.js" });
  return next;
}
const settingsRaceA = settingsRaceContext();
const settingsRaceB = settingsRaceContext();
settingsRaceB.window.SACMemoryV12.lists.upsert({ ...base, id: "settings-race-list", caseNumber: "50000009", account: "ACC-RACE", savedAt: Date.now() + 600 });
settingsRaceA.window.SACMemoryV12.settings.set("theme", "light");
assert.equal(settingsRaceB.window.SACMemoryV12.lists.all().length, 1, "salvar configuração em outra aba não pode apagar uma pendência de LISTAS ainda não lida");

const copyRaceStorage = storageMock();
const copyRaceSession = storageMock();
function copyRaceContext() {
  const next = {
    console,
    Date,
    JSON,
    encodeURIComponent,
    decodeURIComponent,
    setTimeout,
    clearTimeout,
    document: documentMock,
    navigator: { clipboard: {} },
    window: { name: "", localStorage: copyRaceStorage, sessionStorage: copyRaceSession }
  };
  next.window.window = next.window;
  next.window.navigator = next.navigator;
  vm.createContext(next);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "sac-memory-v12.js"), "utf8"), next, { filename: "sac-memory-v12-copy-race.js" });
  return next;
}
const copyRaceA = copyRaceContext();
const copyRaceB = copyRaceContext();
copyRaceB.window.SACMemoryV12.lists.upsert({ ...base, id: "copy-race-list", caseNumber: "50000010", account: "ACC-COPY", savedAt: Date.now() + 700 });
copyRaceB.window.SACMemoryV12.history.upsert({ id: "copy-race-history", caseNumber: "50000010", account: "ACC-COPY", tabulation: "Teste", savedAt: Date.now() + 700 });

(async () => {
  await copyRaceA.window.SACMemoryV12.commit("Texto copiado depois da decisão");
  assert.equal(copyRaceB.window.SACMemoryV12.lists.all().length, 1, "copiar outro conteúdo não pode apagar um caso recém-gravado em LISTAS");
  assert.equal(copyRaceB.window.SACMemoryV12.history.all().length, 1, "copiar outro conteúdo não pode apagar o Histórico recém-gravado");
  const nativeCopyTypes = new Map();
  const nativeCopyPreserved = copyRaceA.window.SACMemoryV12.preserveCopyEvent({
    clipboardData: {
      getData: (type) => type === "text/plain" ? "Conteúdo copiado manualmente" : "",
      setData: (type, value) => nativeCopyTypes.set(type, String(value))
    },
    preventDefault() {}
  });
  assert.equal(nativeCopyPreserved, true, "uma cópia manual deve preservar o envelope da V12");
  assert.equal(nativeCopyTypes.get("text/plain"), "Conteúdo copiado manualmente", "o texto visível copiado não pode ser alterado");
  assert.match(nativeCopyTypes.get("text/html"), /SAC_PREVENCAO_MEMORY_V12/, "a cópia manual deve continuar transportando LISTAS e Histórico");
  const programmaticWrites = [];
  await copyRaceA.window.SACMemoryV12.preserveProgrammaticText("Conteúdo de um botão da página", async (value) => { programmaticWrites.push(value); });
  assert.deepEqual(programmaticWrites, ["Conteúdo de um botão da página"], "a cópia programática deve manter o texto solicitado pela página");
  assert.equal(copyRaceB.window.SACMemoryV12.lists.all().length, 1, "um botão de copiar da página não pode apagar LISTAS");
  assert.equal(copyRaceB.window.SACMemoryV12.history.all().length, 1, "um botão de copiar da página não pode apagar o Histórico");
  copyRaceA.window.SACMemoryV12.transport.set("console", {
    type: "SAC_CONSOLE",
    savedAt: Date.now() + 701,
    jiraActive: true,
    jiraReference: "SERVICOS-975709"
  });
  await copyRaceA.window.SACMemoryV12.commit("Conteúdo copiado antes da decisão");
  const preservedConsole = copyRaceB.window.SACMemoryV12.transport.get("console");
  assert.equal(preservedConsole?.jiraReference, "SERVICOS-975709", "copiar outro conteúdo não pode perder o chamado JIRA antes da decisão");
  copyRaceA.window.SACMemoryV12.transport.set("falcon", { type: "SAC_FALCON", savedAt: Date.now() + 701 });
  assert.equal(copyRaceB.window.SACMemoryV12.lists.all().length, 1, "atualizar o transporte não pode sobrescrever LISTAS com uma leitura antiga");
  copyRaceA.window.SACMemoryV12.transport.clearAll();
  assert.equal(copyRaceB.window.SACMemoryV12.history.all().length, 1, "limpar o caso temporário não pode apagar o Histórico persistente");

  const clipboardBefore = copiedTypes.size;
  const unavailableCopy = await memory.commitCurrentText({ timeoutMs: 25 });
  assert.equal(unavailableCopy.method, "read-unavailable");
  assert.equal(copiedTypes.size, clipboardBefore, "sincronizar configurações não pode apagar a área de transferência sem permissão de leitura");
  context.navigator.clipboard.read = () => new Promise(() => {});
  const startedAt = Date.now();
  const hydrated = await memory.hydrateFromClipboard({ timeoutMs: 25 });
  assert.ok(hydrated && typeof hydrated === "object");
  assert.ok(Date.now() - startedAt < 250, "clipboard sem resposta não pode bloquear a automação");

  const result = await memory.commit("Tabulação pronta");
  assert.equal(result.method, "copy-event");
  assert.equal(copiedTypes.get("text/plain"), "Tabulação pronta");
  assert.match(copiedTypes.get("text/html"), /SAC_PREVENCAO_MEMORY_V12/);
  const encoded = copiedTypes.get("text/html").match(/SAC_PREVENCAO_MEMORY_V12:([^]+?)-->/)?.[1];
  const portable = JSON.parse(decodeURIComponent(encoded));
  assert.deepEqual(portable.lists, [], "o envelope não deve duplicar LISTAS e cofre no mesmo payload");
  assert.ok(portable.listsVault.length > 0, "o cofre compacto deve continuar transportando pendências de LISTAS");
  assert.equal(portable.history.length, 1, "o commit deve transportar o Histórico já persistido sem exigir uma segunda gravação");
  console.log("OK - memória unificada de LISTAS V12 validada");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
