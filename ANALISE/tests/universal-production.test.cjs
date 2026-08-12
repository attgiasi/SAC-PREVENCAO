const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const analysisRoot = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(analysisRoot, "motor-sac-universal.js"), "utf8");
const release = JSON.parse(fs.readFileSync(path.join(analysisRoot, "V12", "release-v12.json"), "utf8"));
const bookmarklet = fs.readFileSync(path.join(analysisRoot, "V12", "bookmarklet-v12.txt"), "utf8");

assert.match(source, /SacPrevencaoUniversalV12/);
assert.match(source, /const VERSION = "12\.6\.0"/);
const loaderRef = source.match(/const LOADER_REF = "([a-f0-9]{40})"/)?.[1] || "";
assert.equal(loaderRef, "18e01541268f7222875a4f45b6ce9ca10bca56ca");
assert.match(source, /const LOADER = `https:\/\/cdn\.jsdelivr\.net\/gh\/attgiasi\/SAC-PREVENCAO@\$\{LOADER_REF\}\/ANALISE\/V12\/loader-v12\.js`/);
assert.deepEqual(
  { build: release.build, source: release.commit, loaderVersion: release.loaderVersion, loader: release.loaderCommit },
  { build: "12.6", source: "dfa7aa9812eb0dcd0a62818a66763935a90227bd", loaderVersion: "12.6.0", loader: loaderRef }
);
assert.match(bookmarklet, new RegExp(`@${loaderRef}/ANALISE/V12/loader-v12\\.js\\?v=12\\.6\\.0`));

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
assert.equal(appended[0].dataset.sacUniversal, "v12");
assert.match(appended[0].src, new RegExp(`@${loaderRef}/ANALISE/V12/loader-v12\\.js\\?v=12\\.6\\.0&cache=`));

console.log("OK - favorito universal direciona para a V12");
