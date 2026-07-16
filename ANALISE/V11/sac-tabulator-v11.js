(function SACTabulatorV11Factory() {
  "use strict";

  if (window.SACTabulatorV11) return;

  const normalize = (value) => String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[–—]/g, "-")
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  function optionsOf(select) {
    return Array.from(select?.options || []);
  }

  function all(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function optionTargets(wanted) {
    const target = normalize(wanted);
    const aliases = new Map([
      ["CARTOES APROVADAS", ["CARTOES APROVADOS", "CARTAO APROVADO", "APROVADAS", "APROVADA", "APPROVE", "AUTHORIZED"]],
      ["CARTOES RECUSADAS", ["CARTOES REPROVADAS", "CARTOES RECUSADOS", "CARTOES REPROVADOS", "CARTAO RECUSADO", "RECUSADA", "REPROVADA", "DECLINE", "DENIED"]],
      ["APPROVE", ["CARTOES APROVADAS", "CARTOES APROVADOS", "APROVADA", "AUTHORIZED"]],
      ["AUTHORIZED", ["CARTOES APROVADAS", "CARTOES APROVADOS", "APPROVE", "APROVADA"]],
      ["DECLINE", ["CARTOES RECUSADAS", "CARTOES REPROVADAS", "RECUSADA", "REPROVADA", "DENIED"]],
      ["DENIED", ["CARTOES RECUSADAS", "CARTOES REPROVADAS", "DECLINE", "RECUSADA", "REPROVADA"]],
      ["ATIVA - PLANILHA", ["ATIVA PLANILHA", "ATIVO - PLANILHA", "ATIVO PLANILHA", "ATIVA – PLANILHA"]],
      ["SEM CONTATO - PLANILHA", ["SEM CONTATO PLANILHA", "SEM CHAMADA - PLANILHA", "SEM CONTATO – PLANILHA"]],
      ["SEM CHAMADA", ["SEM CONTATO", "AUSENCIA DE CHAMADA"]],
      ["COM SUCESSO", ["SUCESSO"]],
      ["SEM SUCESSO", ["INSUCESSO", "SEM EXITO"]],
      ["DADOS INSUFICIENTES PARA ANALISE", ["DADOS INSUFICIENTES", "DADOS INSUFICIENTES PARA DECISAO"]],
      ["CLIENTE NAO ATENDE", ["CLIENTE NAO ATENDEU"]],
      ["CLIENTE SOFREU FRAUDE", ["CLIENTE VITIMA DE FRAUDE", "CLIENTE SOFREU A FRAUDE"]],
      ["FRAUDE TRANSACIONAL", []],
      ["SEM SUSPEITAS", ["SEM SUSPEITA"]]
    ]);
    return Array.from(new Set([target, ...(aliases.get(target) || [])].filter(Boolean)));
  }

  function optionMatches(option, wanted, exactOnly = false) {
    const targets = optionTargets(wanted);
    if (!targets.length) return false;
    const text = normalize(option?.textContent);
    const value = normalize(option?.value);
    return targets.some((target) => {
      if (text === target || value === target) return true;
      if (exactOnly || strictDropdownTarget(target)) return false;
      return text.includes(target) || value.includes(target);
    });
  }

  function strictDropdownTarget(target) {
    return target === "FRAUDE"
      || target === "NAO FRAUDE"
      || target.startsWith("NAO FOI POSSIVEL CONFIRMAR");
  }

  function findOption(select, wanted) {
    const options = optionsOf(select);
    return options.find((option) => optionMatches(option, wanted, true))
      || options.find((option) => optionMatches(option, wanted, false))
      || null;
  }

  function refreshSelect(select, option) {
    select.dispatchEvent(new Event("input", { bubbles: true }));
    select.dispatchEvent(new Event("change", { bubbles: true }));
    try {
      if (window.jQuery?.fn?.selectpicker) {
        window.jQuery(select)
          .selectpicker("val", option.value)
          .selectpicker("render")
          .selectpicker("refresh")
          .trigger("changed.bs.select")
          .trigger("change");
      }
    } catch (_error) {}
  }

  function selectNow(id, wanted) {
    const select = document.getElementById(id);
    const option = findOption(select, wanted);
    if (!select || !option) return false;
    const current = select.options?.[select.selectedIndex];
    if (current && optionMatches(current, wanted, true)) return true;
    optionsOf(select).forEach((item) => { item.selected = false; });
    option.selected = true;
    const index = optionsOf(select).indexOf(option);
    if (index >= 0) select.selectedIndex = index;
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
    if (setter) setter.call(select, option.value);
    else select.value = option.value;
    refreshSelect(select, option);
    const selected = select.options?.[select.selectedIndex];
    return Boolean(selected && optionMatches(selected, wanted, true));
  }

  function selectionMatches(id, wanted) {
    const select = document.getElementById(id);
    const selected = select?.options?.[select.selectedIndex];
    return Boolean(selected && (optionMatches(selected, wanted, true) || optionMatches(selected, wanted, false)));
  }

  function fieldValue(element) {
    return String(element?.value ?? "").trim();
  }

  function compactValue(value) {
    return normalize(value).replace(/[^0-9A-Z]/g, "");
  }

  function valueMatches(element, wanted) {
    const current = fieldValue(element);
    const expected = String(wanted ?? "").trim();
    if (current === expected) return true;
    return compactValue(current) === compactValue(expected);
  }

  function setNativeValue(element, value) {
    if (!element) return false;
    const text = String(value ?? "");
    try {
      const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
      if (descriptor?.set) descriptor.set.call(element, text);
      else element.value = text;
    } catch (_error) {
      element.value = text;
    }
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    try {
      if (/_dctxt$/i.test(element.id || "") && typeof window.setValue === "function") {
        window.setValue(element.id, element.id.replace("_dctxt", "_dchdn"));
      }
      if (typeof window.setDirty === "function") window.setDirty();
    } catch (_error) {}
    return valueMatches(element, text);
  }

  function findTargets(targets) {
    return (Array.isArray(targets) ? targets : [targets]).flatMap((target) => {
      if (!target) return [];
      if (target.id) {
        const element = document.getElementById(target.id);
        return element ? [element] : [];
      }
      if (target.name) {
        return all(`[name="${String(target.name).replace(/"/g, '\\"')}"]`);
      }
      if (target.pattern) {
        return all(target.selector || "input,textarea,select").filter((element) =>
          target.pattern.test(`${element.id || ""} ${element.name || ""} ${element.placeholder || ""}`));
      }
      return [];
    });
  }

  function fillNow(targets, value) {
    const elements = findTargets(targets).filter((element) => element && !element.disabled && !element.readOnly);
    for (const element of elements) {
      if (setNativeValue(element, value)) return true;
    }
    return elements.some((element) => valueMatches(element, value));
  }

  function validateField(field) {
    if (!field || field.optional) return true;
    if (field.type === "select") return selectionMatches(field.id, field.value);
    const elements = findTargets(field.targets || { id: field.id });
    return elements.some((element) => valueMatches(element, field.value));
  }

  async function applyMap(fields, options = {}) {
    const wait = options.wait || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    const isActive = options.isActive || (() => true);
    const pending = [];
    const addPending = (field) => {
      const label = field?.label || field?.id || "Campo";
      if (!pending.includes(label)) pending.push(label);
    };
    for (const field of fields || []) {
      if (!isActive()) return { ok: false, pending, cancelled: true };
      if (!field || field.optional || String(field.value ?? "").trim() === "") continue;
      let applied = false;
      if (field.type === "select") {
        applied = selectNow(field.id, field.value);
        if (!applied && field.alternateId) applied = selectNow(field.alternateId, field.value);
      } else {
        applied = fillNow(field.targets || { id: field.id }, field.value);
      }
      if (!applied) {
        for (let attempt = 0; attempt < Number(field.tries || 4); attempt += 1) {
          if (!isActive()) return { ok: false, pending, cancelled: true };
          await wait(Number(field.delay || 12));
          applied = field.type === "select"
            ? selectNow(field.id, field.value)
            : fillNow(field.targets || { id: field.id }, field.value);
          if (applied) break;
        }
      }
      await wait(Number(field.confirmDelay || 8));
      if (!validateField(field)) addPending(field);
    }
    return { ok: pending.length === 0, pending };
  }

  window.SACTabulatorV11 = Object.freeze({
    selectNow,
    selectionMatches,
    fillNow,
    validateField,
    applyMap
  });
})();

