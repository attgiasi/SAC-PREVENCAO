const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const runtime = fs.readFileSync(path.join(root, "sac-prevencao-v11.js"), "utf8");
const corporate = fs.readFileSync(path.join(root, "sac-corporate-v11.js"), "utf8");
const memory = fs.readFileSync(path.join(root, "sac-memory-v11.js"), "utf8");
const tabulator = fs.readFileSync(path.join(root, "sac-tabulator-v11.js"), "utf8");

assert.doesNotMatch(runtime, /helpMode|getHelpMode/);
assert.doesNotMatch(runtime, /SETTINGS_WINDOW_NAME|readSharedSettings|writeSharedSettings/);
assert.doesNotMatch(runtime, /Legacy/);
assert.doesNotMatch(runtime, /\.sac-grid\.two/);
assert.doesNotMatch(runtime, /sac-support-form|sac-support-field/);
assert.match(runtime, /getInvestigationMode/);
assert.match(runtime, /data-classify-counterparty="TRUSTED"/);
assert.match(runtime, /data-classify-counterparty="UNTRUSTED"/);
assert.doesNotMatch(runtime, /data-classify-counterparty="REVIEW"/);
assert.match(runtime, />INVESTIGAÇÃO</);
assert.match(runtime, /\.sac-investigation-drawer\{width:312px;border-top-width:1px\}/);
assert.match(runtime, /\.sac-side-panel,\.sac-side-panel \*\{box-sizing:border-box!important\}/);

for (const setting of ["theme", "safeMode", "investigationMode", "fontScale", "signatureName", "signatureSector"]) {
  assert.match(runtime, new RegExp(`"${setting}"`));
}
assert.match(runtime, /memory\.settings\?\.set/);
assert.match(runtime, /sharedMemory: packageMemorySnapshot\(\)/);
assert.match(runtime, /return data;\s*}\s*function looksLikeAccountStatus/);
assert.match(runtime, /memory\.transport\.clearAll/);
assert.match(runtime, /getInvestigationMode\(\)\s*\? transactionEngine\.collectFalconTransactions/);

assert.doesNotMatch(corporate, /openOfficialQuery|OFFICIAL_QUERY_URL|window\.open/);
assert.match(corporate, /lookupFromPublicData/);
assert.match(corporate, /BRASIL_API_ENDPOINT/);
assert.match(corporate, /releaseSession/);
assert.doesNotMatch(corporate, /LOOKUP_CACHE_KEY/);

assert.doesNotMatch(memory, /web application\/x-sac-prevencao-memory|legacyListIdentity/);
assert.doesNotMatch(memory, /type: TYPE|bootKey: BOOT_KEY/);
assert.match(memory, /SAC_PREVENCAO_MEMORY_V11/);
assert.match(memory, /listTombstones/);
assert.match(memory, /TRANSPORT_STAGES/);
assert.doesNotMatch(memory, /writeJson\(localStore, STATE_KEY/);
assert.doesNotMatch(memory, /writeJson\(sessionStore, STATE_SESSION_KEY/);

assert.doesNotMatch(tabulator, /applyMap|fillNow|setNativeValue/);
assert.match(tabulator, /Object\.freeze\(\{\s*selectNow\s*\}\)/);

console.log("OK - resíduos obsoletos não retornaram ao runtime V11");
