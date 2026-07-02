(() => {
  'use strict';

  if (window.SACPrevencao && typeof window.SACPrevencao.destroy === 'function') {
    window.SACPrevencao.destroy();
  }

  const Memory = window.SACMemory;
  const Tabulator = window.SACTabulator;
  const VERSION = 'V1';
  const ROOT_ATTR = 'data-sac-root';
  const WINDOW_WIDTH = 420;

  const OPTIONS = {
    statusPessoa: ['normal', 'ativo', 'bloqueado', 'bloqueio preventivo falcon 254', 'cancelada', 'spd 1', 'spd 2', 'spd 8', 'spd 15', 'spd 17', 'spd 21', 'spd 25', 'spd 33', 'outro'],
    midiasDesabonadora: ['não', 'sim', 'sem acesso'],
    historicoSpd: ['não', 'sim', 'spd 1', 'spd 2', 'spd 8', 'spd 15', 'spd 17', 'spd 21', 'spd 25', 'spd 33', 'outro'],
    emailDddEndereco: ['de acordo', 'divergente', 'sem informação'],
    documentacao: ['sem ressalvas', 'com ressalvas', 'baixa qualidade', 'foto de tela', 'editado', 'falsificado', 'ilegível', 'danificado', 'sem arquivos'],
    extrato: ['sem suspeitas', 'com suspeitas', 'triangulação', 'autofinanciamento', 'sem histórico']
  };

  const MEDIA_CHECKS = [
    'Crimes contra a fé pública',
    'Tráfico de drogas',
    'Terrorismo',
    'Crimes contra o patrimônio',
    'Crimes contra o sistema financeiro',
    'Crimes contra a ordem tributária',
    'Crimes contra a administração da justiça',
    'Crimes contra a administração pública',
    'Falsidade ideológica',
    'Receptação',
    'Estelionato',
    'Roubo (majorado ou qualificado)',
    'Furto (majorado ou qualificado)',
    'Estupro',
    'Homicídio'
  ];

  const DIVERGENCE_CHECKS = [
    'E-mail não se refere ao nome',
    'DDD diferente da região do endereço',
    'Copia e cola'
  ];

  const HELP_RULES = {
    hold: 'Regra com HOLD exige fluxo HOLD, cor quente, fila HOLD e seleção apenas das linhas que contenham HOLD no Falcon.',
    denylist: 'Denylist indica lista restritiva. Confira se a regra pede decisão mais conservadora antes de concluir.',
    contencao: 'Regra de contenção com decisão final NÃO FRAUDE inclui o item também na aba CONTENÇÃO.',
    'auto fraude': 'AUTO FRAUDE merece leitura de padrão transacional e sinais de autofinanciamento antes da decisão.',
    'capital de giro': 'Capital de giro costuma exigir atenção ao contexto da conta, extrato e recorrência do favorecido.',
    denylist_ec: 'DENYLIST_EC aponta restrição de estabelecimento. Em cartão, confira EC e histórico no estabelecimento.',
    denylist_ccs: 'DENYLIST_CCS indica restrição relacionada a CCS. Confira documentação e vínculos disponíveis.'
  };

  const SELECTORS = {
    falcon: {
      caseTab: ['[data-sac-tab="caso"]', '#tabCaso', '[href="#caso"]', '[aria-controls="caso"]'],
      orangeRows: [
        '[data-sac-row="transaction"][data-sac-highlight="orange"]',
        '[data-sac-row="transaction"].orange',
        '[data-sac-row="transaction"].linha-laranja',
        'tr[data-row-color="orange"]',
        'tr.linha-laranja',
        'tr.orange',
        '.transaction-row.orange',
        '[style*="orange"][data-sac-row="transaction"]',
        'tr[style*="orange"]',
        'tr[style*="rgb(255, 165, 0)"]'
      ],
      fields: {
        caseNumber: ['[data-sac-field="caseNumber"]', '#numeroCaso', '#caseNumber', '[name="caseNumber"]'],
        transactionType: ['[data-sac-field="transactionType"]', '[data-sac-col="transactionType"]', '.tipo-transacao'],
        rule: ['[data-sac-field="rule"]', '[data-sac-col="rule"]', '.regra'],
        dateTime: ['[data-sac-field="dateTime"]', '[data-sac-col="dateTime"]', '.data-hora'],
        value: ['[data-sac-field="value"]', '[data-sac-col="value"]', '.valor-transacao'],
        infractionHistory: ['[data-sac-field="infractionHistory"]', '[data-sac-col="infractionHistory"]', '.historico-infracoes'],
        establishment: ['[data-sac-field="establishment"]', '[data-sac-col="establishment"]', '.estabelecimento'],
        transactionDecision: ['[data-sac-field="transactionDecision"]', '[data-sac-col="transactionDecision"]', '.decisao-transacao'],
        cardFinal: ['[data-sac-field="cardFinal"]', '[data-sac-col="cardFinal"]', '.final-cartao'],
        entryType: ['[data-sac-field="entryType"]', '[data-sac-col="entryType"]', '.tipo-entrada'],
        issuerName: ['[data-sac-field="issuerName"]', '#nomeEmissor', '.emissor'],
        issuerId: ['[data-sac-field="issuerId"]', '#idEmissor'],
        accountId: ['[data-sac-field="accountId"]', '#idConta', '.id-conta'],
        document: ['[data-sac-field="document"]', '#cpfCnpj', '.cpf-cnpj'],
        accountStatus: ['[data-sac-field="accountStatus"]', '.status-conta'],
        registrationDate: ['[data-sac-field="registrationDate"]', '.data-cadastro']
      }
    },
    console: {
      fields: {
        statusConta: ['[data-sac-console-field="statusConta"]', '.status-conta', '#statusConta'],
        statusCartao: ['[data-sac-console-field="statusCartao"]', '.status-cartao', '#statusCartao'],
        dataCadastro: ['[data-sac-console-field="dataCadastro"]', '.data-cadastro', '#dataCadastro'],
        historicoCompraEstabelecimento: ['[data-sac-console-field="historicoCompraEstabelecimento"]', '.historico-compra-estabelecimento'],
        padraoCompra: ['[data-sac-console-field="padraoCompra"]', '.padrao-compra'],
        document: ['[data-sac-console-field="document"]', '#cpfCnpj', '.cpf-cnpj'],
        accountId: ['[data-sac-console-field="accountId"]', '#idConta', '.id-conta'],
        issuerName: ['[data-sac-console-field="issuerName"]', '#nomeEmissor', '.emissor']
      }
    },
    tabulador: {
      marker: ['#ddl_tipoDoc', '#ddl_status', '#ddl_motivostatus', '[data-sac-page="tabulador"]']
    },
    lists: {
      first: ['[data-sac-list-field="first"]', '#txtValor1', '#txt_chave_1', '[name="valor1"]'],
      second: ['[data-sac-list-field="second"]', '#txtValor2', '#txt_chave_2', '[name="valor2"]'],
      start: ['[data-sac-list-field="startDate"]', '#txtDataInicial', '#dtInicio', '[name="dataInicial"]'],
      end: ['[data-sac-list-field="endDate"]', '#txtDataFinal', '#dtFinal', '[name="dataFinal"]'],
      issuer: ['[data-sac-list-field="issuer"]', '#ddlEmissor', '[name="emissor"]']
    }
  };

  const state = {
    activeWindow: null,
    sidePanels: [],
    cleanup: [],
    minimized: false,
    issuerDirectory: null
  };

  const normalize = (value) => Memory.normalize(value);
  const compact = (value) => Memory.compact(value);
  const cleanDocument = (value) => Memory.cleanDocument(value);

  const ensureStyle = () => {
    if (document.getElementById('sac-prevencao-style')) return;
    const style = document.createElement('style');
    style.id = 'sac-prevencao-style';
    style.setAttribute(ROOT_ATTR, 'true');
    style.textContent = `
      :root{--sac-dark-bg:#0f1720;--sac-dark-panel:#121c28;--sac-dark-soft:#182536;--sac-dark-border:#334155;--sac-dark-text:#f8fafc;--sac-dark-muted:#a8b3c4;--sac-light-bg:#f8fafc;--sac-light-panel:#ffffff;--sac-light-soft:#eef2f7;--sac-light-border:#cbd5e1;--sac-light-text:#111827;--sac-light-muted:#475569;--sac-red:#dc2626;--sac-green:#16a34a;--sac-yellow:#d97706;--sac-blue:#2563eb;--sac-orange:#f97316}
      .sac-window,.sac-side-panel{position:fixed;z-index:2147483645;width:420px;max-width:calc(100vw - 18px);box-sizing:border-box;border-radius:8px;box-shadow:0 22px 70px rgba(0,0,0,.38);font-family:system-ui,-apple-system,Segoe UI,sans-serif;letter-spacing:0;overflow:hidden}
      .sac-theme-dark{background:var(--sac-dark-panel);color:var(--sac-dark-text);border:1px solid var(--sac-dark-border)}
      .sac-theme-light{background:var(--sac-light-panel);color:var(--sac-light-text);border:1px solid var(--sac-light-border)}
      .sac-window[data-flow="hold"]{border-color:var(--sac-orange);box-shadow:0 20px 70px rgba(249,115,22,.28)}
      .sac-topbar{height:38px;display:flex;align-items:center;gap:6px;padding:0 8px;cursor:move;border-bottom:1px solid currentColor;border-color:rgba(148,163,184,.28);user-select:none}
      .sac-title{font-size:13px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-right:auto}
      .sac-flow-chip{font-size:10px;font-weight:900;text-transform:uppercase;border-radius:5px;padding:3px 6px;background:#243244;color:#e2e8f0}
      .sac-theme-light .sac-flow-chip{background:#e2e8f0;color:#111827}
      .sac-flow-hold{background:#9a3412!important;color:#fff!important}
      .sac-icon-btn{width:25px;height:25px;display:grid;place-items:center;border-radius:5px;border:1px solid rgba(148,163,184,.35);background:transparent;color:inherit;font-size:12px;font-weight:900;line-height:1;cursor:pointer}
      .sac-icon-btn:hover{background:rgba(148,163,184,.16)}
      .sac-close{background:var(--sac-red);border-color:var(--sac-red);color:#fff}
      .sac-body{padding:10px;display:grid;gap:10px;max-height:min(76vh,720px);overflow:auto}
      .sac-body::-webkit-scrollbar{width:8px}.sac-body::-webkit-scrollbar-thumb{background:#64748b;border-radius:8px}
      .sac-section{display:grid;gap:6px}.sac-section h3{font-size:12px;margin:0;text-transform:uppercase;color:inherit;opacity:.78}
      .sac-grid{display:grid;gap:5px}.sac-row{display:grid;grid-template-columns:116px 1fr;gap:8px;padding:7px;border-radius:6px;border:1px solid rgba(148,163,184,.24);background:rgba(15,23,42,.22);align-items:start}
      .sac-theme-light .sac-row{background:#f8fafc}.sac-label{font-size:11px;font-weight:800;color:inherit;opacity:.76;text-align:left}.sac-value{font-size:12px;line-height:1.28;white-space:normal;overflow-wrap:anywhere;text-align:left;max-height:4.9em;overflow:hidden}
      .sac-row[data-copy="true"]{cursor:pointer}.sac-row[data-editable="true"]{cursor:text}.sac-edit{width:100%;box-sizing:border-box;border:1px solid #64748b;border-radius:5px;background:#0b1220;color:#fff;padding:6px;font:12px system-ui}.sac-theme-light .sac-edit{background:#fff;color:#111827}
      .sac-alert{border-radius:6px;padding:8px 9px;font-size:12px;line-height:1.35;text-align:left}.sac-alert.warn{background:#451a03;color:#ffedd5;border:1px solid #f97316}.sac-alert.danger{background:#450a0a;color:#fee2e2;border:1px solid #ef4444}.sac-alert.ok{background:#052e16;color:#dcfce7;border:1px solid #22c55e}
      .sac-history-ok{color:#22c55e;font-weight:900}.sac-history-warn{color:#f97316;font-weight:900}.sac-history-danger{color:#ef4444;font-weight:900;animation:sacPulse 1.1s infinite}
      @keyframes sacPulse{0%,100%{opacity:1}50%{opacity:.42}}
      .sac-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.sac-btn{border:0;border-radius:6px;padding:8px 10px;font-size:12px;font-weight:900;cursor:pointer;color:#fff;background:#334155}.sac-btn.primary{background:#2563eb}.sac-btn.ok{background:#16a34a}.sac-btn.warn{background:#d97706}.sac-btn.danger{background:#dc2626}.sac-btn.ghost{background:transparent;color:inherit;border:1px solid rgba(148,163,184,.4)}
      .sac-form{display:grid;gap:8px}.sac-field{display:grid;grid-template-columns:142px 1fr;gap:8px;align-items:center;text-align:left}.sac-field span{font-size:11px;font-weight:800;color:inherit;opacity:.8}.sac-field select,.sac-field input,.sac-field textarea{width:100%;box-sizing:border-box;border-radius:6px;border:1px solid #475569;background:#0b1220;color:#f8fafc;padding:7px;font:12px system-ui}.sac-theme-light .sac-field select,.sac-theme-light .sac-field input,.sac-theme-light .sac-field textarea{background:#fff;color:#111827;border-color:#cbd5e1}
      .sac-toggle-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px}.sac-toggle{display:flex;align-items:center;justify-content:center;gap:6px;border:1px solid rgba(148,163,184,.35);border-radius:6px;padding:8px 6px;font-size:12px;font-weight:900;cursor:pointer}.sac-toggle input{accent-color:#2563eb}
      .sac-decision-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.sac-decision-grid .sac-btn{min-height:48px;white-space:normal;line-height:1.15}.sac-decision-grid .long{font-size:11px}
      .sac-side-panel{z-index:2147483646;left:calc(50% + 226px);top:74px;padding:12px;display:grid;gap:8px}.sac-side-panel h3{margin:0;font-size:13px}.sac-side-panel label{display:flex;align-items:flex-start;gap:8px;font-size:12px;line-height:1.3;text-align:left}.sac-side-panel input[type="text"]{width:100%;box-sizing:border-box;border-radius:6px;border:1px solid #475569;background:#0b1220;color:#fff;padding:7px}.sac-theme-light.sac-side-panel input[type="text"]{background:#fff;color:#111827}
      .sac-help-dot{display:inline-grid;place-items:center;width:16px;height:16px;border-radius:50%;background:#2563eb;color:#fff;font-size:11px;font-weight:900;margin-left:4px;cursor:help}
      .sac-list-card{border:1px solid rgba(148,163,184,.28);border-radius:6px;padding:8px;display:grid;gap:6px;background:rgba(15,23,42,.18)}.sac-theme-light .sac-list-card{background:#f8fafc}.sac-list-card strong{font-size:12px}.sac-list-card small{font-size:11px;opacity:.78}
      .sac-search-row{display:grid;grid-template-columns:1fr 120px;gap:8px}.sac-search-row input,.sac-search-row select{border-radius:6px;border:1px solid #64748b;padding:7px;font:12px system-ui;background:#0b1220;color:#fff}.sac-theme-light .sac-search-row input,.sac-theme-light .sac-search-row select{background:#fff;color:#111827;border-color:#cbd5e1}
      .sac-minimized .sac-body{display:none}.sac-minimized{height:38px}
      @media (max-width:720px){.sac-window{left:9px!important;right:auto!important;width:calc(100vw - 18px)!important}.sac-side-panel{left:9px!important;top:auto!important;bottom:9px;width:calc(100vw - 18px)!important}.sac-field{grid-template-columns:1fr}.sac-row{grid-template-columns:94px 1fr}}
    `;
    document.documentElement.appendChild(style);
  };

  const queryFirst = (selectors, root = document) => {
    for (const selector of selectors) {
      const node = root.querySelector(selector);
      if (node) return node;
    }
    return null;
  };

  const queryAll = (selectors, root = document) => {
    const nodes = [];
    selectors.forEach((selector) => nodes.push(...root.querySelectorAll(selector)));
    return Array.from(new Set(nodes));
  };

  const nodeText = (node) => {
    if (!node) return '';
    if ('value' in node && node.value) return compact(node.value);
    return compact(node.textContent);
  };

  const readMapped = (selectors, root) => {
    const node = queryFirst(selectors, root);
    return nodeText(node);
  };

  const readField = (group, fieldName, row) => {
    const selectors = SELECTORS[group].fields[fieldName] || [];
    const fromRow = row ? readMapped(selectors, row) : '';
    return fromRow || readMapped(selectors, document);
  };

  const clickCaseTab = () => {
    const mapped = queryFirst(SELECTORS.falcon.caseTab);
    if (mapped) {
      mapped.click();
      return true;
    }
    const candidates = Array.from(document.querySelectorAll('button,a,[role="tab"]'));
    const tab = candidates.find((node) => normalize(nodeText(node)) === 'caso');
    if (tab) tab.click();
    return Boolean(tab);
  };

  const historyInfo = (rawValue) => {
    const digits = cleanDocument(rawValue);
    const found = Boolean(digits);
    const value = found ? digits.padStart(10, '0').slice(-10) : '0000000000';
    const first = value.slice(0, 4);
    const second = value.slice(4, 7);
    const third = value.slice(7, 10);
    const total = Number(first) + Number(second) + Number(third);
    const tone = !found ? 'warn' : total >= 3 ? 'danger' : 'ok';
    return {
      raw: value,
      display: value,
      blocks: `${first} ${second} ${third}`,
      total,
      found,
      tone
    };
  };

  const detectFlow = (data) => {
    const explicit = normalize(data.flow);
    if (explicit === 'card' || explicit === 'cartao' || explicit === 'cartão') return 'CARD';
    if (explicit === 'hold') return 'HOLD';
    if (explicit === 'banking') return 'BANKING';

    const transaction = normalize(data.transactionType);
    const hasCardEvidence = Boolean(
      compact(data.establishment) ||
      compact(data.cardFinal) ||
      compact(data.entryType) ||
      compact(data.transactionDecision) ||
      transaction.includes('autorizacao') ||
      transaction.includes('lancamento de credito')
    );
    if (hasCardEvidence) return 'CARD';
    if (normalize(data.rule).includes('hold')) return 'HOLD';
    return 'BANKING';
  };

  const collectFalcon = () => {
    clickCaseTab();
    const rows = queryAll(SELECTORS.falcon.orangeRows);
    if (!rows.length) {
      return { blocked: true, missing: ['Linha laranja da transação'], analysis: null };
    }

    const rowDataList = rows.map((row) => {
      const data = {
        flow: row.dataset.sacFlow || row.dataset.flow || '',
        caseNumber: readField('falcon', 'caseNumber', row),
        transactionType: readField('falcon', 'transactionType', row),
        rule: readField('falcon', 'rule', row),
        dateTime: readField('falcon', 'dateTime', row),
        value: readField('falcon', 'value', row),
        infractionHistory: readField('falcon', 'infractionHistory', row),
        establishment: readField('falcon', 'establishment', row),
        transactionDecision: readField('falcon', 'transactionDecision', row),
        cardFinal: readField('falcon', 'cardFinal', row),
        entryType: readField('falcon', 'entryType', row),
        issuerName: readField('falcon', 'issuerName', row),
        issuerId: readField('falcon', 'issuerId', row),
        accountId: readField('falcon', 'accountId', row),
        document: readField('falcon', 'document', row),
        accountStatus: readField('falcon', 'accountStatus', row),
        registrationDate: readField('falcon', 'registrationDate', row),
        source: 'Falcon'
      };
      data.flow = detectFlow(data);
      return { row, data };
    });

    const holdRows = rowDataList.filter((item) => normalize(item.data.rule).includes('hold'));
    const target = holdRows[0] || rowDataList[0];
    let analysis = target.data;
    if (holdRows.length) {
      analysis.flow = 'HOLD';
      selectRows(holdRows.map((item) => item.row), rows);
    } else if (analysis.flow === 'CARD') {
      selectRows([target.row], rows);
    }

    const infraction = historyInfo(analysis.infractionHistory);
    analysis = {
      ...analysis,
      flow: analysis.flow === 'CARD' ? 'card' : analysis.flow === 'HOLD' ? 'hold' : 'banking',
      infractionHistory: infraction.raw,
      infractionHistoryDisplay: infraction.display,
      infractionHistoryBlocks: infraction.blocks,
      infractionHistoryTone: infraction.tone,
      collectedAt: Date.now()
    };

    const missing = missingFalconFields(analysis);
    return { blocked: missing.length > 0, missing, analysis };
  };

  const selectRows = (selectedRows, allRows) => {
    const selected = new Set(selectedRows);
    allRows.forEach((row) => {
      const checkbox = row.querySelector('input[type="checkbox"]');
      if (checkbox) {
        checkbox.checked = selected.has(row);
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        return;
      }
      if (selected.has(row)) row.click();
    });
  };

  const missingFalconFields = (analysis) => {
    const missing = [];
    const common = [
      ['Número do caso', analysis.caseNumber],
      ['Tipo de transação', analysis.transactionType],
      ['Regra', analysis.rule],
      ['Data/hora', analysis.dateTime],
      ['Valor', analysis.value]
    ];
    common.forEach(([label, value]) => {
      if (!compact(value)) missing.push(label);
    });
    if (analysis.flow === 'card') {
      [
        ['Estabelecimento', analysis.establishment],
        ['Tipo de entrada/compra', analysis.entryType],
        ['Decisão da transação', analysis.transactionDecision]
      ].forEach(([label, value]) => {
        if (!compact(value)) missing.push(label);
      });
    }
    return missing;
  };

  const detectHandling = () => {
    const controls = Array.from(document.querySelectorAll('button,a,input[type="button"],input[type="submit"]'));
    const texts = controls.map((node) => nodeText(node) || node.value);
    if (texts.some((text) => normalize(text).includes('global backoffice'))) return 'GLOBAL';
    if (texts.some((text) => normalize(text).includes('backoffice brasil'))) return 'BRASIL';
    return 'BRASIL';
  };

  const collectConsoleMapped = () => {
    const fields = {};
    Object.keys(SELECTORS.console.fields).forEach((field) => {
      fields[field] = readMapped(SELECTORS.console.fields[field], document);
    });
    return fields;
  };

  const loadIssuerDirectory = async () => {
    if (state.issuerDirectory) return state.issuerDirectory;
    const script = Array.from(document.scripts).find((item) => item.src.includes('sac-prevencao-v1.js'));
    const url = script && script.src ? new URL('issuer-directory.json', script.src).toString() : './issuer-directory.json';
    try {
      const response = await fetch(url, { cache: 'no-store' });
      state.issuerDirectory = response.ok ? await response.json() : { issuers: [], help: {} };
    } catch (error) {
      state.issuerDirectory = { issuers: [], help: {} };
    }
    return state.issuerDirectory;
  };

  const issuerMatch = async (issuerName) => {
    const directory = await loadIssuerDirectory();
    const name = normalize(issuerName);
    const issuers = Array.isArray(directory.issuers) ? directory.issuers : [];
    return issuers.find((issuer) => [issuer.name, ...(issuer.aliases || [])].map(normalize).includes(name)) || null;
  };

  const makeWindow = (title, flow, body, options = {}) => {
    ensureStyle();
    closeMain();
    const config = Memory.getConfig();
    const theme = config.theme === 'light' ? 'light' : 'dark';
    const windowNode = document.createElement('section');
    windowNode.className = `sac-window sac-theme-${theme}`;
    windowNode.dataset.sacRoot = 'true';
    windowNode.dataset.flow = flow || '';
    windowNode.style.width = `${config.width || WINDOW_WIDTH}px`;
    windowNode.style.left = `${Math.max(8, (window.innerWidth - (config.width || WINDOW_WIDTH)) / 2)}px`;
    windowNode.style.top = '72px';
    windowNode.innerHTML = `
      <div class="sac-topbar" data-drag>
        <strong class="sac-title">${escapeHtml(title)}</strong>
        ${flow ? `<span class="sac-flow-chip ${flow === 'hold' ? 'sac-flow-hold' : ''}">${escapeHtml(flow)}</span>` : ''}
        <button type="button" class="sac-icon-btn" data-action="history" title="Histórico">H</button>
        <button type="button" class="sac-icon-btn" data-action="lists" title="LISTAS">L</button>
        <button type="button" class="sac-icon-btn" data-action="theme" title="Trocar tema">T</button>
        <button type="button" class="sac-icon-btn" data-action="reload" title="Recarregar">R</button>
        <button type="button" class="sac-icon-btn" data-action="reset" title="Posição inicial">P</button>
        <button type="button" class="sac-icon-btn" data-action="minimize" title="Minimizar">M</button>
        <button type="button" class="sac-icon-btn sac-close" data-action="close" title="Fechar">X</button>
      </div>
      <div class="sac-body"></div>
    `;
    windowNode.querySelector('.sac-body').append(...asNodes(body));
    document.documentElement.appendChild(windowNode);
    bindWindow(windowNode, options);
    state.activeWindow = windowNode;
    return windowNode;
  };

  const asNodes = (body) => {
    if (Array.isArray(body)) return body;
    if (body instanceof Node) return [body];
    const wrap = document.createElement('div');
    wrap.innerHTML = body;
    return Array.from(wrap.childNodes);
  };

  const bindWindow = (windowNode, options) => {
    windowNode.addEventListener('mousedown', () => {
      state.activeWindow = windowNode;
    });
    windowNode.querySelector('[data-action="close"]').addEventListener('click', closeMain);
    windowNode.querySelector('[data-action="minimize"]').addEventListener('click', () => {
      windowNode.classList.toggle('sac-minimized');
      closeSidePanels();
    });
    windowNode.querySelector('[data-action="reset"]').addEventListener('click', () => {
      windowNode.style.left = `${Math.max(8, (window.innerWidth - windowNode.offsetWidth) / 2)}px`;
      windowNode.style.top = '72px';
    });
    windowNode.querySelector('[data-action="theme"]').addEventListener('click', toggleTheme);
    windowNode.querySelector('[data-action="reload"]').addEventListener('click', () => openDetected());
    windowNode.querySelector('[data-action="history"]').addEventListener('click', openHistory);
    windowNode.querySelector('[data-action="lists"]').addEventListener('click', openLists);
    enableDrag(windowNode);

    if (options.primary) {
      windowNode.dataset.primary = options.primary;
    }
  };

  const enableDrag = (windowNode) => {
    const handle = windowNode.querySelector('[data-drag]');
    let start = null;
    const move = (event) => {
      if (!start) return;
      const nextLeft = Math.max(4, Math.min(window.innerWidth - 60, start.left + event.clientX - start.x));
      const nextTop = Math.max(4, Math.min(window.innerHeight - 38, start.top + event.clientY - start.y));
      windowNode.style.left = `${nextLeft}px`;
      windowNode.style.top = `${nextTop}px`;
    };
    const up = () => {
      start = null;
      document.removeEventListener('mousemove', move, true);
      document.removeEventListener('mouseup', up, true);
    };
    handle.addEventListener('mousedown', (event) => {
      if (event.target.closest('button')) return;
      const rect = windowNode.getBoundingClientRect();
      start = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
      document.addEventListener('mousemove', move, true);
      document.addEventListener('mouseup', up, true);
    });
  };

  const closeMain = () => {
    closeSidePanels();
    document.querySelectorAll('.sac-window').forEach((node) => node.remove());
    state.activeWindow = null;
  };

  const closeSidePanels = () => {
    state.sidePanels.forEach((panel) => panel.remove());
    state.sidePanels = [];
  };

  const toggleTheme = () => {
    const config = Memory.getConfig();
    const next = config.theme === 'light' ? 'dark' : 'light';
    Memory.setConfig({ theme: next });
    document.querySelectorAll('.sac-window,.sac-side-panel').forEach((node) => {
      node.classList.toggle('sac-theme-dark', next === 'dark');
      node.classList.toggle('sac-theme-light', next === 'light');
    });
  };

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const section = (title, children) => {
    const node = document.createElement('div');
    node.className = 'sac-section';
    node.innerHTML = `<h3>${escapeHtml(title)}</h3>`;
    node.append(...asNodes(children));
    return node;
  };

  const grid = (items, analysis) => {
    const config = Memory.getConfig();
    const node = document.createElement('div');
    node.className = 'sac-grid';
    items.forEach((item) => {
      if (item.hidden) return;
      const row = document.createElement('div');
      row.className = 'sac-row';
      row.dataset.copy = config.safeMode ? 'true' : 'false';
      row.dataset.editable = config.safeMode ? 'false' : 'true';
      row.innerHTML = `
        <div class="sac-label">${escapeHtml(item.label)}${helpDot(item, analysis)}</div>
        <div class="sac-value ${item.className || ''}">${escapeHtml(item.value || 'N/A')}</div>
      `;
      row.addEventListener('click', async () => {
        if (!Memory.getConfig().safeMode) return;
        await Memory.copyText(item.value || '');
        Memory.toast('Dado copiado.', 'ok');
      });
      row.addEventListener('dblclick', () => {
        if (Memory.getConfig().safeMode || !item.key) return;
        editRowValue(row, item, analysis);
      });
      attachHelp(row, item, analysis);
      node.appendChild(row);
    });
    return node;
  };

  const helpDot = (item, analysis) => {
    if (!Memory.getConfig().helpMode) return '';
    const content = helpContent(item, analysis);
    return content ? '<span class="sac-help-dot">?</span>' : '';
  };

  const helpContent = (item, analysis) => {
    if (item.key === 'rule') {
      const text = normalize(item.value);
      const found = Object.keys(HELP_RULES).find((key) => text.includes(key));
      return found ? HELP_RULES[found] : '';
    }
    if (item.key === 'issuerName') {
      const name = normalize(item.value || analysis.issuerName);
      const directory = state.issuerDirectory || {};
      const issuerHelp = directory.help && directory.help.issuers ? directory.help.issuers : {};
      const key = Object.keys(issuerHelp).find((candidate) => name.includes(candidate));
      return key ? issuerHelp[key] : 'Confira se o emissor selecionado corresponde ao nome exibido no book e no Tabulador.';
    }
    return '';
  };

  const attachHelp = (row, item, analysis) => {
    const dot = row.querySelector('.sac-help-dot');
    if (!dot) return;
    dot.addEventListener('mouseenter', () => openHelpPanel(helpContent(item, analysis)));
    dot.addEventListener('mouseleave', closeSidePanels);
  };

  const openHelpPanel = (content) => {
    closeSidePanels();
    const panel = document.createElement('aside');
    const theme = Memory.getConfig().theme === 'light' ? 'light' : 'dark';
    panel.className = `sac-side-panel sac-theme-${theme}`;
    panel.dataset.sacRoot = 'true';
    panel.innerHTML = `<h3>Ajuda</h3><div class="sac-alert ok">${escapeHtml(content)}</div>`;
    document.documentElement.appendChild(panel);
    state.sidePanels.push(panel);
  };

  const editRowValue = (row, item, analysis) => {
    const valueNode = row.querySelector('.sac-value');
    const input = document.createElement('input');
    input.className = 'sac-edit';
    input.value = item.value || '';
    valueNode.replaceChildren(input);
    input.focus();
    input.select();
    const save = () => {
      const value = compact(input.value);
      analysis[item.key] = value;
      Memory.saveCurrent(analysis);
      valueNode.textContent = value || 'N/A';
      item.value = value;
      Memory.toast('Dado manual atualizado.', 'ok');
    };
    input.addEventListener('blur', save, { once: true });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') input.blur();
    });
  };

  const falconItems = (analysis) => {
    const card = analysis.flow === 'card';
    return [
      { key: 'caseNumber', label: 'Caso', value: analysis.caseNumber },
      { key: 'issuerName', label: 'Emissor', value: analysis.issuerName },
      { key: 'accountId', label: 'Conta', value: analysis.accountId },
      { key: 'transactionType', label: 'Tipo transação', value: analysis.transactionType },
      { key: 'rule', label: 'Regra', value: analysis.rule },
      { key: 'dateTime', label: 'Data/hora', value: analysis.dateTime },
      { key: 'value', label: 'Valor', value: analysis.value },
      { key: 'infractionHistoryDisplay', label: 'Hist. infrações', value: analysis.infractionHistoryDisplay, hidden: card, className: `sac-history-${analysis.infractionHistoryTone}` },
      { key: 'establishment', label: 'Estabelecimento', value: analysis.establishment, hidden: !card },
      { key: 'entryType', label: 'Entrada/compra', value: analysis.entryType, hidden: !card },
      { key: 'transactionDecision', label: 'Decisão transação', value: analysis.transactionDecision, hidden: !card },
      { key: 'cardFinal', label: 'Final cartão', value: analysis.cardFinal, hidden: !card }
    ];
  };

  const openFalcon = async () => {
    await loadIssuerDirectory();
    const config = Memory.getConfig();
    const result = collectFalcon();
    if (!result.analysis) {
      makeWindow('SAC Prevenção - Falcon', '', [
        alertNode('danger', 'Não encontrei linha laranja de transação usando os seletores mapeados.'),
        actionsNode([{ label: 'Recarregar', tone: 'primary', onClick: () => openFalcon() }])
      ]);
      return;
    }

    const issuer = await issuerMatch(result.analysis.issuerName);
    const analysis = Memory.saveCurrent({
      ...result.analysis,
      issuerId: result.analysis.issuerId || (issuer && issuer.id) || '',
      issuerAllowlistDays: issuer && issuer.allowlistDays,
      sourcePage: 'falcon'
    });
    Memory.addHistory({
      kind: 'falcon',
      caseNumber: analysis.caseNumber,
      issuerName: analysis.issuerName,
      accountId: analysis.accountId,
      flow: analysis.flow,
      analysis
    });

    const nodes = [];
    if (result.blocked) {
      const message = `Dados obrigatórios não encontrados: ${result.missing.join(', ')}.`;
      nodes.push(alertNode(config.safeMode ? 'danger' : 'warn', config.safeMode ? `${message} Modo seguro bloqueou avanço.` : `${message} Modo seguro desligado: revise manualmente.`));
    }
    if (analysis.infractionHistoryTone === 'warn' && analysis.flow !== 'card') {
      nodes.push(alertNode('warn', 'Histórico de infrações não encontrado na página. Exibindo 0000000000 para conferência.'));
    }
    nodes.push(section('Dados Falcon', grid(falconItems(analysis), analysis)));
    nodes.push(actionsNode([
      { label: 'Abrir Console', tone: config.safeMode && result.blocked ? 'ghost' : 'primary', disabled: config.safeMode && result.blocked, onClick: () => openConsole() },
      { label: 'Configuração', tone: 'ghost', onClick: openConfig }
    ]));
    makeWindow('SAC Prevenção - Falcon', analysis.flow, nodes);
  };

  const alertNode = (tone, text) => {
    const node = document.createElement('div');
    node.className = `sac-alert ${tone}`;
    node.textContent = text;
    return node;
  };

  const actionsNode = (actions) => {
    const node = document.createElement('div');
    node.className = 'sac-actions';
    actions.forEach((action) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `sac-btn ${action.tone || 'primary'}`;
      button.textContent = action.label;
      button.disabled = Boolean(action.disabled);
      button.addEventListener('click', action.onClick);
      node.appendChild(button);
    });
    return node;
  };

  const openConsole = async () => {
    await loadIssuerDirectory();
    const current = Memory.getCurrent() || {};
    const mapped = collectConsoleMapped();
    const handling = detectHandling();
    const consoleData = {
      ...(current.consoleData || {}),
      ...mapped,
      handling
    };
    const analysis = Memory.saveCurrent({
      ...current,
      ...pickPresent(mapped, ['document', 'accountId', 'issuerName']),
      handling,
      consoleData
    });

    const nodes = [
      section('Dados recebidos do Falcon', grid(falconItems(analysis), analysis)),
      consoleForm(analysis, consoleData),
      actionsNode([
        { label: 'Salvar Console', tone: 'primary', onClick: () => saveConsoleForm(analysis) },
        { label: 'Configuração', tone: 'ghost', onClick: openConfig }
      ])
    ];
    if (handling === 'GLOBAL') {
      nodes.unshift(alertNode('warn', 'Global Backoffice: grids combinados não aplicáveis serão enviados como N/A. Em cartão global, ausência de dados do cartão não bloqueia.'));
    }
    makeWindow('SAC Prevenção - Console', analysis.flow || 'banking', nodes);
    refreshConditionalPanels();
  };

  const pickPresent = (source, keys) => keys.reduce((acc, key) => {
    if (compact(source[key])) acc[key] = source[key];
    return acc;
  }, {});

  const consoleForm = (analysis, consoleData) => {
    const form = document.createElement('div');
    form.className = 'sac-form';
    form.dataset.consoleForm = 'true';

    const handling = consoleData.handling || detectHandling();
    form.appendChild(staticField('Tratativa', handling === 'GLOBAL' ? 'Global Backoffice' : 'Backoffice Brasil'));
    form.appendChild(inputField('Status conta', 'statusConta', consoleData.statusConta || analysis.accountStatus || ''));
    if (analysis.flow === 'card') {
      form.appendChild(inputField('Status cartão', 'statusCartao', consoleData.statusCartao || analysis.cardStatus || ''));
      form.appendChild(inputField('Histórico compra EC', 'historicoCompraEstabelecimento', consoleData.historicoCompraEstabelecimento || ''));
      form.appendChild(inputField('Padrão de compra', 'padraoCompra', consoleData.padraoCompra || ''));
    }
    form.appendChild(inputField('Data cadastro', 'dataCadastro', consoleData.dataCadastro || analysis.registrationDate || ''));
    form.appendChild(selectField('Status Pessoa (SPD)', 'statusPessoa', OPTIONS.statusPessoa, consoleData.statusPessoa));
    form.appendChild(selectField('Mídia desabonadora', 'midiasDesabonadora', OPTIONS.midiasDesabonadora, consoleData.midiasDesabonadora, { panel: 'media' }));

    if (handling !== 'GLOBAL') {
      form.appendChild(selectField('E-mail, DDD e Endereço', 'emailDddEndereco', OPTIONS.emailDddEndereco, consoleData.emailDddEndereco, { panel: 'divergence' }));
      form.appendChild(selectField('Histórico SPD', 'historicoSpd', OPTIONS.historicoSpd, consoleData.historicoSpd));
      form.appendChild(selectField('Documentação', 'documentacao', OPTIONS.documentacao, consoleData.documentacao));
      form.appendChild(selectField('Extrato', 'extrato', OPTIONS.extrato, consoleData.extrato));
    } else {
      ['emailDddEndereco', 'historicoSpd', 'documentacao', 'extrato'].forEach((name) => {
        const hidden = document.createElement('input');
        hidden.type = 'hidden';
        hidden.dataset.consoleName = name;
        hidden.value = 'N/A';
        form.appendChild(hidden);
      });
    }

    const call = document.createElement('div');
    call.className = 'sac-toggle-row';
    call.innerHTML = `
      ${toggleHtml('JIRA', 'jira', consoleData.jira)}
      ${toggleHtml('Com chamada', 'comChamada', consoleData.comChamada)}
      ${toggleHtml('Com sucesso', 'comSucesso', consoleData.comSucesso)}
    `;
    form.appendChild(call);
    form.addEventListener('change', refreshConditionalPanels);
    return form;
  };

  const staticField = (label, value) => {
    const node = document.createElement('div');
    node.className = 'sac-field';
    node.innerHTML = `<span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>`;
    return node;
  };

  const inputField = (label, name, value) => {
    const node = document.createElement('label');
    node.className = 'sac-field';
    node.innerHTML = `<span>${escapeHtml(label)}</span><input type="text" data-console-name="${escapeHtml(name)}" value="${escapeHtml(value)}">`;
    return node;
  };

  const selectField = (label, name, options, value, meta = {}) => {
    const node = document.createElement('label');
    node.className = 'sac-field';
    const opts = options.map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join('');
    node.innerHTML = `<span>${escapeHtml(label)}</span><select data-console-name="${escapeHtml(name)}" ${meta.panel ? `data-panel="${meta.panel}"` : ''}>${opts}</select>`;
    const select = node.querySelector('select');
    select.value = value && options.includes(value) ? value : options[0];
    return node;
  };

  const toggleHtml = (label, name, checked) => `
    <label class="sac-toggle"><input type="checkbox" data-console-name="${name}" ${checked ? 'checked' : ''}>${escapeHtml(label)}</label>
  `;

  const refreshConditionalPanels = () => {
    const form = document.querySelector('[data-console-form="true"]');
    if (!form) return;
    closeSidePanels();
    const media = form.querySelector('[data-console-name="midiasDesabonadora"]');
    const divergence = form.querySelector('[data-console-name="emailDddEndereco"]');
    if (media && normalize(media.value) === 'sim') {
      openCheckboxPanel('Mídia desabonadora', 'mediaChecks', MEDIA_CHECKS);
    }
    if (divergence && normalize(divergence.value) === 'divergente') {
      openCheckboxPanel('Divergências', 'divergenceChecks', DIVERGENCE_CHECKS, true);
    }
  };

  const openCheckboxPanel = (title, name, values, withEmail) => {
    const theme = Memory.getConfig().theme === 'light' ? 'light' : 'dark';
    const panel = document.createElement('aside');
    panel.className = `sac-side-panel sac-theme-${theme}`;
    panel.dataset.sacRoot = 'true';
    panel.dataset.sideName = name;
    panel.innerHTML = `<h3>${escapeHtml(title)}</h3>`;
    values.forEach((value) => {
      const label = document.createElement('label');
      label.innerHTML = `<input type="checkbox" value="${escapeHtml(value)}"> ${escapeHtml(value)}`;
      panel.appendChild(label);
    });
    if (withEmail) {
      const label = document.createElement('label');
      label.style.display = 'grid';
      label.innerHTML = `E-mail observado<input type="text" data-extra-email>`;
      panel.appendChild(label);
    }
    document.documentElement.appendChild(panel);
    state.sidePanels.push(panel);
  };

  const readPanelData = (name) => {
    const panel = document.querySelector(`[data-side-name="${name}"]`);
    if (!panel) return { checked: [], email: '' };
    return {
      checked: Array.from(panel.querySelectorAll('input[type="checkbox"]:checked')).map((item) => item.value),
      email: nodeText(panel.querySelector('[data-extra-email]'))
    };
  };

  const saveConsoleForm = async (analysis) => {
    const form = document.querySelector('[data-console-form="true"]');
    if (!form) return;
    const data = {};
    form.querySelectorAll('[data-console-name]').forEach((field) => {
      if (field.type === 'checkbox') data[field.dataset.consoleName] = field.checked;
      else data[field.dataset.consoleName] = field.value;
    });
    data.mediaChecks = readPanelData('mediaChecks').checked;
    const divergence = readPanelData('divergenceChecks');
    data.divergenceChecks = divergence.checked;
    data.emailObservado = divergence.email;
    data.handling = detectHandling();

    const issuer = await issuerMatch(analysis.issuerName || data.issuerName);
    const saved = Memory.saveCurrent({
      ...analysis,
      issuerId: analysis.issuerId || (issuer && issuer.id) || '',
      issuerAllowlistDays: issuer && issuer.allowlistDays,
      consoleData: data,
      handling: data.handling,
      sourcePage: 'console'
    });
    Memory.addHistory({
      kind: 'console',
      caseNumber: saved.caseNumber,
      issuerName: saved.issuerName,
      accountId: saved.accountId,
      flow: saved.flow,
      analysis: saved,
      consoleData: data
    });
    closeSidePanels();
    Memory.toast('Dados do Console salvos.', 'ok');
  };

  const openTabulador = () => {
    const analysis = Memory.getCurrent();
    const nodes = [];
    if (!analysis) {
      nodes.push(alertNode('warn', 'Nenhum dado de análise encontrado em memória local nas últimas 12 horas.'));
    } else {
      nodes.push(section('Análise carregada', grid(summaryItems(analysis), analysis)));
      nodes.push(decisionButtons(analysis));
    }
    makeWindow('SAC Prevenção - Tabulador', analysis ? analysis.flow : '', nodes);
  };

  const summaryItems = (analysis) => [
    { key: 'caseNumber', label: 'Caso', value: analysis.caseNumber },
    { key: 'issuerName', label: 'Emissor', value: analysis.issuerName },
    { key: 'accountId', label: 'Conta', value: analysis.accountId },
    { key: 'flow', label: 'Fluxo', value: analysis.flow },
    { key: 'rule', label: 'Regra', value: analysis.rule },
    { key: 'value', label: 'Valor', value: analysis.value }
  ];

  const decisionButtons = (analysis) => {
    const node = document.createElement('div');
    node.className = 'sac-decision-grid';
    const decisions = [
      ['FRAUDE', 'danger'],
      ['NÃO FRAUDE', 'ok'],
      ['NÃO FOI POSSÍVEL CONFIRMAR FRAUDE', 'warn long'],
      ['NÃO FOI POSSÍVEL CONFIRMAR NÃO FRAUDE', 'primary long']
    ];
    decisions.forEach(([label, tone], index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `sac-btn ${tone}`;
      button.dataset.decisionIndex = String(index + 1);
      button.textContent = label;
      button.addEventListener('click', () => applyDecision(label, analysis));
      node.appendChild(button);
    });
    return section('Decisão', node);
  };

  const applyDecision = async (decision, analysis) => {
    try {
      const result = await Tabulator.apply(decision, analysis);
      openReady(result.text, analysis);
    } catch (error) {
      Memory.toast(error.message || 'Falha ao aplicar tabulação.', 'danger');
    }
  };

  const openReady = (text, analysis) => {
    const nodes = [
      alertNode('ok', 'Tabulação pronta copiada. Campos críticos confirmados no Tabulador.'),
      section('Prévia', grid([{ label: 'Texto', value: text }], analysis || {})),
      actionsNode([
        { label: 'Copiar', tone: 'primary', onClick: async () => { await Memory.copyText(text); closeMain(); Memory.toast('Tabulação copiada novamente.', 'ok'); } },
        { label: 'Mudar decisão', tone: 'ghost', onClick: () => openTabulador() }
      ])
    ];
    makeWindow('Tabulação pronta', analysis ? analysis.flow : '', nodes);
  };

  const openHistory = () => {
    const history = Memory.getHistory();
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div class="sac-search-row">
        <input type="search" data-history-search placeholder="Pesquisar caso, emissor ou conta">
        <select data-history-flow>
          <option value="">Todos</option>
          <option value="banking">BANKING</option>
          <option value="card">CARTÃO</option>
          <option value="hold">HOLD</option>
        </select>
      </div>
      <div class="sac-grid" data-history-list></div>
    `;
    const render = () => {
      const query = normalize(wrap.querySelector('[data-history-search]').value);
      const flow = normalize(wrap.querySelector('[data-history-flow]').value);
      const list = wrap.querySelector('[data-history-list]');
      list.replaceChildren();
      history
        .filter((item) => !flow || normalize(item.flow) === flow)
        .filter((item) => {
          const hay = normalize([item.caseNumber, item.issuerName, item.accountId, item.flow, item.finalDecision].join(' '));
          return !query || hay.includes(query);
        })
        .forEach((item) => {
          const row = document.createElement('div');
          row.className = 'sac-list-card';
          row.innerHTML = `
            <strong>${escapeHtml(item.caseNumber || 'Sem caso')} · ${escapeHtml((item.flow || '').toUpperCase())}</strong>
            <small>${escapeHtml(item.issuerName || 'Emissor N/A')} · Conta ${escapeHtml(item.accountId || 'N/A')}</small>
            <small>${escapeHtml(item.finalDecision || item.kind || 'registro')} ${item.finalMotive ? `· ${escapeHtml(item.finalMotive)}` : ''}</small>
          `;
          list.appendChild(row);
        });
      if (!list.children.length) {
        list.appendChild(alertNode('warn', 'Nenhum histórico encontrado para o filtro.'));
      }
    };
    wrap.addEventListener('input', render);
    wrap.addEventListener('change', render);
    render();
    makeWindow('Histórico SAC', '', [wrap]);
  };

  const openLists = () => {
    const lists = Memory.getLists();
    const nodes = [];
    nodes.push(listSection('Allowlist', 'allowlist', lists.allowlist));
    nodes.push(listSection('CONTENÇÃO', 'contencao', lists.contencao));
    makeWindow('LISTAS SAC', '', nodes);
  };

  const listSection = (title, type, items) => {
    const wrap = document.createElement('div');
    wrap.className = 'sac-section';
    wrap.innerHTML = `<h3>${escapeHtml(title)}</h3>`;
    if (!items.length) {
      wrap.appendChild(alertNode('warn', 'Sem itens pendentes.'));
      return wrap;
    }
    items.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'sac-list-card';
      const value = type === 'allowlist' ? item.accountId : item.documentClean;
      card.innerHTML = `
        <strong>${escapeHtml(item.caseNumber || 'Sem caso')} · ${escapeHtml(item.issuerName || 'Emissor N/A')}</strong>
        <small>${escapeHtml(type === 'allowlist' ? 'ID conta' : 'CPF/CNPJ limpo')}: ${escapeHtml(value || 'N/A')}</small>
        <small>Início ${escapeHtml(item.startDate)} · Final ${escapeHtml(item.endDate)} · Regra ${escapeHtml(item.rule || 'N/A')}</small>
      `;
      card.appendChild(actionsNode([
        { label: 'INSERIR', tone: 'ok', onClick: () => insertListItem(type, item) },
        { label: 'REMOVER', tone: 'danger', onClick: () => { Memory.applyListAction(type, item.id, 'REMOVER'); openLists(); } }
      ]));
      wrap.appendChild(card);
    });
    return wrap;
  };

  const insertListItem = (type, item) => {
    const value = type === 'allowlist' ? item.accountId : item.documentClean;
    if (!compact(value)) {
      Memory.toast('Item sem chave para aplicar na LISTA.', 'danger');
      return;
    }
    fillListFields(item, value);
    Memory.applyListAction(type, item.id, 'INSERIR');
    Memory.toast('LISTA aplicada e item removido da memória.', 'ok');
    openLists();
  };

  const fillListFields = (item, value) => {
    const first = queryFirst(SELECTORS.lists.first) || firstVisibleTextInput(0);
    const second = queryFirst(SELECTORS.lists.second) || firstVisibleTextInput(1);
    const start = queryFirst(SELECTORS.lists.start);
    const end = queryFirst(SELECTORS.lists.end);
    setNativeValue(first, value);
    setNativeValue(second, value);
    setNativeValue(start, item.startDate);
    setNativeValue(end, item.endDate);
    const issuer = queryFirst(SELECTORS.lists.issuer);
    if (issuer && issuer.options) selectRealOption(issuer, [item.issuerId, item.issuerName]);
    if (!item.issuerId) Memory.toast('Emissor sem ID mapeado. Confira manualmente.', 'warn');
  };

  const firstVisibleTextInput = (index) => {
    const inputs = Array.from(document.querySelectorAll('input[type="text"],input:not([type]),input[type="search"]'))
      .filter((input) => input.offsetParent !== null && !input.disabled && !input.readOnly);
    return inputs[index] || null;
  };

  const setNativeValue = (field, value) => {
    if (!field) return false;
    field.focus();
    field.value = value || '';
    ['input', 'change', 'blur'].forEach((name) => field.dispatchEvent(new Event(name, { bubbles: true })));
    return true;
  };

  const selectRealOption = (select, labels) => {
    const wanted = labels.map(normalize).filter(Boolean);
    const option = Array.from(select.options).find((candidate) => {
      const text = normalize(candidate.textContent);
      const value = normalize(candidate.value);
      return wanted.some((label) => text === label || value === label || text.includes(label) || value.includes(label));
    });
    if (!option) return false;
    select.value = option.value;
    option.selected = true;
    ['input', 'change', 'blur'].forEach((name) => select.dispatchEvent(new Event(name, { bubbles: true })));
    return true;
  };

  const openConfig = () => {
    const config = Memory.getConfig();
    const wrap = document.createElement('div');
    wrap.className = 'sac-form';
    wrap.innerHTML = `
      <label class="sac-toggle" style="justify-content:flex-start"><input type="checkbox" data-config="safeMode" ${config.safeMode ? 'checked' : ''}>Modo seguro</label>
      <label class="sac-toggle" style="justify-content:flex-start"><input type="checkbox" data-config="helpMode" ${config.helpMode ? 'checked' : ''}>Modo ajuda</label>
      <label class="sac-field"><span>Largura</span><input type="number" data-config="width" min="360" max="620" value="${escapeHtml(config.width || WINDOW_WIDTH)}"></label>
      <div class="sac-alert warn">Modo seguro desligado permite seguir com alerta laranja e edição manual por duplo clique nos grids.</div>
    `;
    wrap.addEventListener('change', () => {
      const patch = {
        safeMode: wrap.querySelector('[data-config="safeMode"]').checked,
        helpMode: wrap.querySelector('[data-config="helpMode"]').checked,
        width: Number(wrap.querySelector('[data-config="width"]').value) || WINDOW_WIDTH
      };
      Memory.setConfig(patch);
      Memory.toast('Configuração salva.', 'ok');
    });
    makeWindow('Configuração SAC', '', [wrap]);
  };

  const detectPage = () => {
    const forced = document.body && document.body.dataset ? document.body.dataset.sacPreviewPage : '';
    if (forced) return forced;
    if (queryFirst(SELECTORS.tabulador.marker)) return 'tabulador';
    const hasConsoleButton = Array.from(document.querySelectorAll('button,a,input[type="button"],input[type="submit"]'))
      .some((node) => ['backoffice brasil', 'global backoffice'].some((label) => normalize(nodeText(node) || node.value).includes(label)));
    if (hasConsoleButton) return 'console';
    return 'falcon';
  };

  const openDetected = () => {
    const page = detectPage();
    if (page === 'tabulador') openTabulador();
    else if (page === 'console') openConsole();
    else openFalcon();
  };

  const shortcutHandler = (event) => {
    if (!state.activeWindow) return;
    const tag = event.target && event.target.tagName ? event.target.tagName.toLowerCase() : '';
    const typing = ['input', 'textarea', 'select'].includes(tag);
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMain();
      return;
    }
    if (typing) return;
    const keyName = event.key.toLowerCase();
    const actions = {
      h: openHistory,
      t: toggleTheme,
      r: openDetected,
      '0': openDetected,
      p: () => state.activeWindow && state.activeWindow.querySelector('[data-action="reset"]').click(),
      m: () => state.activeWindow && state.activeWindow.querySelector('[data-action="minimize"]').click()
    };
    if (actions[keyName]) {
      event.preventDefault();
      actions[keyName]();
      return;
    }
    if (event.key === 'Enter') {
      const primary = state.activeWindow.querySelector('.sac-btn.primary:not(:disabled)');
      if (primary) {
        event.preventDefault();
        primary.click();
      }
      return;
    }
    if (['1', '2', '3', '4'].includes(event.key)) {
      const decision = state.activeWindow.querySelector(`[data-decision-index="${event.key}"]`);
      if (decision) {
        event.preventDefault();
        decision.click();
      }
    }
  };

  const init = () => {
    ensureStyle();
    loadIssuerDirectory();
    document.addEventListener('keydown', shortcutHandler, true);
    state.cleanup.push(() => document.removeEventListener('keydown', shortcutHandler, true));
    if (!document.body || document.body.dataset.sacPreview === 'true') return;
    openDetected();
  };

  const destroy = () => {
    state.cleanup.splice(0).forEach((fn) => fn());
    closeMain();
    closeSidePanels();
    document.querySelectorAll('[data-sac-root="true"],#sac-prevencao-style').forEach((node) => node.remove());
  };

  window.SACPrevencao = {
    VERSION,
    open: (page) => {
      if (page === 'tabulador') openTabulador();
      else if (page === 'console') openConsole();
      else if (page === 'history') openHistory();
      else if (page === 'lists') openLists();
      else openFalcon();
    },
    openDetected,
    destroy,
    collectFalcon,
    detectPage
  };

  init();
})();
