const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "..", "sac-prevencao-v12.js"), "utf8");
const finalStart = source.indexOf('byId("sac-copy-final")?.addEventListener');
const finalEnd = source.indexOf('byId("sac-change-decision")?.addEventListener', finalStart);
const finalHandler = source.slice(finalStart, finalEnd);

assert.ok(finalStart >= 0 && finalEnd > finalStart, "finalização do Tabulador não encontrada");
assert.ok(
  finalHandler.indexOf("stageListsForFinalDecision(data, decision)") < finalHandler.indexOf("copyText(text)"),
  "LISTAS deve ser persistida antes da criação do envelope copiado"
);
assert.ok(
  finalHandler.indexOf("addHistory(data, decision, text)") < finalHandler.indexOf("copyText(text)"),
  "Histórico deve entrar no mesmo envelope do clique em Copiar"
);
assert.match(source, /function stageListsForFinalDecision\(data, decision\)/);
assert.doesNotMatch(source, /async function stageListsForFinalDecision/);
assert.doesNotMatch(source, /hydrateListClipboardFast|hydrateClipboard:\s*"full"/);
assert.match(source, /await memory\.hydrateFromClipboard\(\{ timeoutMs: 1100 \}\)/);
assert.match(source, /if \(!await markListDone\(target\.id, activeTab\)\)/);
assert.doesNotMatch(source, /markListBatchDone/);
assert.match(source, /LISTAS_PERSISTENCE_NOT_CONFIRMED/);
assert.match(source, /return text\.includes\("ISPB"\)/);

console.log("OK - LISTAS e Histórico são gravados no clique final sem ficar um caso atrás");
