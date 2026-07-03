# SAC Prevenção - V5

Automação por bookmarklet para coletar dados no Falcon, complementar no Console, preencher o Tabulador e guardar pendências de LISTAS.

## Como usar

1. Suba a pasta `ANALISE` no repositório `attgiasi/AUTOMACAO`.
2. Crie um favorito no Chrome usando o conteúdo de `ANALISE/favorito-unico.bookmarklet.txt`.
3. Use o mesmo favorito em cada página. O loader `ANALISE/sac-prevencao.js` identifica a etapa automaticamente e carrega a versão atual.
4. Para forçar uma etapa, use os bookmarklets da pasta `ANALISE/V5`: `falcon`, `console`, `tabulador` ou `listas`.

## Fluxos

- `CARTÃO`: quando o Falcon identificar últimos 4 dígitos do cartão ou o tipo de transação for `autorização ou lançamento de crédito`.
- `BANKING`: quando não houver critério de cartão.
- `HOLD`: quando o fluxo for banking e a regra tiver a palavra `HOLD`.

## Tratativa

- `BRASIL`: padrão do Console Brasil.
- `GLOBAL`: quando a página indicar Global, Dock One ou Dock On.

## Regras principais

- As janelas abrem em tema escuro por padrão.
- A largura das janelas de Falcon, Console e Tabulador é fixa.
- A janela pode ser arrastada sem alterar largura.
- Não há janelas nativas de confirmação do navegador.
- Alertas ficam na tela por alguns segundos e são empilhados no canto inferior.
- Se o modo seguro estiver ligado, dados obrigatórios faltantes bloqueiam o avanço.
- Se o modo seguro estiver desligado, a automação permite seguir, mas avisa em amarelo.

## Histórico de infrações

O código lido deve ter sempre 10 caracteres no formato `0000000000`.

- Bloco 1: últimos 30 dias, 4 dígitos.
- Bloco 2: últimos 90 dias, 3 dígitos.
- Bloco 3: últimos 60 meses, 3 dígitos.
- Se encontrar e for zero, fica verde.
- Se não encontrar, mostra `0000000000` em laranja.
- Se qualquer bloco for maior ou igual a 3, pulsa em vermelho.
- O fluxo cartão não mostra histórico de infrações.

## Tabulador

Ao clicar em uma decisão:

- A decisão é copiada para a tabulação pronta.
- A janela de tabulação pronta aparece imediatamente.
- A automação preenche campos e dropdowns do Tabulador sem atualizar a página.
- O motivo status espera carregar após a decisão.
- A janela final permanece aberta até clicar em `Copiar`.
- `Mudar decisão` volta para os dados de análise.

## Motivo status

- `FRAUDE`: `FRAUDE TRANSACIONAL`.
- `NÃO FRAUDE`: `SEM SUSPEITAS`.
- `NÃO FOI POSSÍVEL CONFIRMAR FRAUDE`: banking/hold usa `DADOS INSUFICIENTES PARA ANÁLISE`; cartão usa `CLIENTE NÃO ATENDE`.
- `NÃO FOI POSSÍVEL CONFIRMAR NÃO FRAUDE`: `DADOS INSUFICIENTES PARA ANÁLISE`.

## Fila

- `BANKING`: fila `BANKING`.
- `HOLD`: fila `HOLD`.
- `CARTÃO`: usa a decisão da transação no Falcon.
- `approve`: `CARTÕES APROVADAS`.
- `decline`: `CARTÕES RECUSADAS`.

## LISTAS

Somente casos `BANKING` decididos como `NÃO FRAUDE` entram em LISTAS.

- Allowlist: usa ID da conta.
- Contenção: se a regra tiver `CONTENÇÃO` ou `CONTENCAO`, também usa CPF/CNPJ sem pontuação na aba Contenção.
- ONLYPAY: prazo de 5 dias.
- SOFISA em contenção: prazo de 3 dias.
- Demais banking: prazo de 2 dias.
- Casos saem da LISTAS somente ao inserir ou remover.

## PID no cartão

No Console, ao selecionar `COM CHAMADA`, abre uma janela lateral de PID.

- PID padrão: CPF, cartão e última compra como dados obrigatórios.
- PID AMIGOZ: usa o PID próprio do book, com nome da mãe, final do CPF, data de nascimento, últimos dígitos do cartão, vencimento da fatura e última compra.

## Atalhos

- `Enter`: finaliza a etapa atual ou copia a tabulação final.
- `1`, `2`, `3`, `4`: selecionam decisões no Tabulador.
- `Esc`: fecha a janela.
- `M`: minimiza.
- `P`: volta a janela para a posição inicial.
- `T`: troca tema.
- `R` ou `0`: recarrega a automação.
- `A`: abre configuração de assinatura no Tabulador.

## Arquivos

- `sac-prevencao.js`: código principal da V5.
- `preview.html`: prévia interativa.
- `issuer-directory.json`: base local de emissores.
- `auto.bookmarklet.txt`: favorito automático.
- `falcon.bookmarklet.txt`, `console.bookmarklet.txt`, `tabulador.bookmarklet.txt`, `listas.bookmarklet.txt`: favoritos por etapa.
