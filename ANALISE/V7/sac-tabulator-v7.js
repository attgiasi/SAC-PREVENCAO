(function SacTabulatorV7Factory() {
  "use strict";

  if (window.SACTabulatorV7) return;

  const normalize = (value) => String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();

  function optionsOf(select) {
    return Array.from(select?.options || []);
  }

  function findOption(select, wanted) {
    const target = normalize(wanted);
    if (!target) return null;
    const options = optionsOf(select);
    return options.find((option) => {
      const text = normalize(option.textContent);
      const value = normalize(option.value);
      return text === target || value === target;
    }) || options.find((option) => {
      const text = normalize(option.textContent);
      const value = normalize(option.value);
      return text.includes(target) || value.includes(target);
    }) || null;
  }

  function refreshSelect(select, value) {
    select.dispatchEvent(new Event("input", { bubbles: true }));
    select.dispatchEvent(new Event("change", { bubbles: true }));
    try {
      if (window.jQuery?.fn?.selectpicker) {
        window.jQuery(select)
          .selectpicker("val", value)
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
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
    if (setter) setter.call(select, option.value);
    else select.value = option.value;
    refreshSelect(select, option.value);
    const selected = select.options?.[select.selectedIndex];
    return Boolean(selected && findOption({ options: [selected] }, wanted));
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

  window.SACTabulatorV7 = Object.freeze({
    selectNow,
    waitAndSelect
  });
})();
