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

## Integração no Console

O `Modo investigação` fica desligado por padrão. Quando ativado nas Configurações, o rodapé do Console exibe os botões compactos `Verificar CNPJ` e `Análise transacional`. O comando de `Mídia desabonadora` aparece somente quando houver CPF elegível.

- `Análise transacional`: avalia somente sinais explicitamente cadastrados. P2P adiciona um ponto favorável a não fraude.
- `Verificar CNPJ`: consulta a base versionada e mostra classificação, justificativa, fonte e versão em um painel lateral de grids.
- a mesma consulta mostra situação cadastral, data da situação, razão social, nome fantasia, abertura e CNAE quando o snapshot oficial estiver sincronizado.
- situação `INAPTA`, `BAIXADA`, `SUSPENSA` ou `NULA` e empresa com menos de três meses recebem alerta pulsante vermelho.
- nenhum resultado seleciona decisão ou Motivo Status automaticamente.

Os HTMLs do Falcon disponíveis em 16/07/2026 contêm CPF/ID dos clientes, contas de origem e crédito e nome do pagador, mas não contêm o CNPJ da contraparte. Por segurança, o campo de consulta permanece manual até que o elemento real seja mapeado. O documento do titular coletado no Console nunca é reutilizado como CNPJ da contraparte.

## Situação cadastral da Receita Federal

O cruzamento mantém duas conclusões separadas:

1. situação cadastral oficial: `ATIVA`, `SUSPENSA`, `INAPTA`, `BAIXADA` ou `NULA`;
2. classificação operacional: `TRUSTED`, `UNTRUSTED`, `REVIEW` ou `UNKNOWN`.

Situação `ATIVA` não transforma automaticamente uma contraparte em confiável. Situação diferente de `ATIVA` gera revisão cadastral, mesmo que exista um cadastro favorável na lista interna.

O arquivo público no GitHub não recebe credenciais. Consulta oficial em tempo real exige API contratada do SERPRO e um serviço intermediário autorizado, pois o segredo OAuth nunca pode ficar no bookmarklet. Sem esse serviço, `rfb-cnpj-registry-v11.json` deve ser atualizado a partir dos dados abertos oficiais da Receita. Enquanto não houver sincronização, a tela informa `DADO DA RECEITA NÃO SINCRONIZADO` sem inventar situação cadastral.

## Mídia e análise transacional

O motor transacional lê somente sinais explícitos. P2P soma um ponto favorável a não fraude; limites de tempo, valor e velocidade serão adicionados apenas após o HTML da página transacional e os books atualizados serem mapeados.

A investigação de mídia usa transporte entre páginas. O Console cria um pedido com número do caso e CPF, e o BigData devolve um resultado vinculado à mesma identidade. Resultado sem processo criminal compatível é `SEM MÍDIA` e atualiza o campo do Console para `não`. A coleta automática permanece bloqueada enquanto o adaptador `SACBigDataMediaAdapter` não tiver seletores confirmados.

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
