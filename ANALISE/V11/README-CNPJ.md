# Arquitetura de Contrapartes por CNPJ - V11

Esta arquitetura prepara a consulta de CNPJs confiáveis e não confiáveis sem ativar decisões automáticas. A conclusão continua pertencendo ao analista.

A base combina 18 registros confirmados pelo usuário com 82 CNPJs autorizados nacionalmente pela SPA e dois CNPJs operando por decisão judicial. Como GAMEWIZ BRASIL LTDA está tanto na lista operacional de revisão quanto na lista nacional da SPA, o resultado permanece `REVIEW` por conflito explícito.

## Arquivos

- `sac-counterparty-v11.js`: motor de validação, atualização, cache e classificação.
- `sac-corporate-v11.js`: motor cadastral que cruza a situação da Receita Federal com a classificação operacional.
- `sac-transaction-v11.js`: motor de sinais transacionais. Nesta versão, P2P soma um ponto favorável a não fraude e a classificação do CNPJ pode complementar a leitura.
- `counterparty-registry-v11.json`: snapshot seguro e versionado. Começa vazio para não inventar classificações.
- `rfb-cnpj-registry-v11.json`: snapshot compacto reservado aos dados oficiais já sincronizados.
- `counterparty-registry-v11.schema.json`: contrato dos dados aceitos.

## Resultado operacional

O motor aceita apenas CNPJ válido. CPF retorna `NOT_APPLICABLE`.

- `TRUSTED`: exibe `SINAL FAVORÁVEL A NÃO FRAUDE`.
- `UNTRUSTED`: exibe `ORIGEM OU DESTINO NÃO CONFIÁVEL`.
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

## Integração no Console

O `Modo investigação` fica desligado por padrão. Quando ativado, uma aba discreta abre o painel lateral. `Verificar CNPJ` aparece no Falcon quando o documento de quem enviou ou recebeu na linha laranja for um CNPJ válido; `Análise transacional` aparece quando houver transações mapeadas. O BigData não mostra painel: somente coleta PID/mídia e transporta o resultado ao Console.

- `Análise transacional`: avalia somente sinais explicitamente cadastrados. P2P adiciona um ponto favorável a não fraude.
- `Verificar CNPJ`: consulta a base versionada e apresenta a classificação em um indicador dentro do próprio grid do CNPJ.
- a mesma consulta mostra nome fantasia ou razão social, abertura e situação cadastral em grids compactos.
- situação `INAPTA`, `BAIXADA`, `SUSPENSA` ou `NULA` e empresa com menos de três meses recebem alerta pulsante vermelho.
- nenhum resultado seleciona decisão ou Motivo Status automaticamente.

O Falcon não possui uma coluna chamada CNPJ, mas o documento de quem enviou ou recebeu pode estar nos IDs da linha laranja. Em `Depósito bancário de varejo`, o motor lê a coluna de crédito (`CREDIT_CUSTOMER_XID_VALUE`); em `Pagamento bancário de varejo`, lê a coluna de origem/débito (`DEBIT_CUSTOMER_XID_VALUE`). A seleção é feita no mesmo índice da linha de regra, data e valor. Quando o ID passa na validação de CNPJ, o painel é preenchido automaticamente. Caso seja CPF ou valor inválido, a consulta empresarial permanece vazia. O documento do titular do Console nunca é reutilizado como documento da outra parte.

## Situação cadastral da Receita Federal

O cruzamento mantém duas conclusões separadas:

1. situação cadastral oficial: `ATIVA`, `SUSPENSA`, `INAPTA`, `BAIXADA` ou `NULA`;
2. classificação operacional: `TRUSTED`, `UNTRUSTED`, `REVIEW` ou `UNKNOWN`.

Situação `ATIVA` não transforma automaticamente uma contraparte em confiável. Situação diferente de `ATIVA` gera revisão cadastral, mesmo que exista um cadastro favorável na lista interna.

O arquivo público no GitHub não recebe credenciais. O motor consulta primeiro o snapshot sincronizado e, na ausência, tenta automaticamente a BrasilAPI, baseada nos dados públicos da Receita, sem abrir outra página. Integração oficial em tempo real com SERPRO continua exigindo um serviço intermediário autorizado, pois segredo OAuth nunca deve ficar no bookmarklet.

## Mídia e análise transacional

O motor transacional lê os campos mapeados dos HTMLs do Console e Falcon, calcula volume, direção, intervalos, concentração, passagem de saldo e horários, informa o período efetivamente analisado e cruza as particularidades explícitas do book por emissor. P2P é ponto favorável a não fraude, mas nenhum sinal decide o caso sozinho.

A investigação de mídia segue `FALCON > BigData (opcional) > CONSOLE`. O Falcon cria um pedido identificado por caso e CPF; o BigData coleta silenciosamente e devolve o resultado para a mesma identidade. O CPF do bloco de dados pessoais precisa coincidir com o pedido. Só conta processo em que esse mesmo CPF seja parte ré/polo passivo. Variações de assunto são classificadas por palavras-chave tolerantes. Resultado sem categoria criminal compatível é `SEM MÍDIA` e atualiza o campo do Console para `não`; com ocorrência, o Console recebe `sim` e as categorias marcadas automaticamente.

## Próxima integração automática

Quando a página que expõe o CNPJ da contraparte estiver disponível, o Console fornecerá ao motor somente:

```js
await window.SACCounterpartyV11.classify({
  cnpj: contraparte.cnpj,
  issuer: dadosConsole.issuer,
  direction: transacao.direction
});
```

As regras adicionais de velocidade, valores e comportamento só serão implementadas depois do mapeamento dos books, sem limites presumidos.
