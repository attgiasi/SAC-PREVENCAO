# SAC Prevenção - ANALISE/V2

Versão 2.10 da automação para Falcon, Console, Tabulador e LISTAS.

## Arquivos

- `sac-prevencao.js`: código principal.
- `issuer-directory.json`: base de emissores extraída da Lista de SE.
- `falcon.bookmarklet.txt`: favorito da etapa Falcon.
- `console.bookmarklet.txt`: favorito da etapa Console.
- `tabulador.bookmarklet.txt`: favorito da etapa Tabulador.
- `listas.bookmarklet.txt`: favorito da janela LISTAS.
- `allowlist.bookmarklet.txt`: alias compatível que também abre LISTAS.
- `auto.bookmarklet.txt`: favorito que tenta detectar a etapa automaticamente.
- `preview.html`: prévia interativa.

Os favoritos desta revisão usam cache `v=2.10`.

## Ordem de uso

1. Execute o favorito Falcon na página do Falcon.
2. Revise os grids e clique em `Finalizar etapa`.
3. Execute o favorito Console na página do Console.
4. Revise os dados recebidos do Falcon, os dados do Console e os dropdowns.
5. Clique em `Finalizar etapa`.
6. Execute o favorito Tabulador.
7. Escolha a decisão.
8. A automação aplica os campos, copia a tabulação e mostra a tela final.
9. Na tela final, use `Copiar` para copiar novamente e fechar, ou `Mudar decisão` para voltar.

## Fluxos

- `CARTÃO`: quando o tipo de transação do Falcon for `autorização ou lançamento de crédito`, ou quando forem encontrados os últimos 4 dígitos do cartão.
- `BANKING`: quando não houver sinal de cartão.
- `HOLD`: quando o fluxo for banking e a regra contiver `HOLD`.

O HOLD usa a lógica de Banking, mas com cor de alerta e fila `HOLD`.

## Falcon

O Falcon coleta:

- caso;
- valor;
- regra;
- data/hora sem segundos;
- histórico de infrações;
- tipo de transação para Banking/HOLD;
- estabelecimento, tipo de compra do cartão e decisão da transação para Cartão.

A coleta prioriza a linha laranja. Se faltar dado obrigatório, a etapa não avança e os grids ausentes piscam em laranja.

## Console

A janela do Console mostra:

- no topo, todos os dados recebidos do Falcon, na mesma ordem e no mesmo layout;
- abaixo, os dados coletados no próprio Console;
- abaixo, os dropdowns de análise.

Opções de `Status conta` e `Status Pessoa (SPD)`:

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

Quando `outro` for selecionado, aparece um campo manual dentro da janela. Nenhum `prompt`, `alert` ou confirmação do navegador é usado.

Demais dropdowns:

- Mídia desabonadora: `não`, `sim`.
- Histórico SPD: `normal`, `não`, `sim`, `spd 1`, `spd 2`, `spd 8`, `spd 15`, `spd 17`, `spd 21`, `spd 25`, `spd 33`, `outro`.
- E-mail, DDD e Endereço: `de acordo`, `divergente`, `sem informação`.
- Documentação: `sem ressalvas`, `com ressalvas`, `baixa qualidade`, `foto de tela`, `editado`, `falsificado`, `sem arquivos`.
- Extrato: `sem suspeitas`, `com suspeitas`, `triangulação`, `autofinanciamento`, `sem histórico`.

## Tabulador

A janela do Tabulador mostra:

- dados do Falcon;
- dados do Console;
- respostas dos dropdowns;
- botões de decisão.

As decisões aplicadas no dropdown `ddl_status` são:

- `FRAUDE`;
- `NÃO FRAUDE`;
- `NÃO FOI POSSÍVEL CONFIRMAR FRAUDE`;
- `NÃO FOI POSSÍVEL CONFIRMAR NÃO FRAUDE`.

Motivo status:

- `FRAUDE`: `FRAUDE TRANSACIONAL`.
- `NÃO FRAUDE`: `SEM SUSPEITAS`.
- Banking/HOLD + decisões inconclusivas: `DADOS INSUFICIENTES PARA ANÁLISE`.
- Cartão + `NÃO FOI POSSÍVEL CONFIRMAR FRAUDE`: `CLIENTE NÃO ATENDE`.

O motivo status é dependente da decisão. A automação seleciona a decisão, aguarda o dropdown carregar e tenta aplicar o motivo correto por várias tentativas antes de avisar pendência.

Fila:

- Banking: `BANKING`.
- Hold: `HOLD`.
- Cartão com `approve`: `CARTÕES APROVADAS`.
- Cartão com `decline`: `CARTÕES RECUSADAS`.

## Alertas

- Verde: tudo ok.
- Amarelo: atenção ou dado pendente.
- Vermelho: erro, falta de dado ou risco relevante.
- Azul: informação complementar.

Regras de alerta:

- Histórico de infrações fica vermelho quando qualquer bloco for 3 ou mais.
- Data de cadastro menor que 90 dias fica vermelha.
- Status conta fica neutro se for `normal`, `ativo` ou `ativa`; qualquer outro valor fica vermelho.
- Dropdown diferente do padrão fica vermelho, exceto `sem histórico`, `ausência de dados`, `sem documentos`, `sem informação` e `sem arquivos`.

Histórico de infrações:

- 4 primeiros dígitos: últimos 30 dias.
- 3 dígitos do meio: últimos 90 dias.
- 3 últimos dígitos: últimos 60 meses.
- Exemplo: `0003003003` aciona vermelho.

## Assinatura

A assinatura só aparece nas configurações do Tabulador.

Padrão:

`Giasi Mandela | Backoffice Prevenção`

Complementos disponíveis:

- `SAC Prevenção`
- `Dock Teck Prevenção`
- `Backoffice Prevenção`
- personalizado

O campo personalizado só aparece quando `Personalizado` é selecionado.

## LISTAS

A decisão `NÃO FRAUDE` cria pendências na janela `LISTAS`.

- Aba `ALLOWLIST`: recebe todos os casos decididos como `NÃO FRAUDE`.
- Aba `CONTENÇÃO`: recebe também os casos decididos como `NÃO FRAUDE` quando a regra tiver `CONTENSÃO` ou `CONTENSAO`.
- As abas são complementares. Um caso com regra de contenção aparece na aba `ALLOWLIST` e também na aba `CONTENÇÃO`.
- Na aba `ALLOWLIST`, a automação aplica o número da conta nas duas primeiras caixas de informação e o número do caso na outra caixa.
- Na aba `CONTENÇÃO`, a automação aplica CPF/CNPJ limpo nas duas primeiras caixas de informação e o número do caso na outra caixa.
- A data inicial é o dia atual.
- A data final é dois dias depois.
- O emissor é localizado no `issuer-directory.json` e aplicado pelo ID.
- Após inserir uma aba, o item sai automaticamente daquela aba.
- A fila dura 12 horas e guarda apenas o necessário para a inclusão.

## Modo seguro

Na engrenagem existe o botão `Seguro`.

- Ligado: se faltar dado obrigatório, a automação não deixa avançar.
- Desligado: a automação deixa avançar, mas mostra alerta amarelo e mantém os grids pendentes destacados.

## Atalhos

- `Enter`: confirma a etapa atual.
- `1`, `2`, `3`, `4`: escolhem decisões no Tabulador.
- `Esc`: fecha a janela.
- `m`: minimiza.
- `p`: volta para a posição inicial.
- `t`: troca o tema.
- `r` ou `0`: recarrega a automação.
- `a`: abre configurações de assinatura no Tabulador.
