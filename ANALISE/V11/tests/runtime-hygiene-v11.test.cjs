const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const runtime = fs.readFileSync(path.join(root, "sac-prevencao-v11.js"), "utf8");
const corporate = fs.readFileSync(path.join(root, "sac-corporate-v11.js"), "utf8");
const memory = fs.readFileSync(path.join(root, "sac-memory-v11.js"), "utf8");
const tabulator = fs.readFileSync(path.join(root, "sac-tabulator-v11.js"), "utf8");
const preview = fs.readFileSync(path.join(root, "preview.html"), "utf8");

assert.doesNotMatch(runtime, /helpMode|getHelpMode/);
assert.doesNotMatch(runtime, /SETTINGS_WINDOW_NAME|readSharedSettings|writeSharedSettings/);
assert.doesNotMatch(runtime, /Legacy/);
assert.doesNotMatch(runtime, /\.sac-grid\.two/);
assert.doesNotMatch(runtime, /sac-support-form|sac-support-field/);
assert.doesNotMatch(runtime, /applyMappedTabulatorFields|tabulatorTextFieldMap|tabulatorDropdownFieldMap/);
assert.doesNotMatch(runtime, /window\.set(?:Dirty|Value)\s*=\s*\(\)\s*=>/);
assert.doesNotMatch(runtime, /showNotice\([^\n]+,\s*"info"/);
assert.doesNotMatch(runtime, /listMutationDepth/);
assert.doesNotMatch(runtime, /copyText\(text, queue, history\)/);
assert.doesNotMatch(runtime, /memory\.lists\.upsert\?\.\(item\)/);
assert.match(runtime, /async function renderTabulator\([^)]*\)\s*\{\s*installTabulatorWriteGuard\(\);/);
assert.match(runtime, /getInvestigationMode/);
assert.match(runtime, /data-classify-counterparty="TRUSTED"/);
assert.match(runtime, /data-classify-counterparty="UNTRUSTED"/);
assert.doesNotMatch(runtime, /data-classify-counterparty="REVIEW"/);
assert.match(runtime, />INVESTIGAÇÃO</);
assert.match(runtime, /\.sac-investigation-drawer\{width:332px/);
assert.match(runtime, /\.sac-investigation-head\{/);
assert.match(runtime, /\.sac-investigation-arrow\.is-open/);
assert.doesNotMatch(runtime, /\.sac-investigation-drawer\{width:312px/);
assert.match(runtime, /\.sac-side-panel,\.sac-side-panel \*\{box-sizing:border-box!important\}/);

for (const setting of ["theme", "safeMode", "investigationMode", "fontScale", "signatureName", "signatureSector"]) {
  assert.match(runtime, new RegExp(`"${setting}"`));
}
assert.match(runtime, /memory\.settings\?\.set/);
assert.match(runtime, /sharedMemory: packageMemorySnapshot\(\)/);
assert.match(runtime, /return data;\s*}\s*function looksLikeAccountStatus/);
assert.match(runtime, /memory\.transport\.clearAll/);
assert.match(runtime, /__SAC_TABULATOR_NAVIGATION_GUARD_V2__/);
assert.match(runtime, /__sacSubmitGuardVersion === 2/);
assert.doesNotMatch(runtime, /__sacSubmitGuardInstalled/);
assert.match(runtime, /await memory\.hydrateFromClipboard\(\{ timeoutMs: timeout \}\)/);
assert.match(runtime, /const savedAt = nextListRevision\(queue\)/);
assert.match(runtime, /const updatedAt = nextListRevision\(\[item\]\);[\s\S]+?savedAt: updatedAt,[\s\S]+?updatedAt/);
assert.match(runtime, /window\.__SAC_TABULATOR_DECISION_WRITE_ACTIVE__ = false;\s*window\.__SAC_TABULATOR_DECISION_PANEL_ACTIVE__ = false;/);
assert.match(runtime, /const data = \{\s*type: EXPORT_CONSOLE,[\s\S]+?data\.pidData = collectConsolePidData\(data\);\s*return data;/);
assert.match(runtime, /\.sac-config\{max-height:calc\(100vh - 16px\);overflow-y:auto;overscroll-behavior:contain\}/);
assert.match(runtime, /const width = configPanel\.offsetWidth \|\| 360;[\s\S]+?configPanel\.style\.maxHeight = `\$\{Math\.max\(180, window\.innerHeight - top - 8\)\}px`/);
assert.match(runtime, /const tombstones = memory\.lists\.tombstones\?\.\(\) \|\| \[\]/);
assert.match(runtime, /function closeAuxiliaryPanels[\s\S]+?\.sac-choice-popover/);
assert.doesNotMatch(runtime, /getInvestigationMode\(\)\s*\? transactionEngine\.collectFalconTransactions/);
assert.match(runtime, /attachInvestigationLauncher\(panel, "FALCON", data, \(\) => transactionEngine\.collectFalconTransactions/);

assert.doesNotMatch(corporate, /openOfficialQuery|OFFICIAL_QUERY_URL|window\.open/);
assert.match(corporate, /lookupFromPublicData/);
assert.match(corporate, /BRASIL_API_ENDPOINT/);
assert.match(corporate, /releaseSession/);
assert.doesNotMatch(corporate, /LOOKUP_CACHE_KEY/);

assert.doesNotMatch(memory, /web application\/x-sac-prevencao-memory|legacyListIdentity/);
assert.doesNotMatch(memory, /type: TYPE|bootKey: BOOT_KEY/);
assert.match(memory, /SAC_PREVENCAO_MEMORY_V11/);
assert.match(memory, /listTombstones/);
assert.match(memory, /const key = normalizeText\(item\.id\) \|\| identity\(item\)/);
assert.match(memory, /const history = \{[\s\S]+?all\(\) \{\s*mergeCurrentMirrors\(\);[\s\S]+?upsert\(item\) \{\s*mergeCurrentMirrors\(\);/);
assert.match(memory, /const removals = tombstoneMap\(tombstones\)/);
assert.match(memory, /TRANSPORT_STAGES/);
assert.doesNotMatch(memory, /writeJson\(localStore, STATE_KEY/);
assert.doesNotMatch(memory, /writeJson\(sessionStore, STATE_SESSION_KEY/);
assert.match(memory, /clearTimeout\(timeout\)/);

assert.match(preview, /document\.getElementById\("merchantHistory"\)\?\.value\|\|data\.fields\.merchantHistory\|\|""/);
assert.match(preview, /document\.getElementById\("purchase"\)\?\.value\|\|data\.fields\.purchase\|\|""/);
assert.match(preview, /\.config\{max-height:calc\(100vh - 16px\);overflow-y:auto;overscroll-behavior:contain\}/);
assert.match(preview, /width=box\.offsetWidth\|\|360[\s\S]+?box\.style\.maxHeight=`\$\{Math\.max\(180,innerHeight-top-8\)\}px`/);

assert.doesNotMatch(tabulator, /applyMap|fillNow|setNativeValue/);
assert.match(tabulator, /Object\.freeze\(\{\s*selectNow\s*\}\)/);

console.log("OK - resíduos obsoletos não retornaram ao runtime V11");
