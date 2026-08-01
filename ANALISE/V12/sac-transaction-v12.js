(function SACTransactionV12Factory() {
  "use strict";

  if (window.SACTransactionV12) return;

  const ENGINE_VERSION = "2.3.0";
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
      keys: ["NATURA"],
      name: "NATURA",
      expected: ["O histórico e a compatibilidade da movimentação com o perfil da conta devem ser considerados."],
      cautions: ["Boletos em alto volume ou alto valor, combinados com conta nova, ausência de histórico ou documentação fora do padrão, exigem atenção reforçada."]
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
    merchant: ["MERCHANT_NAME_VALUE", "MERCHANT_DBA_NAME_VALUE", "CARD_ACCEPTOR_NAME_VALUE"],
    merchantId: ["MERCHANT_XID_VALUE", "CARD_ACCEPTOR_XID_VALUE"],
    entryMode: ["TRANSACTION_POSTING_ENTRY_XFLG_VALUE", "TRANSACTION_ENTRY_MODE_VALUE", "POS_ENTRY_MODE_VALUE"],
    decision: ["FALCON_DECISION_CODE_VALUE", "FALCON_DECISION_VALUE"],
    authorizationResponse: ["AUTHORIZATION_RESPONSE_XCD_VALUE"],
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

  function documentInText(value) {
    const source = String(value ?? "");
    const formatted = source.match(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b|\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/);
    if (formatted) return formatted[0].replace(/\D/g, "");
    const compact = source.replace(/[^0-9A-Za-z]/g, " ").split(/\s+/).find((token) => /^\d{11}$|^\d{14}$/.test(token));
    return compact || "";
  }

  function transactionCounterparties(rows = []) {
    const grouped = new Map();
    (Array.isArray(rows) ? rows : []).forEach((row) => {
      const objectValue = typeof row?.counterparty === "object" ? row.counterparty : null;
      const documentValue = String(row?.counterpartyDocument || objectValue?.document || documentInText(row?.counterparty) || "").replace(/\D/g, "");
      const name = String(row?.counterpartyName || (typeof row?.counterparty === "string" ? row.counterparty : "") || row?.payerName || "").replace(/\s+/g, " ").trim();
      const key = documentValue || normalizeText(name);
      if (!key) return;
      const current = grouped.get(key) || { key, document: documentValue, name, transactionCount: 0, totalAmount: 0 };
      current.transactionCount += 1;
      current.totalAmount += Number(row?.amount || 0);
      if (!current.name && name) current.name = name;
      grouped.set(key, current);
    });
    return Object.freeze(Array.from(grouped.values(), (item) => Object.freeze({ ...item })));
  }

  function p2pRelationshipMetrics(rows = [], input = {}) {
    const issuer = normalizeText(input.issuer);
    const holderDocument = String(input.holderDocument || input.customerDocument || "").replace(/\D/g, "");
    let issuerCount = 0;
    let personalCount = 0;
    (Array.isArray(rows) ? rows : []).filter((row) => row?.p2p || containsP2P(`${row?.description || ""} ${row?.transactionType || ""}`)).forEach((row) => {
      const objectValue = typeof row?.counterparty === "object" ? row.counterparty : null;
      const documentValue = String(row?.counterpartyDocument || objectValue?.document || documentInText(row?.counterparty) || "").replace(/\D/g, "");
      const context = normalizeText(`${row?.counterpartyName || ""} ${typeof row?.counterparty === "string" ? row.counterparty : ""} ${row?.payerName || ""} ${row?.description || ""}`);
      if ((holderDocument && documentValue === holderDocument) || /MESMA TITULARIDADE|PROPRIA TITULARIDADE|ENTRE CONTAS PROPRIAS/.test(context)) personalCount += 1;
      if ((issuer.length >= 3 && context.includes(issuer)) || /P2P (?:DO|PARA O|VINDO DO) EMISSOR/.test(context)) issuerCount += 1;
    });
    return Object.freeze({ issuerCount, personalCount });
  }

  function cardEntryMode(value) {
    const mode = normalizeText(value);
    if (!mode || mode === "A") return "";
    if (mode === "V" || /CHIP|SENHA|PIN/.test(mode)) return "CHIP E SENHA";
    if (mode === "D" || /APROX|CONTACTLESS|NFC/.test(mode)) return "APROXIMAÇÃO";
    if (mode === "K" || /MANUAL|DIGITAD/.test(mode)) return "DIGITADO MANUAL";
    if (mode === "E" || /E.?COMMERCE|ECOMMERCE/.test(mode)) return "E-COMMERCE";
    return mode;
  }

  function isCardTransaction(input = {}, rows = []) {
    if (normalizeText(input.flow) === "CARD" || normalizeText(input.flow) === "CARTAO") return true;
    const context = normalizeText(`${input.transactionType || ""} ${input.description || ""}`);
    if (/AUTORIZACAO|LANCAMENTO DE CREDITO|CREDIT AUTHORIZATION/.test(context)) return true;
    return rows.some((row) => Boolean(row?.merchant || row?.merchantId || cardEntryMode(row?.entryMode || row?.entryModeCode)));
  }

  function cardActivity(rows = []) {
    const items = Array.isArray(rows) ? rows : [];
    const merchants = new Map();
    let chipPinCount = 0;
    let attentionModeCount = 0;
    items.forEach((row) => {
      const mode = cardEntryMode(row?.entryMode || row?.entryModeCode);
      if (mode === "CHIP E SENHA") chipPinCount += 1;
      if (["APROXIMAÇÃO", "DIGITADO MANUAL", "E-COMMERCE"].includes(mode)) attentionModeCount += 1;
      const name = String(row?.merchant || "").replace(/\s+/g, " ").trim();
      const id = String(row?.merchantId || "").trim();
      const key = normalizeText(id || name);
      if (!key) return;
      const current = merchants.get(key) || {
        key,
        name: name || id,
        id,
        count: 0,
        amount: 0,
        modes: new Set(),
        decisions: new Set(),
        attentionModeCount: 0,
        chipPinCount: 0
      };
      current.count += 1;
      current.amount += Number(row?.amount || 0);
      if (mode) current.modes.add(mode);
      if (row?.decision) current.decisions.add(normalizeText(row.decision));
      if (mode === "CHIP E SENHA") current.chipPinCount += 1;
      if (["APROXIMAÇÃO", "DIGITADO MANUAL", "E-COMMERCE"].includes(mode)) current.attentionModeCount += 1;
      merchants.set(key, current);
    });
    const merchantList = Array.from(merchants.values(), (item) => Object.freeze({
      ...item,
      modes: Object.freeze(Array.from(item.modes)),
      decisions: Object.freeze(Array.from(item.decisions))
    }));
    return Object.freeze({
      chipPinCount,
      attentionModeCount,
      merchantCount: merchantList.length,
      repeatedMerchantCount: merchantList.filter((item) => item.count >= 2).length,
      repeatedAttentionMerchantCount: merchantList.filter((item) => item.attentionModeCount >= 2).length,
      merchants: Object.freeze(merchantList)
    });
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

  function transactionIsBlocked(row = {}) {
    if (typeof row.blocked === "boolean") return row.blocked;
    const state = normalizeText(`${row.status || ""} ${row.decision || ""} ${row.authorizationResponse || ""}`);
    return /NEGAD|RECUSAD|DECLIN|BLOQUEAD|FALH|ERRO|NAO PROCESSAD|CANCELAD/.test(state);
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
      counterparty: indexOf("BENEFICIARIO", "ESTABELECIMENTO", "CONTRAPARTE", "ORIGEM", "DESTINO"),
      document: indexOf("CPF/CNPJ", "CPF OU CNPJ", "DOCUMENTO", "DOCUMENTO DA CONTRAPARTE"),
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
      const counterparty = valueAt(indexes.counterparty);
      const counterpartyDocument = documentInText(valueAt(indexes.document) || counterparty || textOf(row));
      const status = valueAt(indexes.status);
      return [Object.freeze({
        rowIndex,
        source,
        dateText: valueAt(indexes.date),
        timestamp: parseTransactionDate(valueAt(indexes.date)),
        description,
        category: valueAt(indexes.category),
        counterparty,
        counterpartyName: counterparty.replace(/\b\d{11,14}\b/g, "").trim(),
        counterpartyDocument,
        status,
        amountText,
        signedAmount,
        amount: Math.abs(signedAmount),
        direction: signedAmount < 0 ? "DEBIT" : "CREDIT",
        p2p: containsP2P(description),
        blocked: /NEGAD|RECUSAD|DECLIN|BLOQUEAD|FALH|ERRO|NAO PROCESSAD|CANCELAD/.test(normalizeText(status))
      })];
    });
    return Object.freeze(rows);
  }

  function transactionMetrics(rows = [], input = {}) {
    const items = Array.isArray(rows) ? rows : [];
    const effectiveItems = items.filter((row) => !transactionIsBlocked(row));
    const validTimes = items.map((row) => Number(row.timestamp)).filter(Number.isFinite).sort((a, b) => a - b);
    const effectiveTimes = effectiveItems.map((row) => Number(row.timestamp)).filter(Number.isFinite).sort((a, b) => a - b);
    let shortIntervals = 0;
    for (let index = 1; index < effectiveTimes.length; index += 1) {
      if (effectiveTimes[index] - effectiveTimes[index - 1] <= 10 * 60 * 1000) shortIntervals += 1;
    }
    const credits = effectiveItems.filter((row) => row.direction === "CREDIT");
    const debits = effectiveItems.filter((row) => row.direction === "DEBIT");
    const creditAmount = credits.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const debitAmount = debits.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const sortedAmounts = effectiveItems.map((row) => Number(row.amount || 0)).filter(Number.isFinite).sort((a, b) => a - b);
    const largestAmount = Math.max(0, ...sortedAmounts);
    const medianAmount = sortedAmounts.length
      ? sortedAmounts.length % 2
        ? sortedAmounts[Math.floor(sortedAmounts.length / 2)]
        : (sortedAmounts[(sortedAmounts.length / 2) - 1] + sortedAmounts[sortedAmounts.length / 2]) / 2
      : 0;
    const counterparties = new Set(effectiveItems.map((row) => normalizeText(
      typeof row.counterparty === "object" ? row.counterparty?.document || row.counterpartyName : row.counterparty
    )).filter(Boolean));
    const p2pRows = items.filter((row) => row.p2p);
    const unusualHourRows = effectiveItems.filter((row) => Number.isFinite(row.timestamp) && new Date(row.timestamp).getHours() < 6);
    const unusualHours = unusualHourRows.length;
    const unusualHoursAmount = unusualHourRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const chronological = effectiveItems.filter((row) => Number.isFinite(row.timestamp)).slice().sort((a, b) => a.timestamp - b.timestamp);
    let lowToHighEscalations = 0;
    for (let index = 1; index < chronological.length; index += 1) {
      const previous = Number(chronological[index - 1].amount || 0);
      const current = Number(chronological[index].amount || 0);
      const elapsed = chronological[index].timestamp - chronological[index - 1].timestamp;
      if (previous > 0 && current >= previous * 4 && current - previous >= 500 && elapsed <= 30 * 60 * 1000) {
        lowToHighEscalations += 1;
      }
    }
    let passThroughPairs = 0;
    let passThroughRatio = 1;
    chronological.forEach((entry, index) => {
      if (!["CREDIT", "DEBIT"].includes(entry.direction)) return;
      for (let nextIndex = index + 1; nextIndex < chronological.length; nextIndex += 1) {
        const exit = chronological[nextIndex];
        const elapsed = exit.timestamp - entry.timestamp;
        if (elapsed > 10 * 60 * 1000) break;
        if (!["CREDIT", "DEBIT"].includes(exit.direction) || exit.direction === entry.direction) continue;
        const largerAmount = Math.max(Number(entry.amount || 0), Number(exit.amount || 0));
        if (!largerAmount) continue;
        const ratio = Math.abs(Number(entry.amount || 0) - Number(exit.amount || 0)) / largerAmount;
        passThroughRatio = Math.min(passThroughRatio, ratio);
        if (ratio <= 0.12) {
          passThroughPairs += 1;
          break;
        }
      }
    });
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
    const maxRollingCount = (windowMs) => {
      let left = 0;
      let maximum = 0;
      chronological.forEach((row, right) => {
        while (chronological[right].timestamp - chronological[left].timestamp > windowMs) left += 1;
        maximum = Math.max(maximum, right - left + 1);
      });
      return maximum;
    };
    const monthlyTotals = new Map();
    chronological.forEach((row) => {
      const date = new Date(row.timestamp);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      monthlyTotals.set(key, Number(monthlyTotals.get(key) || 0) + Number(row.amount || 0));
    });
    const p2pRelationships = p2pRelationshipMetrics(items, input);
    const groupedCounterparties = transactionCounterparties(effectiveItems);
    const repeatedCounterpartyCount = groupedCounterparties.filter((item) => item.transactionCount >= 2).length;
    const blockedAttemptCount = items.filter(transactionIsBlocked).length;
    const attemptedAmount = items.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    return Object.freeze({
      count: items.length,
      effectiveCount: effectiveItems.length,
      blockedAttemptCount,
      validDateCount: validTimes.length,
      periodStart: validTimes[0] || 0,
      periodEnd: validTimes[validTimes.length - 1] || 0,
      periodDurationMs: validTimes.length > 1 ? validTimes[validTimes.length - 1] - validTimes[0] : 0,
      creditCount: credits.length,
      debitCount: debits.length,
      creditAmount,
      debitAmount,
      totalAmount: creditAmount + debitAmount,
      attemptedAmount,
      largestAmount,
      medianAmount,
      uniqueCounterparties: counterparties.size,
      counterparties: groupedCounterparties,
      repeatedCounterpartyCount,
      p2pCount: p2pRows.length,
      p2pIssuerCount: p2pRelationships.issuerCount,
      p2pPersonalCount: p2pRelationships.personalCount,
      shortIntervals,
      velocity1m: maxRollingCount(60 * 1000),
      velocity5m: maxRollingCount(5 * 60 * 1000),
      velocity10m: maxRollingCount(10 * 60 * 1000),
      unusualHours,
      unusualHoursAmount,
      maxAmount24h: maxRollingAmount(24 * 60 * 60 * 1000),
      maxMonthlyAmount: Math.max(0, ...monthlyTotals.values()),
      passThrough: passThroughPairs > 0,
      passThroughPairs,
      passThroughRatio,
      lowToHighEscalations
    });
  }

  function collectFalconTransactions(input = {}) {
    const root = input.root || (typeof document !== "undefined" ? document : null);
    if (!root?.querySelectorAll) return Object.freeze([]);
    const transactionType = String(input.transactionType || "");
    const selectCounterparty = window.SACCounterpartyV12?.selectFalconCounterparty;
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
        const decision = falconFieldText(row, "decision");
        const authorizationResponse = falconFieldText(row, "authorizationResponse");
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
          p2p: containsP2P(transactionType),
          merchant: falconFieldText(row, "merchant"),
          merchantId: falconFieldText(row, "merchantId"),
          entryModeCode: falconFieldText(row, "entryMode"),
          entryMode: cardEntryMode(falconFieldText(row, "entryMode")),
          decision,
          authorizationResponse,
          blocked: Boolean(rule) || /NEGAD|RECUSAD|DECLIN|BLOQUEAD|FALH|ERRO|NAO PROCESSAD|CANCELAD/.test(normalizeText(`${decision} ${authorizationResponse}`)),
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

  function summarizeFalconTransactions(rows = [], input = {}) {
    const items = Array.isArray(rows) ? rows : [];
    const metrics = transactionMetrics(items, input);
    const card = cardActivity(items);
    const counterparties = new Map();
    let totalAmount = 0;

    items.forEach((row) => {
      if (transactionIsBlocked(row)) return;
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
      effectiveTransactionCount: metrics.effectiveCount,
      blockedAttemptCount: metrics.blockedAttemptCount,
      attemptedAmount: metrics.attemptedAmount,
      validDateCount: metrics.validDateCount,
      periodStart: metrics.periodStart,
      periodEnd: metrics.periodEnd,
      periodDurationMs: metrics.periodDurationMs,
      totalAmount,
      p2pDetected: items.some((row) => row?.p2p || containsP2P(`${row?.transactionType || ""} ${row?.description || ""}`)),
      p2pCount: metrics.p2pCount,
      p2pIssuerCount: metrics.p2pIssuerCount,
      p2pPersonalCount: metrics.p2pPersonalCount,
      velocity1m: metrics.velocity1m,
      velocity5m: metrics.velocity5m,
      velocity10m: metrics.velocity10m,
      unusualHours: metrics.unusualHours,
      unusualHoursAmount: metrics.unusualHoursAmount,
      largestAmount: metrics.largestAmount,
      medianAmount: metrics.medianAmount,
      repeatedCounterpartyCount: metrics.repeatedCounterpartyCount,
      lowToHighEscalations: metrics.lowToHighEscalations,
      passThrough: metrics.passThrough,
      passThroughPairs: metrics.passThroughPairs,
      uniqueCounterpartyCount: counterparties.size,
      merchantCount: card.merchantCount,
      chipPinCount: card.chipPinCount,
      attentionModeCount: card.attentionModeCount,
      repeatedMerchantCount: card.repeatedMerchantCount,
      repeatedAttentionMerchantCount: card.repeatedAttentionMerchantCount,
      merchants: card.merchants,
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
    const metrics = transactionMetrics(rows, input);
    const issuer = normalizeText(input.issuer);
    const transactionContext = normalizeText([
      input.transactionType,
      input.rule,
      input.description,
      ...rows.flatMap((row) => [row?.description, row?.category, row?.rule])
    ].filter(Boolean).join(" | "));
    const signals = [];
    if (isCardTransaction(input, rows)) {
      const card = cardActivity(rows);
      if (card.chipPinCount > 0) {
        signals.push(signal("favorable", "CARD_CHIP_PIN", "Chip e senha identificado", `${card.chipPinCount} tentativa${card.chipPinCount === 1 ? "" : "s"} com chip e senha foram identificadas. Esse modo é um sinal favorável de autenticação.`, 1));
      }
      const riskyRepeated = card.merchants.filter((item) => item.attentionModeCount >= 2);
      if (riskyRepeated.length) {
        const details = riskyRepeated.map((item) => `${item.name}: ${item.attentionModeCount} tentativas (${item.modes.join(", ")})`).join(" · ");
        signals.push(signal("alert", "CARD_REPEATED_RISKY_MERCHANT", "Repetição suspeita no mesmo estabelecimento", `${details}. Aproximação, digitado manual e e-commerce repetidos exigem atenção reforçada.`, -1));
      }
      const otherRepeated = card.merchants.filter((item) => item.count >= 2 && item.attentionModeCount < 2);
      if (otherRepeated.length) {
        const details = otherRepeated.map((item) => `${item.name}: ${item.count} tentativas`).join(" · ");
        signals.push(signal("attention", "CARD_REPEATED_MERCHANT", "Tentativas repetidas no mesmo estabelecimento", `${details}. Confira intervalo, valores, decisões e histórico de compra do cliente.`, 0));
      }
      return {
        metrics: Object.freeze({
          ...metrics,
          merchantCount: card.merchantCount,
          chipPinCount: card.chipPinCount,
          attentionModeCount: card.attentionModeCount,
          repeatedMerchantCount: card.repeatedMerchantCount,
          repeatedAttentionMerchantCount: card.repeatedAttentionMerchantCount
        }),
        signals
      };
    }
    if (metrics.p2pCount > 0) {
      signals.push(signal("favorable", "P2P_PRESENT", "P2P identificado", "Ponto favorável à decisão de não fraude conforme a regra operacional definida.", 1));
    }
    if (metrics.passThrough && metrics.count >= 2) {
      signals.push(signal("attention", "PASS_THROUGH", "Possível passagem de recursos", "Entradas e saídas possuem valores próximos. Verifique triangulação e retenção de saldo.", 0));
    }
    if (metrics.lowToHighEscalations > 0) {
      signals.push(signal("attention", "LOW_TO_HIGH_ESCALATION", "Teste seguido de valor elevado", `${metrics.lowToHighEscalations} sequência${metrics.lowToHighEscalations === 1 ? "" : "s"} começou com valor baixo e subiu rapidamente para valor alto.`, 0));
    }
    if (metrics.uniqueCounterparties >= 5) {
      signals.push(signal("attention", "MANY_COUNTERPARTIES", "Muitas pessoas ou empresas diferentes", `${metrics.uniqueCounterparties} pessoas ou empresas diferentes aparecem no período carregado.`, 0));
    }
    if (metrics.unusualHours >= 2) {
      signals.push(signal("attention", "UNUSUAL_HOURS", "Horário incomum", `${metrics.unusualHours} movimentações ocorreram entre 00h e 06h.`, 0));
    }
    const boletoDeposit = /DEPOSITO/.test(transactionContext) && /BOLETO/.test(transactionContext);
    const highRiskBoleto = /BOLETO_VALOR_SUSPEITO|BOL_VLR_SUSPEITO|ALTO_RISCO[^|]*BOLETO|BOLETO[^|]*ALTO_RISCO|BOLETO[^|]*VALOR_SUSPEITO/.test(transactionContext);
    if (boletoDeposit && highRiskBoleto) {
      const bemol = issuer.includes("BEMOL");
      signals.push(signal(
        "alert",
        "HIGH_VALUE_BOLETO_DEPOSIT",
        "Depósito por boleto de alto valor",
        bemol
          ? "A regra boleto_valor_suspeito é de alto risco para BEMOL; o book orienta fraude e SPD 15."
          : "A regra ou descrição identifica depósito por boleto de alto valor. Confira recorrência, histórico, idade da conta e documentação.",
        -1
      ));
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
    const transactionText = [input.transactionType, input.description]
      .map(normalizeText)
      .filter(Boolean)
      .join(" | ");
    const signals = [];
    const cardFlow = isCardTransaction(input, input.rows || []);

    const mappedRows = Array.isArray(input.rows) ? input.rows : [];
    if (!cardFlow && containsP2P(transactionText) && mappedRows.length === 0) {
      signals.push(signal(
        "favorable",
        "P2P_PRESENT",
        "P2P identificado",
        "Ponto favorável à decisão de não fraude conforme a regra operacional definida.",
        1
      ));
    }

    const counterpart = cardFlow ? null : counterpartySignal(input.counterpartyResult);
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

  window.SACTransactionV12 = Object.freeze({
    version: ENGINE_VERSION,
    normalizeText,
    containsP2P,
    cardEntryMode,
    isCardTransaction,
    cardActivity,
    parseBrazilianAmount,
    parseSignedAmount,
    parseTransactionDate,
    collectConsoleTransactions,
    transactionCounterparties,
    transactionMetrics,
    issuerProfileFor,
    collectFalconTransactions,
    summarizeFalconTransactions,
    analyze,
    analyzeConsole,
    useProvider
  });
})();
