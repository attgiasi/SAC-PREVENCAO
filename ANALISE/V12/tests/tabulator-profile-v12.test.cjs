const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "sac-prevencao-v12.js"), "utf8");
const start = source.indexOf("  function tabulatorPageProfile() {");
const end = source.indexOf("  function preventionObservationTargets()", start);
assert.ok(start >= 0 && end > start, "detector do perfil do Tabulador não encontrado");

function detect({ selected = "", system = "", hasPreventionFields = false } = {}) {
  const elements = new Map([
    ["ddl_tabulador", { selectedOptions: selected ? [{ textContent: selected }] : [], value: selected }],
    ["txt_Sistema", { value: system, textContent: system }]
  ]);
  const sandbox = {
    byId: (id) => elements.get(id) || null,
    document: { querySelector: () => hasPreventionFields ? {} : null },
    normalize: (value) => String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
  };
  vm.createContext(sandbox);
  vm.runInContext(`${source.slice(start, end)}\nthis.tabulatorPageProfile = tabulatorPageProfile;`, sandbox);
  return sandbox.tabulatorPageProfile();
}

assert.equal(detect({ selected: "Falcon" }), "falcon");
assert.equal(detect({ selected: "Falcon Prevenção" }), "falcon-prevencao");
assert.equal(detect({ system: "Falcon Prevenção" }), "falcon-prevencao");
assert.equal(detect({ hasPreventionFields: true }), "falcon-prevencao");

assert.match(source, /if \(tabulatorPageProfile\(\) === "falcon-prevencao"\) \{\s*await waitForTabulatorFields\(\);\s*return canWriteTabulator\(isActive\);/);
assert.match(source, /zpartial_Falcon_Prevencao_Estabelecimento/);
assert.match(source, /zpartial_Falcon_Prevencao_Observacao/);
assert.match(source, /_partial_Falcon_Prevencao\.Cpf/);
assert.match(source, /_partial_Falcon_Prevencao\.Cnpj/);
assert.match(source, /_partial_Falcon_Prevencao\.ValorTransacao/);
assert.match(source, /if \(!prevention\) \{\s*addChecked\("Emissor"\)/);
assert.match(source, /if \(!prevention && byId\("ddl_tabulador"\)\)/);

console.log("OK - perfil FALCON PREVENÇÃO usa apenas os destinos mapeados e não troca a aba do Tabulador");
