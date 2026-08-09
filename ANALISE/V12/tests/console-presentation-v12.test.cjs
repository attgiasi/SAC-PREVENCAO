const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "..", "sac-prevencao-v12.js"), "utf8");
const preview = fs.readFileSync(path.join(__dirname, "..", "preview.html"), "utf8");

function block(from, to) {
  const start = source.indexOf(from);
  const end = source.indexOf(to, start + from.length);
  assert.ok(start >= 0 && end > start, `bloco não localizado: ${from}`);
  return source.slice(start, end);
}

const accountStatus = block("function accountStatusFromContainer", "function tableColumn");
assert.match(accountStatus, /\["Status conta", "Status da conta"\]\.map\(findValueAfterLabel\)/);
assert.match(accountStatus, /stateButtons\.length === 1 \? clean\(stateButtons\[0\]\) : "N\/A"/);
assert.doesNotMatch(accountStatus, /BLOQUEIO PREVENTIVO|SPD \\d|ATIV\[AO\]/, "a leitura não pode limitar o texto a uma lista antiga");

const presentation = block("function consoleDocumentGrid", "function consoleFlagControls");
assert.match(presentation, /!isMissing\(data\?\.falcon\?\.holderDocument\)/, "CPF/CNPJ do Console deve ser ocultado quando já veio do Falcon");
assert.match(presentation, /function bemolDddGrid\(data\)/);
assert.match(presentation, /dddEngine\.lookup/);
assert.match(presentation, /kv\("DDD x região"/);
assert.match(presentation, /const documentGrid = consoleDocumentGrid\(data\)/);
assert.doesNotMatch(presentation, /kv\("CPF\/CNPJ", data\.cpfCnpj\)/, "o grid do Console não pode duplicar diretamente o documento");

assert.match(source, /section\("Dados do Console", consoleGrid\(data\), "coletados"\)/, "o Console deve usar a composição revisada");
assert.match(source, /section\("Dados do Console", consoleGrid\(data\), "coletados"\)/g);
assert.match(preview, /const BUILD_VERSION="12\.2"/);
assert.match(preview, /function bemolDddGrid\(data\)/);
assert.match(preview, /issuer:"BEMOL"/);
assert.match(preview, /DDD x região/);

console.log("OK - status literal, CPF único e DDD BEMOL validados no Console e Tabulador");
