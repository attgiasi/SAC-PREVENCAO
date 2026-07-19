const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "sac-prevencao-v11.js"), "utf8");
const media = fs.readFileSync(path.join(root, "sac-media-v11.js"), "utf8");

assert.match(source, /const BUILD_VERSION = "11\.22"/);
assert.match(source, />Investigação e ajuda</);
assert.doesNotMatch(source, /data-action="help-mode"/);
assert.doesNotMatch(source, /helpMode|getHelpMode/);
assert.match(source, /requestAnimationFrame\(\(\) => drawer\.querySelectorAll\("\[data-investigation\]"\)/);
assert.match(source, /data-investigation-slot="transaction"/);
assert.match(source, /data-investigation-slot="cnpj"/);
assert.match(source, /data-investigation-slot="help"/);
assert.match(source, /Pontos de análise do book/);
assert.match(source, /pelo menos dois indícios concretos/);
assert.match(source, /sac-investigation-heading/);
assert.match(source, /sac-investigation-arrow is-close/);
assert.match(source, /Transacionando com/);
assert.match(source, /P2P Emissor/);
assert.match(source, /P2P Pessoal/);
assert.match(source, /Transações em \$\{escapeHtml\(active\[0\]\)\}/);
assert.match(source, /Porte da empresa/);
assert.match(source, /data-remove-counterparty/);
assert.match(source, /EXCLUIR GRUPO/);
assert.match(source, /removeListIssuerGroup/);
assert.match(source, /data-pid-reload/);
assert.doesNotMatch(source, /Vencimento da fatura/);
assert.doesNotMatch(source, /pidResult/);
assert.match(source, /releaseInvestigationSession/);
assert.match(source, /transferableCaseData/);
assert.match(source, /clearCompletedCaseState/);

assert.match(media, /function collectCustomerIdentity/);
assert.doesNotMatch(media, /function collectPidData/);
assert.doesNotMatch(media, /queryResult_addressData/);
assert.doesNotMatch(media, /queryResult_phoneData/);

console.log("OK - fluxo unificado de investigação V11 validado");
