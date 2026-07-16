(function SACMediaV11Factory() {
  "use strict";

  if (window.SACMediaV11) return;

  const ENGINE_VERSION = "1.0.0";
  const MEDIA_TYPES = Object.freeze([
    "Crimes contra a fé pública",
    "Tráfico de drogas",
    "Terrorismo",
    "Crimes contra o patrimônio",
    "Crimes contra o sistema financeiro",
    "Crimes contra a ordem tributária",
    "Crimes contra a administração da justiça",
    "Crimes contra a administração pública",
    "Falsidade ideológica",
    "Receptação",
    "Estelionato",
    "Roubo (majorado ou qualificado)",
    "Furto (majorado ou qualificado)",
    "Estupro",
    "Homicídio"
  ]);

  let provider = null;

  function normalizeText(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
  }

  function digits(value) {
    return String(value ?? "").replace(/\D/g, "");
  }

  function isCpf(value) {
    return digits(value).length === 11;
  }

  function eligibleParties(input = {}) {
    const candidates = [
      ["Titular", input.holderDocument],
      ["Origem", input.originDocument],
      ["Destino", input.destinationDocument],
      ["Contraparte", input.counterpartyDocument],
      ...(Array.isArray(input.parties) ? input.parties.map((party) => [party.label || "Parte", party.document]) : [])
    ];
    const seen = new Set();
    return candidates.flatMap(([label, value]) => {
      const document = digits(value);
      if (!isCpf(document) || seen.has(document)) return [];
      seen.add(document);
      return [{ label, document }];
    });
  }

  function normalizeTypes(values) {
    const allowed = new Map(MEDIA_TYPES.map((item) => [normalizeText(item), item]));
    return Array.from(new Set((Array.isArray(values) ? values : [])
      .map((item) => allowed.get(normalizeText(item)))
      .filter(Boolean)));
  }

  function requestIdentity(value = {}) {
    const caseNumber = String(value.caseNumber || "").replace(/\D/g, "");
    const documents = (value.parties || eligibleParties(value))
      .map((party) => digits(party.document))
      .filter(isCpf)
      .sort();
    return `${caseNumber}:${documents.join(",")}`;
  }

  function createRequest(input = {}) {
    const parties = eligibleParties(input);
    return {
      type: "SAC_MEDIA_REQUEST",
      id: requestIdentity({ caseNumber: input.caseNumber, parties }),
      caseNumber: String(input.caseNumber || "").trim(),
      flow: String(input.flow || "banking").trim(),
      parties,
      createdAt: Date.now(),
      savedAt: Date.now()
    };
  }

  function createResult(request, scanResult = {}) {
    const mediaTypes = normalizeTypes(scanResult.mediaTypes);
    const found = Boolean(scanResult.found || mediaTypes.length);
    return {
      type: "SAC_MEDIA_RESULT",
      requestId: requestIdentity(request),
      caseNumber: String(request?.caseNumber || "").trim(),
      flow: String(request?.flow || "banking").trim(),
      parties: Array.isArray(request?.parties) ? request.parties : [],
      classification: found ? "COM MÍDIA" : "SEM MÍDIA",
      found,
      mediaTypes,
      defendants: Array.isArray(scanResult.defendants) ? scanResult.defendants : [],
      source: String(scanResult.source || "BigData").trim(),
      createdAt: Date.now(),
      savedAt: Date.now()
    };
  }

  function resultMatches(request, result) {
    return Boolean(request && result && requestIdentity(request) && requestIdentity(request) === String(result.requestId || ""));
  }

  function activeProvider() {
    return provider || window.SACBigDataMediaAdapter || null;
  }

  function canScanPage(root = document) {
    const adapter = activeProvider();
    if (!adapter || typeof adapter.scan !== "function") return false;
    return typeof adapter.canScan !== "function" || Boolean(adapter.canScan(root));
  }

  async function scanPage(input = {}) {
    const parties = eligibleParties(input);
    if (!parties.length) {
      return { supported: false, eligible: false, found: false, code: "CPF_REQUIRED", parties: [], mediaTypes: [] };
    }
    const adapter = activeProvider();
    if (!adapter || typeof adapter.scan !== "function") {
      return { supported: false, eligible: true, found: false, code: "BIGDATA_MAPPING_REQUIRED", parties, mediaTypes: [] };
    }
    if (typeof adapter.canScan === "function" && !adapter.canScan(input.root || document)) {
      return { supported: false, eligible: true, found: false, code: "BIGDATA_PAGE_NOT_MAPPED", parties, mediaTypes: [] };
    }
    const raw = await adapter.scan({ ...input, parties });
    const mediaTypes = normalizeTypes(raw?.mediaTypes);
    return {
      supported: true,
      eligible: true,
      found: Boolean(raw?.found || mediaTypes.length),
      code: mediaTypes.length ? "ADVERSE_MEDIA_FOUND" : "NO_ADVERSE_MEDIA",
      parties,
      defendants: Array.isArray(raw?.defendants) ? raw.defendants : [],
      mediaTypes,
      source: String(raw?.source || "BigData").trim()
    };
  }

  function useProvider(nextProvider) {
    if (!nextProvider || typeof nextProvider.scan !== "function") throw new Error("BIGDATA_PROVIDER_INVALID");
    provider = nextProvider;
  }

  window.SACMediaV11 = Object.freeze({
    version: ENGINE_VERSION,
    mediaTypes: MEDIA_TYPES,
    isCpf,
    eligibleParties,
    normalizeTypes,
    requestIdentity,
    createRequest,
    createResult,
    resultMatches,
    scanPage,
    canScanPage,
    useProvider
  });
})();
