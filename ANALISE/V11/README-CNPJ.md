# Arquitetura de Contrapartes por CNPJ - V11

Esta arquitetura prepara a consulta de CNPJs confiáveis e não confiáveis sem ativar decisões automáticas. A conclusão continua pertencendo ao analista.

A base combina 18 registros confirmados pelo usuário com 82 CNPJs autorizados nacionalmente pela SPA e dois CNPJs operando por decisão judicial. Como GAMEWIZ BRASIL LTDA está tanto na lista operacional de revisão quanto na lista nacional da SPA, o resultado permanece `REVIEW` por conflito explícito.

## Arquivos

- `sac-counterparty-v11.js`: motor de validação, atualização, cache e classificação.
- `counterparty-registry-v11.json`: snapshot seguro e versionado. Começa vazio para não inventar classificações.
- `counterparty-registry-v11.schema.json`: contrato dos dados aceitos.

## Resultado operacional

O motor aceita apenas CNPJ válido. CPF retorna `NOT_APPLICABLE`.

- `TRUSTED`: exibe `SINAL FAVORÁVEL A NÃO FRAUDE`.
- `UNTRUSTED`: exibe `CONTRAPARTE NÃO CONFIÁVEL`.
- `REVIEW`: informa conflito, validade expirada ou necessidade de revisão.
- `UNKNOWN`: informa que o CNPJ ainda não foi mapeado.

Esses resultados são sinais de apoio. Nenhum deles seleciona decisão ou Motivo Status automaticamente.

Porte, idade da empresa ou vínculo com um emissor são evidências favoráveis, mas não criam confiança automática. O CNPJ precisa estar cadastrado na base e regras específicas do emissor podem sobrepor a classificação global.

## Prioridade das regras

1. CNPJ completo antes da raiz empresarial.
2. Regra específica do emissor antes da regra `GLOBAL`.
3. Direção específica (`ORIGIN` ou `DESTINATION`) antes de `BOTH`.
4. Maior `priority` quando os demais critérios forem iguais.
5. Classificações contraditórias na mesma prioridade produzem `REVIEW`.

Um registro fora de `validFrom` e `validUntil` não é tratado como confiável. O resultado passa a ser `REVIEW`.

## Modelo de registro

```json
{
  "id": "identificador-interno",
  "cnpj": "<CNPJ>",
  "scope": "EXACT",
  "legalName": "<RAZÃO SOCIAL>",
  "aliases": ["<NOME CONHECIDO>"],
  "classification": "TRUSTED",
  "directions": ["ORIGIN"],
  "issuers": ["GLOBAL"],
  "category": "PAYROLL",
  "reason": "Pagamento empresarial confirmado pela fonte cadastrada.",
  "source": {
    "type": "INTERNAL",
    "label": "Base revisada pela operação",
    "url": ""
  },
  "validFrom": "2026-07-16T00:00:00-03:00",
  "validUntil": "2027-07-16T23:59:59-03:00",
  "reviewedAt": "2026-07-16T00:00:00-03:00",
  "active": true,
  "priority": 100
}
```

## CNPJ alfanumérico

O CNPJ é armazenado como texto, nunca como número. A normalização remove pontuação, preserva letras, converte para maiúsculas e valida as 14 posições e os dígitos verificadores.

## Atualização em nuvem

O motor usa um provedor substituível:

- padrão atual: JSON versionado no GitHub, consultado com cache desativado;
- produção em tempo real: Supabase/PostgreSQL ou API interna aprovada;
- edição simplificada: planilha Google usada apenas como painel de origem, com API intermediária entregando o JSON sanitizado.

O método `useProvider()` permite trocar o GitHub por um provedor que implemente `load()` e, opcionalmente, `subscribe()`. Assim a lógica de classificação não precisa ser reescrita.

Nunca colocar token administrativo, chave `service_role` ou token do GitHub no bookmarklet. O navegador deve receber somente leitura dos campos necessários. Dados transacionais, CPF, conta e valores não devem ser enviados para a base de CNPJs.

## Sincronização oficial da SPA

O script `tools/sync-spa-registry.ps1` baixa as duas bases publicadas pelo Ministério da Fazenda, extrai os CNPJs, consolida marcas e preserva todos os registros internos.

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\sync-spa-registry.ps1
```

- autorização nacional: `TRUSTED`, categoria `BET_AUTHORIZED`, prioridade 300;
- decisão judicial: `REVIEW`, categoria `BET_JUDICIAL`, prioridade 250;
- atenção interna: prioridade 200;
- classificação manual de mesma prioridade pode produzir conflito `REVIEW`.

O sincronizador remove somente registros gerados anteriormente com os prefixos `spa-national-` e `spa-judicial-`. A lista operacional nunca é apagada por essa atualização.

## Cache e indisponibilidade

- atualização padrão a cada 60 segundos;
- consulta remota com `cache: no-store`;
- última versão válida guardada localmente;
- falha de rede mantém o snapshot anterior marcado como `stale`;
- versão e data da base acompanham todo resultado.

## Próxima integração

Quando a página transacional e os books atualizados estiverem disponíveis, o Console fornecerá ao motor somente:

```js
await window.SACCounterpartyV11.classify({
  cnpj: contraparte.cnpj,
  issuer: dadosConsole.issuer,
  direction: transacao.direction
});
```

O painel transacional exibirá a classificação, o motivo, a fonte, a validade e a particularidade do emissor. As regras de velocidade, valores e comportamento só serão implementadas depois do mapeamento dos books, sem limites presumidos.
