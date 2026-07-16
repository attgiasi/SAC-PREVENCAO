const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const context = { window: {} };
vm.createContext(context);
const source = fs.readFileSync(path.join(__dirname, "..", "sac-transaction-v11.js"), "utf8");
vm.runInContext(source, context, { filename: "sac-transaction-v11.js" });

const engine = context.window.SACTransactionV11;
assert.ok(engine);
assert.equal(engine.containsP2P("Transferência P2P"), true);
assert.equal(engine.containsP2P("P2P_OUT_DIF_CONTA"), true);
assert.equal(engine.containsP2P("Depósito bancário"), false);

const p2p = engine.analyze({ transactionType: "P2P" });
assert.equal(p2p.classification, "FAVORABLE");
assert.equal(p2p.favorablePoints, 1);
assert.equal(p2p.p2pDetected, true);

const trusted = engine.analyze({
  transactionType: "P2P",
  counterpartyResult: { classification: "TRUSTED", reason: "Empresa conhecida." }
});
assert.equal(trusted.classification, "FAVORABLE");
assert.equal(trusted.favorablePoints, 2);

const untrusted = engine.analyze({
  transactionType: "P2P",
  counterpartyResult: { classification: "UNTRUSTED", reason: "Base de atenção." }
});
assert.equal(untrusted.classification, "REVIEW");
assert.equal(untrusted.favorablePoints, 1);
assert.equal(untrusted.alertPoints, 1);

const empty = engine.analyze({ transactionType: "Depósito bancário" });
assert.equal(empty.classification, "NO_SIGNAL");
assert.equal(empty.signals.length, 0);

(async () => {
  const pending = await engine.analyzeConsole({ transactionType: "P2P" });
  assert.equal(pending.mappingPending, true);
  engine.useProvider({ canScan: () => true, scan: async () => ({ transactionType: "P2P", metrics: { count: 2 } }) });
  const mapped = await engine.analyzeConsole({ root: {} });
  assert.equal(mapped.mappingPending, false);
  assert.equal(mapped.p2pDetected, true);
  console.log("OK - motor transacional V11 validado");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
