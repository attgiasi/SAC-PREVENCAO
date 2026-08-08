(function SACMemoryV12Factory() {
  "use strict";

  if (window.SACMemoryV12) return;

  const HTML_TYPE = "text/html";
  const HTML_MARKER = "SAC_PREVENCAO_MEMORY_V12";
  const BOOT_KEY = "__SAC_PREVENCAO_V12_SHARED_MEMORY__";
  const HISTORY_KEY = "sac_prevencao_V12:history";
  const LISTS_VAULT_KEY = "sac_prevencao_V12:lists_vault";
  const LIST_TOMBSTONES_KEY = "sac_prevencao_V12:list_tombstones";
  const SETTINGS_KEY = "sac_prevencao_V12:settings";
  const TRANSPORT_KEY = "sac_prevencao_V12:transport";
  const WINDOW_NAME_KEY = "__SAC_PREVENCAO_V12_MEMORY__=";
  const TTL_MS = 12 * 60 * 60 * 1000;
  const TRANSPORT_STAGES = new Set(["falcon", "console", "mediaRequest", "mediaResult"]);
  const LIST_TYPES = Object.freeze(["allowlist", "contencao", "cashout"]);
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
  const normalizedListType = (listType) => {
    const normalized = normalizeText(listType).toLowerCase();
    return LIST_TYPES.includes(normalized) ? normalized : "allowlist";
  };
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
  const compositeListIdentityAlias = (item, listType = "") => `${identity(item) || item?.id || ""}:${normalizeText(listType)}`;
  const caseOnlyListIdentity = (item, listType = "") => {
    const caseNumber = identityPart(item?.caseNumber);
    return caseNumber ? `CASE:${caseNumber}:${normalizeText(listType)}` : "";
  };
  const listIdentityAliases = (item, listType = "") => Array.from(new Set([
    listIdentity(item, listType),
    caseOnlyListIdentity(item, listType),
    compositeListIdentityAlias(item, listType)
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
      const encoded = encodeURIComponent(JSON.stringify(portableMemory(value)));
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

  function normalizeTransport(value) {
    const source = value && typeof value === "object" ? value : {};
    return Object.fromEntries(Object.entries(source).filter(([stage, item]) => (
      TRANSPORT_STAGES.has(stage) && validAge(item)
    )));
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
    const transport = normalizeTransport(source.transport);
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

  function mergeTransport(...groups) {
    const merged = {};
    groups.forEach((group) => {
      Object.entries(normalizeTransport(group)).forEach(([stage, item]) => {
        const previous = merged[stage];
        if (!previous || Number(item.savedAt || 0) >= Number(previous.savedAt || 0)) {
          merged[stage] = item;
        }
      });
    });
    return normalizeTransport(merged);
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
      const key = normalizeText(item.id) || identity(item);
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
    const removals = tombstones instanceof Map ? tombstones : tombstoneMap(tombstones);
    LIST_TYPES.forEach((listType) => {
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
    return LIST_TYPES.some((listType) => item?.lists?.[listType] && !item?.applied?.[listType]);
  }

  function splitPendingListEntries(item) {
    return LIST_TYPES.flatMap((listType) => {
      if (!item?.lists?.[listType] || item?.applied?.[listType]) return [];
      const stableId = (normalizeText(item?.id) || listBaseIdentity(item, listType)).replace(/:(allowlist|contencao|cashout)$/i, "");
      return [{
        ...item,
        id: `${stableId}:${listType}`,
        lists: Object.fromEntries(LIST_TYPES.map((type) => [type, type === listType])),
        applied: Object.fromEntries(LIST_TYPES.map((type) => [type, type !== listType]))
      }];
    });
  }

  function mergeLists(...groups) {
    const tombstones = memory?.listTombstones || [];
    const removals = tombstoneMap(tombstones);
    const byIdentity = new Map();
    groups.flat().filter(validAge).forEach((item) => {
      const normalizedItem = applyListTombstones(item, removals);
      if (!hasPendingList(normalizedItem)) return;
      splitPendingListEntries(normalizedItem).forEach((entry) => {
        const listType = LIST_TYPES.find((type) => entry.lists?.[type] && !entry.applied?.[type]) || "allowlist";
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
  function readStable(key, fallback) {
    const localValue = localStore ? readJson(localStore, key, null) : null;
    if (localValue !== null) return localValue;
    return sessionStore ? readJson(sessionStore, key, fallback) : fallback;
  }

  function portableMemory(value) {
    const normalized = normalizeMemory(value);
    return { ...normalized, lists: [] };
  }
  function writeStable(key, value) {
    const savedLocally = Boolean(localStore && writeJson(localStore, key, value));
    if (savedLocally) {
      try { sessionStore?.removeItem(key); } catch (_error) {}
      return true;
    }
    return Boolean(sessionStore && writeJson(sessionStore, key, value));
  }
  const localHistory = readStable(HISTORY_KEY, []);
  const localListsVault = readStable(LISTS_VAULT_KEY, []);
  const localTombstones = readStable(LIST_TOMBSTONES_KEY, []);
  const localSettings = readStable(SETTINGS_KEY, {});
  const localTransport = sessionStore ? readJson(sessionStore, TRANSPORT_KEY, {}) : {};
  const bootMemory = window[BOOT_KEY];
  const windowNameMemory = readWindowNameMemory();
  let memory = normalizeMemory(bootMemory);
  memory.listTombstones = mergeTombstones(memory.listTombstones, localTombstones, windowNameMemory.listTombstones);
  memory.settings = mergeSettings(localSettings, windowNameMemory.settings, memory.settings);
  memory.history = mergeHistory(memory.history, localHistory, windowNameMemory.history);
  memory.listsVault = mergeLists(memory.listsVault, localListsVault, windowNameMemory.listsVault, windowNameMemory.lists);
  memory.lists = mergeLists(memory.lists, memory.listsVault, windowNameMemory.lists);
  memory.transport = mergeTransport(localTransport, windowNameMemory.transport, memory.transport);
  window[BOOT_KEY] = memory;

  function persistMirrors() {
    const stableLists = mergeLists(memory.lists);
    memory.lists = stableLists;
    memory.listsVault = stableLists;
    memory.transport = normalizeTransport(memory.transport);
    writeStable(HISTORY_KEY, memory.history.map(sanitizeHistory));
    writeStable(LISTS_VAULT_KEY, memory.listsVault);
    writeStable(LIST_TOMBSTONES_KEY, memory.listTombstones);
    writeStable(SETTINGS_KEY, memory.settings);
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
    const localHistoryNow = readStable(HISTORY_KEY, []);
    const localListsVaultNow = readStable(LISTS_VAULT_KEY, []);
    const localTombstonesNow = readStable(LIST_TOMBSTONES_KEY, []);
    const localSettingsNow = readStable(SETTINGS_KEY, {});
    const localTransportNow = sessionStore ? readJson(sessionStore, TRANSPORT_KEY, {}) : {};
    const windowNameNow = readWindowNameMemory();
    memory.listTombstones = mergeTombstones(memory.listTombstones, localTombstonesNow, windowNameNow.listTombstones);
    memory.settings = mergeSettings(localSettingsNow, windowNameNow.settings, memory.settings);
    memory.history = mergeHistory(memory.history, localHistoryNow, windowNameNow.history);
    memory.listsVault = mergeLists(memory.listsVault, localListsVaultNow, windowNameNow.listsVault, windowNameNow.lists);
    memory.lists = mergeLists(memory.lists, memory.listsVault, windowNameNow.lists);
    memory.transport = mergeTransport(localTransportNow, windowNameNow.transport, memory.transport);
    return snapshot();
  }

  function mergeCurrentSettings() {
    const localSettingsNow = readStable(SETTINGS_KEY, {});
    const windowNameNow = readWindowNameMemory();
    memory.settings = mergeSettings(localSettingsNow, windowNameNow.settings, memory.settings);
    return memory.settings;
  }

  function encodeMemoryPayload(value = memory) {
    return encodeURIComponent(JSON.stringify(portableMemory(value)));
  }

  function htmlClipboardPayload(text = "") {
    return `<div>${escapeHtml(String(text ?? "")).replace(/\n/g, "<br>")}</div><!--${HTML_MARKER}:${encodeMemoryPayload()}-->`;
  }

  let internalCopyActive = false;
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
      internalCopyActive = true;
      const copied = document.execCommand("copy");
      document.removeEventListener("copy", onCopy);
      return copied;
    } catch (_error) {
      document.removeEventListener("copy", onCopy);
      return false;
    } finally {
      internalCopyActive = false;
    }
  }

  function selectedCopyText(event) {
    const existing = String(event?.clipboardData?.getData?.("text/plain") || "");
    if (existing) return existing;
    const active = document?.activeElement;
    if (active && typeof active.value === "string" && Number.isInteger(active.selectionStart) && Number.isInteger(active.selectionEnd)) {
      const selected = active.value.slice(active.selectionStart, active.selectionEnd);
      if (selected) return selected;
    }
    try { return String(window.getSelection?.().toString() || ""); }
    catch (_error) { return ""; }
  }

  function preserveCopyEvent(event) {
    if (internalCopyActive || event?.defaultPrevented || !event?.clipboardData) return false;
    const plain = selectedCopyText(event);
    if (!plain) return false;
    mergeCurrentMirrors();
    memory.savedAt = now();
    persistMirrors();
    event.clipboardData.setData("text/plain", plain);
    event.clipboardData.setData(HTML_TYPE, htmlClipboardPayload(plain));
    event.preventDefault?.();
    return true;
  }

  async function preserveProgrammaticText(text, nativeWriteText) {
    const plain = String(text ?? "");
    mergeCurrentMirrors();
    memory.savedAt = now();
    persistMirrors();
    if (navigator.clipboard?.write && window.ClipboardItem && typeof Blob === "function") {
      try {
        const html = htmlClipboardPayload(plain);
        await navigator.clipboard.write([new ClipboardItem({
          "text/plain": new Blob([plain], { type: "text/plain" }),
          [HTML_TYPE]: new Blob([html], { type: HTML_TYPE })
        })]);
        return;
      } catch (_error) {}
    }
    if (typeof nativeWriteText === "function") return nativeWriteText(plain);
    throw new Error("CLIPBOARD_WRITE_UNAVAILABLE");
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
    const incomingIsNewer = Number(next.savedAt || 0) >= Number(memory.savedAt || 0);
    next.listTombstones = mergeTombstones(next.listTombstones, memory.listTombstones);
    next.settings = mergeSettings(memory.settings, next.settings);
    next.history = mergeHistory(next.history, memory.history);
    memory.listTombstones = next.listTombstones;
    memory.settings = next.settings;
    next.listsVault = mergeLists(next.listsVault, next.lists, memory.listsVault, memory.lists);
    next.lists = mergeLists(next.lists, next.listsVault, memory.lists, memory.listsVault);
    next.transport = incomingIsNewer
      ? normalizeTransport(next.transport)
      : mergeTransport(memory.transport, next.transport);
    return setSnapshot(next);
  }

  async function hydrateFromClipboard(options = {}) {
    mergeCurrentMirrors();
    if (!navigator.clipboard?.read) return snapshot();
    const timeoutMs = Math.max(50, Number(options.timeoutMs) || 1200);
    let items = [];
    let timeout = 0;
    try {
      items = await Promise.race([
        navigator.clipboard.read(),
        new Promise((resolve) => { timeout = setTimeout(() => resolve(null), timeoutMs); })
      ]);
    } catch (_error) {
      return snapshot();
    } finally {
      clearTimeout(timeout);
    }
    if (!Array.isArray(items)) return snapshot();
    for (const item of items) {
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
    // A cópia pode acontecer em uma aba que ainda não leu a última LISTAS.
    // Reconcilie todos os espelhos antes de gerar o envelope do clipboard.
    mergeCurrentMirrors();
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

  async function commitCurrentText(options = {}) {
    if (!navigator.clipboard?.readText) {
      return { textCopied: false, memoryCopied: false, method: "read-unavailable" };
    }
    const timeoutMs = Math.max(50, Number(options.timeoutMs) || 700);
    const unavailable = Symbol("clipboard-unavailable");
    let timeout = 0;
    try {
      const text = await Promise.race([
        navigator.clipboard.readText(),
        new Promise((resolve) => { timeout = setTimeout(() => resolve(unavailable), timeoutMs); })
      ]);
      if (text === unavailable) {
        return { textCopied: false, memoryCopied: false, method: "read-timeout" };
      }
      return commit(String(text ?? ""));
    } catch (_error) {
      return { textCopied: false, memoryCopied: false, method: "read-denied" };
    } finally {
      clearTimeout(timeout);
    }
  }

  const transport = {
    get(stage) {
      mergeCurrentMirrors();
      const item = memory.transport?.[stage];
      if (validAge(item)) return item;
      if (item) this.clear(stage);
      return null;
    },
    set(stage, value) {
      if (!TRANSPORT_STAGES.has(stage)) return null;
      mergeCurrentMirrors();
      memory.transport = { ...memory.transport, [stage]: value };
      memory.savedAt = now();
      persistMirrors();
      return value;
    },
    clear(stage) {
      mergeCurrentMirrors();
      const next = { ...memory.transport };
      delete next[stage];
      memory.transport = next;
      persistMirrors();
    },
    clearAll() {
      mergeCurrentMirrors();
      memory.transport = {};
      memory.savedAt = now();
      persistMirrors();
    }
  };

  const lists = {
    all() {
      mergeCurrentMirrors();
      memory.lists = mergeLists(memory.lists, memory.listsVault);
      memory.listsVault = memory.lists;
      return memory.lists.map((item) => ({ ...item }));
    },
    key(item, listType = "") {
      return listIdentity(item, listType);
    },
    upsert(item) {
      mergeCurrentMirrors();
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
    reconcile(items) {
      mergeCurrentMirrors();
      memory.lists = mergeLists(Array.isArray(items) ? items : [], memory.lists, memory.listsVault);
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
      mergeCurrentMirrors();
      return memory.listTombstones.map((item) => ({ ...item }));
    }
  };

  const settings = {
    get(name) {
      mergeCurrentSettings();
      return String(memory.settings?.[name]?.value ?? "");
    },
    set(name, value) {
      // Uma gravação de configuração também persiste os demais espelhos.
      // Reconcilie-os antes para não sobrescrever LISTAS/Histórico de outra aba.
      mergeCurrentMirrors();
      memory.settings = mergeSettings(memory.settings, { [name]: { value: String(value ?? ""), updatedAt: now() } });
      memory.savedAt = now();
      persistMirrors();
      return String(value ?? "");
    },
    remove(name) {
      mergeCurrentMirrors();
      const next = { ...(memory.settings || {}) };
      delete next[name];
      memory.settings = next;
      memory.savedAt = now();
      persistMirrors();
      return true;
    },
    all() {
      mergeCurrentSettings();
      return Object.fromEntries(Object.entries(memory.settings || {}).map(([name, entry]) => [name, String(entry.value ?? "")]));
    }
  };

  const history = {
    all() {
      mergeCurrentMirrors();
      return memory.history.map((item) => ({ ...item }));
    },
    replace(items) {
      mergeCurrentMirrors();
      memory.history = mergeHistory(Array.isArray(items) ? items : []);
      memory.savedAt = now();
      persistMirrors();
      return this.all();
    },
    upsert(item) {
      mergeCurrentMirrors();
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

  window.SACMemoryV12 = Object.freeze({
    hydrateFromClipboard,
    mergeCurrentMirrors,
    mergeSnapshot: mergeIncomingMemory,
    snapshot,
    commit,
    commitCurrentText,
    preserveCopyEvent,
    preserveProgrammaticText,
    transport,
    state,
    lists,
    settings,
    history
  });
})();
