const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

class FakeEvent {
  constructor(type) {
    this.type = type;
  }
}

class FakeSelect {
  constructor(id, values) {
    this.id = id;
    this.name = "";
    this.placeholder = "";
    this.disabled = false;
    this.readOnly = false;
    this.events = [];
    this.options = values.map(([value, text]) => ({ value, textContent: text, selected: false }));
    this.selectedIndex = 0;
    if (this.options[0]) this.options[0].selected = true;
  }

  dispatchEvent(event) {
    this.events.push(event.type);
    return true;
  }
}

Object.defineProperty(FakeSelect.prototype, "value", {
  configurable: true,
  get() {
    return this.options[this.selectedIndex]?.value || "";
  },
  set(value) {
    const index = this.options.findIndex((option) => option.value === value);
    if (index < 0) return;
    this.options.forEach((option) => { option.selected = false; });
    this.options[index].selected = true;
    this.selectedIndex = index;
  }
});

const selects = new Map();
const documentMock = {
  getElementById: (id) => selects.get(id) || null,
  querySelectorAll: (selector) => selector === "select" ? Array.from(selects.values()) : []
};
const context = {
  console,
  document: documentMock,
  Event: FakeEvent,
  HTMLSelectElement: FakeSelect,
  Object,
  window: {}
};
context.window.window = context.window;
context.window.document = documentMock;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "sac-tabulator-v12.js"), "utf8"), context, { filename: "sac-tabulator-v12.js" });

const engine = context.window.SACTabulatorV12;
const addSelect = (id, values) => {
  const select = new FakeSelect(id, values);
  selects.set(id, select);
  return select;
};

const status = addSelect("ddl_status", [
  ["", "Status*"],
  ["FRAUDE", "FRAUDE"],
  ["NÃO FOI POSSÍVEL CONFIRMAR FRAUDE", "NÃO FOI POSSÍVEL CONFIRMAR FRAUDE"],
  ["NÃO FOI POSSÍVEL CONFIRMAR NÃO FRAUDE", "NÃO FOI POSSÍVEL CONFIRMAR NÃO FRAUDE"],
  ["NÃO FRAUDE", "NÃO FRAUDE"]
]);
assert.equal(engine.selectNow("ddl_status", "FRAUDE"), true);
assert.equal(status.value, "FRAUDE", "FRAUDE não pode selecionar uma decisão inconclusiva por aproximação");
assert.equal(engine.selectNow("ddl_status", "NÃO FRAUDE"), true);
assert.equal(status.value, "NÃO FRAUDE");

const queue = addSelect("ddl_Fila", [
  ["", "Fila*"],
  ["BANKING", "BANKING"],
  ["CARTÕES APROVADAS", "CARTÕES APROVADAS"],
  ["CARTÕES RECUSADAS", "CARTÕES RECUSADAS"],
  ["HOLD", "HOLD"]
]);
assert.equal(engine.selectNow("ddl_Fila", "CARTÕES RECUSADAS"), true);
assert.equal(queue.value, "CARTÕES RECUSADAS");
assert.equal(engine.selectNow("ddl_Fila", "CARTÕES REPROVADAS"), true);
assert.equal(queue.value, "CARTÕES RECUSADAS");

const callType = addSelect("ddl_TipoChamada", [
  ["", "Tipo Chamada*"],
  ["ATIVA – PLANILHA", "ATIVA – PLANILHA"],
  ["SEM CONTATO - PLANILHA", "SEM CONTATO - PLANILHA"],
  ["RECEPTIVO", "RECEPTIVO"]
]);
assert.equal(engine.selectNow("ddl_TipoChamada", "ATIVA - PLANILHA"), true);
assert.equal(callType.value, "ATIVA – PLANILHA");

const reason = addSelect("ddl_motivostatus", [
  ["", "Motivo Status*"],
  ["DADOS INSUFICIENTES PARA ANÁLISE", "DADOS INSUFICIENTES PARA ANÁLISE"]
]);
assert.equal(engine.selectNow("ddl_motivostatus", "DADOS INSUFICIENTES PARA ANÁLISE"), true);
assert.equal(reason.value, "DADOS INSUFICIENTES PARA ANÁLISE");
assert.ok(reason.events.includes("change"));
assert.deepEqual(Object.keys(engine), ["selectNow"], "o motor auxiliar deve expor apenas o contrato usado pelo runtime");

console.log("OK - motor de dropdowns do Tabulador V12 validado");
