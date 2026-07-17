const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "sac-ddd-v11.js"), "utf8"), context);

const engine = context.window.SACDddV11;
assert.equal(engine.extractDdd("+55 (92) 99999-9999"), "92");
assert.equal(engine.lookup("92").uf, "AM");
assert.equal(engine.lookup("92").region, "Norte");
assert.equal(engine.lookup("41").region, "Sul");
assert.equal(engine.bemolAssessment("92").status, "MATCH");
assert.equal(engine.bemolAssessment("41").status, "ALERT");
assert.equal(engine.bemolAssessment("").status, "REVIEW");
console.log("OK - motor de DDD V11 validado");
