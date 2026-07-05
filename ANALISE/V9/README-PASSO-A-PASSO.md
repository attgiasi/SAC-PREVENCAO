# SAC Prevenção V9

Versão revisada em 05/07/2026. Build interno `9.4`.

## Estrutura

A V9 fica organizada em blocos claros:

- `sac-prevencao-v9.js`: interface, coleta, fluxos Falcon/Console/Tabulador, Histórico e LISTAS.
- `sac-memory-v9.js`: memória própria da V9 para pacotes entre etapas, Histórico e LISTAS.
- `sac-tabulator-v9.js`: motor rápido de aplicação dos campos no Tabulador.
- `preview.html`: prévia interativa fiel ao comportamento visual principal.
- `issuer-directory.json`: base de apoio para cruzamento de emissores.
- `bookmarklet-v9.txt`: favorito dedicado para testar a V9 sem mexer no favorito universal.

Nesta entrega, o favorito universal não foi vinculado à V9. Para testar esta versão, use somente o conteúdo de `ANALISE/V9/bookmarklet-v9.txt`. O universal deve continuar apontando para a versão aprovada até você liberar a troca.

## Fluxos

O fluxo é identificado automaticamente:

- `CARTÃO`: quando houver dados de cartão ou tipo de transação `autorização ou lançamento de crédito`.
- `BANKING`: quando não for cartão.
- `HOLD`: quando a regra de um caso BANKING contiver `HOLD`.

`HOLD` segue a lógica operacional de BANKING, mas usa cor quente de alerta e fila `HOLD`.

Cores padrão dos fluxos:

- `BANKING`: verde secundário.
- `CARTÃO`: violeta secundário.
- `HOLD`: laranja/vermelho vibrante de alerta.

A paleta das configurações inclui preto, verde secundário, violeta secundário, laranja de alerta, vermelho, laranja vibrante, amarelo, turquesa e azul. A mesma cor não pode ser aplicada em dois fluxos ao mesmo tempo.

## Tratativas

No Console, a tratativa é coletada pelos botões:

- `Backoffice Brasil`: mantém os dropdowns de tratativa.
- `Global Backoffice`: remove os grids combinados anteriormente e envia `N/A` na tabulação quando o item não se aplica.

No fluxo cartão com tratativa global, a ausência dos dados do cartão não bloqueia o fluxo; os campos seguem como `ausência de dados`.

## Janelas

Falcon, Console e Tabulador usam largura padrão de `420px`.

As janelas são flutuantes, com posição fixa durante o arrasto. Ao minimizar a janela principal, os painéis laterais ligados a ela também minimizam. Ao fechar ou finalizar a etapa, os painéis laterais ligados ao fluxo também são fechados.

Painéis laterais incluem:

- configuração compartilhada entre Falcon, Console e Tabulador na mesma aba;
- ajuda de regra;
- ajuda de emissor;
- PID de chamada;
- escolhas complementares de mídia desabonadora;
- escolhas complementares de e-mail, DDD e endereço.

As janelas complementares de `Mídia desabonadora` e `E-mail, DDD e endereço` fecham somente pelo botão `Aplicar`. O PID e a ajuda rápida não possuem botão Aplicar, pois são apenas painéis de consulta.

## Configuração

O botão de configuração abre uma janela lateral. Cada item fica em um grid próprio:

- tema claro/escuro;
- tamanho da fonte;
- modo seguro;
- modo ajuda;
- cores dos fluxos;
- assinatura, apenas no Tabulador.

A assinatura é solicitada somente na primeira vez em que o Tabulador precisar finalizar uma decisão. Depois de salva, fica guardada na memória local enquanto o código estiver em uso.

O complemento padrão é `SAC Prevenção`. Também existem `Dock Teck Prevenção`, `Backoffice Prevenção` e opção personalizada.

## Modo Seguro

O modo seguro é compartilhado entre Falcon, Console e Tabulador.

- Ligado: dados obrigatórios faltantes bloqueiam avanço.
- Desligado: permite seguir com alerta e permite edição manual por duplo clique nos grids.

Com o modo seguro desligado, o clique simples no grid não copia o dado. Isso evita cópia acidental durante edição manual.

## Modo Ajuda

O modo ajuda fica desligado por padrão.

Quando ativado, os grids de `Regra` e `Emissor` exibem ícone de informação somente quando houver orientação real cadastrada. A ajuda aparece ao passar o mouse sobre o ícone e desaparece ao retirar o mouse. Cada orientação é exibida em um grid separado no painel lateral.

As mensagens do modo ajuda foram consolidadas a partir do `BOOK PREVENÇÃO FALCON` e do resumo de regras enviado, sem repetir o nome da regra/emissor dentro dos cards. Os textos são curtos, objetivos e focados no que ajuda a decidir.

No grid de `Regra`, o ícone `!` usa palavras-chave para exibir orientações:

- `HOLD`: atenção especial; fluxo vira HOLD, fila HOLD, e no Falcon são selecionadas somente linhas cuja regra contenha HOLD.
- `DENYLIST`: conferir se há restrição compatível com o comportamento do cliente, status, histórico e documentação.
- `CONTENÇÃO`: em caso BANKING com decisão NÃO FRAUDE, envia também para a aba CONTENÇÃO da janela LISTAS.
- `AUTO FRAUDE`: revisar documentação, mídia desabonadora, extrato, SPD e coerência cadastral. Não confundir com `autofinanciamento` do extrato.
- `CAPITAL DE GIRO`: avaliar compatibilidade da movimentação com perfil, origem/destino e possibilidade de triangulação.
- `DENYLIST_EC`: foco em estabelecimento; validar EC, recorrência, decisão da transação e comportamento da compra.
- `DENYLIST_CCS`: foco em conta/cliente; validar status da conta, SPD, documentação e extrato.
- `P2P / dispositivo diferente`: validar aparelho, vínculo do destino, conta controle e padrão transacional.
- `CASHOUT`: avaliar saída de saldo, velocidade, horário, dispositivo, histórico e possível triangulação.
- `PixIn DICT`: validar situação cadastral do CPF/CNPJ vinculado à chave Pix.
- `Desvio de padrão`, `Contactless`, `3DS`, `Boleto valor suspeito` e demais regras conhecidas exibem orientação resumida quando a palavra-chave estiver na regra.

No grid de `Emissor`, o painel lateral exibe particularidades conhecidas do emissor e orientações do book quando houver correspondência. Exemplos incluídos: `Onlypay`, `Sofisa`, `Conta Simples`, `Amigoz`, `Tipcard`, `WudiPay`, `EzzePay`, `RedeFrota/Frotabank`, `Noh`, `Trampay`, `Bemol`, `iFood` e `Meu Tudo`.

## Falcon

O Falcon coleta os dados do caso, identifica o fluxo e, no caso de cartão, tenta acessar a aba `Caso` antes da leitura.

Regras:

- Se encontrar histórico de infrações e o total for `0`, o grid fica verde.
- Se não encontrar histórico na página, exibe `0000000000` em laranja.
- Se encontrar 3 ou mais infrações na lógica dos blocos, o grid pulsa em vermelho.
- O padrão de blocos é `0003 003 003`: 30 dias, 90 dias e 60 meses.
- Fluxo cartão não exibe histórico de infração.
- Em regra HOLD, seleciona apenas linhas cuja regra contenha HOLD.

## Console

O Console mostra primeiro todos os dados recebidos do Falcon, na mesma ordem visual, e depois os dados coletados no próprio Console.

Dropdowns do Backoffice Brasil:

- `Status Pessoa (SPD)`: normal, ativo, bloqueado, bloqueio preventivo falcon 254, cancelada, spd 1, spd 2, spd 8, spd 15, spd 17, spd 21, spd 25, spd 33, outro.
- `Mídia desabonadora`: não, sim, sem acesso.
- `Histórico de SPD`: não, sim, spd 1, spd 2, spd 8, spd 15, spd 17, spd 21, spd 25, spd 33, outro.
- `E-mail, DDD e endereço`: de acordo, divergente, sem informação.
- `Documentação`: sem ressalvas, com ressalvas, baixa qualidade, foto de tela, editado, falsificado, ilegível, danificado, sem arquivos.
- `Extrato`: sem suspeitas, com suspeitas, triangulação, autofinanciamento, sem histórico.

Quando `Mídia desabonadora` for `sim`, abre uma janela lateral para marcar o tipo. Quando `E-mail, DDD e endereço` for `divergente`, abre uma janela lateral para marcar os motivos e preencher e-mail opcional.

No cartão, quando houver `COM CHAMADA`, o painel PID abre ao lado esquerdo do Console. Emissor `AMIGOZ` usa perguntas próprias; demais emissores usam o PID padrão.

As chaves `JIRA`, `Com chamada` e `Com sucesso` ficam lado a lado no Console para BANKING, HOLD e CARTÃO:

- `Com chamada` desligado: o Tabulador aplica `SEM CONTATO - PLANILHA` e `SEM CHAMADA`.
- `Com chamada` ligado: o Tabulador aplica `ATIVA - PLANILHA`.
- `Resultado` desligado com chamada ligada: aplica `SEM SUCESSO`.
- `Resultado` ligado com chamada ligada: aplica `COM SUCESSO`.
- `JIRA` ligado prevalece sobre a chamada e aplica `RECEPTIVO` e `COM SUCESSO`.

## Tabulador

Ao executar o favorito no Tabulador, somente a janela de análise e decisão abre. Nenhum campo da página é preenchido antes do clique em uma decisão.

Depois do clique em uma decisão:

- a tabulação pronta é copiada automaticamente;
- os campos independentes são aplicados rapidamente e em rodadas confirmadas;
- `Fila`, `Status`, `Observações` e campos primários são preenchidos;
- somente `Motivo Status` aguarda carregamento, pois depende da seleção do status;
- quando `Motivo Status` é confirmado, a janela `Tabulação pronta` abre.

A janela `Tabulação pronta` permanece aberta até ação do usuário:

- `Copiar`: copia novamente a tabulação e finaliza o fluxo.
- `Mudar decisão`: volta para a análise sem recarregar a página e sem limpar os campos.

Campos primários aplicados no Tabulador:

- tipo de documento CPF/CNPJ;
- CPF/CNPJ;
- data;
- hora;
- emissor;
- valor da transação;
- tipo de chamada;
- status da chamada ativa;
- número do caso;
- fila;
- estabelecimento ou tipo de transação;
- regra;
- observações/tabulação pronta.

O motor usa aplicação direta em campos e selects, dispara `input`, `change` e `blur`, atualiza `selectpicker` quando existir e faz rodadas de confirmação para evitar falhas intermitentes. Essa é a lógica rápida inspirada na aplicação direta dos códigos base, mas com confirmação e tolerância a variações de texto.

Regras de chamada:

- `SEM CHAMADA`: Tipo de chamada `SEM CONTATO - PLANILHA` e status da chamada ativa `SEM CHAMADA`.
- `COM CHAMADA`: Tipo de chamada `ATIVA - PLANILHA`.
- `COM SUCESSO`: status da chamada ativa `COM SUCESSO`.
- `SEM SUCESSO`: status da chamada ativa `SEM SUCESSO`.
- `JIRA` ligado: Tipo de chamada `RECEPTIVO` e status da chamada ativa `COM SUCESSO`.

Depois de aplicar esses campos, o motor confirma novamente `Tipo de chamada`, `Status chamada`, `Fila`, `Decisão` e `Motivo Status`. Se algum deles não ficar aplicado, a inconsistência é informada com o nome do campo.

## Decisões

Status:

- `FRAUDE` seleciona `FRAUDE`.
- `NÃO FRAUDE` seleciona `NÃO FRAUDE`.
- `NÃO FOI POSSÍVEL CONFIRMAR FRAUDE` seleciona o mesmo texto.
- `NÃO FOI POSSÍVEL CONFIRMAR NÃO FRAUDE` seleciona o mesmo texto.

Motivo Status:

- BANKING/HOLD + `FRAUDE`: `FRAUDE TRANSACIONAL`.
- BANKING/HOLD + `NÃO FRAUDE`: `SEM SUSPEITAS`.
- BANKING/HOLD + decisões inconclusivas: `DADOS INSUFICIENTES PARA ANÁLISE`.
- CARTÃO + `NÃO FOI POSSÍVEL CONFIRMAR FRAUDE`: `CLIENTE NÃO ATENDE`.
- CARTÃO + demais decisões seguem a regra geral.

Fila:

- BANKING: `BANKING`.
- HOLD: `HOLD`.
- CARTÃO approve/aprovada/autorizada: `CARTÕES APROVADAS`.
- CARTÃO decline/recusada/reprovada/negada: `CARTÕES RECUSADAS`.

O motor aceita variações próximas dos textos dos dropdowns, como `ATIVO - PLANILHA` e `ATIVA - PLANILHA`, ou `CARTÕES RECUSADAS` e `CARTÕES REPROVADAS`.

## JIRA

No Console, o flag `JIRA` aparece como chave liga/desliga. Essa escolha é salva junto com os dados do Console e usada depois pelo Tabulador.

Quando ligado:

- Tipo de chamada: `RECEPTIVO`.
- Status da chamada ativa: `COM SUCESSO`.
- O Tabulador não mostra mais o botão JIRA; ele apenas aplica automaticamente a regra salva no Console após o clique na decisão.

## Tabulação Final

BANKING e HOLD:

```text
Valor da transação:
Regra:
Histórico de Infrações:
Mídia desabonadora:
Status conta:
Status Pessoa (SPD):
Data de cadastro:
E-mail, DDD e Endereço:
Histórico SPD:
Documentação:
Extrato:

Decisão:
Motivo:

Assinatura
```

Cartão:

```text
Valor da transação:
Regra:
Estabelecimento:
Status do cartão:
Data de cadastro:
Histórico de compra no estabelecimento:
Padrão de compra:

Decisão:
Motivo:

Assinatura
```

O campo `Motivo` só aparece preenchido quando o analista escrever uma justificativa livre.

## LISTAS

LISTAS usa memória própria da V9 e mantém vários casos pendentes até a inclusão.

Regras:

- Somente BANKING com decisão final `NÃO FRAUDE` entra em Allowlist.
- Cartão não entra em LISTAS.
- Se a regra contiver `CONTENÇÃO` ou variações sem acento, o caso também entra na aba `CONTENÇÃO`.
- Se depois o mesmo caso/conta for decidido como fraude ou outra decisão, o item é removido da lista pendente.
- Os itens só saem da lista após `INSERIR` ou `REMOVER`.

Aplicação:

- Allowlist usa ID da conta nos dois campos principais.
- Contenção usa CPF/CNPJ limpo, sem pontos, traços ou barras.
- A data inicial é o dia atual.
- A data final é dois dias depois, salvo regra específica por emissor.
- O ID do emissor é cruzado pelo nome do emissor; se não localizar, o sistema avisa para conferência manual.

## Histórico

O Histórico registra casos concluídos por até 12 horas e fica disponível pelo botão `H` na barra superior das janelas.

O motor do Histórico mescla a memória local da página, a memória compartilhada do clipboard e um espelho interno por aba do navegador. Assim, ao abrir o Histórico no Falcon, Console, Tabulador ou Listas, a janela deve exibir os mesmos casos resolvidos no fluxo.

Para segurança, CPF e CNPJ não são exibidos no Histórico. A janela mostra:

- pesquisa;
- filtro por fluxo;
- lista compacta com número do caso, emissor e conta;
- dados de análise;
- tabulação final do caso selecionado.

## Notificações

Para manter a tela limpa, notificações de progresso foram reduzidas.

O sistema mostra principalmente:

- erro ou dado obrigatório faltante;
- alerta quando o modo seguro estiver desligado;
- conclusão de etapa;
- confirmação de cópia/finalização.

## Atalhos

- `1`, `2`, `3`, `4`: escolhem decisões.
- `Enter`: confirma ação principal quando aplicável.
- `Esc`: fecha a janela ativa.
- `M`: minimiza.
- `P`: volta à posição inicial.
- `T`: alterna tema.
- `R` ou `0`: recarrega a automação.

## Instalação

1. Envie a pasta `ANALISE/V9` para o GitHub.
2. No Chrome, crie um favorito temporário apontando para o conteúdo de `ANALISE/V9/bookmarklet-v9.txt`.
3. Use esse favorito temporário nas páginas do Falcon, Console, Tabulador e LISTAS.
4. Mantenha o favorito universal como está até a V9 ser aprovada.

Depois da aprovação, o universal pode ser atualizado para apontar para a V9.



