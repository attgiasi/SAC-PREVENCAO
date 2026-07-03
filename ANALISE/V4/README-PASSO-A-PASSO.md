# SAC Prevenção - ANALISE/V4

Versão 4.0 da automação para Falcon, Console, Tabulador e LISTAS.

Esta versão usa um prefixo interno novo (`sac_prevencao_v4_20260618`) para não misturar dados com V1, V2 ou V3.

## Arquivos

- `sac-prevencao.js`: código principal.
- `issuer-directory.json`: base de emissores da Lista de SE.
- `falcon.bookmarklet.txt`: favorito da etapa Falcon.
- `console.bookmarklet.txt`: favorito da etapa Console.
- `tabulador.bookmarklet.txt`: favorito da etapa Tabulador.
- `listas.bookmarklet.txt`: favorito da janela LISTAS.
- `allowlist.bookmarklet.txt`: alias que também abre LISTAS.
- `auto.bookmarklet.txt`: tenta detectar a etapa automaticamente.
- `preview.html`: prévia interativa.

O favorito principal é único e estável:

`https://cdn.jsdelivr.net/gh/attgiasi/AUTOMACAO@main/ANALISE/sac-prevencao.js`

Use o arquivo `ANALISE/favorito-unico.bookmarklet.txt`. Ele detecta se você está no Falcon, Console, Tabulador ou LISTAS e executa a etapa correta.

Quando criarmos V5, V6 ou outra versão, o favorito continua igual. Basta atualizar o carregador `ANALISE/sac-prevencao.js` para apontar para a versão atual.

## Fluxo de uso

1. Execute o favorito único na página do Falcon.
2. Revise os grids e clique em `Finalizar etapa`.
3. Execute o mesmo favorito único na página do Console.
4. Revise os dados recebidos do Falcon, os dados coletados no Console e os dropdowns.
5. Clique em `Finalizar etapa`.
6. Execute o mesmo favorito único na página do Tabulador.
7. Se quiser, preencha o campo `Motivo`.
8. Escolha a decisão.
9. A tela `Tabulação pronta` aparece imediatamente. Enquanto isso, a automação preenche os campos do Tabulador, aplica os dropdowns e copia a tabulação.
10. Na tela final, use `Copiar` para copiar novamente e fechar, ou `Mudar decisão` para voltar à análise.

## Identificação automática de fluxo

- `CARTÃO`: prioridade quando o tipo de transação for `autorização ou lançamento de crédito`; também pode ser identificado pelos últimos 4 dígitos do cartão.
- `BANKING`: quando não houver sinal de cartão.
- `HOLD`: quando o fluxo for Banking e a regra contiver `HOLD`.

Não há fluxo cartão com HOLD.

## Falcon

Coleta:

- número do caso;
- valor;
- regra;
- data e hora sem segundos;
- tipo de transação;
- histórico de infrações em Banking/HOLD;
- estabelecimento e decisão da transação em Cartão.

O tipo de compra do cartão aparece apenas como apoio visual quando disponível. Ele não é obrigatório; se o código vier como `A`, o grid fica em branco.

Se a aba `Caso` estiver disponível e não estiver selecionada, a janela mostra o alerta `ACESSE A ABA CASO`.

Em HOLD, a automação tenta marcar todas as linhas visíveis que contenham `HOLD` e também tenta marcar a ação/checkbox de HOLD quando esse campo existir.

## Histórico de infrações

Formato usado:

`0003003003`

- Os 4 primeiros dígitos representam os últimos 30 dias.
- Os 3 dígitos do meio representam os últimos 90 dias.
- Os 3 últimos dígitos representam os últimos 60 meses.

Regras visuais:

- Se encontrar e todos os blocos forem menores que 3: verde.
- Se encontrar qualquer bloco com 3 ou mais: vermelho pulsante.
- Se não encontrar: laranja e exibe `0000000000`.
- O fluxo Cartão não mostra histórico de infrações.

## Console

A janela do Console mostra:

- dados recebidos do Falcon;
- dados coletados no Console;
- dropdowns de análise.

`Status conta` não é dropdown. Ele é sempre coletado da página do Console e exibido como grid.

No fluxo Cartão, os dropdowns do Console iniciam vazios para forçar a escolha do analista. Acima deles existe o bloco de chamada:

- `sem chamada`: aplica `SEM CONTATO - PLANILHA` e `SEM CHAMADA` no Tabulador.
- `com chamada`: aplica `ATIVO - PLANILHA`; nesse caso é obrigatório escolher `COM SUCESSO` ou `SEM SUCESSO`.

Se o cartão relacionado aos últimos 4 dígitos do Falcon não for localizado, a área do Console mostra `ACESSE CARTÕES`.

## Dropdowns

`Status Pessoa (SPD)`:

- `normal`
- `ativo`
- `bloqueado`
- `bloqueio preventivo falcon 254`
- `cancelada`
- `spd 1`
- `spd 2`
- `spd 8`
- `spd 15`
- `spd 17`
- `spd 21`
- `spd 25`
- `spd 33`
- `outro`

`Histórico SPD`:

- `não`
- `sim`
- `spd 1`
- `spd 2`
- `spd 8`
- `spd 15`
- `spd 17`
- `spd 21`
- `spd 25`
- `spd 33`
- `outro`

Em tratativa global, o dropdown `Status Pessoa (SPD)` não aparece. O campo `E-mail, DDD e Endereço` aparece também em tratativa global.

Demais dropdowns:

- Mídia desabonadora: `não`, `sim`, `sem acesso`.
- E-mail, DDD e Endereço: `de acordo`, `divergente`, `sem informação`.
- Documentação: `sem ressalvas`, `com ressalvas`, `baixa qualidade`, `foto de tela`, `editado`, `falsificado`, `ilegível`, `danificado`, `sem arquivos`.
- Extrato: `sem suspeitas`, `com suspeitas`, `triangulação`, `autofinanciamento`, `sem histórico`.

Quando `Mídia desabonadora` for `sim`, abre uma janela lateral sem itens pré-selecionados. As opções escolhidas aparecem apenas na tabulação pronta.

Quando `E-mail, DDD e Endereço` for `divergente`, abre uma janela lateral com as divergências e um campo opcional para registrar o e-mail observado.

## Tabulador

O motor da V4 usa duas etapas:

1. preenchimento direto dos campos conhecidos, como no código original;
2. confirmação rápida e retry apenas do que não entrou.

O motivo status é dependente da decisão. A automação seleciona a decisão, aguarda o dropdown carregar e aplica:

- `FRAUDE`: `FRAUDE TRANSACIONAL`;
- `NÃO FRAUDE`: `SEM SUSPEITAS`;
- Banking/HOLD inconclusivo: `DADOS INSUFICIENTES PARA ANÁLISE`;
- Cartão + `NÃO FOI POSSÍVEL CONFIRMAR FRAUDE`: `CLIENTE NÃO ATENDE`.

Fila:

- Banking: `BANKING`.
- HOLD: `HOLD`.
- Cartão com `approve`: `CARTÕES APROVADAS`.
- Cartão com `decline`: `CARTÕES RECUSADAS`.

## LISTAS

Somente casos `BANKING` decididos como `NÃO FRAUDE` entram em LISTAS.

Cartão e HOLD não entram na LISTAS.

Quando a regra tiver `CONTENÇÃO` ou `CONTENCAO`, o caso aparece também na aba `CONTENÇÃO`.

Regra de aplicação:

- Allowlist sem contenção: aplica ID da conta nos dois primeiros campos e número do caso no próximo.
- Contenção: aplica CPF/CNPJ limpo nos dois primeiros campos e número do caso no próximo.
- Datas: data atual e dois dias depois.
- Emissor: busca o ID pelo `issuer-directory.json`.

Exceção:

- Emissor `CONTA SIMPLES` / ID `155` com cadastro menor que 90 dias não entra em LISTAS.

Os casos ficam guardados até a inclusão ou remoção manual. Eles não somem por tempo. Depois de inserir, saem automaticamente da aba correspondente.

A memória de LISTAS é própria e fica separada dos pacotes temporários Falcon/Console.

## Modo seguro

O modo seguro é global:

- se ligar no Falcon, continua ligado no Console e no Tabulador;
- se desligar em qualquer etapa, as próximas seguem desligadas.

Ligado:

- falta de dado obrigatório bloqueia avanço.

Desligado:

- permite avançar, mas mostra alerta laranja.
- duplo clique em grids permite ajuste manual.

## Atalhos

- `Enter`: finaliza a etapa atual ou copia a tabulação final.
- `1`, `2`, `3`, `4`: escolhem decisões no Tabulador.
- `Esc`: fecha a janela.
- `M`: minimiza.
- `P`: volta a janela para a posição inicial.
- `T`: troca tema.
- `A`: abre assinatura no Tabulador.
- `R` ou `0`: recarrega a automação.

## Ajuda da regra

O ícone `!` no grid `Regra` mostra orientação rápida conforme a regra encontrada, como `HOLD`, `CONTENÇÃO`, `DENYLIST`, `DENYLIST_EC`, `DENYLIST_CCS` e capital de giro/auto fraude.

Na engrenagem, o botão `Ajuda da regra` liga ou desliga esses tooltips.

## Assinatura

A assinatura só aparece no Tabulador.

Padrão:

`Giasi Mandela | SAC Prevenção`

Complementos:

- `SAC Prevenção`
- `Dock Teck Prevenção`
- `Backoffice Prevenção`
- personalizado

## Alertas visuais

- Verde: tudo ok.
- Amarelo: atenção, falta de dado ou exceção controlada.
- Vermelho: risco relevante.
- Azul: informação complementar.

Data de cadastro menor que 90 dias pulsa em vermelho.

Status conta fica neutro para `normal`, `ativo` ou `ativa`; qualquer outro valor pulsa em vermelho.
