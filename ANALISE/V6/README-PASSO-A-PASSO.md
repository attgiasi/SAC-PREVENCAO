# SAC Prevenção V6

Versão revisada em 22/06/2026.

## Arquivos ativos

- `ANALISE/motor-sac-universal.js`: carregador estável.
- `ANALISE/favorito-universal.bookmarklet.txt`: único favorito necessário.
- `ANALISE/V6/sac-prevencao-v6.js`: automação principal.
- `ANALISE/V6/issuer-directory.json`: nomes e IDs dos emissores.
- `ANALISE/V6/preview.html`: prévia interativa.

O favorito não abre popup. A versão de 22/06/2026 exige atualizar o favorito uma única vez, pois ele agora recupera a memória compartilhada antes de carregar o motor. Depois dessa troca, novas versões continuam sendo apontadas apenas pelo `motor-sac-universal.js`.

## Instalação

1. Envie a pasta `V6` para `ANALISE/V6` no GitHub.
2. Envie `motor-sac-universal.js` e `favorito-universal.bookmarklet.txt` para `ANALISE`.
3. Abra `favorito-universal.bookmarklet.txt`.
4. Crie um favorito no Google Chrome.
5. Cole todo o conteúdo do arquivo no campo de URL.
6. Use esse mesmo favorito no Falcon, Console, Tabulador e página de LISTAS.

Se já havia um favorito instalado antes de 22/06/2026, substitua a URL antiga pelo conteúdo atual de `favorito-universal.bookmarklet.txt`.

## Identificação

Fluxos:

- `CARTÃO`: quatro últimos dígitos do cartão ou tipo `autorização ou lançamento de crédito`.
- `HOLD`: fluxo BANKING cuja regra contém `HOLD`.
- `BANKING`: quando as regras de CARTÃO e HOLD não forem atendidas.

No Falcon, HOLD seleciona somente as linhas cuja célula `Regras rastreadas` contém `HOLD`. Linhas com outra regra ou regra vazia são desmarcadas.

Tratativas no Console:

- botão `Backoffice Brasil`: tratativa `BACKOFFICE BRASIL`;
- botão `Global Backoffice`: tratativa `GLOBAL BACKOFFICE`.

O texto exato do botão tem prioridade sobre URL e estrutura da página.

No CARTÃO com `GLOBAL BACKOFFICE`, a ausência de ID, final, tipo ou status do cartão não bloqueia o fluxo. Os campos recebem `ausência de dados` e o Console continua sem exibir `Tentar novamente`.

## Janelas

Falcon, Console e Tabulador têm largura fixa de `420px`.

- clicar na barra não altera a largura;
- arrastar move a janela na mesma posição do ponteiro;
- minimizar mantém a barra com `420px`;
- o conteúdo interno do Tabulador não pode ampliar a janela;
- o PID abre à esquerda do Console e acompanha seu movimento;
- o PID mostra dados obrigatórios primeiro e complementares abaixo.

## Tabulador

Os campos primários são aplicados juntos. Após a decisão:

1. os campos independentes, incluindo Fila, são aplicados na abertura do Tabulador;
2. a tela de análise permanece aberta após o clique na decisão;
3. o clique aplica `Status`;
4. o motor aguarda o AJAX carregar `Motivo Status` e escolhe a resposta correspondente;
5. Status, Motivo Status e os demais campos são relidos e confirmados;
6. somente depois da confirmação aparece a janela de tabulação pronta;
7. Fila, Status e Motivo Status sempre bloqueiam a finalização quando não forem confirmados, mesmo com o modo seguro desligado;
8. uma inconsistência informa o local exato, por exemplo `Tabulador > Motivo status`;
9. a janela de tabulação pronta não fecha pelo X, Esc ou recarregar;
10. `Mudar decisão` cancela a aplicação anterior e retorna sem registrar o caso;
11. somente `Copiar` finaliza, registra o histórico, atualiza LISTAS e fecha a janela.

O detalhe de Mídia desabonadora usa grids compactos de até duas linhas. As palavras são quebradas somente nos espaços, sem cortes no meio.

Ao selecionar `divergente` em E-mail, DDD e Endereço, a janela oferece:

- E-mail não se refere ao nome;
- DDD diferente da região do endereço;
- Copia e cola;
- campo opcional para registrar o e-mail observado.

## LISTAS

Somente BANKING com decisão final `NÃO FRAUDE` entra na Allowlist. Regras de contenção também entram na aba Contenção.

- o item só é criado no clique final em `Copiar`;
- CARTÃO e HOLD não entram;
- qualquer decisão posterior diferente de `NÃO FRAUDE`, para o mesmo caso e conta, remove o item pendente;
- itens iguais são substituídos, evitando duplicidade;
- a fila aceita até 300 itens e mantém cada pendência por até 12 horas;
- a fila usa um envelope privado no clipboard junto ao texto normal;
- não existe janela auxiliar;
- CPF/CNPJ não é gravado em `localStorage` ou `sessionStorage`;
- `INSERIR` e `REMOVER` retiram o item da fila.

Evite copiar outro conteúdo entre a finalização do caso e a inclusão em LISTAS, pois isso pode substituir o clipboard e, junto, a fila pendente.

## Memória e histórico

LISTAS e Histórico usam uma memória compartilhada própria, transportada no mesmo clipboard do fluxo sem alterar o texto normal copiado.

- a memória é recuperada pelo favorito antes de o código principal carregar;
- os casos de LISTAS continuam disponíveis ao alternar entre Falcon, Console, Tabulador e página de inclusão;
- até 300 pendências de LISTAS são mantidas por 12 horas;
- o Histórico mantém até 60 casos por 12 horas;
- refazer um caso e uma conta atualiza o registro existente no Histórico, sem duplicá-lo;
- uma decisão posterior diferente de `NÃO FRAUDE` remove o caso correspondente de LISTAS;
- o Histórico possui uma cópia local sanitizada, sem CPF ou CNPJ;
- CPF e CNPJ usados em Contenção permanecem somente na memória de LISTAS e somem após `INSERIR` ou `REMOVER`.

## Atalhos

- `Enter`: ação principal.
- `1`, `2`, `3`, `4`: decisão.
- `Esc`: fechar.
- `M`: minimizar.
- `P`: posição inicial.
- `T`: tema.
- `A`: assinatura no Tabulador.
- `R` ou `0`: recarregar a automação.
