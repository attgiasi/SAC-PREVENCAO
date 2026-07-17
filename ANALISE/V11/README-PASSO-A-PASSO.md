# SAC Prevenção V11

Versão de testes revisada em 17/07/2026. Build `11.13`.

## Estrutura

A V11 fica organizada em blocos claros:

- `sac-prevencao-v11.js`: interface, coleta, fluxos Falcon/Console/Tabulador, Histórico e LISTAS.
- `sac-memory-v11.js`: memória própria da V11 para pacotes entre etapas, Histórico e LISTAS.
- `sac-tabulator-v11.js`: motor rápido de aplicação dos campos no Tabulador.
- `sac-counterparty-v11.js`: arquitetura independente para classificação assistida de CNPJs.
- `sac-corporate-v11.js`: consulta cadastral e cruzamento com dados oficiais da Receita Federal.
- `sac-transaction-v11.js`: motor de sinais da análise transacional do Console.
- `sac-media-v11.js`: coleta mapeada de PID e processos no BigData, vinculada ao caso e ao CPF consultado.
- `sac-ddd-v11.js`: identificação de DDD, UF e região, incluindo a regra regional da BEMOL.
- `counterparty-registry-v11.json`: snapshot versionado da base de CNPJs; permanece vazio até receber dados confirmados.
- `counterparty-registry-v11.schema.json`: contrato dos registros de contrapartes.
- `preview.html`: prévia interativa fiel ao comportamento visual principal.
- `issuer-directory.json`: base de apoio para cruzamento de emissores.
- `bookmarklet-v11.txt`: favorito dedicado para testar a V11 diretamente.
- `loader-v11.js`: carregador dedicado que resolve o commit mais recente e evita reutilizar uma build antiga do CDN.

Esta versão é isolada para testes. O favorito universal permanece na V10 estável.

A V11.13 mantém o `Modo investigação` desligado por padrão. Quando ativado, uma aba discreta abre o painel lateral opcional. `Verificar CNPJ` aparece no Falcon somente para CNPJ válido de quem enviou ou recebeu; a análise transacional aparece quando houver linhas mapeadas. O controle de painel usa chevron com marcador lateral para diferenciar abrir e recolher. Clicar novamente na ação ativa também fecha o resultado. O BigData não abre janela de análise: apenas coleta PID e mídia, guarda o resultado e o entrega ao Console. Nenhum resultado toma a decisão pelo analista.

O carregamento inicial limita a espera pela área de transferência. Se o navegador não responder à permissão de leitura, a janela abre normalmente e utiliza as memórias locais disponíveis, sem ficar travada antes do Falcon.

No Console, ligar `COM CHAMADA` abre o painel PID ao lado da janela em qualquer fluxo. O emissor aparece no título, AMIGOZ mantém seu roteiro específico e os dados coletados anteriormente no BigData preenchem os respectivos grids de confirmação.

O painel de investigação usa grids compactos. A análise transacional informa explicitamente se houve `P2P detectado`, com verde para sinal favorável, laranja para atenção e vermelho para sinal suspeito. A consulta cadastral mostra nome, abertura e situação; CNPJ com menos de três meses ou situação `INAPTA`, `BAIXADA`, `SUSPENSA` ou `NULA` pulsa em vermelho. O indicador dentro do grid do CNPJ fica verde para base confiável, amarelo para atenção, vermelho para contraparte suspeita e neutro quando ainda não há classificação.

## Blocos revisados

- `FALCON`: coleta caso, fluxo, regra, data/hora, valor, histórico, CPF/CNPJ do titular em BANKING/HOLD e dados específicos de cartão quando houver.
- `CONSOLE`: recebe os dados do Falcon, complementa status, emissor, conta, cadastro, documento e campos de análise.
- `TABULADOR`: só aplica os campos depois da decisão; Motivo Status é o único campo dependente que aguarda carregar.
- `CONFIGURAÇÕES`: usa memória compartilhada para refletir tema, modo seguro, ajuda, fonte, assinatura e cores entre etapas.
- `LISTAS`: recebe apenas BANKING não fraude, com Contenção quando a regra tiver `CONTENÇÃO`/`CONTENCAO`; itens inseridos ou removidos ficam baixados e não devem reaparecer por cópia antiga.
- `HISTÓRICO`: grava a tabulação sem CPF/CNPJ visível e deve abrir igual em qualquer etapa.

Na V11, a memória de LISTAS, Histórico e Configurações usa um estado central próprio e também é espelhada por `localStorage`, `sessionStorage`, `window.name` e envelope HTML padrão no clipboard. O formato customizado antigo é apenas lido para compatibilidade; novas gravações usam formatos padrão. As configurações, LISTAS e Histórico também viajam dentro dos pacotes Falcon e Console para reforçar tema, modo seguro, modo ajuda, fonte, assinatura, cores dos fluxos e casos pendentes entre etapas.

LISTAS também possui um cofre dedicado da V11. Esse cofre guarda os casos pendentes por 12 horas, aplica tombstones quando um item é inserido ou removido, e impede que uma cópia antiga do clipboard traga de volta casos já baixados.

As gravações de LISTAS usam uma única fila canônica de mutação e cofre persistente. Ao finalizar um caso BANKING como NÃO FRAUDE, a gravação é confirmada antes de a janela fechar. A leitura da janela LISTAS passa primeiro pelos registros de baixa, impedindo que cópias antigas reapresentem itens já inseridos ou removidos. Os blocos compartilhados em `window.name` também são preservados sem apagar LISTAS, Histórico ou Configurações uns dos outros.

O Tabulador possui um mapa fixo de aplicação: cada campo tem tipo, seletor, valor esperado e validação. Dropdowns são selecionados pela opção real, não por texto colado, e qualquer inconsistência aparece no painel do Tabulador com o nome do campo.

Também foi feito pente fino no caminho ativo da V11: funções internas não utilizadas foram removidas e os aliases de fila de cartão aceitam tanto `APPROVE/AUTHORIZED` quanto `DECLINE/DENIED`, sempre selecionando a opção real do dropdown.

O bloco `FALCON` usa leitura contextual da linha laranja. A coleta prioriza os campos mapeados do grid (`RULESTEXT`, `TRANSACTION_DTTM`, `TRANSACTION_AMT`, `USER_DATA_20`, `MERCHANT_NAME`, `FALCON_DECISION_CODE` e `TRANSACTION_POSTING_ENTRY_XFLG`) e não usa busca global ampla para histórico de infrações.

Na V11, o bloco `CONSOLE` mantém a coleta mapeada. BANKING/HOLD validam `ID da conta + CPF/CNPJ`; CARTÃO valida o número pelo final do cartão coletado no Falcon. Com modo seguro ligado, divergência bloqueia a etapa; com modo seguro desligado, a mensagem `CASO DIVERGENTE, CONFIRA O FALCON NOVAMENTE` aparece, mas o fluxo pode continuar.

O Tabulador mantém a aplicação estável da V10. Pacotes Falcon/Console só são aceitos quando pertencem à build atual, evitando mistura com dados de versões anteriores.

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
- modo investigação;
- cores dos fluxos;
- assinatura, apenas no Tabulador.

A assinatura é solicitada somente na primeira vez em que o Tabulador precisar finalizar uma decisão. Depois de salva, fica guardada na memória local enquanto o código estiver em uso.

O complemento padrão é `SAC Prevenção`. Também existem `Dock Teck Prevenção`, `Backoffice Prevenção` e opção personalizada.

## Modo Investigação E BigData

O `Modo investigação` é compartilhado entre as etapas e fica desligado por padrão. O fluxo opcional completo é:

`FALCON > BigData (opcional) > CONSOLE > TABULADOR`

O BigData só coleta e transporta dados; não exibe janela de análise. No Falcon e no Console, a aba lateral do modo investigação mostra apenas as ações compatíveis com a página:

- `Verificar CNPJ`: cruza a classificação interna, a lista SPA e o cadastro oficial disponível. Situação `INAPTA`, `BAIXADA`, `SUSPENSA` ou `NULA` e abertura inferior a três meses pulsam em vermelho. Sem snapshot oficial sincronizado, informa que o dado da Receita está indisponível em vez de presumir um status.
- `Análise transacional no Console`: prepara a avaliação da página transacional do Console. P2P é um sinal favorável à decisão de não fraude, mas não decide o caso sozinho.
- `Análise transacional no Falcon`: lê todas as linhas visíveis do grid, agrupa quem enviou ou recebeu, quantidade e valores, informa o período entre a primeira e a última data válida carregada e cruza CNPJs com a base operacional. O painel não altera o caso.
- `BigData/PID`: coleta nome, nome da mãe, nascimento, documento/status, endereço principal, cidade, UF, telefone e e-mail nos blocos mapeados.
- `Mídia desabonadora`: lê processos em `queryResult_judicialCasesHolderData`; só aceita ocorrência quando o CPF consultado coincide com a parte e ela está como réu/polo passivo. Variações de título são normalizadas por categoria. O Console recebe `sim` e as categorias automaticamente; sem ocorrência recebe `não`/`SEM MÍDIA`.
- antes de classificar processos, o CPF do bloco de dados pessoais do BigData deve coincidir com um CPF do pedido do Falcon; divergência interrompe apenas a coleta opcional e não altera o Console.

Os seletores do BigData e das páginas transacionais foram mapeados nos HTMLs fornecidos. O motor não faz busca global por nomes ou documentos fora desses blocos.

Na página-base do BigData, sem resultado visível, a V11 orienta a realizar a consulta e executar o favorito novamente após o carregamento. Um HTML salvo pode conter os resultados no código-fonte e removê-los do DOM ao ser reaberto; a coleta operacional ocorre sobre os resultados visíveis da consulta real.

Nos fluxos BANKING e HOLD, o documento de quem enviou ou recebeu é coletado da mesma linha laranja usada para regra, data e valor:

- `Depósito bancário de varejo`: usa `CREDIT_CUSTOMER_XID_VALUE`, exibido como `ID do cliente de crédito`.
- `Pagamento bancário de varejo`: usa `DEBIT_CUSTOMER_XID_VALUE`, exibido como `ID do cliente de origem`.
- um valor de 14 caracteres válido preenche automaticamente a verificação de CNPJ;
- um valor de 11 dígitos é mantido como CPF e nunca é enviado à consulta empresarial.

O documento do titular usa o lado da transação definido para conferência:

- `Depósito bancário de varejo`: titular em `CREDIT_CUSTOMER_XID_VALUE`.
- `Pagamento bancário de varejo`: titular em `DEBIT_CUSTOMER_XID_VALUE` (origem).
- a conta do mesmo lado é usada como confirmação auxiliar.
- no fluxo CARTÃO essa regra não é usada; a ligação Falcon/Console é feita pelo número/final do cartão.

## Modo Seguro

O modo seguro é compartilhado entre Falcon, Console e Tabulador.

- Ligado: dados obrigatórios faltantes bloqueiam avanço.
- Desligado: permite seguir com alerta e permite edição manual por duplo clique nos grids.

Com o modo seguro desligado, o clique simples no grid não copia o dado. Isso evita cópia acidental durante edição manual.

## Modo Ajuda

O modo ajuda fica desligado por padrão.

Quando ativado, os grids de `Regra` e `Emissor` exibem ícone de informação somente quando houver orientação real cadastrada. Grids de status também podem exibir ajuda quando o valor for `bloqueio preventivo falcon 254`. A ajuda aparece ao passar o mouse sobre o ícone e desaparece ao retirar o mouse. Cada orientação é exibida em um grid separado no painel lateral.

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
- `Bloqueio Preventivo Falcon`: resume quando aplicar bloqueio em cartão, quando manter bloqueio em Banking/JIRA, e quais SPDs avaliar conforme sustentação.
- `Bloqueios do book Falcon`: inclui `SPD 01`, `SPD 02`, `SPD 08`, `SPD 15`, `SPD 17`, `SPD 21`, `SPD 25`, `SPD 33`, `Ação Judicial`, `Conta não ativada`, `Bloqueio Preventivo Falcon 254` e `Cancelamento Definitivo Falcon`.
- `Desvio de padrão`, `Contactless`, `3DS`, `Boleto valor suspeito` e demais regras conhecidas exibem orientação resumida quando a palavra-chave estiver na regra.

No grid de `Emissor`, o painel lateral exibe particularidades conhecidas do emissor e orientações do book quando houver correspondência. Exemplos incluídos: `Onlypay`, `Sofisa`, `Conta Simples`, `Amigoz`, `Tipcard`, `WudiPay`, `EzzePay`, `RedeFrota/Frotabank`, `Noh`, `Trampay`, `Bemol`, `iFood`, `Jeitto` e `Meu Tudo`.

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
- os campos independentes são aplicados rapidamente e confirmados de forma curta;
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

O motor usa aplicação direta em campos e selects, dispara `input`, `change` e `blur`, atualiza `selectpicker` quando existir e faz confirmação curta para evitar falhas intermitentes. Essa é a lógica rápida inspirada na aplicação direta dos códigos base, preservando tolerância a variações de texto.

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
- CARTÃO + `FRAUDE`: `CLIENTE SOFREU FRAUDE`, exceto quando `Histórico de compra no estabelecimento` ou `Padrão de compra` for `autofinanciamento`; nesse caso aplica `FRAUDE TRANSACIONAL`.
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

LISTAS usa memória própria da V11 e mantém vários casos pendentes até a inclusão.

Regras:

- Somente BANKING com decisão final `NÃO FRAUDE` entra em Allowlist.
- Cartão não entra em LISTAS.
- Se a regra contiver `CONTENÇÃO` ou variações sem acento, o caso também entra na aba `CONTENÇÃO`.
- Se depois o mesmo caso/conta for decidido como fraude ou outra decisão, o item é removido da lista pendente.
- Os itens só saem da lista após `INSERIR` ou `REMOVER`.
- A duplicidade da ALLOWLIST usa a combinação `número do caso + ID da conta`.
- A duplicidade da CONTENÇÃO usa a combinação `número do caso + CPF/CNPJ`.
- Um caso de CONTENÇÃO gera registros lógicos independentes nas duas abas, para que inserir/remover uma não baixe a outra por engano.
- Um BANKING `NÃO FRAUDE` com regra de `CONTENÇÃO` aparece imediatamente nas abas `ALLOWLIST` e `CONTENÇÃO`.
- Se ID da conta ou CPF/CNPJ estiver temporariamente ausente, o registro permanece visível e a inclusão é bloqueada até o dado ser corrigido; ele não é descartado silenciosamente.
- A janela de tabulação não fecha se o motor não confirmar a gravação do caso em LISTAS.

Aplicação:

- Allowlist usa ID da conta nos dois campos principais.
- Contenção usa CPF/CNPJ limpo, sem pontos, traços ou barras.
- A data inicial é o dia atual.
- A data final é dois dias depois, salvo regra específica por emissor.
- O ID do emissor é cruzado pelo nome do emissor; se não localizar, o sistema avisa para conferência manual.
- A base de emissores foi atualizada pelo documento de seleção enviado, com 382 emissores e aliases para nomes que aparecem diferente entre Console, Falcon e LISTAS.

## Histórico

O Histórico registra casos concluídos por até 12 horas e fica disponível pelo botão `H` na barra superior das janelas.

O motor do Histórico mescla a memória local da página, a memória compartilhada do clipboard e um espelho interno por aba do navegador. Assim, ao abrir o Histórico no Falcon, Console, Tabulador ou Listas, a janela deve exibir os mesmos casos resolvidos no fluxo.

Para segurança, CPF e CNPJ não são exibidos no Histórico. A janela mostra:

- pesquisa;
- filtro por fluxo;
- lista compacta com número do caso, emissor e conta;
- dados de análise;
- tabulação final do caso selecionado.
- grids clicáveis de `Número do caso` e `ID da conta` acima da tabulação pronta.

Com o modo seguro ligado, um clique em qualquer um desses dois grids copia o valor e mostra uma confirmação discreta.

## Notificações

Para manter a tela limpa, notificações de progresso foram reduzidas.

O sistema mostra principalmente:

- erro ou dado obrigatório faltante;
- alerta quando o modo seguro estiver desligado;
- conclusão de etapa;
- confirmação de cópia/finalização.

## Barra e configurações

- `⚙️`: abre Configurações.
- `🕘`: abre o Histórico.
- `🔄`: recarrega a automação.
- O tamanho da fonte usa um controle segmentado `A− | percentual | A+`, com áreas de clique maiores.
- Aumentar ou diminuir a fonte atualiza o layout sem fechar o painel de Configurações.

## Atalhos

- `1`, `2`, `3`, `4`: escolhem decisões.
- `Enter`: confirma ação principal quando aplicável.
- `Esc`: fecha a janela ativa.
- `M`: minimiza.
- `P`: volta à posição inicial.
- `T`: alterna tema.
- `R` ou `0`: recarrega a automação.
- `+`: aumenta a fonte.
- `-`: diminui a fonte.

## Instalação

1. Envie a pasta `ANALISE/V11` para o GitHub.
2. Mantenha o favorito geral apontando para `ANALISE/favorito-universal.bookmarklet.txt`.
3. Use o mesmo favorito nas páginas do Falcon, Console, Tabulador e LISTAS.
4. Para testar a V11 sem alterar o favorito universal, use `ANALISE/V11/bookmarklet-v11.txt`.

O bookmarklet dedicado da V11 não altera nem substitui o favorito universal da V10.

Ao migrar de um favorito V11 antigo, substitua seu conteúdo uma vez pelo código atual de `bookmarklet-v11.txt`. O novo favorito chama `loader-v11.js`, resolve o commit mais recente do repositório e carrega os oito módulos por uma referência imutável, evitando permanecer preso a builds antigas como a V11.8.



