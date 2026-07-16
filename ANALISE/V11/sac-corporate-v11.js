(function SACCorporateV11Factory() {
  "use strict";

  if (window.SACCorporateV11) return;

  const ENGINE_VERSION = "1.1.0";
  const CACHE_KEY = "sac_prevencao_V11:rfb_registry";
  const CONFIG_KEY = "sac_prevencao_V11:rfb_config";
  const DEFAULT_ENDPOINT = "https://cdn.jsdelivr.net/gh/attgiasi/SAC-PREVENCAO@main/ANALISE/V11/rfb-cnpj-registry-v11.json";
  const OFFICIAL_QUERY_URL = "https://solucoes.receita.fazenda.gov.br/Servicos/cnpjreva/Cnpjreva_Solicitacao.asp";
  const DEFAULT_TTL_MS = 15 * 60 * 1000;
  const STATUS_BY_CODE = Object.freeze({ "01": "NULA", "1": "NULA", "02": "ATIVA", "2": "ATIVA", "03": "SUSPENSA", "3": "SUSPENSA", "04": "INAPTA", "4": "INAPTA", "08": "BAIXADA", "8": "BAIXADA" });
  const VALID_STATUS = new Set(["ATIVA", "SUSPENSA", "INAPTA", "BAIXADA", "NULA"]);

  let provider = null;
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
    try { return JSON.parse(storage()?.getItem(key) || "null") ?? fallback; }
    catch (_error) { return fallback; }
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
      ttlMs: Number.isFinite(Number(stored.ttlMs)) ? Math.max(30_000, Number(stored.ttlMs)) : DEFAULT_TTL_MS
    };
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

  function validCnpj(value) {
    const cnpj = normalizeCnpj(value);
    const sharedValidator = window.SACCounterpartyV11?.validateCnpj;
    return typeof sharedValidator === "function" ? sharedValidator(cnpj) : /^[A-Z0-9]{12}[0-9]{2}$/.test(cnpj);
  }

  function normalizeStatus(value) {
    const raw = normalizeText(value);
    return STATUS_BY_CODE[raw] || (VALID_STATUS.has(raw) ? raw : "NÃO INFORMADA");
  }

  function parseDate(value) {
    const text = String(value || "").trim();
    let match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (match) return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
    match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return null;
  }

  function activityAge(openedAt, referenceDate = new Date()) {
    const opened = parseDate(openedAt);
    const reference = referenceDate && typeof referenceDate.getTime === "function"
      ? new Date(referenceDate.getTime())
      : parseDate(referenceDate);
    if (!opened || Number.isNaN(opened.getTime()) || !reference || Number.isNaN(reference.getTime())) {
      return { known: false, underThreeMonths: false, completedMonths: null };
    }
    const anniversary = new Date(opened);
    anniversary.setMonth(anniversary.getMonth() + 3);
    const completedMonths = Math.max(0,
      (reference.getFullYear() - opened.getFullYear()) * 12
      + reference.getMonth() - opened.getMonth()
      - (reference.getDate() < opened.getDate() ? 1 : 0)
    );
    return {
      known: true,
      underThreeMonths: reference < anniversary,
      completedMonths
    };
  }

  function normalizeRecord(record) {
    const cnpj = normalizeCnpj(record?.cnpj || record?.ni);
    return {
      cnpj,
      legalName: String(record?.legalName || record?.nomeEmpresarial || "").trim(),
      tradeName: String(record?.tradeName || record?.nomeFantasia || "").trim(),
      registrationStatus: normalizeStatus(record?.registrationStatus || record?.situacaoCadastral?.codigo || record?.situacaoCadastral),
      statusDate: String(record?.statusDate || record?.situacaoCadastral?.data || "").trim(),
      statusReason: String(record?.statusReason || record?.situacaoCadastral?.motivo || "").trim(),
      openedAt: String(record?.openedAt || record?.dataAbertura || "").trim(),
      primaryCnae: String(record?.primaryCnae?.description || record?.primaryCnae?.descricao || record?.primaryCnae || record?.cnaePrincipal?.descricao || "").trim(),
      primaryCnaeCode: String(record?.primaryCnae?.code || record?.primaryCnae?.codigo || record?.cnaePrincipal?.codigo || "").trim(),
      source: {
        type: normalizeText(record?.source?.type || "RFB_OPEN_DATA"),
        label: String(record?.source?.label || "Receita Federal").trim(),
        referenceDate: String(record?.source?.referenceDate || "").trim()
      }
    };
  }

  function emptyRegistry() {
    return { schemaVersion: 1, version: "empty", updatedAt: "", records: [] };
  }

  function normalizeRegistry(value) {
    if (!value || typeof value !== "object" || !Array.isArray(value.records)) throw new Error("RFB_REGISTRY_INVALID");
    const records = value.records.map(normalizeRecord).filter((record) => validCnpj(record.cnpj));
    return {
      schemaVersion: Number(value.schemaVersion || 1),
      version: String(value.version || "unversioned"),
      updatedAt: String(value.updatedAt || ""),
      records
    };
  }

  function statusPresentation(status) {
    const normalized = normalizeStatus(status);
    if (normalized === "ATIVA") return { label: "ATIVA", severity: "success" };
    if (VALID_STATUS.has(normalized)) return { label: normalized, severity: "danger" };
    return { label: "NÃO SINCRONIZADA", severity: "warning" };
  }

  function lookupFromRegistry(cnpj, registry = state.registry || emptyRegistry()) {
    const normalized = normalizeCnpj(cnpj);
    if (!validCnpj(normalized)) {
      return { found: false, cnpj: normalized, registrationStatus: "NÃO INFORMADA", label: "CNPJ INVÁLIDO", severity: "danger", registryVersion: registry.version, registryStale: state.stale };
    }
    const record = registry.records.find((item) => item.cnpj === normalized);
    if (!record) {
      return { found: false, cnpj: normalized, registrationStatus: "NÃO INFORMADA", label: "DADO DA RECEITA NÃO SINCRONIZADO", severity: "warning", registryVersion: registry.version, registryStale: state.stale };
    }
    const presentation = statusPresentation(record.registrationStatus);
    return {
      found: true,
      ...record,
      activityAge: activityAge(record.openedAt),
      label: presentation.label,
      severity: presentation.severity,
      registryVersion: registry.version,
      registryUpdatedAt: registry.updatedAt,
      registryStale: state.stale
    };
  }

  function cross(corporateResult, counterpartyResult) {
    if (corporateResult?.found && corporateResult.registrationStatus !== "ATIVA") {
      return { label: "REVISAR SITUAÇÃO CADASTRAL", severity: "danger", reason: `CNPJ com situação ${corporateResult.registrationStatus} na Receita Federal.` };
    }
    if (!corporateResult?.found) {
      return { label: "RECEITA NÃO CONFIRMADA", severity: "warning", reason: "A classificação interna foi consultada, mas a situação cadastral oficial ainda não foi sincronizada." };
    }
    if (corporateResult.activityAge?.underThreeMonths) {
      return { label: "REVISAR EMPRESA RECENTE", severity: "danger", reason: "O início das atividades ocorreu há menos de 3 meses." };
    }
    return {
      label: counterpartyResult?.label || "CNPJ ATIVO SEM CLASSIFICAÇÃO INTERNA",
      severity: counterpartyResult?.severity || "neutral",
      reason: counterpartyResult?.reason || "Situação ativa na Receita; sem classificação adicional na base interna."
    };
  }

  function defaultProvider() {
    return {
      async load({ endpoint }) {
        const url = new URL(endpoint, window.location?.href || undefined);
        url.searchParams.set("sac_refresh", String(Date.now()));
        const response = await fetch(url.toString(), { cache: "no-store", credentials: "omit" });
        if (!response.ok) throw new Error(`RFB_HTTP_${response.status}`);
        return response.json();
      }
    };
  }

  function loadCachedRegistry() {
    const cached = readJson(CACHE_KEY, null);
    if (!cached?.registry) return null;
    try { return { registry: normalizeRegistry(cached.registry), savedAt: Number(cached.savedAt || 0) }; }
    catch (_error) { return null; }
  }

  async function refresh(options = {}) {
    if (!options.force && state.registry && Date.now() - state.loadedAt < state.config.ttlMs) return getState();
    try {
      const raw = await (provider || defaultProvider()).load({ endpoint: state.config.endpoint });
      const registry = normalizeRegistry(raw);
      state = { ...state, registry, loadedAt: Date.now(), source: "remote", stale: false, error: "" };
      writeJson(CACHE_KEY, { savedAt: state.loadedAt, registry });
    } catch (error) {
      const cached = loadCachedRegistry();
      state = { ...state, registry: cached?.registry || state.registry || emptyRegistry(), loadedAt: cached?.savedAt || state.loadedAt || Date.now(), source: cached ? "cache" : "empty", stale: true, error: String(error?.message || error || "RFB_LOAD_FAILED") };
    }
    return getState();
  }

  async function lookup(cnpj, options = {}) {
    if (options.refresh !== false) await refresh({ force: Boolean(options.forceRefresh) });
    return lookupFromRegistry(cnpj);
  }

  function loadSnapshot(value, options = {}) {
    const registry = normalizeRegistry(value);
    state = { ...state, registry, loadedAt: Date.now(), source: String(options.source || "snapshot"), stale: Boolean(options.stale), error: "" };
    if (options.persist !== false) writeJson(CACHE_KEY, { savedAt: state.loadedAt, registry });
    return getState();
  }

  function configure(options = {}) {
    state = {
      ...state,
      config: {
        endpoint: String(options.endpoint || state.config.endpoint || DEFAULT_ENDPOINT).trim(),
        ttlMs: Number.isFinite(Number(options.ttlMs)) ? Math.max(30_000, Number(options.ttlMs)) : state.config.ttlMs
      },
      loadedAt: 0
    };
    if (options.persist !== false) writeJson(CONFIG_KEY, state.config);
    return getState();
  }

  function useProvider(nextProvider) {
    if (!nextProvider || typeof nextProvider.load !== "function") throw new Error("RFB_PROVIDER_INVALID");
    provider = nextProvider;
    state = { ...state, loadedAt: 0 };
    return getState();
  }

  function openOfficialQuery() {
    const opened = window.open?.(OFFICIAL_QUERY_URL, "_blank", "noopener,noreferrer");
    if (opened) opened.opener = null;
    return Boolean(opened);
  }

  function getState() {
    return {
      engineVersion: ENGINE_VERSION,
      registryVersion: state.registry?.version || "empty",
      registryUpdatedAt: state.registry?.updatedAt || "",
      recordCount: state.registry?.records?.length || 0,
      source: state.source,
      stale: state.stale,
      error: state.error,
      config: { ...state.config }
    };
  }

  const cached = loadCachedRegistry();
  if (cached) state = { ...state, registry: cached.registry, loadedAt: cached.savedAt, source: "cache", stale: true };

  window.SACCorporateV11 = Object.freeze({
    version: ENGINE_VERSION,
    normalizeCnpj,
    normalizeStatus,
    activityAge,
    statusPresentation,
    lookup,
    lookupFromRegistry,
    cross,
    refresh,
    loadSnapshot,
    configure,
    useProvider,
    openOfficialQuery,
    officialQueryUrl: OFFICIAL_QUERY_URL,
    getState
  });
})();
