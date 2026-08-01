# SAC Prevenção V12

## Estado da versão

A V12 é uma versão de teste isolada. Use somente o favorito dedicado em `bookmarklet-v12.txt` enquanto ela estiver em homologação. O favorito universal permanece inalterado.

## Arquivos

- `loader-v12.js`: resolve uma revisão imutável e carrega os módulos na ordem correta.
- `sac-memory-v12.js`: memória unificada de transporte, Configurações, Histórico e LISTAS.
- `sac-tabulator-v12.js`: seleção real de opções nos dropdowns do Tabulador.
- `sac-counterparty-v12.js`: identificação da pessoa ou empresa da outra ponta da transação.
- `sac-corporate-v12.js`: consulta e classificação cadastral de CNPJ.
- `sac-transaction-v12.js`: leitura e resumo transacional.
- `sac-media-v12.js`: leitura de mídia desabonadora no BigData.
- `sac-ddd-v12.js`: região do DDD e regra regional da BEMOL.
- `sac-prevencao-v12.js`: interface e coordenação dos fluxos.
- `preview.html`: prévia interativa fiel à V12.
- `tests/`: testes automatizados dos motores e contratos entre etapas.

Todos os nomes globais, namespaces, chaves de memória e arquivos desta pasta usam `V12`.

## Fluxo operacional

O percurso principal é:

`FALCON > BigData opcional > CONSOLE > TABULADOR > HISTÓRICO/LISTAS`

O mesmo favorito dedicado pode ser executado em cada página. O estágio é reconhecido pelo conteúdo da página; a URL não define o fluxo.

Os dados do caso atravessam as páginas por três meios coordenados:

1. armazenamento da página quando permitido;
2. cofre compartilhado em `window.name`;
3. envelope HTML transportado pela área de transferência.

O caso temporário expira em 12 horas. Configurações, Histórico e pendências de LISTAS possuem armazenamento próprio.

## Fluxos

### CARTÃO

CARTÃO tem prioridade quando o tipo da transação for `autorização ou lançamento de crédito`. Os dados mapeados do cartão também confirmam esse fluxo.

No Falcon, o valor da linha deve ser coletado antes da troca automática para a aba `Caso`.

No Console, os dados do cartão são relacionados aos quatro últimos dígitos coletados no Falcon. A ausência desses dados não bloqueia o fluxo GLOBAL; nesse cenário são usados os textos de ausência de dados definidos na interface.

### BANKING

Quando a regra de CARTÃO não se confirma, o caso segue BANKING. O campo de estabelecimento do Tabulador recebe o tipo de transação do Falcon.

### HOLD

Toda regra que contenha `HOLD` transforma o BANKING em HOLD. Somente linhas cuja regra contenha `HOLD` são selecionadas no Falcon. A fila do Tabulador é `HOLD`.

## Console

O Console exibe primeiro os dados recebidos do Falcon e depois os dados coletados na própria página, mantendo a mesma organização por grids.

### Dropdowns BANKING/HOLD Brasil

- Status Pessoa (SPD): `normal`, `ativo`, `bloqueado`, `bloqueio preventivo falcon 254`, `cancelada`, `spd 1`, `spd 2`, `spd 8`, `spd 15`, `spd 17`, `spd 21`, `spd 25`, `spd 33`, `outro`.
- Histórico SPD: `não`, `sim`, `spd 1`, `spd 2`, `spd 8`, `spd 15`, `spd 17`, `spd 21`, `spd 25`, `spd 33`, `outro`.
- Mídia desabonadora: `não`, `sim`, `sem acesso`.
- E-mail, DDD e Endereço: `de acordo`, `divergente`, `sem informação`.
- Documentação: `sem ressalvas`, `com ressalvas`, `baixa qualidade`, `foto de tela`, `editado`, `falsificado`, `ilegível`, `danificado`, `sem arquivos`.
- Extrato: `sem suspeitas`, `com suspeitas`, `triangulação`, `autofinanciamento`, `sem histórico`.

No GLOBAL não são exibidos Status Pessoa, Histórico SPD e Documentação. A tabulação recebe `N/A` nesses itens.

### Dropdowns CARTÃO

Os dois dropdowns de análise mantêm estas opções:

- `não`;
- `sim`;
- `reconhece a compra`;
- `autofinanciamento`;
- `ausência de dados`.

## JIRA e chamada

As chaves `JIRA`, `Com chamada` e `Com sucesso` ficam no Console.

- JIRA desligado e sem chamada: `SEM CONTATO - PLANILHA` + `SEM CHAMADA`.
- JIRA desligado e com chamada: `ATIVA - PLANILHA` + resultado escolhido.
- JIRA ligado e sem chamada: `SEM CONTATO - FILA` + `SEM CHAMADA`.
- JIRA ligado e com chamada: `RECEPTIVO` + `COM SUCESSO`.

JIRA com chamada não abre PID. Uma chamada comum abre o PID.

## PID

O PID usa os dados da página atual do Console e uma coluna por informação.

- Pessoa física: busca `Nome do Cliente` na página inicial.
- Pessoa jurídica: em `Pessoas > Sócio`, busca o nome completo do responsável e o CPF dele.
- AMIGOZ mantém seu roteiro específico.
- Um dado ausente recebe um botão de recarga que procura somente aquele item.
- Ao minimizar ou finalizar o Console, o PID acompanha a janela principal.

## Histórico de infrações

O código possui dez caracteres no formato `0000 000 000`:

- primeiro bloco: últimos 30 dias;
- segundo bloco: últimos 90 dias;
- terceiro bloco: últimos 60 meses.

O valor mais recente se repete nos blocos de períodos maiores. O alerta usa a maior quantidade interpretada nos blocos.

- encontrado e menor que 3: verde;
- encontrado e igual ou maior que 3: vermelho pulsante;
- não encontrado: `0000000000` em laranja.

CARTÃO não exibe Histórico de infrações.

## Tabulador

Ao abrir o favorito no Tabulador, nenhuma informação é aplicada. A janela de análise aguarda uma decisão.

Depois do clique:

1. os campos independentes são aplicados em conjunto;
2. o Status recebe exatamente o texto da decisão;
3. somente o Motivo Status aguarda o carregamento dependente;
4. a aplicação é conferida;
5. a janela de tabulação pronta permanece aberta.

`Copiar` grava Histórico e LISTAS, copia a tabulação e encerra o caso. `Mudar decisão` retorna apenas à janela de decisão, sem recarregar a página.

### Perfil FALCON

Mantém a aplicação completa já existente:

- data e hora de entrada;
- tipo e número do documento;
- emissor;
- valor;
- tipo e status da chamada;
- número do caso;
- fila;
- estabelecimento/tipo de transação;
- regra;
- decisão;
- Motivo Status;
- Observações.

### Perfil FALCON PREVENÇÃO

É reconhecido pelos campos `_partial_Falcon_Prevencao`, pelo sistema `Falcon Prevenção` ou pela seleção correspondente.

O código não troca o dropdown `ddl_tabulador` e aplica somente:

- tipo de documento;
- número do CPF ou CNPJ;
- valor da transação;
- Status;
- Motivo Status;
- fila;
- estabelecimento;
- Observação com a tabulação pronta.

### Filas

- BANKING: `BANKING`.
- HOLD: `HOLD`.
- CARTÃO aprovado/approve/authorized: `CARTÕES APROVADAS`.
- CARTÃO recusado/decline/denied: `CARTÕES RECUSADAS`.

### Motivo Status

- BANKING/HOLD + FRAUDE: `FRAUDE TRANSACIONAL`.
- BANKING/HOLD + NÃO FRAUDE: `SEM SUSPEITAS`.
- BANKING/HOLD + inconclusiva: `DADOS INSUFICIENTES PARA ANÁLISE`.
- CARTÃO + FRAUDE: `CLIENTE SOFREU FRAUDE`.
- CARTÃO + FRAUDE com `autofinanciamento`: `FRAUDE TRANSACIONAL`.
- CARTÃO + NÃO FOI POSSÍVEL CONFIRMAR FRAUDE: `CLIENTE NÃO ATENDE`.
- Demais decisões de CARTÃO seguem a regra geral.

## LISTAS

LISTAS é criada somente para BANKING decidido como `NÃO FRAUDE`. CARTÃO e HOLD não entram.

O item é persistido sincronamente antes da cópia final. A janela LISTAS reconcilia toda a memória transportada antes de renderizar, evitando exibir uma fila parcial.

### ALLOWLIST

- caso comum: exige conta normal/ativa e sem SPD;
- Conta Simples: entra somente com JIRA;
- JIRA: permite a inclusão mesmo com bloqueio, SPD ou conta recente;
- regra ISPB: também gera ALLOWLIST.

### CONTENÇÃO

Qualquer variação de `CONTENÇÃO`, `CONTENCAO`, `CONTENSÃO` ou `CONTENSAO` gera uma pendência própria com CPF/CNPJ sem formatação.

### CASHOUT

Qualquer regra que contenha `ISPB` gera duas pendências independentes:

- ALLOWLIST;
- CASHOUT (`ALLOWLIST_CASHOUT_LIMITE_ISPB_CRYPTO`).

### Persistência e duplicidade

- ALLOWLIST e CASHOUT: número do caso + ID da conta.
- CONTENÇÃO: número do caso + CPF/CNPJ.
- Repetir o mesmo caso não cria duplicata.
- Uma decisão posterior diferente de NÃO FRAUDE remove as pendências daquele caso.
- Inserir ou remover cria uma baixa permanente durante a validade do cofre; uma cópia antiga não pode restaurar o item.
- Vários casos permanecem disponíveis até a inclusão individual ou por grupo de emissor.

## Histórico

O Histórico mantém os casos concluídos por 12 horas sem CPF ou CNPJ. Mostra número do caso, ID da conta, emissor, fluxo, decisão e tabulação.

Filtros disponíveis:

- pesquisa por caso, conta ou emissor;
- fluxo: CARTÃO, BANKING ou HOLD;
- emissor;
- decisão.

Número do caso e ID da conta podem ser copiados pelo grid.

## Investigação transacional

O modo é opcional e não decide o caso.

- P2P é sempre exibido como detectado ou não detectado.
- Grids sem informação relevante não aparecem.
- Tentativa que possui regra/recusa é tratada como barrada: não compõe valor efetivo, velocidade, triangulação ou recorrência.
- Tentativas barradas podem aparecer somente como quantidade informativa.
- Valor baixo/teste seguido rapidamente por valor alto gera atenção.
- Valor alto seguido por valor baixo não é classificado sozinho como teste suspeito.
- Triangulação só aparece quando houver entrada e saída efetivas de valores semelhantes em até 10 minutos.
- Particularidades do emissor ficam no painel Ajuda, sem duplicar os alertas transacionais.

## Configurações

Tema, modo seguro, investigação, ajuda, fonte, assinatura e cores são compartilhados entre Falcon, Console e Tabulador.

Os botões `A-` e `A+`, além dos atalhos `-` e `+`, alteram a fonte das janelas principais, PID, Histórico, Configurações e investigação sem fechar o painel aberto.

A assinatura existe somente no Tabulador. O nome é solicitado na primeira utilização e permanece salvo. Complementos disponíveis:

- SAC Prevenção;
- Dock Teck Prevenção;
- Backoffice Prevenção;
- personalizado.

## Atalhos

- `1`, `2`, `3`, `4`: decisões.
- `Esc`: fecha a janela ativa quando a aplicação não está em andamento.
- `M`: minimiza/restaura.
- `P`: volta à posição inicial.
- `T`: troca o tema.
- `R` ou `0`: recarrega a automação.
- `+` e `-`: ajustam a fonte.

## Validação

Execute na pasta V12:

```powershell
node --check sac-memory-v12.js
node --check sac-tabulator-v12.js
node --check sac-counterparty-v12.js
node --check sac-corporate-v12.js
node --check sac-transaction-v12.js
node --check sac-media-v12.js
node --check sac-ddd-v12.js
node --check sac-prevencao-v12.js
node --test tests/*.test.cjs
```

O teste geral em `../tests/universal-production.test.cjs` confirma que o favorito universal permanece inalterado durante a homologação.

## Instalação para teste

1. Publique todos os arquivos da V12 na mesma revisão do repositório.
2. Atualize `release-v12.json`, `bookmarklet-v12.txt` e a revisão segura do loader para essa revisão imutável.
3. Crie um favorito no Chrome com o conteúdo de `bookmarklet-v12.txt`.
4. Não substitua o favorito universal até a aprovação explícita da V12.
