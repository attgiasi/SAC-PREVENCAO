(() => {
  'use strict';

  if (window.SACTabulator && typeof window.SACTabulator.destroy === 'function') {
    window.SACTabulator.destroy();
  }

  const Memory = window.SACMemory;
  const VERSION = 'V1';

  const FIELD_SELECTORS = {
    dataEntrada: ['#txt_data_entrada', '[name="txt_data_entrada"]'],
    horaEntrada: ['#txt_hora_entrada', '[name="txt_hora_entrada"]'],
    tipoDocumento: ['#ddl_tipoDoc', '[name="ddl_tipoDoc"]'],
    cpf: ['#txt_cpf', '[name="txt_cpf"]'],
    cnpj: ['#txt_cnpj', '[name="txt_cnpj"]'],
    emissor: ['#ddl_idemissor', '[name="ddl_idemissor"]'],
    valor: ['#txt_ValorTransacao', '[name="txt_ValorTransacao"]'],
    tipoChamada: ['#ddl_TipoChamada', '[name="ddl_TipoChamada"]'],
    statusChamada: ['#ddl_ChamadaAtiva', '[name="ddl_ChamadaAtiva"]'],
    fila: ['#ddl_Fila', '[name="ddl_Fila"]'],
    ecTransacao: [
      '#EcTransacao',
      '[name="EcTransacao"]',
      '[data-sac-tab-field="EcTransacao"]',
      'input[id*="EcTransacao"]',
      'textarea[id*="EcTransacao"]'
    ],
    regra: [
      '#RegraListada',
      '[name="RegraListada"]',
      '[data-sac-tab-field="RegraListada"]',
      'input[id*="RegraListada"]',
      'textarea[id*="RegraListada"]'
    ],
    status: ['#ddl_status', '[name="ddl_status"]'],
    motivoStatus: ['#ddl_motivostatus', '[name="ddl_motivostatus"]'],
    observacoes: [
      '#txt_observacao',
      '#txt_observacoes',
      '#Observacao',
      '#Observacoes',
      '[name="Observacao"]',
      '[name="Observacoes"]',
      '[data-sac-tab-field="Observacoes"]',
      'textarea'
    ]
  };

  const DECISIONS = {
    FRAUDE: 'FRAUDE',
    NAO_FRAUDE: 'NÃO FRAUDE',
    NAO_CONFIRMAR_FRAUDE: 'NÃO FOI POSSÍVEL CONFIRMAR FRAUDE',
    NAO_CONFIRMAR_NAO_FRAUDE: 'NÃO FOI POSSÍVEL CONFIRMAR NÃO FRAUDE'
  };

  const SIGNATURE_COMPLEMENTS = [
    'SAC Prevenção',
    'Dock Teck Prevenção',
    'Backoffice Prevenção',
    'Personalizado'
  ];

  const normalize = (value) => Memory.normalize(value);
  const compact = (value) => Memory.compact(value);
  const cleanDocument = (value) => Memory.cleanDocument(value);

  const queryFirst = (selectors, root = document) => {
    for (const selector of selectors) {
      const node = root.querySelector(selector);
      if (node) return node;
    }
    return null;
  };

  const fireEvents = (element) => {
    ['input', 'change', 'blur'].forEach((name) => {
      element.dispatchEvent(new Event(name, { bubbles: true }));
    });
  };

  const setFieldValue = (keyName, value) => {
    const element = queryFirst(FIELD_SELECTORS[keyName]);
    if (!element) return false;
    element.focus();
    element.value = String(value ?? '');
    fireEvents(element);
    return true;
  };

  const selectOption = (keyName, labels) => {
    const select = queryFirst(FIELD_SELECTORS[keyName]);
    if (!select) {
      throw new Error(`Campo não encontrado: ${keyName}`);
    }
    const wanted = (Array.isArray(labels) ? labels : [labels]).map(normalize).filter(Boolean);
    const options = Array.from(select.options || []);
    const option = options.find((candidate) => {
      const text = normalize(candidate.textContent);
      const value = normalize(candidate.value);
      return wanted.some((label) => text === label || value === label);
    }) || options.find((candidate) => {
      const text = normalize(candidate.textContent);
      const value = normalize(candidate.value);
      return wanted.some((label) => label && (text.includes(label) || value.includes(label)));
    });

    if (!option) {
      throw new Error(`Opção real não encontrada em ${keyName}: ${wanted.join(' / ')}`);
    }

    select.value = option.value;
    option.selected = true;
    fireEvents(select);

    if (window.jQuery && typeof window.jQuery(select).selectpicker === 'function') {
      window.jQuery(select).selectpicker('refresh');
    }

    return option.textContent.trim();
  };

  const waitForOptions = async (keyName, minOptions = 2, timeoutMs = 3500) => {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const field = queryFirst(FIELD_SELECTORS[keyName]);
      if (field && field.options && field.options.length >= minOptions) return field;
      await new Promise((resolve) => window.setTimeout(resolve, 120));
    }
    return queryFirst(FIELD_SELECTORS[keyName]);
  };

  const splitDateTime = (analysis) => {
    const explicitDate = compact(analysis.dateEntrada || analysis.entryDate);
    const explicitHour = compact(analysis.horaEntrada || analysis.entryHour);
    if (explicitDate || explicitHour) {
      return { date: explicitDate, hour: explicitHour };
    }
    const raw = compact(analysis.dateTime);
    const match = raw.match(/(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}(?::\d{2})?)/);
    if (!match) return { date: '', hour: '' };
    return { date: match[1], hour: match[2] };
  };

  let issuerDirectoryPromise = null;

  const issuerDirectoryUrl = () => {
    const script = document.currentScript || Array.from(document.scripts).find((item) => item.src.includes('sac-tabulator-v1.js'));
    if (!script || !script.src) return './issuer-directory.json';
    return new URL('issuer-directory.json', script.src).toString();
  };

  const loadIssuerDirectory = async () => {
    if (issuerDirectoryPromise) return issuerDirectoryPromise;
    issuerDirectoryPromise = fetch(issuerDirectoryUrl(), { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error('issuer-directory indisponível');
        return response.json();
      })
      .catch((error) => {
        console.warn('[SACTabulator] Não foi possível carregar issuer-directory', error);
        return { issuers: [] };
      });
    return issuerDirectoryPromise;
  };

  const findIssuer = async (analysis) => {
    const directory = await loadIssuerDirectory();
    const name = normalize(analysis.issuerName || analysis.emissor);
    const id = compact(analysis.issuerId);
    const issuers = Array.isArray(directory.issuers) ? directory.issuers : [];
    const found = issuers.find((issuer) => compact(issuer.id) === id) || issuers.find((issuer) => {
      const candidates = [issuer.name, ...(issuer.aliases || [])].map(normalize);
      return candidates.includes(name);
    });
    if (!found && name) {
      Memory.toast('Emissor não encontrado no diretório. Confira manualmente no Tabulador.', 'warn');
    }
    return found || null;
  };

  const classifyDocument = (analysis) => {
    const clean = cleanDocument(analysis.document || analysis.documentClean || analysis.cpf || analysis.cnpj);
    if (clean.length > 11) return { type: 'CNPJ', cpf: '', cnpj: clean };
    return { type: 'CPF', cpf: clean, cnpj: '' };
  };

  const transactionQueue = (analysis) => {
    const flow = normalize(analysis.flow);
    if (flow === 'hold') return 'HOLD';
    if (flow === 'banking') return 'BANKING';
    const decision = normalize(analysis.transactionDecision || analysis.cardDecision);
    if (['approve', 'aprovada', 'autorizada', 'aprovado', 'autorizado'].some((word) => decision.includes(word))) {
      return 'CARTÕES APROVADAS';
    }
    if (['decline', 'recusada', 'reprovada', 'negada', 'recusado', 'negado'].some((word) => decision.includes(word))) {
      return 'CARTÕES RECUSADAS';
    }
    throw new Error('Decisão da transação do cartão não mapeada para fila.');
  };

  const callMapping = (analysis) => {
    const consoleData = analysis.consoleData || {};
    const jira = Boolean(consoleData.jira);
    const withCall = Boolean(consoleData.comChamada);
    const success = Boolean(consoleData.comSucesso);

    if (jira) {
      return { tipoChamada: 'RECEPTIVO', statusChamada: 'COM SUCESSO' };
    }
    if (!withCall) {
      return { tipoChamada: 'SEM CONTATO - PLANILHA', statusChamada: 'SEM CHAMADA' };
    }
    return {
      tipoChamada: 'ATIVA - PLANILHA',
      statusChamada: success ? 'COM SUCESSO' : 'SEM SUCESSO'
    };
  };

  const motiveForDecision = (analysis, decision) => {
    const flow = normalize(analysis.flow);
    const cleanDecision = normalize(decision);
    if (flow === 'card' && cleanDecision === normalize(DECISIONS.NAO_CONFIRMAR_FRAUDE)) {
      return 'CLIENTE NÃO ATENDE';
    }
    if (cleanDecision === 'fraude') return 'FRAUDE TRANSACIONAL';
    if (cleanDecision === 'nao fraude') return 'SEM SUSPEITAS';
    return 'DADOS INSUFICIENTES PARA ANÁLISE';
  };

  const valueOr = (analysis, value, fallback = 'N/A') => {
    const text = compact(value);
    if (text) return text;
    if (normalize(analysis.handling) === 'global' && normalize(analysis.flow) === 'card') {
      return 'ausência de dados';
    }
    return fallback;
  };

  const signatureText = (signature) => `${signature.name} | ${signature.complement}`;

  const buildBankingText = (analysis, decision, motive, signature) => {
    const consoleData = analysis.consoleData || {};
    return [
      `Valor da transação: ${valueOr(analysis, analysis.value)}`,
      `Regra: ${valueOr(analysis, analysis.rule)}`,
      `Histórico de Infrações: ${valueOr(analysis, analysis.infractionHistoryDisplay || analysis.infractionHistory)}`,
      `Mídia desabonadora: ${valueOr(analysis, consoleData.midiasDesabonadora)}`,
      `Status conta: ${valueOr(analysis, consoleData.statusConta || analysis.accountStatus)}`,
      `Status Pessoa (SPD): ${valueOr(analysis, consoleData.statusPessoa)}`,
      `Data de cadastro: ${valueOr(analysis, consoleData.dataCadastro || analysis.registrationDate)}`,
      `E-mail, DDD e Endereço: ${valueOr(analysis, consoleData.emailDddEndereco)}`,
      `Histórico SPD: ${valueOr(analysis, consoleData.historicoSpd)}`,
      `Documentação: ${valueOr(analysis, consoleData.documentacao)}`,
      `Extrato: ${valueOr(analysis, consoleData.extrato)}`,
      '',
      `Decisão: ${decision}`,
      `Motivo: ${motive}`,
      '',
      signatureText(signature)
    ].join('\n');
  };

  const buildCardText = (analysis, decision, motive, signature) => {
    const consoleData = analysis.consoleData || {};
    return [
      `Valor da transação: ${valueOr(analysis, analysis.value)}`,
      `Regra: ${valueOr(analysis, analysis.rule)}`,
      `Estabelecimento: ${valueOr(analysis, analysis.establishment)}`,
      `Status do cartão: ${valueOr(analysis, consoleData.statusCartao || analysis.cardStatus)}`,
      `Data de cadastro: ${valueOr(analysis, consoleData.dataCadastro || analysis.registrationDate)}`,
      `Histórico de compra no estabelecimento: ${valueOr(analysis, consoleData.historicoCompraEstabelecimento || analysis.purchaseHistoryAtMerchant)}`,
      `Padrão de compra: ${valueOr(analysis, consoleData.padraoCompra || analysis.purchasePattern)}`,
      '',
      `Decisão: ${decision}`,
      `Motivo: ${motive}`,
      '',
      signatureText(signature)
    ].join('\n');
  };

  const buildTabulation = (decision, analysis, signature) => {
    const motive = motiveForDecision(analysis, decision);
    const text = normalize(analysis.flow) === 'card'
      ? buildCardText(analysis, decision, motive, signature)
      : buildBankingText(analysis, decision, motive, signature);
    return { text, motive };
  };

  const ensureSignatureStyle = () => {
    if (document.getElementById('sac-signature-style')) return;
    const style = document.createElement('style');
    style.id = 'sac-signature-style';
    style.dataset.sacRoot = 'true';
    style.textContent = `
      .sac-signature-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.54);z-index:2147483646;display:grid;place-items:center;font-family:system-ui,-apple-system,Segoe UI,sans-serif}
      .sac-signature-modal{width:min(390px,calc(100vw - 28px));background:#101820;color:#f8fafc;border:1px solid #334155;border-radius:8px;box-shadow:0 20px 60px rgba(0,0,0,.38);padding:16px}
      .sac-signature-modal h2{font-size:16px;margin:0 0 12px}
      .sac-signature-modal label{display:grid;gap:6px;font-size:12px;color:#cbd5e1;margin:10px 0;text-align:left}
      .sac-signature-modal input,.sac-signature-modal select{width:100%;box-sizing:border-box;background:#0b1220;color:#f8fafc;border:1px solid #475569;border-radius:6px;padding:9px;font:13px system-ui}
      .sac-signature-modal .custom{display:none}
      .sac-signature-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:14px}
      .sac-signature-actions button{border:0;border-radius:6px;padding:9px 12px;font-weight:700;cursor:pointer}
      .sac-signature-actions .primary{background:#2563eb;color:#fff}
      .sac-signature-actions .ghost{background:#1f2937;color:#e5e7eb}
    `;
    document.documentElement.appendChild(style);
  };

  const requestSignature = () => new Promise((resolve) => {
    ensureSignatureStyle();
    const existing = Memory.getSignature();
    if (existing && existing.name) {
      resolve(existing);
      return;
    }

    const config = Memory.getConfig();
    const backdrop = document.createElement('div');
    backdrop.className = 'sac-signature-backdrop';
    backdrop.dataset.sacRoot = 'true';
    backdrop.innerHTML = `
      <div class="sac-signature-modal" role="dialog" aria-modal="true" aria-label="Assinatura">
        <h2>Assinatura da tabulação</h2>
        <label>Nome e sobrenome
          <input type="text" data-name autocomplete="name" placeholder="Nome Sobrenome">
        </label>
        <label>Complemento
          <select data-complement>
            ${SIGNATURE_COMPLEMENTS.map((item) => `<option value="${item}">${item}</option>`).join('')}
          </select>
        </label>
        <label class="custom">Complemento personalizado
          <input type="text" data-custom placeholder="Complemento">
        </label>
        <div class="sac-signature-actions">
          <button type="button" class="ghost" data-cancel>Agora não</button>
          <button type="button" class="primary" data-save>Salvar</button>
        </div>
      </div>
    `;
    document.documentElement.appendChild(backdrop);

    const nameInput = backdrop.querySelector('[data-name]');
    const complement = backdrop.querySelector('[data-complement]');
    const customWrap = backdrop.querySelector('.custom');
    const customInput = backdrop.querySelector('[data-custom]');
    complement.value = config.signatureComplement || SIGNATURE_COMPLEMENTS[0];

    const refreshCustom = () => {
      customWrap.style.display = complement.value === 'Personalizado' ? 'grid' : 'none';
    };
    complement.addEventListener('change', refreshCustom);
    refreshCustom();

    backdrop.querySelector('[data-cancel]').addEventListener('click', () => {
      backdrop.remove();
      resolve(null);
    });

    backdrop.querySelector('[data-save]').addEventListener('click', () => {
      const name = compact(nameInput.value);
      const selected = complement.value === 'Personalizado' ? compact(customInput.value) : complement.value;
      if (!name || !selected) {
        Memory.toast('Informe nome e complemento para assinar.', 'warn');
        return;
      }
      const signature = Memory.saveSignature({ name, complement: selected });
      backdrop.remove();
      resolve(signature);
    });

    nameInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') backdrop.querySelector('[data-save]').click();
    });
    nameInput.focus();
  });

  const applyFields = async (analysis, decision, tabulationText, motive) => {
    const doc = classifyDocument(analysis);
    const issuer = await findIssuer(analysis);
    const dateTime = splitDateTime(analysis);
    const call = callMapping(analysis);
    const queue = transactionQueue(analysis);
    const ecTransacao = normalize(analysis.flow) === 'card'
      ? valueOr(analysis, analysis.establishment)
      : valueOr(analysis, analysis.transactionType || analysis.tipoTransacao);

    setFieldValue('dataEntrada', dateTime.date);
    setFieldValue('horaEntrada', dateTime.hour);
    selectOption('tipoDocumento', [doc.type]);
    setFieldValue('cpf', doc.cpf);
    setFieldValue('cnpj', doc.cnpj);
    if (issuer) {
      selectOption('emissor', [issuer.id, issuer.name, analysis.issuerName]);
    } else if (analysis.issuerName || analysis.issuerId) {
      selectOption('emissor', [analysis.issuerId, analysis.issuerName]);
    }
    setFieldValue('valor', analysis.value);
    selectOption('tipoChamada', [call.tipoChamada]);
    selectOption('statusChamada', [call.statusChamada]);
    selectOption('fila', [queue]);
    setFieldValue('ecTransacao', ecTransacao);
    setFieldValue('regra', analysis.rule);
    selectOption('status', [decision]);
    await waitForOptions('motivoStatus');
    selectOption('motivoStatus', [motive]);
    setFieldValue('observacoes', tabulationText);

    const confirmations = confirmCritical();
    if (confirmations.missing.length) {
      throw new Error(`Campos críticos sem confirmação: ${confirmations.missing.join(', ')}`);
    }
    return confirmations;
  };

  const hasValue = (keyName) => {
    const field = queryFirst(FIELD_SELECTORS[keyName]);
    return Boolean(field && compact(field.value));
  };

  const confirmCritical = () => {
    const checks = [
      ['Tipo documento', 'tipoDocumento'],
      ['CPF/CNPJ', classifyDocument(Memory.getCurrent() || {}).type === 'CNPJ' ? 'cnpj' : 'cpf'],
      ['Emissor', 'emissor'],
      ['Tipo chamada', 'tipoChamada'],
      ['Status chamada', 'statusChamada'],
      ['Fila', 'fila'],
      ['Status', 'status'],
      ['Motivo Status', 'motivoStatus']
    ];
    const missing = checks.filter(([, keyName]) => !hasValue(keyName)).map(([label]) => label);
    return { missing };
  };

  const apply = async (decision, incomingAnalysis) => {
    const analysis = incomingAnalysis || Memory.getCurrent();
    if (!analysis) {
      throw new Error('Nenhuma análise SAC disponível em memória.');
    }
    const signature = await requestSignature();
    if (!signature) {
      throw new Error('Assinatura não informada.');
    }

    const { text, motive } = buildTabulation(decision, analysis, signature);
    await Memory.copyText(text);
    await applyFields(analysis, decision, text, motive);

    const saved = Memory.saveCurrent({
      ...analysis,
      finalDecision: decision,
      finalMotive: motive,
      tabulationText: text
    });
    Memory.updateListsFromDecision(saved, decision);
    Memory.addHistory({
      kind: 'tabulacao',
      caseNumber: saved.caseNumber,
      issuerName: saved.issuerName,
      accountId: saved.accountId,
      flow: saved.flow,
      analysis: saved,
      finalDecision: decision,
      finalMotive: motive,
      tabulationText: text
    });
    Memory.toast('Tabulação copiada e campos aplicados.', 'ok');
    return { text, motive, analysis: saved };
  };

  window.SACTabulator = {
    VERSION,
    DECISIONS,
    FIELD_SELECTORS,
    selectOption,
    buildTabulation,
    apply,
    confirmCritical,
    destroy() {
      document.querySelectorAll('.sac-signature-backdrop,#sac-signature-style').forEach((node) => node.remove());
    }
  };
})();
