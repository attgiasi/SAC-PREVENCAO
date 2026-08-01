const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const analysisRoot = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(analysisRoot, "motor-sac-universal.js"), "utf8");

assert.match(source, /SacPrevencaoUniversalV11/);
assert.match(source, /const VERSION = "11\.33\.0"/);
assert.match(source, /const LOADER = "V11\/loader-v11\.js"/);
assert.doesNotMatch(source, /V12\/loader-v12\.js/);

const appended = [];
const context = {
  URL,
  Date,
  document: {
    currentScript: { src: "https://cdn.jsdelivr.net/gh/attgiasi/SAC-PREVENCAO@main/ANALISE/motor-sac-universal.js" },
    querySelectorAll: () => [],
    createElement: () => ({ dataset: {}, async: true }),
    documentElement: { appendChild: (node) => appended.push(node) }
  },
  window: { __SAC_PREVENCAO_V11_RUNTIME__: { dispose() {} } }
};

vm.createContext(context);
vm.runInContext(source, context, { filename: "motor-sac-universal.js" });

assert.equal(appended.length, 1);
assert.equal(appended[0].dataset.sacUniversal, "v11");
assert.match(appended[0].src, /ANALISE\/V11\/loader-v11\.js\?v=11\.33\.0&cache=/);

console.log("OK - favorito universal permanece congelado na versão de produção");
