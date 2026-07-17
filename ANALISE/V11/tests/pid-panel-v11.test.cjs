const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "..", "sac-prevencao-v11.js"), "utf8");

assert.match(source, /if \(enabled\) openPidPanel\(data\);/);
assert.doesNotMatch(source, /data\.flow === ["']card["'] && enabled/);
assert.match(source, /PID - \$\{issuer \|\| ["']PADRÃO["']\}/);
assert.match(source, /pid\.motherName/);
assert.match(source, /pid\.birthDate/);
assert.match(source, /pid\.address/);
assert.match(source, /pid\.phone/);
assert.match(source, /const pasted = await readClipboardText\(\);/);

console.log("OK - painel PID ligado à chamada e aos dados do BigData");
