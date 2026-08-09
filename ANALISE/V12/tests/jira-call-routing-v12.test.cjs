const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "sac-prevencao-v12.js"), "utf8");
const preview = fs.readFileSync(path.join(root, "preview.html"), "utf8");
const start = source.indexOf("  function tabulatorCallValues(data) {");
const end = source.indexOf("  async function verifyDocumentAfterPageValidation", start);

assert.ok(start >= 0 && end > start, "roteamento de chamada do Tabulador não encontrado");
assert.match(source, /if \(enabled && !jira\) openPidPanel\(data\);/);
assert.match(source, /syncCallToggles\(\);/);
assert.match(source, /const jiraCall = Boolean\(data\.jiraActive\) && callModeActive;/);
assert.match(source, /resultToggle\.disabled = !enabled \|\| jira;/);
assert.match(source, /function normalizeJiraReference\(value\)/);
assert.match(source, /id="sac-jira-reference"/);
assert.match(source, /`JIRA: \$\{data\.jiraReference\}`/);
assert.match(source, /Chamado JIRA \(opcional\)/);
assert.equal(
  (source.match(/section\("Chamada", consoleFlagControls\(data\), "opcional"\)/g) || []).length,
  2,
  "JIRA, chamada e o campo do chamado devem existir nos modos normal e invisível"
);
assert.match(preview, /if\(active&&!jira\)openPid\(data\);else closePid\(\)/);
assert.match(preview, /id="jiraReference"/);
assert.match(preview, /function normalizeJiraReference\(value\)/);
assert.match(preview, /JIRA sem chamada: SEM CONTATO - FILA e SEM CHAMADA aplicados/);
assert.match(preview, /JIRA com chamada: RECEPTIVO e COM SUCESSO aplicados/);
assert.doesNotMatch(preview, /if\(jira&&!data\.jiraReference\)/, "o chamado JIRA opcional não pode bloquear a decisão na prévia");

const requiredStart = source.indexOf("  function requiredConsole(data) {");
const requiredEnd = source.indexOf("  function requiredAnalysisFields", requiredStart);
assert.ok(requiredStart >= 0 && requiredEnd > requiredStart, "validação do Console não encontrada");
const requiredSandbox = {
  isMissing: (value) => !String(value || "").trim()
};
vm.createContext(requiredSandbox);
vm.runInContext(`${source.slice(requiredStart, requiredEnd)}\nthis.requiredConsole = requiredConsole;`, requiredSandbox);
assert.deepEqual(
  JSON.parse(JSON.stringify(requiredSandbox.requiredConsole({
    flow: "banking",
    cpfCnpj: "11111111111",
    issuer: "BEMOL",
    registrationDate: "01/01/2020",
    accountStatus: "Normal",
    jiraActive: true,
    jiraReference: ""
  }))),
  [],
  "JIRA ativo sem link deve continuar sendo opcional"
);

const sandbox = {
  normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase();
  }
};
vm.createContext(sandbox);
vm.runInContext(`${source.slice(start, end)}\nthis.tabulatorCallValues = tabulatorCallValues;`, sandbox);

assert.deepEqual(JSON.parse(JSON.stringify(sandbox.tabulatorCallValues({ jiraActive: true, fields: { callMode: "sem chamada" } }))), {
  type: "SEM CONTATO - FILA",
  result: "SEM CHAMADA"
});
assert.deepEqual(JSON.parse(JSON.stringify(sandbox.tabulatorCallValues({ jiraActive: true, fields: { callMode: "com chamada", callResult: "sem sucesso" } }))), {
  type: "RECEPTIVO",
  result: "COM SUCESSO"
});
assert.deepEqual(JSON.parse(JSON.stringify(sandbox.tabulatorCallValues({ jiraActive: false, fields: { callMode: "com chamada", callResult: "sem sucesso" } }))), {
  type: "ATIVA - PLANILHA",
  result: "SEM SUCESSO"
});
assert.deepEqual(JSON.parse(JSON.stringify(sandbox.tabulatorCallValues({ jiraActive: false, fields: { callMode: "sem chamada" } }))), {
  type: "SEM CONTATO - PLANILHA",
  result: "SEM CHAMADA"
});

const jiraStart = source.indexOf("  function normalizeJiraReference(value) {");
const jiraEnd = source.indexOf("  function cardFields", jiraStart);
assert.ok(jiraStart >= 0 && jiraEnd > jiraStart, "normalizador JIRA não localizado");
const jiraSandbox = {
  normalize(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toUpperCase();
  },
  decodeURIComponent
};
vm.createContext(jiraSandbox);
vm.runInContext(`${source.slice(jiraStart, jiraEnd)}\nthis.normalizeJiraReference = normalizeJiraReference;`, jiraSandbox);
assert.equal(jiraSandbox.normalizeJiraReference("https://jira.exemplo/browse/SERVICO-12345"), "SERVICO-12345");
assert.equal(jiraSandbox.normalizeJiraReference("https://jira.exemplo/INCIDENTE/9876?origem=console"), "INCIDENTE-9876");
assert.equal(jiraSandbox.normalizeJiraReference("https://docktech.atlassian.net/browse/SERVICOS-975709"), "SERVICOS-975709");
assert.equal(jiraSandbox.normalizeJiraReference("https://docktech.atlassian.net/browse/INCIDENTES-122518"), "INCIDENTES-122518");
assert.equal(jiraSandbox.normalizeJiraReference("link sem identificador"), "");

const tabulationStart = source.indexOf("  function buildTabulation(data, decision) {");
const tabulationEnd = source.indexOf("  // ========================= TABULADOR: APLICAÇÃO", tabulationStart);
assert.ok(tabulationStart >= 0 && tabulationEnd > tabulationStart, "montagem da tabulação não encontrada");
const tabulationSandbox = {
  clean: (value, fallback = "N/A") => String(value || "").trim() || fallback,
  formatHistoryValue: (value) => String(value || "0000000000"),
  signatureText: () => "Nome Teste | SAC Prevenção"
};
vm.createContext(tabulationSandbox);
vm.runInContext(`${source.slice(tabulationStart, tabulationEnd)}\nthis.buildTabulation = buildTabulation;`, tabulationSandbox);
const bankingTabulation = tabulationSandbox.buildTabulation({
  flow: "banking",
  falcon: { value: "100,00", rule: "REGRA TESTE", history: "0000000000" },
  fields: {
    badMedia: "não",
    personStatus: "normal",
    emailPhoneAddress: "de acordo",
    spdHistory: "não",
    documentation: "sem ressalvas",
    statement: "sem suspeitas"
  },
  accountStatus: "Normal",
  registrationDate: "01/01/2020",
  jiraActive: true,
  jiraReference: "SERVICOS-975709",
  decisionReason: "Teste concluído"
}, "NÃO FRAUDE");
assert.match(bankingTabulation, /Decisão: NÃO FRAUDE\nJIRA: SERVICOS-975709\nMotivo: Teste concluído/);

console.log("OK - JIRA roteia chamada, PID e Tabulador sem conflito");
