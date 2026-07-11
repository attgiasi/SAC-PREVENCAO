(function SACTabulatorV9Factory() {
  "use strict";

  if (window.SACTabulatorV9) return;

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
    optionsOf(select).forEach((item) => { item.selected = false; });
    option.selected = true;
    const index = optionsOf(select).indexOf(option);
    if (index >= 0) select.selectedIndex = index;
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
    if (setter) setter.call(select, option.value);
    else select.value = option.value;
    refreshSelect(select, option);
    option.selected = true;
    if (index >= 0) select.selectedIndex = index;
    if (setter) setter.call(select, option.value);
    else select.value = option.value;
    const selected = select.options?.[select.selectedIndex];
    return Boolean(selected && optionMatches(selected, wanted, true));
  }

  function waitAndSelect(id, wanted, timeoutMs = 10000) {
    if (selectNow(id, wanted)) return Promise.resolve(true);
    return new Promise((resolve) => {
      let finished = false;
      const finish = (result) => {
        if (finished) return;
        finished = true;
        observer.disconnect();
        clearInterval(interval);
        clearTimeout(timeout);
        resolve(result);
      };
      const attempt = () => {
        if (selectNow(id, wanted)) finish(true);
      };
      const observer = new MutationObserver(attempt);
      observer.observe(document.documentElement, { childList: true, subtree: true });
      const interval = setInterval(attempt, 80);
      const timeout = setTimeout(() => finish(false), timeoutMs);
      attempt();
    });
  }

  window.SACTabulatorV9 = Object.freeze({
    selectNow,
    waitAndSelect
  });
})();

