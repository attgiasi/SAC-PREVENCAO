(function SACCounterpartyV11Factory() {
  "use strict";

  if (window.SACCounterpartyV11) return;

  const ENGINE_VERSION = "1.3.0";
  const CACHE_KEY = "sac_prevencao_V11:counterparty_registry";
  const CONFIG_KEY = "sac_prevencao_V11:counterparty_config";
  const LOCAL_RECORDS_KEY = "sac_prevencao_V11:counterparty_local_records";
  const DEFAULT_ENDPOINT = "https://cdn.jsdelivr.net/gh/attgiasi/SAC-PREVENCAO@main/ANALISE/V11/counterparty-registry-v11.json";
  const DEFAULT_TTL_MS = 60 * 1000;
  const VALID_CLASSIFICATIONS = new Set(["TRUSTED", "UNTRUSTED", "REVIEW", "UNKNOWN"]);
  const VALID_DIRECTIONS = new Set(["ORIGIN", "DESTINATION", "BOTH"]);

  const listeners = new Set();
  let provider = null;
  let providerUnsubscribe = null;
  let state = {
    registry: null,
    loadedAt: 0,
    source: "empty",
    stale: true,
    error: "",
    config: readConfig()
  };

  function storage() {
    try { return window.localStorage; } catch (_error) { return null; }
  }

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(storage()?.getItem(key) || "null");
      return value ?? fallback;
    } catch (_error) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      storage()?.setItem(key, JSON.stringify(value));
      return true;
    } catch (_error) {
      return false;
    }
  }

  function readConfig() {
    const stored = readJson(CONFIG_KEY, {});
    return {
      endpoint: String(stored.endpoint || DEFAULT_ENDPOINT).trim(),
      ttlMs: clampTtl(stored.ttlMs)
    };
  }

  function clampTtl(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(15 * 60 * 1000, Math.max(10 * 1000, number)) : DEFAULT_TTL_MS;
  }

  function normalizeText(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
  }

  function normalizeCnpj(value) {
    return String(value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  }

  function cnpjCharacterValue(character) {
    return character.charCodeAt(0) - 48;
  }

  function calculateDigit(base, weights) {
    const total = base.split("").reduce((sum, character, index) => sum + cnpjCharacterValue(character) * weights[index], 0);
    const remainder = total % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  }

  function validateCnpj(value) {
    const cnpj = normalizeCnpj(value);
    if (!/^[A-Z0-9]{12}[0-9]{2}$/.test(cnpj)) return false;
    if (/^(.)\1{13}$/.test(cnpj)) return false;
    const first = calculateDigit(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    const second = calculateDigit(`${cnpj.slice(0, 12)}${first}`, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    return cnpj.endsWith(`${first}${second}`);
  }

  function normalizeDirection(value) {
    const direction = normalizeText(value);
    if (["ORIGIN", "ORIGEM", "CREDIT", "CREDITO", "ENTRADA"].includes(direction)) return "ORIGIN";
    if (["DESTINATION", "DESTINO", "DEBIT", "DEBITO", "SAIDA"].includes(direction)) return "DESTINATION";
    return "BOTH";
  }

  function selectFalconCounterparty(input = {}) {
    const transactionType = normalizeText(input.transactionType);
    const isRetailDeposit = transactionType.includes("DEPOSITO BANCARIO DE VAREJO");
    const isRetailPayment = transactionType.includes("PAGAMENTO BANCARIO DE VAREJO");
    const direction = isRetailDeposit ? "ORIGIN" : isRetailPayment ? "DESTINATION" : "BOTH";
    const sourceField = isRetailDeposit
      ? "CREDIT_CUSTOMER_XID_VALUE"
      : isRetailPayment
        ? "DEBIT_CUSTOMER_XID_VALUE"
        : "";
    const sourceLabel = isRetailDeposit
      ? "ID do cliente de crédito"
      : isRetailPayment
        ? "ID do cliente de origem"
        : "";
    const rawDocument = isRetailDeposit
      ? input.creditCustomerId
      : isRetailPayment
        ? input.debitCustomerId
        : "";
    const document = normalizeCnpj(rawDocument);

    return Object.freeze({
      transactionType,
      direction,
      sourceField,
      sourceLabel,
      document,
      cnpj: validateCnpj(document) ? document : "",
      cpf: /^\d{11}$/.test(document) ? document : ""
    });
  }

  function normalizeClassification(value) {
    const classification = normalizeText(value);
    return VALID_CLASSIFICATIONS.has(classification) ? classification : "UNKNOWN";
  }

  function normalizeStringArray(value, fallback = []) {
    const items = Array.isArray(value) ? value : value ? [value] : fallback;
    return Array.from(new Set(items.map(normalizeText).filter(Boolean)));
  }

  function normalizeRecord(record, index) {
    const cnpj = normalizeCnpj(record?.cnpj);
    const root = normalizeCnpj(record?.root || cnpj.slice(0, 8));
    const scope = normalizeText(record?.scope) === "ROOT" ? "ROOT" : "EXACT";
    const directions = normalizeStringArray(record?.directions, ["BOTH"])
      .map(normalizeDirection)
      .filter((item) => VALID_DIRECTIONS.has(item));
    const issuers = normalizeStringArray(record?.issuers, ["GLOBAL"]);
    return {
      id: String(record?.id || `record-${index + 1}`),
      cnpj,
      root,
      scope,
      legalName: String(record?.legalName || "").trim(),
      aliases: Array.isArray(record?.aliases) ? record.aliases.map((item) => String(item).trim()).filter(Boolean) : [],
      classification: normalizeClassification(record?.classification),
      directions: directions.length ? directions : ["BOTH"],
      issuers: issuers.length ? issuers : ["GLOBAL"],
      category: normalizeText(record?.category || "OTHER"),
      reason: String(record?.reason || "").trim(),
      source: {
        type: normalizeText(record?.source?.type || "INTERNAL"),
        label: String(record?.source?.label || "").trim(),
        url: String(record?.source?.url || "").trim()
      },
      validFrom: String(record?.validFrom || "").trim(),
      validUntil: String(record?.validUntil || "").trim(),
      reviewedAt: String(record?.reviewedAt || "").trim(),
      active: record?.active !== false,
      priority: Number.isFinite(Number(record?.priority)) ? Number(record.priority) : 0
    };
  }

  function emptyRegistry() {
    return { schemaVersion: 1, version: "empty", updatedAt: "", records: [] };
  }

  function normalizeRegistry(value) {
    if (!value || typeof value !== "object" || !Array.isArray(value.records)) throw new Error("COUNTERPARTY_REGISTRY_INVALID");
    return {
      schemaVersion: Number(value.schemaVersion || 1),
      version: String(value.version || "unversioned"),
      updatedAt: String(value.updatedAt || ""),
      records: value.records.map(normalizeRecord).filter((record) => (
        record.scope === "ROOT" ? /^[A-Z0-9]{8}$/.test(record.root) : validateCnpj(record.cnpj)
      ))
    };
  }

  function recordIdentity(record) {
    return `${record.scope}:${record.scope === "ROOT" ? record.root : record.cnpj}:${record.issuers.join(",")}:${record.directions.join(",")}:${record.classification}`;
  }

  function dedupeRecords(records) {
    const map = new Map();
    records.forEach((record) => {
      const key = recordIdentity(record);
      const current = map.get(key);
      if (!current || record.priority >= current.priority) map.set(key, record);
    });
    return Array.from(map.values());
  }

  function localRecords() {
    const source = readJson(LOCAL_RECORDS_KEY, []);
    return (Array.isArray(source) ? source : [])
      .map(normalizeRecord)
      .filter((record) => record.scope === "ROOT" ? /^[A-Z0-9]{8}$/.test(record.root) : validateCnpj(record.cnpj));
  }

  function registryWithLocal(registry = state.registry || emptyRegistry()) {
    const records = dedupeRecords([...(registry?.records || []), ...localRecords()]);
    return { ...registry, records };
  }

  function isWithinValidity(record, timestamp) {
    if (!record.active) return false;
    const from = record.validFrom ? Date.parse(record.validFrom) : Number.NaN;
    const until = record.validUntil ? Date.parse(record.validUntil) : Number.NaN;
    if (Number.isFinite(from) && timestamp < from) return false;
    if (Number.isFinite(until) && timestamp > until) return false;
    return true;
  }

  function matchRecord(record, input) {
    const identifierMatches = record.scope === "ROOT" ? record.root === input.root : record.cnpj === input.cnpj;
    if (!identifierMatches) return null;
    const issuerSpecific = record.issuers.includes(input.issuer);
    const issuerGlobal = record.issuers.includes("GLOBAL");
    if (!issuerSpecific && !issuerGlobal) return null;
    const directionSpecific = record.directions.includes(input.direction);
    const directionGlobal = record.directions.includes("BOTH");
    if (!directionSpecific && !directionGlobal) return null;
    return {
      record,
      score: (record.scope === "EXACT" ? 1000 : 500)
        + (issuerSpecific ? 200 : 0)
        + (directionSpecific ? 100 : 0)
        + record.priority
    };
  }

  function publicRecord(record) {
    return {
      id: record.id,
      cnpj: record.cnpj,
      root: record.root,
      legalName: record.legalName,
      classification: record.classification,
      category: record.category,
      reason: record.reason,
      source: { ...record.source },
      reviewedAt: record.reviewedAt,
      validUntil: record.validUntil
    };
  }

  function classificationPresentation(classification) {
    const map = {
      TRUSTED: { label: "SINAL FAVORÁVEL A NÃO FRAUDE", severity: "success" },
      UNTRUSTED: { label: "CONTRAPARTE NÃO CONFIÁVEL", severity: "danger" },
      REVIEW: { label: "REVISAR CONTRAPARTE", severity: "warning" },
      UNKNOWN: { label: "CNPJ NÃO MAPEADO", severity: "neutral" }
    };
    return map[classification] || map.UNKNOWN;
  }

  function classifyFromRegistry(input, registry = state.registry || emptyRegistry()) {
    registry = registryWithLocal(registry);
    const cnpj = normalizeCnpj(input?.cnpj);
    if (/^[0-9]{11}$/.test(cnpj)) return result("NOT_APPLICABLE", "CONTRAPARTE É CPF", "neutral", input, registry, []);
    if (!validateCnpj(cnpj)) return result("NOT_APPLICABLE", "CNPJ AUSENTE OU INVÁLIDO", "neutral", input, registry, []);

    const normalizedInput = {
      cnpj,
      root: cnpj.slice(0, 8),
      issuer: normalizeText(input?.issuer || "GLOBAL") || "GLOBAL",
      direction: normalizeDirection(input?.direction)
    };
    const timestamp = Number.isFinite(Number(input?.at)) ? Number(input.at) : Date.now();
    const allMatches = dedupeRecords(registry.records)
      .map((record) => matchRecord(record, normalizedInput))
      .filter(Boolean)
      .sort((left, right) => right.score - left.score);
    const activeMatches = allMatches.filter(({ record }) => isWithinValidity(record, timestamp));

    if (!activeMatches.length && allMatches.length) {
      return result("REVIEW", "CADASTRO ENCONTRADO FORA DA VALIDADE", "warning", normalizedInput, registry, allMatches);
    }
    if (!activeMatches.length) {
      const presentation = classificationPresentation("UNKNOWN");
      return result("UNKNOWN", presentation.label, presentation.severity, normalizedInput, registry, []);
    }

    const bestScore = activeMatches[0].score;
    const bestMatches = activeMatches.filter((match) => match.score === bestScore);
    const classifications = new Set(bestMatches.map(({ record }) => record.classification));
    if (classifications.size > 1) {
      return result("REVIEW", "CLASSIFICAÇÕES CONFLITANTES", "warning", normalizedInput, registry, bestMatches);
    }
    const classification = bestMatches[0].record.classification;
    const presentation = classificationPresentation(classification);
    return result(classification, presentation.label, presentation.severity, normalizedInput, registry, bestMatches);
  }

  function result(classification, label, severity, input, registry, matches) {
    const first = matches[0]?.record;
    return {
      applicable: classification !== "NOT_APPLICABLE",
      classification,
      label,
      severity,
      cnpj: normalizeCnpj(input?.cnpj),
      issuer: normalizeText(input?.issuer || "GLOBAL") || "GLOBAL",
      direction: normalizeDirection(input?.direction),
      reason: first?.reason || "",
      source: first ? { ...first.source } : null,
      category: first?.category || "",
      matchedBy: first ? first.scope.toLowerCase() : "none",
      matches: matches.map(({ record }) => publicRecord(record)),
      registryVersion: registry.version,
      registryUpdatedAt: registry.updatedAt,
      registryStale: state.stale
    };
  }

  function defaultProvider() {
    return {
      async load({ endpoint }) {
        const url = new URL(endpoint, window.location?.href || undefined);
        url.searchParams.set("sac_refresh", String(Date.now()));
        const response = await fetch(url.toString(), { cache: "no-store", credentials: "omit" });
        if (!response.ok) throw new Error(`COUNTERPARTY_HTTP_${response.status}`);
        return response.json();
      }
    };
  }

  function emit() {
    const snapshot = getState();
    listeners.forEach((listener) => {
      try { listener(snapshot); } catch (_error) {}
    });
    try { window.dispatchEvent(new CustomEvent("sac:counterparty-registry-updated", { detail: snapshot })); } catch (_error) {}
  }

  function loadCachedRegistry() {
    const cached = readJson(CACHE_KEY, null);
    if (!cached?.registry) return null;
    try {
      return { registry: normalizeRegistry(cached.registry), savedAt: Number(cached.savedAt || 0) };
    } catch (_error) {
      return null;
    }
  }

  async function refresh(options = {}) {
    const force = Boolean(options.force);
    if (!force && state.registry && Date.now() - state.loadedAt < state.config.ttlMs) return getState();
    try {
      const raw = await (provider || defaultProvider()).load({ endpoint: state.config.endpoint });
      const registry = normalizeRegistry(raw);
      state = { ...state, registry, loadedAt: Date.now(), source: "remote", stale: false, error: "" };
      writeJson(CACHE_KEY, { savedAt: state.loadedAt, registry });
      emit();
      return getState();
    } catch (error) {
      const cached = loadCachedRegistry();
      state = {
        ...state,
        registry: cached?.registry || state.registry || emptyRegistry(),
        loadedAt: cached?.savedAt || state.loadedAt || Date.now(),
        source: cached ? "cache" : "empty",
        stale: true,
        error: String(error?.message || error || "COUNTERPARTY_LOAD_FAILED")
      };
      emit();
      return getState();
    }
  }

  async function classify(input, options = {}) {
    if (options.refresh !== false) await refresh({ force: Boolean(options.forceRefresh) });
    return classifyFromRegistry(input);
  }

  function upsertLocalClassification(input = {}) {
    const cnpj = normalizeCnpj(input.cnpj);
    if (!validateCnpj(cnpj)) throw new Error("COUNTERPARTY_CNPJ_INVALID");
    const classification = normalizeClassification(input.classification);
    if (!new Set(["TRUSTED", "UNTRUSTED", "REVIEW"]).has(classification)) throw new Error("COUNTERPARTY_CLASSIFICATION_INVALID");
    const issuer = normalizeText(input.issuer || "GLOBAL") || "GLOBAL";
    const direction = normalizeDirection(input.direction || "BOTH");
    const records = localRecords();
    const nextRecord = normalizeRecord({
      id: `local-${cnpj}-${issuer}-${direction}`,
      cnpj,
      scope: "EXACT",
      legalName: String(input.legalName || "").trim(),
      classification,
      directions: [direction],
      issuers: [issuer],
      category: String(input.category || "CADASTRO DO OPERADOR"),
      reason: String(input.reason || (classification === "TRUSTED" ? "CNPJ incluído pelo operador na lista confiável." : "CNPJ incluído pelo operador na lista de atenção.")).trim(),
      source: { type: "LOCAL", label: "Base local do operador" },
      reviewedAt: new Date().toISOString(),
      active: true,
      priority: 10000
    }, records.length);
    const kept = records.filter((record) => !(record.cnpj === cnpj && record.issuers.includes(issuer) && record.directions.includes(direction)));
    writeJson(LOCAL_RECORDS_KEY, [...kept, nextRecord].slice(-500));
    emit();
    return publicRecord(nextRecord);
  }

  function removeLocalClassification(input = {}) {
    const cnpj = normalizeCnpj(input.cnpj);
    if (!validateCnpj(cnpj)) throw new Error("COUNTERPARTY_CNPJ_INVALID");
    const issuer = normalizeText(input.issuer || "GLOBAL") || "GLOBAL";
    const direction = normalizeDirection(input.direction || "BOTH");
    const records = localRecords();
    const kept = records.filter((record) => !(record.cnpj === cnpj && record.issuers.includes(issuer) && record.directions.includes(direction)));
    writeJson(LOCAL_RECORDS_KEY, kept);
    emit();
    return kept.length !== records.length;
  }

  function exportLocalRecords() {
    return localRecords().map((record) => ({
      ...record,
      aliases: record.aliases.slice(),
      directions: record.directions.slice(),
      issuers: record.issuers.slice(),
      source: { ...record.source }
    }));
  }

  function importLocalRecords(records) {
    const source = Array.isArray(records) ? records : [];
    const normalized = source.map(normalizeRecord).filter((record) => validateCnpj(record.cnpj));
    writeJson(LOCAL_RECORDS_KEY, dedupeRecords([...localRecords(), ...normalized]).slice(-500));
    emit();
    return exportLocalRecords();
  }

  function loadSnapshot(value, options = {}) {
    const registry = normalizeRegistry(value);
    state = {
      ...state,
      registry,
      loadedAt: Date.now(),
      source: String(options.source || "snapshot"),
      stale: Boolean(options.stale),
      error: ""
    };
    if (options.persist !== false) writeJson(CACHE_KEY, { savedAt: state.loadedAt, registry });
    emit();
    return getState();
  }

  function configure(options = {}) {
    const next = {
      endpoint: String(options.endpoint || state.config.endpoint || DEFAULT_ENDPOINT).trim(),
      ttlMs: clampTtl(options.ttlMs ?? state.config.ttlMs)
    };
    state = { ...state, config: next, loadedAt: 0 };
    if (options.persist !== false) writeJson(CONFIG_KEY, next);
    return getState();
  }

  function useProvider(nextProvider) {
    if (!nextProvider || typeof nextProvider.load !== "function") throw new Error("COUNTERPARTY_PROVIDER_INVALID");
    disconnectProvider();
    provider = nextProvider;
    state = { ...state, loadedAt: 0 };
    if (typeof provider.subscribe === "function") {
      providerUnsubscribe = provider.subscribe((registry) => loadSnapshot(registry, { source: "realtime" }));
    }
    return getState();
  }

  function disconnectProvider() {
    try { providerUnsubscribe?.(); } catch (_error) {}
    providerUnsubscribe = null;
  }

  function subscribe(listener) {
    if (typeof listener !== "function") return () => {};
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function getState() {
    return {
      engineVersion: ENGINE_VERSION,
      registryVersion: state.registry?.version || "empty",
      registryUpdatedAt: state.registry?.updatedAt || "",
      loadedAt: state.loadedAt,
      source: state.source,
      stale: state.stale,
      error: state.error,
      recordCount: registryWithLocal().records.length,
      localRecordCount: localRecords().length,
      config: { ...state.config }
    };
  }

  const cached = loadCachedRegistry();
  if (cached) {
    state = { ...state, registry: cached.registry, loadedAt: cached.savedAt, source: "cache", stale: true };
  }

  window.SACCounterpartyV11 = Object.freeze({
    version: ENGINE_VERSION,
    normalizeCnpj,
    validateCnpj,
    normalizeDirection,
    selectFalconCounterparty,
    classify,
    classifyFromRegistry,
    upsertLocalClassification,
    removeLocalClassification,
    exportLocalRecords,
    importLocalRecords,
    refresh,
    loadSnapshot,
    configure,
    useProvider,
    disconnectProvider,
    subscribe,
    getState
  });
})();
