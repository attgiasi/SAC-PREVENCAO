(function SACMediaV11Factory() {
  "use strict";

  if (window.SACMediaV11) return;

  const ENGINE_VERSION = "2.2.0";
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
  const MEDIA_PATTERNS = Object.freeze([
    ["Tráfico de drogas", /TRAFIC\w*.*(?:DROG|ENTORPEC)|DROG\w*|ENTORPEC\w*/],
    ["Terrorismo", /TERRORIS\w*/],
    ["Falsidade ideológica", /FALS\w*\s+IDEOLOG\w*|IDENTIDADE FALSA/],
    ["Crimes contra a fé pública", /FE\s+PUBLIC\w*|MOED\w*\s+FALS\w*|DOCUMENT\w*\s+FALS\w*|FALSIFIC\w*|USO\s+DE\s+DOCUMENT\w*\s+FALS\w*/],
    ["Crimes contra o sistema financeiro", /SISTEMA\s+FINANCEIR\w*|CRIM\w*\s+FINANCEIR\w*|GESTAO\s+FRAUDULENT\w*|EVASAO\s+DE\s+DIVISAS/],
    ["Crimes contra a ordem tributária", /ORDEM\s+TRIBUTARI\w*|SONEG\w*|CRIM\w*\s+TRIBUTARI\w*|FRAUDE\s+FISCAL/],
    ["Crimes contra a administração da justiça", /ADMINISTRACAO\s+DA\s+JUSTICA|FRAUDE\s+PROCESSUAL|FALS\w*\s+TESTEMUNH\w*|COACAO\s+NO\s+CURSO/],
    ["Crimes contra a administração pública", /ADMINISTRACAO\s+PUBLIC\w*|PECULAT\w*|CORRUP\w*|CONCUSSAO|IMPROBIDADE/],
    ["Receptação", /RECEPTA\w*/],
    ["Estelionato", /ESTELIONAT\w*|FRAUDE\s+ELETRONIC\w*/],
    ["Roubo (majorado ou qualificado)", /ROUB\w*/],
    ["Furto (majorado ou qualificado)", /FURT\w*/],
    ["Estupro", /ESTUPR\w*|VIOLACAO\s+SEXUAL/],
    ["Homicídio", /HOMICID\w*|LATROCIN\w*/],
    ["Crimes contra o patrimônio", /CRIM\w*\s+CONTRA\s+O\s+PATRIMON\w*|DANO\s+(?:SIMPLES|QUALIFICADO)|APROPRIACAO\s+INDEBIT\w*/]
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

  const MEDIA_TYPE_BY_KEY = new Map(MEDIA_TYPES.map((item) => [normalizeText(item), item]));

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
    return Array.from(new Set((Array.isArray(values) ? values : [])
      .map((item) => MEDIA_TYPE_BY_KEY.get(normalizeText(item)))
      .filter(Boolean)));
  }

  function textOf(node) {
    return String(node?.innerText ?? node?.textContent ?? "").replace(/\s+/g, " ").trim();
  }

  function fieldMap(root) {
    const values = new Map();
    Array.from(root?.querySelectorAll?.(".cd-block") || []).forEach((block) => {
      const label = normalizeText(textOf(block.querySelector?.(".cd-title"))).replace(/:$/, "");
      const value = textOf(block.querySelector?.(".cd-value"));
      if (label && value && !values.has(label)) values.set(label, value);
    });
    return values;
  }

  function fieldValue(fields, ...labels) {
    for (const label of labels) {
      const value = fields.get(normalizeText(label).replace(/:$/, ""));
      if (value) return value;
    }
    return "";
  }

  function collectCustomerIdentity(root = document) {
    const personCards = Array.from(root?.querySelectorAll?.("#queryResult_personData .content-card") || []);
    const person = personCards.map(fieldMap).find((fields) => fieldValue(fields, "Nome", "Documento")) || new Map();
    return Object.freeze({
      supported: Boolean(person.size),
      name: fieldValue(person, "Nome"),
      document: digits(fieldValue(person, "Documento"))
    });
  }

  function processMediaTypes(record) {
    const text = normalizeText([record?.subject, record?.type, record?.courtType].filter(Boolean).join(" | "));
    return MEDIA_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([type]) => type);
  }

  function classifyProcessRecords(records = [], parties = []) {
    const targetDocuments = new Set((Array.isArray(parties) ? parties : []).map((party) => digits(party?.document)).filter(isCpf));
    const defendants = [];
    const mediaTypes = new Set();
    (Array.isArray(records) ? records : []).forEach((record) => {
      const matchedParties = (Array.isArray(record?.parties) ? record.parties : []).filter((party) => {
        const role = normalizeText(`${party?.role || ""} ${party?.participation || ""} ${party?.polarity || ""}`);
        return targetDocuments.has(digits(party?.document))
          && /\b(?:REU|RE|DEFENDANT|PASSIVE|POLO PASSIVO|ACUSAD\w*|DENUNCIAD\w*|REQUERID\w*|RECORRID\w*)\b/.test(role);
      });
      if (!matchedParties.length) return;
      const matchedTypes = processMediaTypes(record);
      if (!matchedTypes.length) return;
      matchedTypes.forEach((type) => mediaTypes.add(type));
      defendants.push({
        processNumber: String(record?.processNumber || "").trim(),
        subject: String(record?.subject || "").trim(),
        mediaTypes: matchedTypes,
        documents: matchedParties.map((party) => digits(party.document))
      });
    });
    return Object.freeze({
      found: mediaTypes.size > 0,
      mediaTypes: Object.freeze(Array.from(mediaTypes)),
      defendants: Object.freeze(defendants)
    });
  }

  function parseBigDataProcesses(root = document) {
    const cards = Array.from(root?.querySelectorAll?.("#queryResult_judicialCasesHolderData .content-card") || []);
    return cards.flatMap((card) => {
      const fields = fieldMap(card);
      const processNumber = fieldValue(fields, "Número do processo");
      if (!processNumber) return [];
      const partyNodes = Array.from(card.querySelectorAll?.("ul.process-list > li") || []);
      const parties = partyNodes.map((party) => {
        const partyFields = fieldMap(party);
        return {
          document: fieldValue(partyFields, "Documento"),
          participation: fieldValue(partyFields, "Participação"),
          polarity: fieldValue(partyFields, "Polaridade"),
          role: fieldValue(partyFields, "Tipo Especifico da Parte", "Tipo Específico da Parte")
        };
      });
      return [{
        processNumber,
        subject: fieldValue(fields, "Assunto Principal"),
        type: fieldValue(fields, "Tipo do processo"),
        courtType: fieldValue(fields, "Tipo da corte"),
        parties
      }];
    });
  }

  const builtInProvider = Object.freeze({
    canScan(root) {
      return Boolean(root?.querySelector?.("#queryResult_personData,#queryResult_judicialCasesHolderData"));
    },
    async scan(input = {}) {
      const root = input.root || document;
      const pageDocument = digits(collectCustomerIdentity(root).document);
      const requestedDocuments = new Set((input.parties || []).map((party) => digits(party?.document)).filter(isCpf));
      if (!isCpf(pageDocument) || !requestedDocuments.has(pageDocument)) {
        return { found: false, mediaTypes: [], defendants: [], pageDocument, identityMismatch: true, source: "BigData" };
      }
      const selectedParty = (input.parties || []).filter((party) => digits(party?.document) === pageDocument);
      const result = classifyProcessRecords(parseBigDataProcesses(root), selectedParty);
      return { ...result, pageDocument, identityMismatch: false, source: "BigData" };
    }
  });

  function isBigDataPage(root = document) {
    if (builtInProvider.canScan(root)) return true;
    return Boolean(root?.querySelector?.([
      "#inputCPF",
      "#datasets_people",
      "#querybydoc",
      "[xtargetapi='people']"
    ].join(",")));
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
    return provider || window.SACBigDataMediaAdapter || builtInProvider;
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
    if (raw?.identityMismatch) {
      return {
        supported: true,
        eligible: false,
        found: false,
        code: "BIGDATA_IDENTITY_MISMATCH",
        parties,
        defendants: [],
        mediaTypes: [],
        source: String(raw?.source || "BigData").trim()
      };
    }
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
    collectCustomerIdentity,
    classifyProcessRecords,
    parseBigDataProcesses,
    requestIdentity,
    createRequest,
    createResult,
    resultMatches,
    scanPage,
    canScanPage,
    isBigDataPage,
    useProvider
  });
})();
