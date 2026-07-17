(function SACMemoryV11Factory() {
  "use strict";

  if (window.SACMemoryV11) return;

  const TYPE = "web application/x-sac-prevencao-memory";
  const HTML_TYPE = "text/html";
  const HTML_MARKER = "SAC_PREVENCAO_MEMORY_V11";
  const BOOT_KEY = "__SAC_PREVENCAO_SHARED_MEMORY__";
  const STATE_KEY = "sac_prevencao_V11:state";
  const STATE_SESSION_KEY = "sac_prevencao_V11:state_session";
  const HISTORY_KEY = "sac_prevencao_V11:history";
  const LISTS_KEY = "sac_prevencao_V11:lists";
  const LISTS_VAULT_KEY = "sac_prevencao_V11:lists_vault";
  const LIST_TOMBSTONES_KEY = "sac_prevencao_V11:list_tombstones";
  const SETTINGS_KEY = "sac_prevencao_V11:settings";
  const TRANSPORT_KEY = "sac_prevencao_V11:transport";
  const WINDOW_NAME_KEY = "__SAC_PREVENCAO_V11_MEMORY__=";
  const TTL_MS = 12 * 60 * 60 * 1000;
  const MAX_LISTS = 300;
  const MAX_HISTORY = 60;
  const MAX_TOMBSTONES = 800;

  const now = () => Date.now();
  const validAge = (item) => item && now() - Number(item.savedAt || 0) < TTL_MS;
  const itemStamp = (item) => Math.max(Number(item?.updatedAt || 0), Number(item?.appliedAt || 0), Number(item?.savedAt || 0));
  const normalizeText = (value) => String(value ?? "").trim();
  const identityPart = (value) => {
    const normalized = normalizeText(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^0-9a-z]/gi, "")
      .toUpperCase();
    return ["", "NA", "NULO", "NULL", "UNDEFINED", "AUSENCIADEDADOS"].includes(normalized) ? "" : normalized;
  };
  const identity = (item) => {
    const caseNumber = identityPart(item?.caseNumber);
    const account = identityPart(item?.account);
    const documentValue = identityPart(item?.documentValue || item?.document || item?.cpfCnpj);
    const issuer = identityPart(item?.issuer);
    return caseNumber || account || documentValue || issuer ? `${caseNumber}:${account}:${documentValue}:${issuer}` : "";
  };
  const normalizedListType = (listType) => normalizeText(listType).toLowerCase() === "contencao" ? "contencao" : "allowlist";
  const listBaseIdentity = (item, listType = "allowlist") => {
    const type = normalizedListType(listType);
    const caseNumber = identityPart(item?.caseNumber);
    const subject = type === "contencao"
      ? identityPart(item?.documentValue || item?.document || item?.cpfCnpj)
      : identityPart(item?.account);
    if (caseNumber || subject) return `${type.toUpperCase()}:${caseNumber}:${subject}`;
    return identity(item) || normalizeText(item?.id);
  };
  const listIdentity = (item, listType = "allowlist") => listBaseIdentity(item, listType);
  const legacyListIdentity = (item, listType = "") => `${identity(item) || item?.id || ""}:${normalizeText(listType)}`;
  const caseOnlyListIdentity = (item, listType = "") => {
    const caseNumber = identityPart(item?.caseNumber);
    return caseNumber ? `CASE:${caseNumber}:${normalizeText(listType)}` : "";
  };
  const listIdentityAliases = (item, listType = "") => Array.from(new Set([
    listIdentity(item, listType),
    caseOnlyListIdentity(item, listType),
    legacyListIdentity(item, listType)
  ].filter(Boolean)));
  const redactDocuments = (value) => String(value || "")
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "[CPF protegido]")
    .replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, "[CNPJ protegido]");
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));

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
      const cleanName = String(window.name || "")
        .split("\n")
        .filter((line) => !line.startsWith(WINDOW_NAME_KEY))
        .join("\n")
        .replace(/\n+$/, "");
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

  function normalizeSettings(value) {
    const source = value && typeof value === "object" ? value : {};
    return Object.fromEntries(Object.entries(source)
      .map(([name, entry]) => {
        const next = entry && typeof entry === "object" && "value" in entry
          ? { value: String(entry.value ?? ""), updatedAt: Number(entry.updatedAt || 0) }
          : { value: String(entry ?? ""), updatedAt: 0 };
        return [name, next];
      }));
  }

  function normalizeTombstones(value) {
    const source = Array.isArray(value) ? value : [];
    return source
      .map((item) => ({
        key: normalizeText(item?.key),
        itemId: normalizeText(item?.itemId),
        removedAt: Number(item?.removedAt || item?.savedAt || 0)
      }))
      .filter((item) => item.key && validAge({ savedAt: item.removedAt }))
      .sort((a, b) => Number(b.removedAt || 0) - Number(a.removedAt || 0))
      .slice(0, MAX_TOMBSTONES);
  }

  function normalizeMemory(value) {
    const source = value && typeof value === "object" ? value : {};
    const lists = Array.isArray(source.lists) ? source.lists.filter(validAge).slice(0, MAX_LISTS) : [];
    const listsVault = Array.isArray(source.listsVault) ? source.listsVault.filter(validAge).slice(0, MAX_LISTS) : [];
    const listTombstones = normalizeTombstones(source.listTombstones);
    const history = Array.isArray(source.history)
      ? source.history.filter(validAge).map(sanitizeHistory).slice(0, MAX_HISTORY)
      : [];
    const transport = source.transport && typeof source.transport === "object" ? source.transport : {};
    const settings = normalizeSettings(source.settings);
    return {
      schema: 1,
      savedAt: Number(source.savedAt || 0),
      transport,
      settings,
      listTombstones,
      listsVault,
      lists,
      history
    };
  }

  function mergeSettings(...groups) {
    const merged = {};
    groups.forEach((group) => {
      Object.entries(normalizeSettings(group)).forEach(([name, entry]) => {
        if (!merged[name] || Number(entry.updatedAt || 0) >= Number(merged[name].updatedAt || 0)) {
          merged[name] = entry;
        }
      });
    });
    return merged;
  }

  function mergeTombstones(...groups) {
    const byKey = new Map();
    groups.flatMap(normalizeTombstones).forEach((item) => {
      const previous = byKey.get(item.key);
      if (!previous || Number(item.removedAt || 0) >= Number(previous.removedAt || 0)) {
        byKey.set(item.key, item);
      }
    });
    return Array.from(byKey.values())
      .sort((a, b) => Number(b.removedAt || 0) - Number(a.removedAt || 0))
      .slice(0, MAX_TOMBSTONES);
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

  function tombstoneMap(tombstones) {
    const map = new Map();
    normalizeTombstones(tombstones).forEach((item) => map.set(item.key, item));
    return map;
  }

  function applyListTombstones(item, tombstones) {
    const next = {
      ...item,
      applied: { ...(item?.applied || {}) }
    };
    const stamp = itemStamp(next);
    const removals = tombstoneMap(tombstones);
    ["allowlist", "contencao"].forEach((listType) => {
      if (!next.lists?.[listType]) return;
      const removal = listIdentityAliases(next, listType)
        .map((key) => removals.get(key))
        .filter(Boolean)
        .sort((a, b) => Number(b.removedAt || 0) - Number(a.removedAt || 0))[0];
      const removedAt = Number(removal?.removedAt || 0);
      if (removedAt >= stamp) {
        next.applied[listType] = true;
      }
    });
    return next;
  }

  function hasPendingList(item) {
    return Boolean((item?.lists?.allowlist && !item?.applied?.allowlist) || (item?.lists?.contencao && !item?.applied?.contencao));
  }

  function splitPendingListEntries(item) {
    return ["allowlist", "contencao"].flatMap((listType) => {
      if (!item?.lists?.[listType] || item?.applied?.[listType]) return [];
      return [{
        ...item,
        id: `${normalizeText(item?.id) || listBaseIdentity(item, listType)}:${listType}`,
        lists: { allowlist: listType === "allowlist", contencao: listType === "contencao" },
        applied: { allowlist: listType !== "allowlist", contencao: listType !== "contencao" }
      }];
    });
  }

  function mergeLists(...groups) {
    const tombstones = memory?.listTombstones || [];
    const byIdentity = new Map();
    groups.flat().filter(validAge).forEach((item) => {
      const normalizedItem = applyListTombstones(item, tombstones);
      if (!hasPendingList(normalizedItem)) return;
      splitPendingListEntries(normalizedItem).forEach((entry) => {
        const listType = entry.lists?.contencao ? "contencao" : "allowlist";
        const key = listBaseIdentity(entry, listType) || entry.id;
        const previous = byIdentity.get(key);
        if (!previous || itemStamp(entry) >= itemStamp(previous)) byIdentity.set(key, entry);
      });
    });
    return Array.from(byIdentity.values())
      .sort((a, b) => itemStamp(b) - itemStamp(a))
      .slice(0, MAX_LISTS);
  }

  const localStore = storageOf("localStorage");
  const sessionStore = storageOf("sessionStorage");
  const localState = localStore ? readJson(localStore, STATE_KEY, null) : null;
  const sessionState = sessionStore ? readJson(sessionStore, STATE_SESSION_KEY, null) : null;
  const localHistory = localStore ? readJson(localStore, HISTORY_KEY, []) : [];
  const localLists = localStore ? readJson(localStore, LISTS_KEY, []) : [];
  const localListsVault = localStore ? readJson(localStore, LISTS_VAULT_KEY, []) : [];
  const sessionListsVault = sessionStore ? readJson(sessionStore, LISTS_VAULT_KEY, []) : [];
  const localTombstones = localStore ? readJson(localStore, LIST_TOMBSTONES_KEY, []) : [];
  const localSettings = localStore ? readJson(localStore, SETTINGS_KEY, {}) : {};
  const localTransport = sessionStore ? readJson(sessionStore, TRANSPORT_KEY, {}) : {};
  const bootMemory = window[BOOT_KEY];
  const windowNameMemory = readWindowNameMemory();
  let memory = normalizeMemory(localState || sessionState || bootMemory);
  const localStateMemory = normalizeMemory(localState);
  const sessionStateMemory = normalizeMemory(sessionState);
  memory.listTombstones = mergeTombstones(memory.listTombstones, localStateMemory.listTombstones, sessionStateMemory.listTombstones, localTombstones, windowNameMemory.listTombstones);
  memory.settings = mergeSettings(localStateMemory.settings, sessionStateMemory.settings, localSettings, windowNameMemory.settings, memory.settings);
  memory.history = mergeHistory(memory.history, localStateMemory.history, sessionStateMemory.history, localHistory, windowNameMemory.history);
  memory.listsVault = mergeLists(memory.listsVault, localStateMemory.listsVault, localStateMemory.lists, sessionStateMemory.listsVault, sessionStateMemory.lists, localListsVault, sessionListsVault, windowNameMemory.listsVault, localLists, windowNameMemory.lists);
  memory.lists = mergeLists(memory.lists, memory.listsVault, localStateMemory.lists, sessionStateMemory.lists, localLists, windowNameMemory.lists);
  memory.transport = { ...localTransport, ...localStateMemory.transport, ...sessionStateMemory.transport, ...windowNameMemory.transport, ...memory.transport };
  window[BOOT_KEY] = memory;

  function persistMirrors() {
    const stableLists = mergeLists(memory.lists);
    memory.lists = stableLists;
    memory.listsVault = stableLists;
    if (localStore) writeJson(localStore, HISTORY_KEY, memory.history.map(sanitizeHistory));
    if (localStore) writeJson(localStore, LISTS_KEY, memory.lists);
    if (localStore) writeJson(localStore, LISTS_VAULT_KEY, memory.listsVault);
    if (sessionStore) writeJson(sessionStore, LISTS_VAULT_KEY, memory.listsVault);
    if (localStore) writeJson(localStore, LIST_TOMBSTONES_KEY, memory.listTombstones);
    if (localStore) writeJson(localStore, SETTINGS_KEY, memory.settings);
    if (sessionStore) writeJson(sessionStore, TRANSPORT_KEY, memory.transport);
    if (localStore) writeJson(localStore, STATE_KEY, memory);
    if (sessionStore) writeJson(sessionStore, STATE_SESSION_KEY, memory);
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
    const localStateNow = localStore ? normalizeMemory(readJson(localStore, STATE_KEY, null)) : normalizeMemory(null);
    const sessionStateNow = sessionStore ? normalizeMemory(readJson(sessionStore, STATE_SESSION_KEY, null)) : normalizeMemory(null);
    const localListsNow = localStore ? readJson(localStore, LISTS_KEY, []) : [];
    const localListsVaultNow = localStore ? readJson(localStore, LISTS_VAULT_KEY, []) : [];
    const sessionListsVaultNow = sessionStore ? readJson(sessionStore, LISTS_VAULT_KEY, []) : [];
    const localTombstonesNow = localStore ? readJson(localStore, LIST_TOMBSTONES_KEY, []) : [];
    const localSettingsNow = localStore ? readJson(localStore, SETTINGS_KEY, {}) : {};
    const localTransportNow = sessionStore ? readJson(sessionStore, TRANSPORT_KEY, {}) : {};
    const windowNameNow = readWindowNameMemory();
    memory.listTombstones = mergeTombstones(memory.listTombstones, localStateNow.listTombstones, sessionStateNow.listTombstones, localTombstonesNow, windowNameNow.listTombstones);
    memory.settings = mergeSettings(localStateNow.settings, sessionStateNow.settings, localSettingsNow, windowNameNow.settings, memory.settings);
    memory.history = mergeHistory(memory.history, localStateNow.history, sessionStateNow.history, localHistoryNow, windowNameNow.history);
    memory.listsVault = mergeLists(memory.listsVault, localStateNow.listsVault, localStateNow.lists, sessionStateNow.listsVault, sessionStateNow.lists, localListsVaultNow, sessionListsVaultNow, windowNameNow.listsVault, localListsNow, windowNameNow.lists);
    memory.lists = mergeLists(memory.lists, memory.listsVault, localStateNow.lists, sessionStateNow.lists, localListsNow, windowNameNow.lists);
    memory.transport = { ...localTransportNow, ...localStateNow.transport, ...sessionStateNow.transport, ...windowNameNow.transport, ...memory.transport };
    memory.savedAt = now();
    persistMirrors();
    return snapshot();
  }

  function encodeMemoryPayload(value = memory) {
    return encodeURIComponent(JSON.stringify(normalizeMemory(value)));
  }

  function htmlClipboardPayload(text = "") {
    return `<div>${escapeHtml(String(text ?? "")).replace(/\n/g, "<br>")}</div><!--${HTML_MARKER}:${encodeMemoryPayload()}-->`;
  }

  function copyEnvelopeSynchronously(plain, html) {
    if (typeof document === "undefined" || typeof document.execCommand !== "function") return false;
    const onCopy = (event) => {
      if (!event.clipboardData) return;
      event.clipboardData.setData("text/plain", plain);
      event.clipboardData.setData(HTML_TYPE, html);
      event.preventDefault();
    };
    document.addEventListener("copy", onCopy, { once: true });
    try {
      const copied = document.execCommand("copy");
      if (!copied) document.removeEventListener("copy", onCopy);
      return copied;
    } catch (_error) {
      document.removeEventListener("copy", onCopy);
      return false;
    }
  }

  function memoryFromHtml(html) {
    try {
      const match = String(html || "").match(new RegExp(`<!--${HTML_MARKER}:([^]+?)-->`));
      return match ? normalizeMemory(JSON.parse(decodeURIComponent(match[1]))) : null;
    } catch (_error) {
      return null;
    }
  }

  function mergeIncomingMemory(incoming) {
    const next = normalizeMemory(incoming);
    next.listTombstones = mergeTombstones(next.listTombstones, memory.listTombstones);
    next.settings = mergeSettings(memory.settings, next.settings);
    next.history = mergeHistory(next.history, memory.history);
    memory.listTombstones = next.listTombstones;
    memory.settings = next.settings;
    next.listsVault = mergeLists(next.listsVault, next.lists, memory.listsVault, memory.lists);
    next.lists = mergeLists(next.lists, next.listsVault, memory.lists, memory.listsVault);
    next.transport = { ...memory.transport, ...next.transport };
    return setSnapshot(next);
  }

  async function hydrateFromClipboard() {
    mergeCurrentMirrors();
    if (!navigator.clipboard?.read) return snapshot();
    let items = [];
    try {
      items = await navigator.clipboard.read();
    } catch (_error) {
      return snapshot();
    }
    for (const item of items) {
      if (item.types.includes(TYPE)) {
        try {
          const blob = await item.getType(TYPE);
          return mergeIncomingMemory(JSON.parse(await blob.text()));
        } catch (_error) {}
      }
      if (item.types.includes(HTML_TYPE)) {
        try {
          const blob = await item.getType(HTML_TYPE);
          const incoming = memoryFromHtml(await blob.text());
          if (incoming) return mergeIncomingMemory(incoming);
        } catch (_error) {}
      }
    }
    return snapshot();
  }

  async function commit(text = "") {
    memory.savedAt = now();
    persistMirrors();
    const plain = String(text ?? "");
    const html = htmlClipboardPayload(plain);
    if (copyEnvelopeSynchronously(plain, html)) {
      return { textCopied: true, memoryCopied: true, method: "copy-event" };
    }
    if (navigator.clipboard?.write && window.ClipboardItem) {
      try {
        await navigator.clipboard.write([new ClipboardItem({
          "text/plain": new Blob([plain], { type: "text/plain" }),
          [HTML_TYPE]: new Blob([html], { type: HTML_TYPE })
        })]);
        return { textCopied: true, memoryCopied: true, method: "clipboard-html" };
      } catch (_error) {}
    }
    try {
      await navigator.clipboard.writeText(plain);
      return { textCopied: true, memoryCopied: false, method: "clipboard-text" };
    } catch (_error) {
      return { textCopied: false, memoryCopied: false, method: "unavailable" };
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
      mergeCurrentMirrors();
      memory.lists = mergeLists(memory.lists);
      memory.listsVault = memory.lists;
      persistMirrors();
      return memory.lists.map((item) => ({ ...item }));
    },
    key(item, listType = "") {
      return listIdentity(item, listType);
    },
    upsert(item) {
      const nextItem = {
        ...item,
        savedAt: Number(item?.savedAt || now()),
        updatedAt: now()
      };
      memory.lists = mergeLists([nextItem], memory.lists, memory.listsVault);
      memory.listsVault = memory.lists;
      memory.savedAt = now();
      persistMirrors();
      return this.all();
    },
    replace(items) {
      mergeCurrentMirrors();
      memory.lists = mergeLists(Array.isArray(items) ? items : []);
      memory.listsVault = memory.lists;
      memory.savedAt = now();
      persistMirrors();
      return this.all();
    },
    markDone(item, listType) {
      mergeCurrentMirrors();
      const baseIdentity = listBaseIdentity(item, listType) || item?.id || "";
      const keys = listIdentityAliases(item, listType);
      if (baseIdentity && listType) {
        const removedAt = Math.max(now(), itemStamp(item) + 1);
        memory.listTombstones = mergeTombstones(
          keys.map((key) => ({ key, itemId: normalizeText(item?.id), removedAt })),
          memory.listTombstones
        );
      }
      const changedAt = Math.max(now(), itemStamp(item) + 1);
      const marked = memory.lists.map((entry) => {
        if ((listBaseIdentity(entry, listType) || entry.id) !== baseIdentity) return entry;
        return {
          ...entry,
          applied: { ...(entry.applied || {}), [listType]: true },
          updatedAt: changedAt,
          appliedAt: changedAt,
          savedAt: changedAt
        };
      });
      memory.lists = mergeLists(marked);
      memory.listsVault = memory.lists;
      persistMirrors();
      return this.all();
    },
    tombstones() {
      return memory.listTombstones.map((item) => ({ ...item }));
    }
  };

  const settings = {
    get(name) {
      mergeCurrentMirrors();
      return String(memory.settings?.[name]?.value ?? "");
    },
    set(name, value) {
      memory.settings = mergeSettings(memory.settings, { [name]: { value: String(value ?? ""), updatedAt: now() } });
      memory.savedAt = now();
      persistMirrors();
      return String(value ?? "");
    },
    remove(name) {
      const next = { ...(memory.settings || {}) };
      delete next[name];
      memory.settings = next;
      memory.savedAt = now();
      persistMirrors();
      return true;
    },
    all() {
      mergeCurrentMirrors();
      return Object.fromEntries(Object.entries(memory.settings || {}).map(([name, entry]) => [name, String(entry.value ?? "")]));
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

  const state = {
    get() {
      return mergeCurrentMirrors();
    },
    update(mutator) {
      mergeCurrentMirrors();
      const draft = snapshot();
      const result = typeof mutator === "function" ? mutator(draft) : mutator;
      const next = result && typeof result === "object" ? result : draft;
      return setSnapshot(next);
    },
    merge(incoming) {
      return mergeIncomingMemory(incoming);
    }
  };

  window.SACMemoryV11 = Object.freeze({
    type: TYPE,
    bootKey: BOOT_KEY,
    hydrateFromClipboard,
    mergeCurrentMirrors,
    mergeSnapshot: mergeIncomingMemory,
    snapshot,
    setSnapshot,
    commit,
    commitCurrentText,
    transport,
    state,
    lists,
    settings,
    history,
    redactDocuments
  });
})();

