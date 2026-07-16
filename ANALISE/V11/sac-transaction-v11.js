(function SACTransactionV11Factory() {
  "use strict";

  if (window.SACTransactionV11) return;

  const ENGINE_VERSION = "1.1.0";
  let provider = null;

  function normalizeText(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[–—−]/g, "-")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
  }

  function containsP2P(value) {
    return /(^|[^A-Z0-9])P2P([^A-Z0-9]|$)/.test(normalizeText(value));
  }

  function signal(kind, code, title, detail, points = 0) {
    return Object.freeze({ kind, code, title, detail, points });
  }

  function counterpartySignal(result) {
    const classification = normalizeText(result?.classification);
    if (classification === "TRUSTED") {
      return signal(
        "favorable",
        "COUNTERPARTY_TRUSTED",
        "Contraparte cadastrada como confiável",
        result?.reason || "CNPJ localizado na base de contrapartes confiáveis.",
        1
      );
    }
    if (classification === "UNTRUSTED") {
      return signal(
        "alert",
        "COUNTERPARTY_UNTRUSTED",
        "Contraparte não confiável",
        result?.reason || "CNPJ localizado na base de atenção elevada.",
        -1
      );
    }
    if (classification === "REVIEW") {
      return signal(
        "attention",
        "COUNTERPARTY_REVIEW",
        "Contraparte requer revisão",
        result?.reason || "A classificação da contraparte precisa ser conferida.",
        0
      );
    }
    return null;
  }

  function analyze(input = {}) {
    const transactionText = [input.transactionType, input.rule, input.description]
      .map(normalizeText)
      .filter(Boolean)
      .join(" | ");
    const signals = [];

    if (containsP2P(transactionText)) {
      signals.push(signal(
        "favorable",
        "P2P_PRESENT",
        "P2P identificado",
        "Ponto favorável à decisão de não fraude conforme a regra operacional definida.",
        1
      ));
    }

    const counterpart = counterpartySignal(input.counterpartyResult);
    if (counterpart) signals.push(counterpart);

    const favorablePoints = signals
      .filter((item) => item.kind === "favorable")
      .reduce((total, item) => total + Math.max(0, item.points), 0);
    const alertPoints = signals
      .filter((item) => item.kind === "alert")
      .reduce((total, item) => total + Math.abs(Math.min(0, item.points)), 0);
    const attentionCount = signals.filter((item) => item.kind === "attention").length;

    let classification = "NO_SIGNAL";
    let label = "SEM SINAIS CADASTRADOS";
    if (alertPoints > 0 || attentionCount > 0) {
      classification = "REVIEW";
      label = "REVISÃO RECOMENDADA";
    } else if (favorablePoints > 0) {
      classification = "FAVORABLE";
      label = "SINAL FAVORÁVEL A NÃO FRAUDE";
    }

    return Object.freeze({
      engineVersion: ENGINE_VERSION,
      classification,
      label,
      favorablePoints,
      alertPoints,
      attentionCount,
      p2pDetected: signals.some((item) => item.code === "P2P_PRESENT"),
      signals: Object.freeze(signals.slice()),
      disclaimer: "Apoio à análise. A decisão permanece com o analista."
    });
  }

  async function analyzeConsole(input = {}) {
    const adapter = provider || window.SACConsoleTransactionAdapter || null;
    if (adapter && typeof adapter.scan === "function" && (typeof adapter.canScan !== "function" || adapter.canScan(input.root || document))) {
      const mapped = await adapter.scan(input.root || document);
      return Object.freeze({
        ...analyze({ ...input, ...mapped }),
        source: "CONSOLE_MAPPED",
        mappingPending: false,
        metrics: mapped?.metrics || {}
      });
    }
    return Object.freeze({
      ...analyze(input),
      source: "TRANSPORTED_CONTEXT",
      mappingPending: true,
      metrics: {}
    });
  }

  function useProvider(nextProvider) {
    if (!nextProvider || typeof nextProvider.scan !== "function") throw new Error("TRANSACTION_PROVIDER_INVALID");
    provider = nextProvider;
  }

  window.SACTransactionV11 = Object.freeze({
    version: ENGINE_VERSION,
    normalizeText,
    containsP2P,
    analyze,
    analyzeConsole,
    useProvider
  });
})();
