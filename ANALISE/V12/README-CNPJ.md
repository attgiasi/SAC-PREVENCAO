# Arquitetura de Contrapartes por CNPJ - V12

Esta arquitetura prepara a consulta de CNPJs confiáveis e não confiáveis sem ativar decisões automáticas. A conclusão continua pertencendo ao analista.

A base combina 18 registros confirmados pelo usuário com 82 CNPJs autorizados nacionalmente pela SPA e dois CNPJs operando por decisão judicial. Como GAMEWIZ BRASIL LTDA está tanto na lista operacional de revisão quanto na lista nacional da SPA, o resultado permanece `REVIEW` por conflito explícito.

## Arquivos

- `sac-counterparty-v12.js`: motor de validação, atualização, cache e classificação.
- `sac-corporate-v12.js`: motor cadastral que cruza a situação da Receita Federal com a classificação operacional.
- `sac-transaction-v12.js`: motor de sinais transacionais. Nesta versão, P2P soma um ponto favorável a não fraude e a classificação do CNPJ pode complementar a leitura.
- `counterparty-registry-v12.json`: snapshot seguro e versionado com os registros operacionais e da SPA já validados.
- `rfb-cnpj-registry-v12.json`: snapshot compacto reservado aos dados oficiais já sincronizados.
- `counterparty-registry-v12.schema.json`: contrato dos dados aceitos.

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

`Modo investigação` e `Modo ajuda` ficam desligados por padrão e são independentes. `Analisar` disponibiliza Transacional, CNPJ e Mídias em até três colunas; `Ajuda` abre orientações em um painel próprio. Cada ação só aparece quando houver dados aplicáveis, um painel lateral substitui o anterior e apenas esses painéis recebem rolagem vertical quando necessário. O Console é a fonte principal do PID: para CPF busca o nome do cliente na página inicial e, para CNPJ, busca nome e CPF do responsável em `Pessoas > Sócio`. O BigData permanece dedicado à investigação de mídia e só complementa dados já mapeados quando estiver disponível.

- `Análise transacional`: avalia somente sinais explicitamente cadastrados. P2P adiciona um ponto favorável a não fraude.
- `CNPJ`: consulta separadamente o titular e quem está transacionando quando cada parte possuir CNPJ válido.
- cada resultado mostra `Razão social`, `Nome fantasia`, `Criação`, `Situação cadastral` e `Porte da empresa`.
- o card do CNPJ usa sinal visual e o texto `Confiável`, `Suspeito`, `Atenção` ou `Não classificado`, sem criar um resumo de decisão separado.
- os botões `Confiável`, `Suspeito` e `Remover` atualizam a base local de apoio do operador.
- situação `INAPTA`, `BAIXADA`, `SUSPENSA` ou `NULA` e empresa com menos de três meses recebem alerta pulsante vermelho.
- nenhum resultado seleciona decisão ou Motivo Status automaticamente.

O Falcon não possui uma coluna chamada CNPJ, mas os documentos estão nos IDs da linha laranja. Em `Depósito bancário de varejo`, o titular fica na coluna de crédito (`CREDIT_CUSTOMER_XID_VALUE`) e quem enviou fica na origem/débito (`DEBIT_CUSTOMER_XID_VALUE`). Em `Pagamento bancário de varejo`, o titular fica na origem/débito e quem recebeu fica na coluna de crédito. A seleção usa o mesmo índice da linha de regra, data e valor. O CPF do titular alimenta o BigData; qualquer CNPJ válido do titular ou da outra parte pode alimentar a consulta empresarial. Um documento nunca substitui o outro.

## Situação cadastral da Receita Federal

O cruzamento mantém duas conclusões separadas:

1. situação cadastral oficial: `ATIVA`, `SUSPENSA`, `INAPTA`, `BAIXADA` ou `NULA`;
2. classificação operacional: `TRUSTED`, `UNTRUSTED`, `REVIEW` ou `UNKNOWN`.

Situação `ATIVA` não transforma automaticamente uma contraparte em confiável. Situação diferente de `ATIVA` gera revisão cadastral, mesmo que exista um cadastro favorável na lista interna.

O arquivo público no GitHub não recebe credenciais. O motor consulta primeiro o snapshot sincronizado e, na ausência, tenta automaticamente a BrasilAPI, baseada nos dados públicos da Receita, sem abrir outra página. Integração oficial em tempo real com SERPRO continua exigindo um serviço intermediário autorizado, pois segredo OAuth nunca deve ficar no bookmarklet.

## Mídia e análise transacional

O motor transacional lê somente os campos mapeados dos HTMLs do Console e Falcon. P2P sempre aparece como detectado ou não detectado; os demais grids só aparecem quando houver informação útil. A lista extensa de pessoas ou empresas transacionadas não é exibida nessa análise, e a consulta dedicada de CNPJ permanece separada. Uma transação com regra, recusa ou erro é considerada barrada: seu valor não compõe movimentação efetiva, velocidade, recorrência ou triangulação. Repetições barradas podem aparecer apenas como quantidade informativa. Valor baixo/teste seguido rapidamente por valor alto gera atenção; a sequência inversa não é classificada sozinha como teste suspeito. Movimentações efetivas entre 00h e 06h exibem quantidade e valor somado. As orientações e particularidades do emissor ficam somente no painel `Ajuda`; no Jeitto, os alertas transacionais destacam valor individual acima de R$ 5.000,00, volume acima de R$ 2.000,00 em 24 horas, volume mensal acima de R$ 10.000,00 e P2P próximos. PIX genérico não é considerado P2P: o sinal exige a marcação explícita `P2P`. Depósitos por boleto marcados pela regra como alto risco recebem alerta, incluindo a orientação específica da BEMOL. Em CARTÃO, chip e senha é sinal favorável; duas ou mais tentativas por aproximação, digitado manual ou e-commerce no mesmo estabelecimento geram alerta. Nenhum sinal decide o caso sozinho.

A investigação de mídia segue `FALCON > BigData (opcional) > CONSOLE`. O Falcon cria um pedido identificado por caso e CPF; o BigData coleta silenciosamente e devolve o resultado para a mesma identidade. O CPF do bloco de dados pessoais precisa coincidir com o pedido. Só conta processo em que esse mesmo CPF seja parte ré/polo passivo. Variações de assunto são classificadas por palavras-chave tolerantes. `Tráfico de drogas` exige referência a tráfico, comercialização, distribuição, fornecimento ou artigo 33; posse/porte para consumo e artigo 28 não são classificados como tráfico. Resultado sem categoria criminal compatível é `SEM MÍDIA` e atualiza o campo do Console para `não`; com ocorrência, o Console recebe `sim` e as categorias marcadas automaticamente.

## Integração atual

A contraparte já é coletada da mesma linha laranja usada para regra, data e valor. A classificação recebe somente o CNPJ, o emissor e a direção mapeada da operação. Velocidade, valores, recorrência, triangulação e particularidades cadastradas são calculados pelos motores atuais sem misturar o documento do titular com o documento de quem transacionou.
