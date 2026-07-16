(function SACTransactionV11Factory() {
  "use strict";

  if (window.SACTransactionV11) return;

  const ENGINE_VERSION = "1.2.0";
  let provider = null;

  const FALCON_ROW_FIELDS = Object.freeze({
    rule: ["RULESTEXT_VALUE1", "RULESTEXT_VALUE", "RULES_TEXT"],
    date: ["TRANSACTION_DTTM_VALUE", "TRANSACTION_DATE_VALUE"],
    amount: ["TRANSACTION_AMT_VALUE", "TRANSACTION_AMOUNT_VALUE"],
    debitCustomerId: ["DEBIT_CUSTOMER_XID_VALUE"],
    creditCustomerId: ["CREDIT_CUSTOMER_XID_VALUE"],
    debitAccount: ["DEBIT_ACCOUNT_NUM_VALUE"],
    creditAccount: ["CREDIT_ACCOUNT_NUM_VALUE"],
    payerName: ["CREDIT_PAYER_NAME_VALUE"]
  });

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

  function textOf(node) {
    return String(node?.innerText ?? node?.textContent ?? "").replace(/\s+/g, " ").trim();
  }

  function falconFieldText(row, field) {
    const tokens = FALCON_ROW_FIELDS[field] || [];
    const nodes = Array.from(row?.querySelectorAll?.("[id]") || []);
    const match = nodes.find((node) => tokens.some((token) => String(node.id || "").includes(`:${token}`)) && textOf(node));
    return textOf(match);
  }

  function falconRowIndex(row) {
    const nodes = Array.from(row?.querySelectorAll?.("[id]") || []);
    return nodes.map((node) => String(node.id || "").match(/_(\d+)$/)?.[1] || "").find(Boolean) || "";
  }

  function parseBrazilianAmount(value) {
    const source = String(value ?? "").replace(/[^0-9,.-]/g, "");
    const normalized = source.includes(",") ? source.replace(/\./g, "").replace(",", ".") : source;
    const amount = Number.parseFloat(normalized);
    return Number.isFinite(amount) ? amount : 0;
  }

  function collectFalconTransactions(input = {}) {
    const root = input.root || (typeof document !== "undefined" ? document : null);
    if (!root?.querySelectorAll) return Object.freeze([]);
    const transactionType = String(input.transactionType || "");
    const selectCounterparty = window.SACCounterpartyV11?.selectFalconCounterparty;
    const rows = Array.from(root.querySelectorAll("tr,[role='row']"))
      .filter((row) => {
        const checkbox = row.querySelector?.("input[id*='caseTranGridVwColSelCheckBox']");
        if (!checkbox) return false;
        const directRow = checkbox.closest?.("tr,[role='row']");
        return !directRow || directRow === row;
      })
      .map((row) => {
        const debitCustomerId = falconFieldText(row, "debitCustomerId");
        const creditCustomerId = falconFieldText(row, "creditCustomerId");
        const counterparty = typeof selectCounterparty === "function"
          ? selectCounterparty({ transactionType, debitCustomerId, creditCustomerId })
          : { direction: "BOTH", sourceField: "", sourceLabel: "", document: "", cnpj: "", cpf: "" };
        const amountText = falconFieldText(row, "amount");
        return Object.freeze({
          rowIndex: falconRowIndex(row),
          transactionType,
          rule: falconFieldText(row, "rule"),
          date: falconFieldText(row, "date"),
          amountText,
          amount: parseBrazilianAmount(amountText),
          debitCustomerId,
          creditCustomerId,
          debitAccount: falconFieldText(row, "debitAccount"),
          creditAccount: falconFieldText(row, "creditAccount"),
          payerName: falconFieldText(row, "payerName"),
          counterparty
        });
      });
    return Object.freeze(rows);
  }

  function summarizeFalconTransactions(rows = []) {
    const items = Array.isArray(rows) ? rows : [];
    const counterparties = new Map();
    let totalAmount = 0;

    items.forEach((row) => {
      totalAmount += Number(row?.amount || 0);
      const document = String(row?.counterparty?.document || "");
      if (!document) return;
      const current = counterparties.get(document) || {
        document,
        cnpj: String(row?.counterparty?.cnpj || ""),
        cpf: String(row?.counterparty?.cpf || ""),
        direction: String(row?.counterparty?.direction || "BOTH"),
        sourceLabel: String(row?.counterparty?.sourceLabel || "ID da contraparte"),
        payerNames: new Set(),
        transactionCount: 0,
        totalAmount: 0
      };
      if (row?.payerName) current.payerNames.add(String(row.payerName));
      current.transactionCount += 1;
      current.totalAmount += Number(row?.amount || 0);
      counterparties.set(document, current);
    });

    return Object.freeze({
      transactionCount: items.length,
      totalAmount,
      p2pDetected: items.some((row) => containsP2P(`${row?.transactionType || ""} ${row?.rule || ""}`)),
      uniqueCounterpartyCount: counterparties.size,
      counterparties: Object.freeze(Array.from(counterparties.values(), (item) => Object.freeze({
        ...item,
        payerNames: Object.freeze(Array.from(item.payerNames))
      })))
    });
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
    parseBrazilianAmount,
    collectFalconTransactions,
    summarizeFalconTransactions,
    analyze,
    analyzeConsole,
    useProvider
  });
})();
