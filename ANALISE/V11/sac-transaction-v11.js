(function SACTransactionV11Factory() {
  "use strict";

  if (window.SACTransactionV11) return;

  const ENGINE_VERSION = "2.1.0";
  let provider = null;

  const ISSUER_PROFILES = Object.freeze([
    Object.freeze({
      keys: ["REDEFROTA", "REDE FROTA", "FROTABANK"],
      name: "REDEFROTA",
      expected: ["Recebimentos de alto valor podem fazer parte do perfil de caminhoneiros.", "Gastos em postos, restaurantes e oficinas são recorrentes.", "Relacionamento com Posto Marajó é esperado."],
      cautions: ["Alto valor isolado não sustenta suspeita.", "Falta de contato isolada não sustenta bloqueio."]
    }),
    Object.freeze({
      keys: ["ONLYPAY"],
      name: "ONLYPAY",
      expected: ["Casos JIRA podem identificar cliente premiado."],
      cautions: ["Cliente premiado indicado em JIRA utiliza allowlist por 5 dias corridos."]
    }),
    Object.freeze({
      keys: ["AMIGOZ"],
      name: "AMIGOZ",
      expected: ["A análise deve considerar a confirmação do cliente e o PID."],
      cautions: ["Não aplicar bloqueio sem tentativa de contato.", "Bloqueio apenas com não reconhecimento ou fraude crítica evidente."]
    }),
    Object.freeze({
      keys: ["CONTA SIMPLES"],
      name: "CONTA SIMPLES",
      expected: ["Contas antigas e sem risco podem ser elegíveis à allowlist."],
      cautions: ["Conta ou CNPJ recente, nome suspeito ou indício de fraude exigem atenção reforçada."]
    }),
    Object.freeze({
      keys: ["BEMOL"],
      name: "BEMOL",
      expected: ["O perfil esperado está concentrado na região Norte."],
      cautions: ["DDD fora da região Norte é sinal de atenção.", "A regra boleto_valor_suspeito é crítica."]
    }),
    Object.freeze({
      keys: ["JEITTO"],
      name: "JEITTO",
      expected: ["Perfil de baixo volume e pequenos valores para necessidades cotidianas.", "Empréstimos iniciais costumam variar entre R$ 50,00 e R$ 200,00."],
      cautions: ["Duas ou mais P2P próximas, valor individual acima de R$ 5.000,00, mais de R$ 2.000,00 em 24h ou R$ 10.000,00 no mês exigem revisão."]
    }),
    Object.freeze({
      keys: ["GETNET"],
      name: "GETNET",
      expected: ["Recebíveis, débito, reserva diária e lançamentos 301 podem compor o extrato esperado."],
      cautions: ["O transacional e o histórico de infrações têm maior peso; documentação não determina pendência para esse emissor."]
    }),
    Object.freeze({
      keys: ["JSLNEW", "JSL NEW"],
      name: "JSLNEW",
      expected: ["Primeiro P2P recebido de conta vinculada ao emissor é compatível com o perfil de caminhoneiros."],
      cautions: ["Transações entre terceiros sem relação com o perfil esperado podem indicar conta laranja."]
    }),
    Object.freeze({
      keys: ["NOH"],
      name: "NOH",
      expected: ["Conta compartilhada por casais; relação entre remetente e destinatário deve ser considerada."],
      cautions: ["Valores acima de R$ 2.000,00, conta recente e movimentação incompatível exigem atenção reforçada."]
    }),
    Object.freeze({
      keys: ["WUDIPAY", "WUDI PAY"],
      name: "WUDIPAY",
      expected: ["Alertas do antifraude seguem tratamento operacional como não fraude."],
      cautions: ["Não aplicar bloqueio por esse alerta sem outra orientação formal."]
    }),
    Object.freeze({
      keys: ["EZZEPAY", "EZZE PAY"],
      name: "EZZEPAY",
      expected: ["Opera com conta única e foco em Pix Checkout."],
      cautions: ["Alertas seguem tratamento operacional como não fraude; não bloquear pelo alerta isolado."]
    }),
    Object.freeze({
      keys: ["MEU TUDO", "MEUTUDO"],
      name: "MEU TUDO",
      expected: ["Bloqueio depende da confirmação de fraude pelo cliente."],
      cautions: ["Sem contato ou confirmação, não bloquear pelo evento isolado."]
    }),
    Object.freeze({
      keys: ["TRAMPAY"],
      name: "TRAMPAY",
      expected: ["Perfil relacionado a entregadores e motoboys."],
      cautions: ["Cliente fora do perfil, combinado com indícios de fraude, exige revisão."]
    })
  ]);

  const FALCON_ROW_FIELDS = Object.freeze({
    rule: ["RULESTEXT_VALUE1", "RULESTEXT_VALUE", "RULES_TEXT"],
    date: ["TRANSACTION_DTTM_VALUE", "TRANSACTION_DATE_VALUE"],
    amount: ["TRANSACTION_AMT_VALUE", "TRANSACTION_AMOUNT_VALUE"],
    debitCustomerId: ["DEBIT_CUSTOMER_XID_VALUE"],
    creditCustomerId: ["CREDIT_CUSTOMER_XID_VALUE"],
    debitAccount: ["DEBIT_ACCOUNT_NUM_VALUE"],
    creditAccount: ["CREDIT_ACCOUNT_NUM_VALUE"],
    payerName: ["CREDIT_PAYER_NAME_VALUE"]
  });

  function normalizeText(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[–—−]/g, "-")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
  }

  function containsP2P(value) {
    return /(^|[^A-Z0-9])P2P([^A-Z0-9]|$)/.test(normalizeText(value));
  }

  function issuerProfileFor(value) {
    const issuer = normalizeText(value);
    const profile = ISSUER_PROFILES.find((item) => item.keys.some((key) => issuer.includes(normalizeText(key))));
    return profile ? Object.freeze({ name: profile.name, expected: Object.freeze(profile.expected.slice()), cautions: Object.freeze(profile.cautions.slice()) }) : null;
  }

  function textOf(node) {
    return String(node?.innerText ?? node?.textContent ?? "").replace(/\s+/g, " ").trim();
  }

  function falconFieldText(row, field) {
    const tokens = FALCON_ROW_FIELDS[field] || [];
    const nodes = Array.from(row?.querySelectorAll?.("[id]") || []);
    const match = nodes.find((node) => tokens.some((token) => String(node.id || "").includes(`:${token}`)) && textOf(node));
    return textOf(match);
  }

  function falconRowIndex(row) {
    const nodes = Array.from(row?.querySelectorAll?.("[id]") || []);
    return nodes.map((node) => String(node.id || "").match(/_(\d+)$/)?.[1] || "").find(Boolean) || "";
  }

  function parseBrazilianAmount(value) {
    const source = String(value ?? "").replace(/[^0-9,.-]/g, "");
    const normalized = source.includes(",") ? source.replace(/\./g, "").replace(",", ".") : source;
    const amount = Number.parseFloat(normalized);
    return Number.isFinite(amount) ? amount : 0;
  }

  function parseSignedAmount(value) {
    const text = String(value ?? "").trim();
    const amount = Math.abs(parseBrazilianAmount(text));
    return /^\s*-/.test(text) || /-\s*R\$/i.test(text) ? -amount : amount;
  }

  function parseTransactionDate(value) {
    const text = String(value || "").trim();
    const match = text.match(/(\d{2})\/(\d{2})\/(\d{4})\D+(\d{2}):(\d{2})(?::(\d{2}))?/);
    if (!match) return Number.NaN;
    return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]), Number(match[4]), Number(match[5]), Number(match[6] || 0)).getTime();
  }

  function collectConsoleTransactions(root = document) {
    if (!root?.querySelectorAll) return Object.freeze([]);
    const tables = Array.from(root.querySelectorAll("table"));
    const table = tables.find((candidate) => {
      const headers = Array.from(candidate.querySelectorAll("th")).map((node) => normalizeText(textOf(node)));
      return headers.includes("DATA E HORA") && headers.includes("VALOR")
        && (headers.includes("DESCRICAO") || headers.includes("OPERACAO"));
    });
    if (!table) return Object.freeze([]);
    const headers = Array.from(table.querySelectorAll("th")).map((node) => normalizeText(textOf(node)));
    const indexOf = (...labels) => headers.findIndex((header) => labels.includes(header));
    const indexes = {
      date: indexOf("DATA E HORA"),
      description: indexOf("DESCRICAO", "OPERACAO"),
      counterparty: indexOf("BENEFICIARIO", "ESTABELECIMENTO"),
      category: indexOf("CATEGORIA"),
      status: indexOf("STATUS"),
      amount: indexOf("VALOR")
    };
    const source = headers.includes("OPERACAO") ? "GLOBAL" : "BRASIL";
    const rows = Array.from(table.querySelectorAll("tr")).flatMap((row, rowIndex) => {
      const cells = Array.from(row.querySelectorAll(":scope > td"));
      if (!cells.length || indexes.date < 0 || indexes.amount < 0) return [];
      const valueAt = (index) => index >= 0 ? textOf(cells[index]) : "";
      const amountText = valueAt(indexes.amount);
      const signedAmount = parseSignedAmount(amountText);
      const description = valueAt(indexes.description);
      return [Object.freeze({
        rowIndex,
        source,
        dateText: valueAt(indexes.date),
        timestamp: parseTransactionDate(valueAt(indexes.date)),
        description,
        category: valueAt(indexes.category),
        counterparty: valueAt(indexes.counterparty),
        status: valueAt(indexes.status),
        amountText,
        signedAmount,
        amount: Math.abs(signedAmount),
        direction: signedAmount < 0 ? "DEBIT" : "CREDIT",
        p2p: containsP2P(description) || /PIX/.test(normalizeText(description))
      })];
    });
    return Object.freeze(rows);
  }

  function transactionMetrics(rows = []) {
    const items = Array.isArray(rows) ? rows : [];
    const validTimes = items.map((row) => Number(row.timestamp)).filter(Number.isFinite).sort((a, b) => a - b);
    let shortIntervals = 0;
    for (let index = 1; index < validTimes.length; index += 1) {
      if (validTimes[index] - validTimes[index - 1] <= 10 * 60 * 1000) shortIntervals += 1;
    }
    const credits = items.filter((row) => row.direction === "CREDIT");
    const debits = items.filter((row) => row.direction === "DEBIT");
    const creditAmount = credits.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const debitAmount = debits.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const largestAmount = Math.max(0, ...items.map((row) => Number(row.amount || 0)));
    const counterparties = new Set(items.map((row) => normalizeText(
      typeof row.counterparty === "object" ? row.counterparty?.document || row.counterpartyName : row.counterparty
    )).filter(Boolean));
    const p2pRows = items.filter((row) => row.p2p);
    const unusualHours = items.filter((row) => Number.isFinite(row.timestamp) && new Date(row.timestamp).getHours() < 6).length;
    const largerSide = Math.max(creditAmount, debitAmount);
    const passThroughRatio = largerSide ? Math.abs(creditAmount - debitAmount) / largerSide : 1;
    const chronological = items.filter((row) => Number.isFinite(row.timestamp)).slice().sort((a, b) => a.timestamp - b.timestamp);
    const maxRollingAmount = (windowMs) => {
      let left = 0;
      let sum = 0;
      let maximum = 0;
      chronological.forEach((row, right) => {
        sum += Number(row.amount || 0);
        while (chronological[right].timestamp - chronological[left].timestamp > windowMs) {
          sum -= Number(chronological[left].amount || 0);
          left += 1;
        }
        maximum = Math.max(maximum, sum);
      });
      return maximum;
    };
    const monthlyTotals = new Map();
    chronological.forEach((row) => {
      const date = new Date(row.timestamp);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      monthlyTotals.set(key, Number(monthlyTotals.get(key) || 0) + Number(row.amount || 0));
    });
    return Object.freeze({
      count: items.length,
      validDateCount: validTimes.length,
      periodStart: validTimes[0] || 0,
      periodEnd: validTimes[validTimes.length - 1] || 0,
      periodDurationMs: validTimes.length > 1 ? validTimes[validTimes.length - 1] - validTimes[0] : 0,
      creditCount: credits.length,
      debitCount: debits.length,
      creditAmount,
      debitAmount,
      totalAmount: creditAmount + debitAmount,
      largestAmount,
      uniqueCounterparties: counterparties.size,
      p2pCount: p2pRows.length,
      shortIntervals,
      unusualHours,
      maxAmount24h: maxRollingAmount(24 * 60 * 60 * 1000),
      maxMonthlyAmount: Math.max(0, ...monthlyTotals.values()),
      passThrough: credits.length > 0 && debits.length > 0 && passThroughRatio <= 0.12,
      passThroughRatio
    });
  }

  function collectFalconTransactions(input = {}) {
    const root = input.root || (typeof document !== "undefined" ? document : null);
    if (!root?.querySelectorAll) return Object.freeze([]);
    const transactionType = String(input.transactionType || "");
    const selectCounterparty = window.SACCounterpartyV11?.selectFalconCounterparty;
    const rows = Array.from(root.querySelectorAll("tr,[role='row']"))
      .filter((row) => {
        const checkbox = row.querySelector?.("input[id*='caseTranGridVwColSelCheckBox']");
        if (!checkbox) return false;
        const directRow = checkbox.closest?.("tr,[role='row']");
        return !directRow || directRow === row;
      })
      .map((row) => {
        const debitCustomerId = falconFieldText(row, "debitCustomerId");
        const creditCustomerId = falconFieldText(row, "creditCustomerId");
        const counterparty = typeof selectCounterparty === "function"
          ? selectCounterparty({ transactionType, debitCustomerId, creditCustomerId })
          : { direction: "BOTH", sourceField: "", sourceLabel: "", document: "", cnpj: "", cpf: "" };
        const amountText = falconFieldText(row, "amount");
        const dateText = falconFieldText(row, "date");
        const rule = falconFieldText(row, "rule");
        const normalizedType = normalizeText(transactionType);
        const direction = normalizedType.includes("DEPOSITO BANCARIO DE VAREJO")
          ? "CREDIT"
          : normalizedType.includes("PAGAMENTO BANCARIO DE VAREJO") ? "DEBIT" : "UNKNOWN";
        return Object.freeze({
          rowIndex: falconRowIndex(row),
          transactionType,
          rule,
          date: dateText,
          dateText,
          timestamp: parseTransactionDate(dateText),
          amountText,
          amount: parseBrazilianAmount(amountText),
          signedAmount: direction === "DEBIT" ? -parseBrazilianAmount(amountText) : parseBrazilianAmount(amountText),
          direction,
          p2p: containsP2P(`${transactionType} ${rule}`),
          debitCustomerId,
          creditCustomerId,
          debitAccount: falconFieldText(row, "debitAccount"),
          creditAccount: falconFieldText(row, "creditAccount"),
          payerName: falconFieldText(row, "payerName"),
          counterpartyName: falconFieldText(row, "payerName"),
          counterparty
        });
      });
    return Object.freeze(rows);
  }

  function summarizeFalconTransactions(rows = []) {
    const items = Array.isArray(rows) ? rows : [];
    const metrics = transactionMetrics(items);
    const counterparties = new Map();
    let totalAmount = 0;

    items.forEach((row) => {
      totalAmount += Number(row?.amount || 0);
      const document = String(row?.counterparty?.document || "");
      if (!document) return;
      const current = counterparties.get(document) || {
        document,
        cnpj: String(row?.counterparty?.cnpj || ""),
        cpf: String(row?.counterparty?.cpf || ""),
        direction: String(row?.counterparty?.direction || "BOTH"),
        sourceLabel: String(row?.counterparty?.sourceLabel || "ID da contraparte"),
        payerNames: new Set(),
        transactionCount: 0,
        totalAmount: 0
      };
      if (row?.payerName) current.payerNames.add(String(row.payerName));
      current.transactionCount += 1;
      current.totalAmount += Number(row?.amount || 0);
      counterparties.set(document, current);
    });

    return Object.freeze({
      transactionCount: items.length,
      validDateCount: metrics.validDateCount,
      periodStart: metrics.periodStart,
      periodEnd: metrics.periodEnd,
      periodDurationMs: metrics.periodDurationMs,
      totalAmount,
      p2pDetected: items.some((row) => containsP2P(`${row?.transactionType || ""} ${row?.rule || ""}`)),
      uniqueCounterpartyCount: counterparties.size,
      counterparties: Object.freeze(Array.from(counterparties.values(), (item) => Object.freeze({
        ...item,
        payerNames: Object.freeze(Array.from(item.payerNames))
      })))
    });
  }

  function signal(kind, code, title, detail, points = 0) {
    return Object.freeze({ kind, code, title, detail, points });
  }

  function rowSignals(rows, input = {}) {
    const metrics = transactionMetrics(rows);
    const issuer = normalizeText(input.issuer);
    const signals = [];
    if (metrics.p2pCount > 0) {
      signals.push(signal("favorable", "P2P_PRESENT", "P2P identificado", "Ponto favorável à decisão de não fraude conforme a regra operacional definida.", 1));
    }
    if (metrics.passThrough && metrics.count >= 2) {
      signals.push(signal("attention", "PASS_THROUGH", "Possível passagem de recursos", "Entradas e saídas possuem valores próximos. Verifique triangulação e retenção de saldo.", 0));
    }
    if (metrics.shortIntervals >= 3) {
      signals.push(signal("attention", "TRANSACTION_BURST", "Movimentações em intervalo curto", `${metrics.shortIntervals} intervalos de até 10 minutos foram identificados.`, 0));
    }
    if (metrics.uniqueCounterparties >= 5) {
      signals.push(signal("attention", "MANY_COUNTERPARTIES", "Muitas pessoas ou empresas diferentes", `${metrics.uniqueCounterparties} pessoas ou empresas diferentes aparecem no período carregado.`, 0));
    }
    if (metrics.unusualHours >= 2) {
      signals.push(signal("attention", "UNUSUAL_HOURS", "Horário incomum", `${metrics.unusualHours} movimentações ocorreram entre 00h e 06h.`, 0));
    }
    if (issuer.includes("JEITTO")) {
      if (metrics.largestAmount > 5000) signals.push(signal("alert", "JEITTO_SINGLE_HIGH", "Valor fora do perfil Jeitto", "Há movimentação individual acima de R$ 5.000,00.", -1));
      if (metrics.maxAmount24h > 2000) signals.push(signal("attention", "JEITTO_24H_HIGH", "Volume de 24h fora do perfil Jeitto", "A soma móvel de 24 horas supera R$ 2.000,00.", 0));
      if (metrics.maxMonthlyAmount > 10000) signals.push(signal("attention", "JEITTO_MONTH_HIGH", "Volume mensal elevado para Jeitto", "O maior total mensal carregado supera R$ 10.000,00.", 0));
      if (metrics.p2pCount >= 2 && metrics.shortIntervals > 0) signals.push(signal("attention", "JEITTO_P2P_BURST", "P2P em curto período", "Duas ou mais movimentações P2P próximas exigem conferência do perfil Jeitto.", 0));
    }
    if (issuer.includes("REDEFROTA") || issuer.includes("REDE FROTA") || issuer.includes("FROTABANK")) {
      const expectedMerchant = rows.some((row) => /POSTO|COMBUST|RESTAUR|OFICINA|MARAJO/.test(normalizeText(`${row.counterparty} ${row.description}`)));
      if (expectedMerchant) signals.push(signal("favorable", "REDEFROTA_EXPECTED", "Movimentação compatível com REDEFROTA", "Foram encontrados postos, restaurantes, oficinas ou Posto Marajó no período analisado.", 1));
      if (metrics.largestAmount >= 5000) signals.push(signal("neutral", "REDEFROTA_HIGH_VALUE_CONTEXT", "Alto valor contextualizado", "Recebimentos altos são comuns neste emissor e não representam suspeita isoladamente.", 0));
    }
    if (issuer.includes("GETNET")) {
      const expected = rows.some((row) => /RECEBIVE|RESERVA DIARIA|DEBITO|(^|\D)301(\D|$)/.test(normalizeText(`${row.category} ${row.description}`)));
      if (expected) signals.push(signal("favorable", "GETNET_EXPECTED", "Lançamento esperado para Getnet", "Recebíveis, débito, reserva diária ou lançamento 301 foram identificados.", 1));
    }
    if (issuer.includes("JSLNEW") && metrics.p2pCount > 0) {
      signals.push(signal("favorable", "JSLNEW_P2P_CONTEXT", "P2P compatível com o perfil JSLNEW", "Confirme se o crédito veio de conta vinculada ao emissor; nesse cenário, o comportamento é esperado.", 1));
    }
    if (issuer === "NOH" || issuer.includes(" NOH")) {
      if (metrics.largestAmount > 2000) signals.push(signal("attention", "NOH_HIGH_VALUE", "Valor elevado para NOH", "Há movimentação acima de R$ 2.000,00; avalie vínculo, renda, região e idade da conta.", 0));
    }
    if (issuer.includes("BEMOL") && input.dddAssessment) {
      const ddd = input.dddAssessment;
      signals.push(signal(ddd.severity === "danger" ? "alert" : ddd.severity === "success" ? "favorable" : "attention", `BEMOL_DDD_${ddd.status}`, ddd.label, ddd.reason, ddd.severity === "danger" ? -1 : ddd.severity === "success" ? 1 : 0));
    }
    return { metrics, signals };
  }

  function counterpartySignal(result) {
    const classification = normalizeText(result?.classification);
    if (classification === "TRUSTED") {
      return signal(
        "favorable",
        "COUNTERPARTY_TRUSTED",
        "CNPJ de quem enviou ou recebeu está cadastrado como confiável",
        result?.reason || "CNPJ localizado na base de empresas confiáveis.",
        1
      );
    }
    if (classification === "UNTRUSTED") {
      return signal(
        "alert",
        "COUNTERPARTY_UNTRUSTED",
        "CNPJ de quem enviou ou recebeu exige atenção",
        result?.reason || "CNPJ localizado na base de atenção elevada.",
        -1
      );
    }
    if (classification === "REVIEW") {
      return signal(
        "attention",
        "COUNTERPARTY_REVIEW",
        "CNPJ de quem enviou ou recebeu precisa de revisão",
        result?.reason || "A classificação de quem enviou ou recebeu precisa ser conferida.",
        0
      );
    }
    return null;
  }

  function analyze(input = {}) {
    const transactionText = [input.transactionType, input.rule, input.description]
      .map(normalizeText)
      .filter(Boolean)
      .join(" | ");
    const signals = [];

    if (containsP2P(transactionText) && !(Array.isArray(input.rows) && input.rows.some((row) => row.p2p))) {
      signals.push(signal(
        "favorable",
        "P2P_PRESENT",
        "P2P identificado",
        "Ponto favorável à decisão de não fraude conforme a regra operacional definida.",
        1
      ));
    }

    const counterpart = counterpartySignal(input.counterpartyResult);
    if (counterpart) signals.push(counterpart);

    const mapped = rowSignals(input.rows || [], input);
    mapped.signals.forEach((item) => {
      if (!signals.some((existing) => existing.code === item.code)) signals.push(item);
    });

    const favorablePoints = signals
      .filter((item) => item.kind === "favorable")
      .reduce((total, item) => total + Math.max(0, item.points), 0);
    const alertPoints = signals
      .filter((item) => item.kind === "alert")
      .reduce((total, item) => total + Math.abs(Math.min(0, item.points)), 0);
    const attentionCount = signals.filter((item) => item.kind === "attention").length;

    let classification = "NO_SIGNAL";
    let label = "SEM SINAIS CADASTRADOS";
    if (alertPoints > 0 || attentionCount > 0) {
      classification = "REVIEW";
      label = "REVISÃO RECOMENDADA";
    } else if (favorablePoints > 0) {
      classification = "FAVORABLE";
      label = "SINAL FAVORÁVEL A NÃO FRAUDE";
    }

    return Object.freeze({
      engineVersion: ENGINE_VERSION,
      classification,
      label,
      favorablePoints,
      alertPoints,
      attentionCount,
      p2pDetected: signals.some((item) => item.code === "P2P_PRESENT"),
      signals: Object.freeze(signals.slice()),
      metrics: mapped.metrics,
      issuerProfile: issuerProfileFor(input.issuer),
      disclaimer: "Apoio à análise. A decisão permanece com o analista."
    });
  }

  async function analyzeConsole(input = {}) {
    const root = input.root || (typeof document !== "undefined" ? document : null);
    const adapter = provider || window.SACConsoleTransactionAdapter || null;
    if (adapter && typeof adapter.scan === "function" && (typeof adapter.canScan !== "function" || adapter.canScan(root))) {
      const mapped = await adapter.scan(root);
      return Object.freeze({
        ...analyze({ ...input, ...mapped }),
        source: "CONSOLE_MAPPED",
        mappingPending: false,
        metrics: mapped?.metrics || {}
      });
    }
    const rows = collectConsoleTransactions(root);
    if (rows.length) {
      const analyzed = analyze({ ...input, rows });
      return Object.freeze({
        ...analyzed,
        source: `CONSOLE_${rows[0].source}`,
        mappingPending: false,
        rows
      });
    }
    return Object.freeze({
      ...analyze(input),
      source: "TRANSPORTED_CONTEXT",
      mappingPending: true,
      metrics: {}
    });
  }

  function useProvider(nextProvider) {
    if (!nextProvider || typeof nextProvider.scan !== "function") throw new Error("TRANSACTION_PROVIDER_INVALID");
    provider = nextProvider;
  }

  window.SACTransactionV11 = Object.freeze({
    version: ENGINE_VERSION,
    normalizeText,
    containsP2P,
    parseBrazilianAmount,
    parseSignedAmount,
    parseTransactionDate,
    collectConsoleTransactions,
    transactionMetrics,
    issuerProfileFor,
    collectFalconTransactions,
    summarizeFalconTransactions,
    analyze,
    analyzeConsole,
    useProvider
  });
})();
