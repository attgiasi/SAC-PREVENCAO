const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "loader-v12.js"), "utf8");
const runtimeRef = source.match(/const RUNTIME_REF = "([a-f0-9]{40})"/)?.[1] || "";

assert.equal(runtimeRef, "dfa7aa9812eb0dcd0a62818a66763935a90227bd");
assert.match(source, /const LOADER_VERSION = "12\.6\.0"/);
assert.match(source, /const EXPECTED_RUNTIME_BUILD = "12\.6"/);
assert.match(source, /async function waitForRuntimeReady\(\)/, "o loader deve esperar a inicialização assíncrona do runtime");
assert.match(source, /for \(const file of FILES\)/, "os motores devem carregar em ordem determinística");
assert.doesNotMatch(source, /latestCommit|RELEASE_MANIFEST|api\.github\.com|raw\.githubusercontent/, "a V12.6 não pode misturar revisão móvel ou script com MIME incompatível");
assert.match(source, /fastly\.jsdelivr\.net/);
assert.match(source, /gcore\.jsdelivr\.net/);
assert.match(source, /"\.sac-pid-panel"/, "o carregador deve remover um PID órfão antes da nova execução");

const executableSource = source
  .replace("const SCRIPT_TIMEOUT_MS = 9000;", "const SCRIPT_TIMEOUT_MS = 100;")
  .replace("const RUNTIME_READY_TIMEOUT_MS = 6000;", "const RUNTIME_READY_TIMEOUT_MS = 120;");

async function executeLoader({ runtimeBuild = "12.6", readyDelayMs = 20, fail = () => false } = {}) {
  const loaded = [];
  const notices = [];
  let disposedRuntimes = 0;
  let removedRuntimeScripts = 0;
  const window = {
    __SAC_PREVENCAO_V11_RUNTIME__: { dispose() { disposedRuntimes += 1; } },
    __SAC_PREVENCAO_V12_RUNTIME__: { dispose() { disposedRuntimes += 1; } },
    __SAC_PREVENCAO_ACTIVE_BUILD__: "12.5"
  };
  const document = {
    querySelectorAll: () => [],
    getElementById: () => null,
    createElement(tag) {
      return {
        tag,
        dataset: {},
        style: {},
        remove() { if (tag === "script") removedRuntimeScripts += 1; }
      };
    },
    documentElement: {
      appendChild(node) {
        if (node.tag !== "script") {
          notices.push(node.textContent || "");
          return;
        }
        loaded.push(node.src);
        queueMicrotask(() => {
          if (fail(node.src)) {
            node.onerror?.();
            return;
          }
          if (node.src.includes("sac-prevencao-v12.js")) {
            setTimeout(() => { window.__SAC_PREVENCAO_ACTIVE_BUILD__ = runtimeBuild; }, readyDelayMs);
          }
          node.onload?.();
        });
      }
    }
  };
  const testConsole = { log() {}, warn() {}, error() {} };
  const context = { window, document, console: testConsole, Date, Math, Object, Promise, setTimeout, clearTimeout, queueMicrotask };

  vm.createContext(context);
  vm.runInContext(executableSource, context, { filename: "loader-v12.js" });
  for (let attempt = 0; attempt < 120 && !window.__SAC_PREVENCAO_V12_LOADER__ && !notices.length; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  return { loaded, notices, state: window.__SAC_PREVENCAO_V12_LOADER__, disposedRuntimes, removedRuntimeScripts };
}

(async () => {
  const delayedRuntime = await executeLoader({ readyDelayMs: 35 });
  assert.equal(delayedRuntime.loaded.length, 8, "a inicialização assíncrona normal não pode provocar uma segunda carga");
  assert.equal(delayedRuntime.notices.length, 0, "o Console não pode exibir erro enquanto o runtime ainda está inicializando");
  assert.equal(delayedRuntime.disposedRuntimes, 2, "runtimes de versões anteriores devem ser encerrados");
  assert.equal(delayedRuntime.removedRuntimeScripts, 8, "scripts temporários devem sair do DOM");
  assert.ok(delayedRuntime.loaded.every((url) => url.includes(`@${runtimeRef}/ANALISE/V12/`)));
  assert.ok(delayedRuntime.loaded.every((url) => url.includes("v=12.6.0-")));
  assert.match(delayedRuntime.loaded[0], /sac-memory-v12\.js/);
  assert.match(delayedRuntime.loaded.at(-1), /sac-prevencao-v12\.js/);
  assert.deepEqual(JSON.parse(JSON.stringify(delayedRuntime.state)), { version: "12.6.0", ref: runtimeRef, build: "12.6" });

  let primaryFailed = false;
  const providerFallback = await executeLoader({
    fail(url) {
      if (!primaryFailed && url.includes("cdn.jsdelivr.net") && url.includes("sac-memory-v12.js")) {
        primaryFailed = true;
        return true;
      }
      return false;
    }
  });
  assert.equal(providerFallback.notices.length, 0);
  assert.equal(providerFallback.loaded.length, 9, "uma falha pontual deve tentar o provedor alternativo sem recarregar tudo");
  assert.match(providerFallback.loaded[1], /fastly\.jsdelivr\.net/);
  assert.equal(providerFallback.state.build, "12.6");

  const staleRuntime = await executeLoader({ runtimeBuild: "12.5", readyDelayMs: 0 });
  assert.equal(staleRuntime.loaded.length, 16, "uma build incorreta deve receber apenas uma repetição completa");
  assert.equal(staleRuntime.state, undefined);
  assert.equal(staleRuntime.notices.length, 1);
  assert.match(staleRuntime.notices[0], /Não foi possível carregar a V12\.6/);

  console.log("OK - loader V12.6 imutável, assíncrono e tolerante a falhas validado");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
