const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const context = {
  window: {
    SACCounterpartyV11: {
      selectFalconCounterparty(input) {
        const deposit = String(input.transactionType).includes("Depósito");
        const document = deposit ? input.creditCustomerId : input.debitCustomerId;
        return {
          direction: deposit ? "ORIGIN" : "DESTINATION",
          sourceField: deposit ? "CREDIT_CUSTOMER_XID_VALUE" : "DEBIT_CUSTOMER_XID_VALUE",
          sourceLabel: deposit ? "ID do cliente de crédito" : "ID do cliente de origem",
          document,
          cnpj: String(document).length === 14 ? document : "",
          cpf: String(document).length === 11 ? document : ""
        };
      }
    }
  }
};
vm.createContext(context);
const source = fs.readFileSync(path.join(__dirname, "..", "sac-transaction-v11.js"), "utf8");
vm.runInContext(source, context, { filename: "sac-transaction-v11.js" });

const engine = context.window.SACTransactionV11;
assert.ok(engine);
assert.equal(engine.containsP2P("Transferência P2P"), true);
assert.equal(engine.containsP2P("P2P_OUT_DIF_CONTA"), true);
assert.equal(engine.containsP2P("Depósito bancário"), false);
assert.equal(engine.parseBrazilianAmount("R$ 1.400,50"), 1400.5);

function falconNode(id, text) {
  return { id, innerText: text, textContent: text };
}

function falconRow(index, fields) {
  const nodes = Object.entries(fields).map(([field, value]) => falconNode(`csInvFrm:csInvTbVw:resultGrid:${field}_${index}`, value));
  return {
    querySelector: (selector) => selector.includes("caseTranGridVwColSelCheckBox") ? { id: `caseTranGridVwColSelCheckBox_${index}` } : null,
    querySelectorAll: (selector) => selector === "[id]" ? nodes : []
  };
}

const falconRoot = {
  querySelectorAll: () => [
    falconRow(0, {
      RULESTEXT_VALUE1: "Nega_P2P_Out_Dif_Conta",
      TRANSACTION_DTTM_VALUE: "16/07/2026 10:12:00",
      TRANSACTION_AMT_VALUE: "1.400,00",
      DEBIT_CUSTOMER_XID_VALUE: "11111111111",
      CREDIT_CUSTOMER_XID_VALUE: "42054886000104",
      CREDIT_PAYER_NAME_VALUE: "GETNET"
    }),
    falconRow(1, {
      RULESTEXT_VALUE1: "Nega_P2P_Out_Dif_Conta",
      TRANSACTION_DTTM_VALUE: "16/07/2026 10:20:00",
      TRANSACTION_AMT_VALUE: "600,00",
      DEBIT_CUSTOMER_XID_VALUE: "11111111111",
      CREDIT_CUSTOMER_XID_VALUE: "42054886000104",
      CREDIT_PAYER_NAME_VALUE: "GETNET"
    })
  ]
};
const falconRows = engine.collectFalconTransactions({ root: falconRoot, transactionType: "Depósito bancário de varejo" });
assert.equal(falconRows.length, 2);
assert.equal(falconRows[0].counterparty.document, "42054886000104");
assert.equal(falconRows[0].rowIndex, "0");
const falconSummary = engine.summarizeFalconTransactions(falconRows);
assert.equal(falconSummary.transactionCount, 2);
assert.equal(falconSummary.totalAmount, 2000);
assert.equal(falconSummary.uniqueCounterpartyCount, 1);
assert.equal(falconSummary.p2pDetected, true);
assert.equal(falconSummary.counterparties[0].transactionCount, 2);
assert.equal(falconSummary.validDateCount, 2);
assert.equal(falconSummary.periodEnd - falconSummary.periodStart, 8 * 60 * 1000);

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

const profile = engine.issuerProfileFor("Rede Frota Solutions");
assert.equal(profile.name, "REDEFROTA");
assert.ok(profile.expected.some((item) => item.includes("alto valor")));

const jeittoRows = [
  { timestamp: Date.parse("2026-07-16T10:00:00"), amount: 1200, signedAmount: 1200, direction: "CREDIT", p2p: true, counterparty: "Origem A" },
  { timestamp: Date.parse("2026-07-16T10:05:00"), amount: 1100, signedAmount: -1100, direction: "DEBIT", p2p: true, counterparty: "Destino B" }
];
const jeitto = engine.analyze({ issuer: "JeittoDockone", rows: jeittoRows });
assert.equal(jeitto.metrics.validDateCount, 2);
assert.equal(jeitto.metrics.periodStart, jeittoRows[0].timestamp);
assert.equal(jeitto.metrics.periodEnd, jeittoRows[1].timestamp);
assert.ok(jeitto.signals.some((item) => item.code === "JEITTO_24H_HIGH"));
assert.ok(jeitto.signals.some((item) => item.code === "JEITTO_P2P_BURST"));

const redefrota = engine.analyze({
  issuer: "FrotaBank",
  rows: [{ timestamp: Date.now(), amount: 8000, signedAmount: -8000, direction: "DEBIT", p2p: false, counterparty: "Posto Marajó", description: "Combustível" }]
});
assert.ok(redefrota.signals.some((item) => item.code === "REDEFROTA_EXPECTED"));

assert.equal(engine.cardEntryMode("V"), "CHIP E SENHA");
assert.equal(engine.cardEntryMode("D"), "APROXIMAÇÃO");
assert.equal(engine.cardEntryMode("K"), "DIGITADO MANUAL");
assert.equal(engine.cardEntryMode("E"), "E-COMMERCE");
assert.equal(engine.cardEntryMode("A"), "");

const cardRoot = {
  querySelectorAll: () => [
    falconRow(2, {
      TRANSACTION_DTTM_VALUE: "16/07/2026 11:00:00",
      TRANSACTION_AMT_VALUE: "150,00",
      MERCHANT_NAME_VALUE: "LOJA TESTE",
      MERCHANT_XID_VALUE: "LOJA-001",
      TRANSACTION_POSTING_ENTRY_XFLG_VALUE: "D",
      FALCON_DECISION_CODE_VALUE: "DECLINE"
    }),
    falconRow(3, {
      TRANSACTION_DTTM_VALUE: "16/07/2026 11:03:00",
      TRANSACTION_AMT_VALUE: "175,00",
      MERCHANT_NAME_VALUE: "LOJA TESTE",
      MERCHANT_XID_VALUE: "LOJA-001",
      TRANSACTION_POSTING_ENTRY_XFLG_VALUE: "E",
      FALCON_DECISION_CODE_VALUE: "DECLINE"
    }),
    falconRow(4, {
      TRANSACTION_DTTM_VALUE: "16/07/2026 11:10:00",
      TRANSACTION_AMT_VALUE: "80,00",
      MERCHANT_NAME_VALUE: "MERCADO SEGURO",
      MERCHANT_XID_VALUE: "LOJA-002",
      TRANSACTION_POSTING_ENTRY_XFLG_VALUE: "V",
      FALCON_DECISION_CODE_VALUE: "APPROVE"
    })
  ]
};
const cardRows = engine.collectFalconTransactions({ root: cardRoot, transactionType: "Autorização ou lançamento de crédito" });
const cardSummary = engine.summarizeFalconTransactions(cardRows);
const cardAnalysis = engine.analyze({ flow: "card", transactionType: "Autorização ou lançamento de crédito", rows: cardRows });
assert.equal(cardRows.length, 3);
assert.equal(cardSummary.merchantCount, 2);
assert.equal(cardSummary.chipPinCount, 1);
assert.equal(cardSummary.attentionModeCount, 2);
assert.equal(cardSummary.repeatedAttentionMerchantCount, 1);
assert.equal(cardAnalysis.classification, "REVIEW");
assert.ok(cardAnalysis.signals.some((item) => item.code === "CARD_CHIP_PIN"));
assert.ok(cardAnalysis.signals.some((item) => item.code === "CARD_REPEATED_RISKY_MERCHANT"));
assert.equal(cardAnalysis.p2pDetected, false);

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
