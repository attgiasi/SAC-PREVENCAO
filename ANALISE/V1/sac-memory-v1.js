(() => {
  'use strict';

  if (window.SACMemory && typeof window.SACMemory.destroy === 'function') {
    window.SACMemory.destroy();
  }

  const VERSION = 'V1';
  const PREFIX = 'sac-prevencao:v1:';
  const TTL_MS = 12 * 60 * 60 * 1000;
  const MAX_HISTORY = 120;
  const CHANNEL = new EventTarget();

  const DEFAULT_CONFIG = {
    safeMode: true,
    helpMode: false,
    theme: 'dark',
    width: 420,
    signatureComplement: 'SAC Prevenção'
  };

  const key = (name) => `${PREFIX}${name}`;
  const now = () => Date.now();
  const expiresAt = () => now() + TTL_MS;

  const normalize = (value) => String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  const cleanDocument = (value) => String(value ?? '').replace(/\D+/g, '');

  const readRaw = (name, fallback) => {
    try {
      const raw = localStorage.getItem(key(name));
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.expiresAt <= now()) {
        localStorage.removeItem(key(name));
        return fallback;
      }
      return parsed.value;
    } catch (error) {
      console.warn('[SACMemory] Falha ao ler memória local', error);
      return fallback;
    }
  };

  const writeRaw = (name, value) => {
    localStorage.setItem(key(name), JSON.stringify({ expiresAt: expiresAt(), value }));
    CHANNEL.dispatchEvent(new CustomEvent('change', { detail: { name, value } }));
    window.dispatchEvent(new CustomEvent('sac:memory-change', { detail: { name, value } }));
    return value;
  };

  const readConfig = () => ({ ...DEFAULT_CONFIG, ...readRaw('config', {}) });

  const saveConfig = (patch) => {
    const next = { ...readConfig(), ...patch };
    return writeRaw('config', next);
  };

  const compact = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

  const shallowSafe = (entry) => {
    const copy = { ...entry };
    delete copy.cpf;
    delete copy.cnpj;
    delete copy.document;
    delete copy.documentClean;
    if (copy.analysis) {
      copy.analysis = { ...copy.analysis };
      delete copy.analysis.cpf;
      delete copy.analysis.cnpj;
      delete copy.analysis.document;
      delete copy.analysis.documentClean;
    }
    if (copy.consoleData) {
      copy.consoleData = { ...copy.consoleData };
      delete copy.consoleData.cpf;
      delete copy.consoleData.cnpj;
      delete copy.consoleData.document;
      delete copy.consoleData.documentClean;
    }
    return copy;
  };

  const readHistory = () => {
    const list = readRaw('history', []);
    const limit = now() - TTL_MS;
    return list.filter((item) => (item.createdAt || 0) >= limit).slice(0, MAX_HISTORY);
  };

  const addHistory = (entry) => {
    const item = shallowSafe({
      id: entry.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      createdAt: entry.createdAt || now(),
      version: VERSION,
      ...entry
    });
    const next = [item, ...readHistory()].slice(0, MAX_HISTORY);
    writeRaw('history', next);
    return item;
  };

  const readCurrent = () => readRaw('current-analysis', null);

  const saveCurrent = (analysis) => {
    const current = readCurrent() || {};
    const next = {
      ...current,
      ...analysis,
      updatedAt: now(),
      version: VERSION
    };
    writeRaw('current-analysis', next);
    return next;
  };

  const readSignature = () => readRaw('signature', null);

  const saveSignature = (signature) => {
    const clean = {
      name: compact(signature.name),
      complement: compact(signature.complement || DEFAULT_CONFIG.signatureComplement)
    };
    writeRaw('signature', clean);
    saveConfig({ signatureComplement: clean.complement });
    return clean;
  };

  const emptyLists = () => ({ allowlist: [], contencao: [] });

  const readLists = () => {
    const lists = readRaw('lists', emptyLists());
    return {
      allowlist: Array.isArray(lists.allowlist) ? lists.allowlist : [],
      contencao: Array.isArray(lists.contencao) ? lists.contencao : []
    };
  };

  const sameListIdentity = (item, analysis) => {
    const caseNumber = compact(analysis.caseNumber);
    const accountId = compact(analysis.accountId);
    const documentClean = cleanDocument(analysis.document || analysis.documentClean);
    return Boolean(
      (caseNumber && item.caseNumber === caseNumber) ||
      (accountId && item.accountId === accountId) ||
      (documentClean && item.documentClean === documentClean)
    );
  };

  const hasContainmentRule = (rule) => {
    const text = normalize(rule);
    return ['contencao', 'contensao'].some((term) => text.includes(term));
  };

  const addDaysIso = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  };

  const todayIso = () => new Date().toISOString().slice(0, 10);

  const makeListItem = (analysis, type) => {
    const issuerDays = Number(analysis.issuerAllowlistDays || analysis.allowlistDays || 2);
    return {
      id: `${type}-${compact(analysis.caseNumber) || Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      createdAt: now(),
      caseNumber: compact(analysis.caseNumber),
      issuerName: compact(analysis.issuerName),
      issuerId: compact(analysis.issuerId),
      accountId: compact(analysis.accountId),
      documentClean: cleanDocument(analysis.document || analysis.documentClean),
      rule: compact(analysis.rule),
      flow: compact(analysis.flow),
      startDate: todayIso(),
      endDate: addDaysIso(Number.isFinite(issuerDays) ? issuerDays : 2),
      status: 'pendente'
    };
  };

  const removeFromLists = (lists, analysis) => ({
    allowlist: lists.allowlist.filter((item) => !sameListIdentity(item, analysis)),
    contencao: lists.contencao.filter((item) => !sameListIdentity(item, analysis))
  });

  const updateListsFromDecision = (analysis, decision) => {
    const current = readLists();
    const cleanFlow = normalize(analysis.flow);
    const cleanDecision = normalize(decision);
    const eligible = (cleanFlow === 'banking' || cleanFlow === 'hold') && cleanDecision === 'nao fraude';
    const base = removeFromLists(current, analysis);

    if (!eligible) {
      writeRaw('lists', base);
      return base;
    }

    const allowItem = makeListItem(analysis, 'allowlist');
    base.allowlist = [allowItem, ...base.allowlist];

    if (hasContainmentRule(analysis.rule)) {
      base.contencao = [makeListItem(analysis, 'contencao'), ...base.contencao];
    }

    writeRaw('lists', base);
    return base;
  };

  const applyListAction = (type, id, action) => {
    const lists = readLists();
    const bucket = type === 'contencao' ? 'contencao' : 'allowlist';
    const target = lists[bucket].find((item) => item.id === id);
    const next = {
      allowlist: lists.allowlist.filter((item) => item.id !== id),
      contencao: lists.contencao.filter((item) => item.id !== id)
    };
    writeRaw('lists', next);
    if (target) {
      addHistory({
        kind: 'lista',
        action,
        flow: target.flow,
        caseNumber: target.caseNumber,
        issuerName: target.issuerName,
        accountId: target.accountId,
        listType: bucket
      });
    }
    return next;
  };

  const clearExpired = () => {
    Object.keys(localStorage)
      .filter((storageKey) => storageKey.startsWith(PREFIX))
      .forEach((storageKey) => {
        try {
          const parsed = JSON.parse(localStorage.getItem(storageKey));
          if (!parsed || parsed.expiresAt <= now()) localStorage.removeItem(storageKey);
        } catch (error) {
          localStorage.removeItem(storageKey);
        }
      });
  };

  const ensureToastRoot = () => {
    let root = document.querySelector('[data-sac-toast-root="true"]');
    if (root) return root;
    root = document.createElement('div');
    root.dataset.sacToastRoot = 'true';
    root.setAttribute('aria-live', 'polite');
    root.style.cssText = [
      'position:fixed',
      'left:50%',
      'bottom:22px',
      'transform:translateX(-50%)',
      'display:grid',
      'gap:8px',
      'z-index:2147483647',
      'pointer-events:none',
      'max-width:min(420px,calc(100vw - 24px))'
    ].join(';');
    document.documentElement.appendChild(root);
    return root;
  };

  const toast = (message, tone = 'info') => {
    const root = ensureToastRoot();
    while (root.children.length >= 2) {
      root.firstElementChild.remove();
    }
    const node = document.createElement('div');
    node.dataset.sacToast = tone;
    node.textContent = compact(message);
    const colors = {
      info: ['#111827', '#dbeafe', '#60a5fa'],
      ok: ['#052e16', '#dcfce7', '#22c55e'],
      warn: ['#451a03', '#ffedd5', '#f97316'],
      danger: ['#450a0a', '#fee2e2', '#ef4444']
    };
    const [bg, fg, border] = colors[tone] || colors.info;
    node.style.cssText = [
      `background:${bg}`,
      `color:${fg}`,
      `border:1px solid ${border}`,
      'box-shadow:0 14px 38px rgba(0,0,0,.28)',
      'border-radius:8px',
      'font:12px/1.35 system-ui,-apple-system,Segoe UI,sans-serif',
      'padding:9px 12px',
      'text-align:left',
      'pointer-events:none'
    ].join(';');
    root.appendChild(node);
    window.setTimeout(() => node.remove(), 4200);
  };

  const copyText = async (text) => {
    const content = String(text ?? '');
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(content);
      return true;
    }
    const area = document.createElement('textarea');
    area.value = content;
    area.setAttribute('readonly', 'true');
    area.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand('copy');
    area.remove();
    return copied;
  };

  const onChange = (handler) => {
    CHANNEL.addEventListener('change', handler);
    return () => CHANNEL.removeEventListener('change', handler);
  };

  clearExpired();

  window.SACMemory = {
    VERSION,
    TTL_MS,
    normalize,
    cleanDocument,
    compact,
    getConfig: readConfig,
    setConfig: saveConfig,
    getCurrent: readCurrent,
    saveCurrent,
    getHistory: readHistory,
    addHistory,
    getSignature: readSignature,
    saveSignature,
    getLists: readLists,
    updateListsFromDecision,
    applyListAction,
    hasContainmentRule,
    todayIso,
    addDaysIso,
    toast,
    copyText,
    onChange,
    destroy() {
      document.querySelectorAll('[data-sac-toast-root="true"]').forEach((node) => node.remove());
    }
  };
})();
