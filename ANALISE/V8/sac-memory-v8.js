(function SacMemoryV8Factory() {
  "use strict";

  if (window.SACMemoryV8) return;

  const TYPE = "web application/x-sac-prevencao-memory";
  const BOOT_KEY = "__SAC_PREVENCAO_SHARED_MEMORY__";
  const HISTORY_KEY = "sac_prevencao_v8:history";
  const LISTS_KEY = "sac_prevencao_v8:lists";
  const TRANSPORT_KEY = "sac_prevencao_v8:transport";
  const WINDOW_NAME_KEY = "__SAC_PREVENCAO_V8_MEMORY__=";
  const TTL_MS = 12 * 60 * 60 * 1000;
  const MAX_LISTS = 300;
  const MAX_HISTORY = 60;

  const now = () => Date.now();
  const validAge = (item) => item && now() - Number(item.savedAt || 0) < TTL_MS;
  const normalizeText = (value) => String(value ?? "").trim();
  const identity = (item) => `${normalizeText(item?.caseNumber)}:${normalizeText(item?.account)}`;
  const redactDocuments = (value) => String(value || "")
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "[CPF protegido]")
    .replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, "[CNPJ protegido]");

  function readJson(storage, key, fallback) {
    try {
      const value = JSON.parse(storage.getItem(key) || "null");
      return value ?? fallback;
    } catch (_error) {
      return fallback;
    }
  }

  function writeJson(storage, key, value) {
    try {
      storage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_error) {
      return false;
    }
  }

  function storageOf(name) {
    try { return window[name]; } catch (_error) { return null; }
  }

  function readWindowNameMemory() {
    try {
      const name = String(window.name || "");
      const index = name.indexOf(WINDOW_NAME_KEY);
      if (index < 0) return normalizeMemory(null);
      const encoded = name.slice(index + WINDOW_NAME_KEY.length).split("\n")[0];
      return normalizeMemory(JSON.parse(decodeURIComponent(encoded)));
    } catch (_error) {
      return normalizeMemory(null);
    }
  }

  function writeWindowNameMemory(value) {
    try {
      const name = String(window.name || "");
      const cleanName = name.includes(WINDOW_NAME_KEY)
        ? name.slice(0, name.indexOf(WINDOW_NAME_KEY)).replace(/\n+$/, "")
        : name;
      const encoded = encodeURIComponent(JSON.stringify(normalizeMemory(value)));
      window.name = `${cleanName}${cleanName ? "\n" : ""}${WINDOW_NAME_KEY}${encoded}`;
      return true;
    } catch (_error) {
      return false;
    }
  }

  function sanitizeHistory(item) {
    return {
      ...item,
      tabulation: redactDocuments(item?.tabulation || "")
    };
  }

  function normalizeMemory(value) {
    const source = value && typeof value === "object" ? value : {};
    const lists = Array.isArray(source.lists) ? source.lists.filter(validAge).slice(0, MAX_LISTS) : [];
    const history = Array.isArray(source.history)
      ? source.history.filter(validAge).map(sanitizeHistory).slice(0, MAX_HISTORY)
      : [];
    const transport = source.transport && typeof source.transport === "object" ? source.transport : {};
    return {
      schema: 1,
      savedAt: Number(source.savedAt || 0),
      transport,
      lists,
      history
    };
  }

  function mergeHistory(...groups) {
    const byIdentity = new Map();
    groups.flat().filter(validAge).map(sanitizeHistory).forEach((item) => {
      const key = identity(item) || item.id;
      const previous = byIdentity.get(key);
      if (!previous || Number(item.savedAt || 0) > Number(previous.savedAt || 0)) {
        byIdentity.set(key, item);
      }
    });
    return Array.from(byIdentity.values())
      .sort((a, b) => Number(b.savedAt || 0) - Number(a.savedAt || 0))
      .slice(0, MAX_HISTORY);
  }

  function mergeLists(...groups) {
    const byIdentity = new Map();
    groups.flat().filter(validAge).forEach((item) => {
      const key = item?.id || `${identity(item)}:${Boolean(item?.lists?.allowlist)}:${Boolean(item?.lists?.contencao)}`;
      const previous = byIdentity.get(key);
      if (!previous || Number(item.savedAt || 0) > Number(previous.savedAt || 0)) {
        byIdentity.set(key, item);
      }
    });
    return Array.from(byIdentity.values())
      .sort((a, b) => Number(b.savedAt || 0) - Number(a.savedAt || 0))
      .slice(0, MAX_LISTS);
  }

  const localStore = storageOf("localStorage");
  const sessionStore = storageOf("sessionStorage");
  const localHistory = localStore ? readJson(localStore, HISTORY_KEY, []) : [];
  const localLists = localStore ? readJson(localStore, LISTS_KEY, []) : [];
  const localTransport = sessionStore ? readJson(sessionStore, TRANSPORT_KEY, {}) : {};
  const bootMemory = window[BOOT_KEY];
  const windowNameMemory = readWindowNameMemory();
  let memory = normalizeMemory(bootMemory);
  memory.history = mergeHistory(memory.history, localHistory, windowNameMemory.history);
  memory.lists = mergeLists(memory.lists, localLists, windowNameMemory.lists);
  memory.transport = { ...localTransport, ...windowNameMemory.transport, ...memory.transport };
  window[BOOT_KEY] = memory;

  function persistMirrors() {
    if (localStore) writeJson(localStore, HISTORY_KEY, memory.history.map(sanitizeHistory));
    if (localStore) writeJson(localStore, LISTS_KEY, memory.lists);
    if (sessionStore) writeJson(sessionStore, TRANSPORT_KEY, memory.transport);
    writeWindowNameMemory(memory);
    window[BOOT_KEY] = memory;
  }

  function snapshot() {
    return normalizeMemory(memory);
  }

  function setSnapshot(next) {
    memory = normalizeMemory(next);
    memory.savedAt = now();
    persistMirrors();
    return snapshot();
  }

  function mergeCurrentMirrors() {
    const localHistoryNow = localStore ? readJson(localStore, HISTORY_KEY, []) : [];
    const localListsNow = localStore ? readJson(localStore, LISTS_KEY, []) : [];
    const localTransportNow = sessionStore ? readJson(sessionStore, TRANSPORT_KEY, {}) : {};
    const windowNameNow = readWindowNameMemory();
    memory.history = mergeHistory(memory.history, localHistoryNow, windowNameNow.history);
    memory.lists = mergeLists(memory.lists, localListsNow, windowNameNow.lists);
    memory.transport = { ...localTransportNow, ...windowNameNow.transport, ...memory.transport };
    memory.savedAt = now();
    persistMirrors();
    return snapshot();
  }

  async function hydrateFromClipboard() {
    mergeCurrentMirrors();
    if (!navigator.clipboard?.read) return snapshot();
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        if (!item.types.includes(TYPE)) continue;
        const blob = await item.getType(TYPE);
        const incoming = normalizeMemory(JSON.parse(await blob.text()));
        incoming.history = mergeHistory(incoming.history, memory.history);
        incoming.lists = mergeLists(incoming.lists, memory.lists);
        incoming.transport = { ...memory.transport, ...incoming.transport };
        return setSnapshot(incoming);
      }
    } catch (_error) {}
    return snapshot();
  }

  async function commit(text = "") {
    memory.savedAt = now();
    persistMirrors();
    if (navigator.clipboard?.write && window.ClipboardItem) {
      try {
        const payload = JSON.stringify(memory);
        await navigator.clipboard.write([new ClipboardItem({
          "text/plain": new Blob([String(text ?? "")], { type: "text/plain" }),
          [TYPE]: new Blob([payload], { type: TYPE })
        })]);
        return { textCopied: true, memoryCopied: true };
      } catch (_error) {}
    }
    try {
      await navigator.clipboard.writeText(String(text ?? ""));
      return { textCopied: true, memoryCopied: false };
    } catch (_error) {
      return { textCopied: false, memoryCopied: false };
    }
  }

  async function commitCurrentText() {
    let text = "";
    try { text = await navigator.clipboard.readText(); } catch (_error) {}
    return commit(text);
  }

  const transport = {
    get(stage) {
      const item = memory.transport?.[stage];
      return validAge(item) ? item : null;
    },
    set(stage, value) {
      memory.transport = { ...memory.transport, [stage]: value };
      memory.savedAt = now();
      persistMirrors();
      return value;
    },
    clear(stage) {
      const next = { ...memory.transport };
      delete next[stage];
      memory.transport = next;
      persistMirrors();
    }
  };

  const lists = {
    all() {
      memory.lists = mergeLists(memory.lists);
      persistMirrors();
      return memory.lists.map((item) => ({ ...item }));
    },
    replace(items) {
      memory.lists = mergeLists(Array.isArray(items) ? items : []);
      memory.savedAt = now();
      persistMirrors();
      return this.all();
    }
  };

  const history = {
    all() {
      memory.history = mergeHistory(memory.history);
      persistMirrors();
      return memory.history.map((item) => ({ ...item }));
    },
    replace(items) {
      memory.history = mergeHistory(Array.isArray(items) ? items : []);
      persistMirrors();
      return this.all();
    },
    upsert(item) {
      memory.history = mergeHistory([sanitizeHistory(item)], memory.history);
      persistMirrors();
      return this.all();
    }
  };

  window.SACMemoryV8 = Object.freeze({
    type: TYPE,
    bootKey: BOOT_KEY,
    hydrateFromClipboard,
    mergeCurrentMirrors,
    snapshot,
    setSnapshot,
    commit,
    commitCurrentText,
    transport,
    lists,
    history,
    redactDocuments
  });
})();
