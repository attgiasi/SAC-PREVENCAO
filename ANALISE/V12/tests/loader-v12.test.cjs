const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "loader-v12.js"), "utf8");
const safeFallback = source.match(/const SAFE_FALLBACK_REF = "([a-f0-9]{40})"/)?.[1] || "";
const release = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "release-v12.json"), "utf8"));
const bookmarklet = fs.readFileSync(path.join(__dirname, "..", "bookmarklet-v12.txt"), "utf8");
const bookmarkletLoaderRef = bookmarklet.match(/@([a-f0-9]{40})\/ANALISE\/V12\/loader-v12\.js\?v=12\.3\.0/)?.[1] || "";

assert.match(safeFallback, /^[a-f0-9]{40}$/);
assert.equal(release.build, "12.3");
assert.match(release.commit, /^[a-f0-9]{40}$/);
assert.match(bookmarkletLoaderRef, /^[a-f0-9]{40}$/, "o favorito deve fixar um loader imutável e válido");
assert.match(source, /async function latestCommit\(\)/, "o loader imutável deve resolver a revisão atual do código-fonte");
assert.match(source, /"\.sac-pid-panel"/, "o carregador deve remover um PID órfão antes da nova execução");

async function executeLoader(fetchImpl) {
  const loaded = [];
  let disposedRuntimes = 0;
  let removedRuntimeScripts = 0;
  const window = { __SAC_PREVENCAO_V12_RUNTIME__: { dispose() { disposedRuntimes += 1; } } };
  const document = {
    querySelectorAll: () => [],
    getElementById: () => null,
    createElement: () => ({ dataset: {}, style: {}, remove() { removedRuntimeScripts += 1; } }),
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
  return { loaded, state: window.__SAC_PREVENCAO_V12_LOADER__, disposedRuntimes, removedRuntimeScripts };
}

function response(payload, ok = true, status = 200) {
  return { ok, status, json: async () => payload };
}

(async () => {
  const apiCommit = "a".repeat(40);
  const viaApi = await executeLoader(async () => response({ sha: apiCommit }));
  assert.equal(viaApi.loaded.length, 8);
  assert.equal(viaApi.removedRuntimeScripts, 8, "scripts temporários devem sair do DOM após o carregamento");
  assert.equal(viaApi.disposedRuntimes, 1);
  assert.ok(viaApi.loaded.every((url) => url.includes(`@${apiCommit}/ANALISE/V12/`)));
  assert.equal(viaApi.state.ref, apiCommit);

  const manifestCommit = "b".repeat(40);
  const viaManifest = await executeLoader(async (url) => {
    if (url.includes("api.github.com")) return response({}, false, 403);
    return response({ commit: manifestCommit });
  });
  assert.equal(viaManifest.loaded.length, 8);
  assert.ok(viaManifest.loaded.every((url) => url.includes(`@${manifestCommit}/ANALISE/V12/`)));
  assert.equal(viaManifest.state.ref, manifestCommit);

  const viaFallback = await executeLoader(async () => { throw new Error("offline"); });
  assert.equal(viaFallback.loaded.length, 8);
  assert.ok(viaFallback.loaded.every((url) => url.includes(`@${safeFallback}/ANALISE/V12/`)));
  assert.equal(viaFallback.state.ref, safeFallback);

  assert.match(viaApi.loaded[0], /sac-memory-v12\.js/);
  assert.match(viaApi.loaded.at(-1), /sac-prevencao-v12\.js/);
  assert.ok(viaApi.loaded.every((url) => url.includes("v=12.3.0-")));
  console.log("OK - carregador V12 validado por API, manifesto e revisão segura");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
