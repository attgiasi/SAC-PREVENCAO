# SAC Prevenção V1

Automação por bookmarklet para apoiar análise de prevenção entre Falcon, Console, Tabulador, Histórico e LISTAS.

## Estrutura

- `ANALISE/motor-sac-universal.js`: motor universal, sem versão fixa no favorito.
- `ANALISE/favorito-universal.bookmarklet.txt`: favorito principal.
- `ANALISE/V1/sac-memory-v1.js`: memória local por 12 horas, histórico, LISTAS, configuração e notificações.
- `ANALISE/V1/sac-tabulator-v1.js`: montagem da tabulação e preenchimento do Tabulador somente após decisão.
- `ANALISE/V1/sac-prevencao-v1.js`: coleta Falcon/Console, janelas, atalhos, histórico, listas e preview.
- `ANALISE/V1/issuer-directory.json`: diretório de emissores e particularidades.
- `ANALISE/V1/preview.html`: preview interativo usando os scripts reais da V1.
- `ANALISE/V1/bookmarklet-v1.txt`: favorito fixo da V1 para teste direto.

## Favorito universal

Use o conteúdo de `ANALISE/favorito-universal.bookmarklet.txt`:

```javascript
javascript:(()=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/gh/attgiasi/SAC-PREVENCAO@main/ANALISE/motor-sac-universal.js?cache='+Date.now();document.documentElement.appendChild(s);})();
```

O favorito universal sempre chama `ANALISE/motor-sac-universal.js`. A versão ativa fica definida no motor.

## Uso

1. No Falcon, execute o favorito. O motor tenta acessar a aba Caso, lê a linha laranja mapeada e abre a janela Falcon.
2. Se o modo seguro estiver ligado e faltar dado obrigatório, o avanço fica bloqueado.
3. Se o modo seguro estiver desligado, a janela mostra alerta laranja e permite edição manual por duplo clique nos grids.
4. No Console, execute o favorito. A janela mostra primeiro os dados recebidos do Falcon e depois os dados coletados ou selecionados no Console.
5. No Tabulador, execute o favorito. Ele abre apenas a janela de decisão. Nenhum campo é preenchido antes do clique em uma decisão.
6. Após a decisão, a tabulação pronta é copiada, os campos são aplicados, selects são escolhidos por opções reais e a janela final permite copiar novamente ou mudar decisão.

## Atalhos

- `Esc`: fecha janela ativa.
- `X`: fecha qualquer janela.
- `M`: minimiza.
- `P`: volta a posição inicial.
- `T`: troca tema.
- `R` ou `0`: recarrega.
- `Enter`: confirma a ação principal.
- `1`, `2`, `3`, `4`: escolhem decisões no Tabulador.
- `H`: abre Histórico.

## Fluxos

### CARTÃO

Detectado quando há dados de cartão ou tipo de transação de autorização/lançamento de crédito. Exibe estabelecimento, tipo de entrada/compra e decisão da transação. Não exibe histórico de infrações e não entra em LISTAS.

Filas:

- `approve`, `aprovada`, `autorizada`: `CARTÕES APROVADAS`
- `decline`, `recusada`, `reprovada`, `negada`: `CARTÕES RECUSADAS`

### BANKING

Fluxo padrão quando não for cartão. Exibe tipo de transação e histórico de infrações. Fila `BANKING`.

### HOLD

Detectado quando a regra de Banking contém `HOLD`. Mantém lógica de Banking, usa destaque quente, fila `HOLD` e seleciona apenas linhas HOLD no Falcon.

## Histórico de infrações

O padrão é `0000000000`, interpretado como:

- Primeiro bloco: últimos 30 dias.
- Segundo bloco: últimos 90 dias.
- Terceiro bloco: últimos 60 meses.

Se não encontrar na página, mostra `0000000000` em laranja. Se o total for 0, 1 ou 2, fica verde. Se for 3 ou mais, fica vermelho pulsante.

## Console

Tratativa detectada pelos botões:

- `Backoffice Brasil`: mostra dropdowns normais.
- `Global Backoffice`: oculta grids combinados não aplicáveis e envia `N/A`. Em cartão global, ausência de dados do cartão vira `ausência de dados` e não bloqueia.

Chamada:

- Sem chamada: `SEM CONTATO - PLANILHA` e `SEM CHAMADA`.
- Com chamada: `ATIVA - PLANILHA`.
- Com sucesso ligado: `COM SUCESSO`.
- Com sucesso desligado e com chamada ligada: `SEM SUCESSO`.
- JIRA ligado prevalece: `RECEPTIVO` e `COM SUCESSO`.

## Tabulador

Campos mapeados:

- Data entrada: `#txt_data_entrada`
- Hora entrada: `#txt_hora_entrada`
- Tipo documento: `#ddl_tipoDoc`
- CPF: `#txt_cpf`
- CNPJ: `#txt_cnpj`
- Emissor: `#ddl_idemissor`
- Valor: `#txt_ValorTransacao`
- Tipo chamada: `#ddl_TipoChamada`
- Status chamada: `#ddl_ChamadaAtiva`
- Fila: `#ddl_Fila`
- Estabelecimento/tipo transação: `EcTransacao`
- Regra: `RegraListada`
- Status/decisão: `#ddl_status`
- Motivo Status: `#ddl_motivostatus`
- Observações: campo de observação mapeado

O Motivo Status é o único campo que aguarda carregamento após Status.

## LISTAS

A memória de LISTAS dura 12 horas.

- Apenas BANKING/HOLD com decisão final `NÃO FRAUDE` entra na Allowlist.
- Se a regra contiver `CONTENÇÃO`, `CONTENCAO`, `CONTENSÃO` ou `CONTENSAO`, também entra em CONTENÇÃO.
- Cartão nunca entra em LISTAS.
- Decisão posterior como fraude ou inconclusiva remove o caso/conta das LISTAS.
- Itens pendentes saem da memória após `INSERIR` ou `REMOVER`.
- Allowlist aplica o ID da conta nos dois primeiros campos.
- CONTENÇÃO aplica CPF/CNPJ limpo nos dois primeiros campos.
- Data inicial é hoje; data final é hoje + 2 dias, salvo regra específica em `issuer-directory.json`.

## Histórico

O histórico é unificado entre Falcon, Console, Tabulador e LISTAS, fica 12 horas em memória local e não exibe CPF/CNPJ. Mostra caso, emissor, conta, fluxo, dados de análise e tabulação final.

## Validação

Antes de publicar:

```powershell
node --check ANALISE\motor-sac-universal.js
node --check ANALISE\V1\sac-memory-v1.js
node --check ANALISE\V1\sac-tabulator-v1.js
node --check ANALISE\V1\sac-prevencao-v1.js
```

Também validar o script embutido do `preview.html`, procurar resquícios de versões antigas, conferir que o favorito universal aponta para o motor universal e purgar o jsDelivr após push.
