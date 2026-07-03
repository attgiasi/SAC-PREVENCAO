# SAC Prevenção V7

Versão revisada em 24/06/2026.

## Arquitetura

A V7 possui três motores independentes:

- `sac-memory-v7.js`: transporte, LISTAS e Histórico em canais separados;
- `sac-tabulator-v7.js`: aplicação imediata dos campos e espera exclusiva do Motivo Status;
- `sac-prevencao-v7.js`: coleta, interface e regras dos fluxos.

O `motor-sac-universal.js` carrega esses arquivos em sequência. Nenhum arquivo das versões anteriores é executado. Dados, filas e históricos antigos também não são importados para a V7.

## Instalação

1. Envie a pasta `V7` para `ANALISE/V7` no GitHub.
2. Atualize `ANALISE/motor-sac-universal.js`.
3. Atualize `ANALISE/favorito-universal.bookmarklet.txt`.
4. No Chrome, substitua uma última vez a URL do favorito pelo conteúdo atual do arquivo.
5. Use o mesmo favorito no Falcon, Console, Tabulador e página de LISTAS.

O favorito agora usa o tipo estável `x-sac-prevencao-memory`. Mudanças futuras de versão serão feitas somente no motor universal.

Nesta revisão, o favorito também instala a trava do Tabulador antes de ler o clipboard e antes de carregar o motor. Por isso, substitua o conteúdo do favorito no Chrome pelo arquivo `favorito-universal.bookmarklet.txt`; sem essa troca, o Chrome ainda pode executar o intervalo antigo em que os campos ficavam desprotegidos.

## Tabulador

Ao executar o favorito no Tabulador:

1. a janela de análise e decisão é aberta;
2. nenhum campo é aplicado antes da decisão;
3. a análise permanece visível para escolha da decisão;
4. a flag `JIRA`, quando marcada antes da decisão, força `Tipo de chamada = RECEPTIVO` e `Status chamada ativa = COM SUCESSO`;
5. o clique na decisão monta e copia imediatamente a tabulação;
6. Valor, Data, Hora, documento, Emissor, Caso, Regra, Estabelecimento/Tipo de transação, Tipo de chamada, Status da chamada, Fila, `Status` e a tabulação pronta em `Observações` são aplicados imediatamente após a decisão;
7. somente `Motivo Status` aguarda o carregamento causado pelo dropdown de Status;
8. o motor observa alterações do dropdown e aplica a opção assim que ela aparece;
9. enquanto o Motivo Status carrega, a janela de decisão permanece aberta e mostra o andamento;
10. somente depois da confirmação de Fila, Status e Motivo Status, aparece a janela de tabulação pronta;
11. a janela pronta possui os botões `Copiar` e `Mudar decisão`;
12. `Mudar decisão` remove somente a janela da automação e abre novamente a análise, sem recarregar, atualizar ou alterar a navegação da página;
13. a nova decisão reaplica Status e aguarda o Motivo Status correspondente;
14. `Copiar` copia novamente a tabulação, registra LISTAS e Histórico, fecha somente a janela da automação e encerra a etapa.

Em qualquer janela, um clique simples em um grid copia o valor exibido naquele grid.

A V7 também possui uma trava anti-conflito no Tabulador: enquanto nenhuma decisão foi clicada, os campos reais da página ficam protegidos contra preenchimento por execuções antigas ou pendentes. Além de bloquear escrita direta, o motor guarda um espelho do estado inicial dos campos e restaura qualquer tentativa de alteração até a decisão ser escolhida. A escrita só é liberada durante a aplicação iniciada pelo botão de decisão.

## Aba Caso no Falcon

- o motor verifica primeiro `csOvwFrm:TabView:CaseSummary`;
- se a aba `Caso` já estiver selecionada, nenhuma ação é executada;
- se estiver inativa, o motor clica automaticamente no link da aba;
- a mudança é confirmada pelo atributo `oselected="true"` ou pelo elemento `.tabItemSelected`;
- o motor aguarda a confirmação da aba sem recarregar a página;
- se a aba não puder ser selecionada, a coleta é interrompida e a janela solicita `ACESSE A ABA CASO`.

## Memórias

O motor mantém três canais independentes no mesmo envelope privado:

- `transport`: dados enviados do Falcon ao Console e do Console ao Tabulador;
- `lists`: casos pendentes de Allowlist e Contenção;
- `history`: casos concluídos e respectivas tabulações.

Redundâncias:

- o envelope privado acompanha o texto normal no clipboard;
- o favorito recupera a memória antes de carregar qualquer código;
- o transporte possui espelho temporário na sessão de cada sistema;
- o Histórico possui espelho local sanitizado;
- LISTAS permanece somente no envelope privado para não gravar CPF/CNPJ no armazenamento local.

LISTAS suporta até 300 pendências por 12 horas. Histórico suporta até 60 casos por 12 horas.

## LISTAS

- somente BANKING com decisão final `NÃO FRAUDE` entra na Allowlist;
- HOLD e CARTÃO não entram;
- regra contendo `CONTENÇÃO` ou `CONTENSAO` também cria a pendência de Contenção;
- o caso é registrado somente no botão final `Copiar`;
- refazer o mesmo caso e conta com outra decisão remove a pendência;
- `INSERIR` aplica os campos e remove o item;
- `REMOVER` exclui o item sem aplicar;
- os itens permanecem disponíveis ao alternar entre páginas enquanto o envelope privado for preservado.

Evite copiar outro conteúdo antes de abrir LISTAS, porque qualquer cópia feita por outro programa substitui todo o clipboard do Chrome.

## Histórico

- um caso e uma conta possuem somente um registro atualizado;
- mudar a decisão atualiza o mesmo registro;
- o histórico é recuperado pelo envelope compartilhado;
- existe uma cópia local de segurança em cada sistema onde a automação foi executada;
- CPF e CNPJ são removidos da tabulação armazenada;
- pesquisa e filtro continuam disponíveis.

## Atalhos

- `Enter`: ação principal.
- `1`, `2`, `3`, `4`: decisão.
- `Esc`: fechar.
- `M`: minimizar.
- `P`: posição inicial.
- `T`: trocar tema.
- `A`: assinatura no Tabulador.
- `R` ou `0`: recarregar a automação.
