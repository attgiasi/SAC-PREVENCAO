const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "sac-prevencao-v12.js"), "utf8");
const start = source.indexOf("  function falconHolderDocument(");
const end = source.indexOf("  // ========================= FALCON: LEITURA", start);

assert.ok(start >= 0 && end > start, "função falconHolderDocument não encontrada");

const sandbox = {
  digitsOnly: (value) => String(value || "").replace(/\D/g, ""),
  alnumOnly: (value) => String(value || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase(),
  documentFieldValue: (value) => String(value || "").replace(/\D/g, ""),
  documentKind: (value) => {
    const digits = String(value || "").replace(/\D/g, "");
    return digits.length === 11 ? "CPF" : digits.length === 14 ? "CNPJ" : "";
  },
  normalize: (value) => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
};

vm.createContext(sandbox);
vm.runInContext(`${source.slice(start, end)}\nthis.falconHolderDocument = falconHolderDocument;`, sandbox);

const debit = "111.111.111-11";
const credit = "222.222.222-22";
const bothSides = { debitCustomerId: debit, creditCustomerId: credit };

const comparable = (value) => JSON.parse(JSON.stringify(value));

assert.deepEqual(
  comparable(
  sandbox.falconHolderDocument("", bothSides, "Depósito bancário de varejo"),
  ),
  { document: "22222222222", source: "CREDIT_CUSTOMER_XID" }
);
assert.deepEqual(
  comparable(
  sandbox.falconHolderDocument("", { debitCustomerId: debit }, "Depósito bancário de varejo"),
  ),
  { document: "", source: "" },
  "depósito não pode usar o documento do débito como substituto"
);
assert.deepEqual(
  comparable(
  sandbox.falconHolderDocument("", bothSides, "Pagamento bancário de varejo"),
  ),
  { document: "11111111111", source: "DEBIT_CUSTOMER_XID" }
);
assert.deepEqual(
  comparable(
  sandbox.falconHolderDocument("", { creditCustomerId: credit }, "Pagamento bancário de varejo"),
  ),
  { document: "", source: "" },
  "pagamento não pode usar o documento do crédito como substituto"
);
assert.deepEqual(
  comparable(
  sandbox.falconHolderDocument("CONTA-1", {
    debitAccount: "CONTA-1",
    debitCustomerId: debit,
    creditCustomerId: credit
  }, "Transferência"),
  ),
  { document: "11111111111", source: "DEBIT_CUSTOMER_XID" },
  "tipos não mapeados ainda podem usar a conta correspondente"
);

assert.match(source, /function mediaHolderDocument\(data\)/);
assert.match(source, /return documentKind\(holderDocument\) === "CPF" \? holderDocument : ""/);
assert.match(source, /holderDocument: mediaHolderDocument\(data\)/);

console.log("OK - titular Falcon e CPF do BigData validados");
