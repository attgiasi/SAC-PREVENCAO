const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "..", "sac-prevencao-v11.js"), "utf8");
const consoleStart = source.indexOf("  async function renderConsole()");
const tabulatorStart = source.indexOf("  async function renderTabulator(");
const consoleSource = source.slice(consoleStart, tabulatorStart);
const tabulatorEnd = source.indexOf("  function consoleDropdownGrid(", tabulatorStart);
const tabulatorSource = source.slice(tabulatorStart, tabulatorEnd);

assert.ok(consoleStart >= 0 && tabulatorStart > consoleStart, "blocos Console/Tabulador não encontrados");
assert.doesNotMatch(consoleSource, /memory\.transport\.clear\("mediaRequest"\)/);
assert.doesNotMatch(consoleSource, /memory\.transport\.clear\("mediaResult"\)/);
assert.match(consoleSource, /await applyPendingMediaResult\(data\)/);
assert.match(tabulatorSource, /await applyPendingMediaResult\(data\)/);
assert.match(source, /memory\.transport\.set\("mediaResult", result\)/);
assert.match(source, /memory\.transport\.clear\("mediaRequest"\)/);
assert.match(source, /memory\.transport\.clear\("mediaResult"\)/);

console.log("OK - BigData funciona antes ou depois do Console");
