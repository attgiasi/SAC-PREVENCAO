const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const commit = "a".repeat(40);
const loaded = [];
const document = {
  querySelectorAll: () => [],
  getElementById: () => null,
  createElement: () => ({ dataset: {}, style: {}, remove() {} }),
  documentElement: {
    appendChild(script) {
      loaded.push(script.src);
      queueMicrotask(() => script.onload?.());
    }
  }
};
const context = {
  window: {},
  document,
  console,
  fetch: async () => ({ ok: true, json: async () => ({ sha: commit }) }),
  setTimeout,
  clearTimeout,
  queueMicrotask
};

vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "loader-v11.js"), "utf8"), context);

(async () => {
  for (let attempt = 0; attempt < 20 && loaded.length < 8; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.equal(loaded.length, 8);
  assert.ok(loaded.every((url) => url.includes(`@${commit}/ANALISE/V11/`)));
  assert.match(loaded[0], /sac-memory-v11\.js/);
  assert.match(loaded.at(-1), /sac-prevencao-v11\.js/);
  assert.ok(loaded.every((url) => url.includes("v=11.12.0")));
  console.log("OK - carregador dedicado V11 validado");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
