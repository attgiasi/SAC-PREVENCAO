const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "loader-v11.js"), "utf8");
const safeFallback = "512d5c44b53bf72b603b297beecf968ef8c823a7";

async function executeLoader(fetchImpl) {
  const loaded = [];
  const window = {};
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
    window,
    document,
    console,
    fetch: fetchImpl,
    setTimeout,
    clearTimeout,
    queueMicrotask
  };

  vm.createContext(context);
  vm.runInContext(source, context);
  for (let attempt = 0; attempt < 40 && loaded.length < 8; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  return { loaded, state: window.__SAC_PREVENCAO_V11_LOADER__ };
}

function response(payload, ok = true, status = 200) {
  return { ok, status, json: async () => payload };
}

(async () => {
  const apiCommit = "a".repeat(40);
  const viaApi = await executeLoader(async () => response({ sha: apiCommit }));
  assert.equal(viaApi.loaded.length, 8);
  assert.ok(viaApi.loaded.every((url) => url.includes(`@${apiCommit}/ANALISE/V11/`)));
  assert.equal(viaApi.state.ref, apiCommit);

  const manifestCommit = "b".repeat(40);
  const viaManifest = await executeLoader(async (url) => {
    if (url.includes("api.github.com")) return response({}, false, 403);
    return response({ commit: manifestCommit });
  });
  assert.equal(viaManifest.loaded.length, 8);
  assert.ok(viaManifest.loaded.every((url) => url.includes(`@${manifestCommit}/ANALISE/V11/`)));
  assert.equal(viaManifest.state.ref, manifestCommit);

  const viaFallback = await executeLoader(async () => { throw new Error("offline"); });
  assert.equal(viaFallback.loaded.length, 8);
  assert.ok(viaFallback.loaded.every((url) => url.includes(`@${safeFallback}/ANALISE/V11/`)));
  assert.equal(viaFallback.state.ref, safeFallback);

  assert.match(viaApi.loaded[0], /sac-memory-v11\.js/);
  assert.match(viaApi.loaded.at(-1), /sac-prevencao-v11\.js/);
  assert.ok(viaApi.loaded.every((url) => url.includes("v=11.16.0-")));
  console.log("OK - carregador V11 validado por API, manifesto e revisão segura");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
