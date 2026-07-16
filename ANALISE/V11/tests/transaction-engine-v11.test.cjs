const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const context = {
  window: {
    SACCounterpartyV11: {
      selectFalconCounterparty(input) {
        const deposit = String(input.transactionType).includes("Depósito");
        const document = deposit ? input.debitCustomerId : input.creditCustomerId;
        return {
          direction: deposit ? "ORIGIN" : "DESTINATION",
          sourceField: deposit ? "DEBIT_CUSTOMER_XID_VALUE" : "CREDIT_CUSTOMER_XID_VALUE",
          sourceLabel: deposit ? "ID do cliente de origem" : "ID do cliente de crédito",
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
      DEBIT_CUSTOMER_XID_VALUE: "42054886000104",
      CREDIT_CUSTOMER_XID_VALUE: "11111111111",
      CREDIT_PAYER_NAME_VALUE: "GETNET"
    }),
    falconRow(1, {
      RULESTEXT_VALUE1: "Nega_P2P_Out_Dif_Conta",
      TRANSACTION_DTTM_VALUE: "16/07/2026 10:20:00",
      TRANSACTION_AMT_VALUE: "600,00",
      DEBIT_CUSTOMER_XID_VALUE: "42054886000104",
      CREDIT_CUSTOMER_XID_VALUE: "11111111111",
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
