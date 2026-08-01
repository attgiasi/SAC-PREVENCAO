const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "sac-prevencao-v12.js"), "utf8");
const start = source.indexOf("  function collectConsolePidIdentity(data = {}) {");
const end = source.indexOf("  function collectConsolePidField", start);
assert.ok(start >= 0 && end > start, "função de identidade PID não localizada");

const sandbox = { labels: {}, headerName: "", pageText: "" };
vm.createContext(sandbox);
vm.runInContext(`
  const normalize = (value) => String(value || "").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toUpperCase();
  const bodyText = () => pageText;
  const digitsOnly = (value) => String(value || "").replace(/\\D/g, "");
  const documentKind = (value) => String(value || "").replace(/\\W/g, "").length === 14 ? "CNPJ" : "CPF";
  const firstConsoleLabeledValue = (names) => names.map((name) => labels[name]).find(Boolean) || "";
  const consolePersonHeaderName = () => headerName;
  ${source.slice(start, end)}
  globalThis.collectIdentity = collectConsolePidIdentity;
`, sandbox);

sandbox.labels = {};
sandbox.headerName = "Thailana Gomes Do Nascimento";
sandbox.pageText = "Detalhes de Pessoa Física";
assert.deepEqual(
  JSON.parse(JSON.stringify(sandbox.collectIdentity({ cpfCnpj: "624.033.393-00" }))),
  { clientName: "Thailana Gomes Do Nascimento" }
);

sandbox.labels = {
  "Nome do sócio": "Maria da Silva",
  "CPF do sócio": "111.222.333-44"
};
sandbox.headerName = "Empresa Exemplo Ltda";
sandbox.pageText = "Pessoas > Sócio";
assert.deepEqual(
  JSON.parse(JSON.stringify(sandbox.collectIdentity({ cpfCnpj: "11.111.111/0001-11" }))),
  { responsibleName: "Maria da Silva", responsibleCpf: "11122233344" }
);

sandbox.labels = {};
sandbox.headerName = "Razão Social Não Deve Virar Responsável";
sandbox.pageText = "Detalhes da Pessoa Jurídica";
assert.deepEqual(
  JSON.parse(JSON.stringify(sandbox.collectIdentity({ cpfCnpj: "11.111.111/0001-11" }))),
  { responsibleName: "", responsibleCpf: "" }
);

console.log("OK - identidade PID separa titular PF e responsável de CNPJ");
