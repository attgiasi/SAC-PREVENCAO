const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const context = { window: {}, document: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "sac-media-v11.js"), "utf8"), context);

const engine = context.window.SACMediaV11;
assert.equal(engine.isCpf("111.111.111-11"), true);
assert.equal(engine.isCpf("11.111.111/0001-11"), false);
assert.equal(engine.eligibleParties({ holderDocument: "111.111.111-11", originDocument: "11111111111" }).length, 1);
const request = engine.createRequest({ caseNumber: "49373570", holderDocument: "111.111.111-11" });
const noMedia = engine.createResult(request, { found: false, mediaTypes: [] });
assert.equal(noMedia.classification, "SEM MÍDIA");
assert.equal(engine.resultMatches(request, noMedia), true);

(async () => {
  const unmapped = await engine.scanPage({ holderDocument: "111.111.111-11" });
  assert.equal(unmapped.code, "BIGDATA_MAPPING_REQUIRED");

  engine.useProvider({
    canScan: () => true,
    scan: async () => ({ found: true, mediaTypes: ["Estelionato", "Não cadastrada"], source: "teste" })
  });
  const result = await engine.scanPage({ holderDocument: "111.111.111-11" });
  assert.equal(result.found, true);
  assert.deepEqual(Array.from(result.mediaTypes), ["Estelionato"]);
  console.log("OK - motor de mídia desabonadora V11 validado");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
