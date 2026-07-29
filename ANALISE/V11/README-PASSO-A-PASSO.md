# SAC Prevenção V11

Versão ativa revisada em 29/07/2026. Build `11.31`.

## Estrutura

A V11 fica organizada em blocos claros:

- `sac-prevencao-v11.js`: interface, coleta, fluxos Falcon/Console/Tabulador, Histórico e LISTAS.
- `sac-memory-v11.js`: memória própria da V11 para pacotes entre etapas, Histórico e LISTAS.
- `sac-tabulator-v11.js`: seletor robusto das opções reais dos dropdowns do Tabulador.
- `sac-counterparty-v11.js`: arquitetura independente para classificação assistida de CNPJs.
- `sac-corporate-v11.js`: consulta cadastral e cruzamento com dados oficiais da Receita Federal.
- `sac-transaction-v11.js`: motor de sinais da análise transacional do Console.
- `sac-media-v11.js`: coleta somente o CPF titular e processos no BigData, vinculada ao caso e ao CPF consultado.
- `sac-ddd-v11.js`: identificação de DDD, UF e região, incluindo a regra regional da BEMOL.
- `counterparty-registry-v11.json`: snapshot versionado da base operacional de CNPJs confiáveis, de atenção e suspeitos.
- `counterparty-registry-v11.schema.json`: contrato dos registros de contrapartes.
- `preview.html`: prévia interativa fiel ao comportamento visual principal.
- `issuer-directory.json`: base de apoio para cruzamento de emissores.
- `bookmarklet-v11.txt`: favorito dedicado para testar a V11 diretamente.
- `loader-v11.js`: carregador dedicado que resolve o commit mais recente e evita reutilizar uma build antiga do CDN.

Esta é a versão ativa. O favorito universal carrega a V11 pelo `loader-v11.js`.

A V11.31 mantém `Modo investigação` e `Modo ajuda` desligados por padrão. As duas preferências são independentes e compartilhadas entre todas as etapas. `Analisar` abre somente Transacional, CNPJ e Mídias; `Ajuda` abre separadamente orientações de regra, emissor e book. Os botões aparecem à esquerda das janelas Falcon, Console e Tabulador somente quando o respectivo modo estiver ativo. Cada painel é criado apenas no clique, substitui qualquer lateral anterior e recebe rolagem vertical própria quando o conteúdo ultrapassa a tela. A conferência Falcon x Console continua no fluxo de segurança, mas não ocupa um grid da investigação. O BigData coleta silenciosamente mídia do CPF titular e os dados disponíveis para o PID.

O PID usa botões de chave próprios, sem depender do comportamento de labels da página do Console. Seus dados aparecem em uma única coluna e, quando a investigação também estiver aberta, o posicionador tenta usar o lado oposto da janela do Console para evitar sobreposição. A reexecução encerra listeners e janelas da instância anterior antes de criar a nova, e o PID possui ciclo independente dos popovers auxiliares.

O carregador V11 resolve a revisão mais recente pela API do GitHub e, se necessário, pelo manifesto de lançamento. Se ambas as consultas estiverem indisponíveis, usa uma revisão imutável que já contém a abertura corrigida do PID. Isso impede que o cache de `@main` recupere uma implementação antiga.

O carregamento inicial limita a espera pela área de transferência. Se o navegador não responder à permissão de leitura, a janela abre normalmente e utiliza as memórias locais disponíveis, sem ficar travada antes do Falcon.

O loader baixa os sete motores independentes em paralelo e executa o módulo principal por último. Assim, a janela não precisa aguardar oito downloads sequenciais.

No Console, ligar `COM CHAMADA` abre o painel PID ao lado da janela em qualquer fluxo. O painel PID usa a mesma cor do fluxo atual, inclusive quando a cor foi personalizada. O emissor aparece no título e AMIGOZ mantém seu roteiro específico. Os dados do PID são coletados somente no Console; cada item ausente recebe um botão de recarga que tenta buscar apenas aquele dado na página aberta. `Vencimento da fatura` não participa do PID.

O painel de investigação usa grids compactos com título na borda. A visão geral apresenta total de transações, valor total, período, contatos diferentes, P2P total, P2P com o emissor e P2P pessoal. A seção `Transacionando com` agrupa CPF/CNPJ ou nome, quantidade e valor total por pessoa ou empresa. A velocidade apresenta separadamente os intervalos ativos de 1, 5 e 10 minutos. Quando houver movimentação entre 00h e 06h, informa quantidade e valor nesse horário. Recorrência, possível triangulação, maior valor e valor mediano aparecem como fatos transacionais; orientações de emissor ficam somente em `Ajuda`. A consulta cadastral pode mostrar o CNPJ do titular e o CNPJ de quem está transacionando. Cada resultado exibe `Razão social`, `Nome fantasia`, `Criação`, `Situação cadastral` e `Porte da empresa`; o estado confiável, atenção, suspeito ou não classificado aparece de forma compacta no próprio card do CNPJ. Com o modo seguro ligado, um clique em qualquer grid cadastral copia apenas o valor exibido e confirma a ação discretamente. Os botões `Confiável`, `Suspeito` e `Remover` atualizam somente a classificação local de apoio e nunca escolhem a decisão do caso.

Em depósito bancário, o titular analisado é lido na coluna de crédito e quem enviou é lido na coluna de origem/débito. Em pagamento bancário, o titular é lido na origem/débito e quem recebeu é lido na coluna de crédito. Assim, o CPF usado no BigData continua sendo o do titular e o CNPJ consultado pode pertencer a qualquer uma das duas partes, sem misturá-las.

Uma permissiva só é criada para BANKING com decisão `NÃO FRAUDE` quando a conta está normal/ativa e não possui status SPD. Regra com `CONTENÇÃO`/`CONTENCAO` continua gerando sua pendência própria quando aplicável.

## Blocos revisados

- `FALCON`: coleta caso, fluxo, regra, data/hora, valor, histórico, CPF/CNPJ do titular em BANKING/HOLD e dados específicos de cartão quando houver.
- `CONSOLE`: recebe os dados do Falcon, complementa status, emissor, conta, cadastro, documento e campos de análise.
- `TABULADOR`: só aplica os campos depois da decisão; Motivo Status é o único campo dependente que aguarda carregar.
- `CONFIGURAÇÕES`: usa memória compartilhada para refletir tema, modo seguro, investigação/ajuda, fonte, assinatura e cores entre etapas.
- `LISTAS`: recebe apenas BANKING não fraude, com Contenção quando a regra tiver `CONTENÇÃO`/`CONTENCAO`; itens inseridos ou removidos ficam baixados e não devem reaparecer por cópia antiga.
- `HISTÓRICO`: grava a tabulação sem CPF/CNPJ visível e deve abrir igual em qualquer etapa.

## Pente fino da build 11.27

- `FALCON E CONSOLE`: os seletores foram conferidos contra os HTMLs reais de BANKING, HOLD, CARTÃO e GLOBAL. O Console agora conclui a montagem dos dados do PID antes de retornar o pacote; o trecho antes inalcançável foi corrigido.
- `TABULADOR`: ao descartar ou recarregar a execução, as flags globais de escrita e da janela de decisão são liberadas explicitamente. Isso evita que uma instância anterior mantenha bloqueios sobre a próxima.
- `LISTAS`: a edição manual recebe uma revisão posterior a qualquer baixa existente e renova o prazo do item. Assim, o item editado não é suprimido pelo próprio tombstone criado durante a alteração.
- `HISTÓRICO`: a identidade estável do caso passou a ser a chave principal de atualização. O motor também funde os espelhos atuais antes de ler ou inserir, impedindo duplicação por mudança de emissor e perda de casos concluídos em outra aba.
- `CARREGADOR`: cada script temporário é retirado do DOM assim que termina de carregar, reduzindo resíduos em reexecuções sucessivas.
- `DESEMPENHO`: foram removidas persistências repetidas no encerramento do Tabulador e na fila de LISTAS. As gravações necessárias continuam confirmadas antes de a etapa finalizar.
- As regras de coleta do Falcon, os campos do Console, os mapeamentos de dropdown, Fila, Decisão e Motivo Status do Tabulador não foram alterados neste pente fino.

## Pente fino da build 11.28

- `PID`: os dados obrigatórios e complementares agora usam uma única coluna no runtime e na prévia interativa. Os grids de investigação permanecem em duas colunas e não foram alterados.
- `RESPONSIVIDADE`: removida a regra móvel redundante que reaplicava uma coluna ao PID, pois o componente agora mantém esse formato em qualquer largura.
- `CICLO DE VIDA`: listeners, observadores, intervalos, timers e painéis auxiliares foram conferidos; todos os recursos persistentes possuem encerramento explícito na reexecução ou no fechamento correspondente.
- `HIGIENE`: não foram encontrados IDs estáticos duplicados, funções globais duplicadas, depuração esquecida, recarregamento da página, `alert`, `confirm` ou `prompt` no caminho executável.
- `PRESERVAÇÃO`: coleta Falcon, transferência para Console, dropdowns e aplicação do Tabulador, LISTAS, Histórico, investigação e configurações não tiveram suas regras funcionais modificadas.

## Pente fino da build 11.30

- `PID`: o botão de recarregar usa o símbolo `⟳`, foco visível, destaque no hover e uma identificação curta do que será atualizado.
- `ESTADOS`: durante a busca, o botão informa que está ocupado; no sucesso, o card recebe o check verde; na falha, o botão fica vermelho e passa a oferecer uma nova tentativa claramente identificada.
- `DESEMPENHO`: a coleta continua síncrona e direta na página do Console. Nenhum timer, observador ou armazenamento permanente foi acrescentado ao runtime do PID.
- `HIGIENE`: removido o `async` sem `await` do listener de recarga. A prévia e o teste do PID foram atualizados para reproduzir o mesmo ciclo visual.
- `PRESERVAÇÃO`: coleta de dados, PID específico de AMIGOZ, regras dos fluxos, Tabulador, LISTAS, Histórico, investigação e configurações permaneceram inalterados.

- `CNPJ`: titular e quem está transacionando são candidatos independentes; até dois CNPJs podem ser consultados sem reutilizar o documento errado.
- `APRESENTAÇÃO`: o menu mostra razão social, nome fantasia, criação, situação cadastral e porte. O próprio card do CNPJ recebe sinal visual de confiável, atenção, suspeito ou não classificado.
- `CLASSIFICAÇÃO LOCAL`: os comandos `Confiável`, `Suspeito` e `Remover` persistem a escolha do operador sem tomar decisão automática.
- `INVESTIGAÇÃO`: Transacional, CNPJ e Mídias ficam em até três colunas no painel `Analisar`. A ajuda possui painel e configuração próprios.
- `BIGDATA/PID`: nome, nome da mãe, nascimento, endereço e e-mail disponíveis são transportados para complementar o PID.
- `LISTAS`: permissiva é bloqueada quando a conta possui bloqueio ou qualquer SPD; Contenção mantém sua regra própria.
- `TABULADOR`: removidas mensagens intermediárias de espera; a tabulação pronta só conclui depois da aplicação real dos campos.
- `VALIDAÇÃO`: 16 testes cobrem motores, transferência, memória, investigação, PID, LISTAS e aplicação do Tabulador.

## Base funcional preservada

- `FALCON e CONSOLE`: seletores mapeados e fallbacks contextuais foram mantidos porque atendem variações reais das páginas; não existem funções ou constantes internas sem consumidor.
- `TABULADOR`: o módulo auxiliar permanece restrito ao seletor de opções reais. O caminho de mapas que nunca era executado foi removido; a aplicação direta estável e a espera exclusiva do Motivo Status foram preservadas.
- `MEMÓRIA`: leituras deixaram de regravar o estado inteiro. Os espelhos completos antigos foram migrados para chaves dedicadas e compactas.
- `CNPJ`: a função que abria o site da Receita em outra janela foi removida. A consulta continua automática pela base cadastrada e pelo serviço público configurado.
- `INVESTIGAÇÃO`: ajuda e investigação usam preferências independentes. Os botões laterais abrem e recolhem seus painéis sob demanda; a coleta das transações visíveis só começa depois do clique em Transacional.
- `CONFIGURAÇÕES`: tema, modo seguro, investigação, ajuda, fonte, assinatura e cores são gravados no estado compartilhado e transportados nos pacotes Falcon/Console.
- `LISTAS e HISTÓRICO`: o índice de baixas de LISTAS é calculado uma vez por mesclagem, e o arraste do Histórico libera seus eventos ao fechar. As confirmações múltiplas de persistência foram mantidas por serem proteção operacional entre páginas, não duplicação descartável.
- `VALIDAÇÃO`: corrigido o retorno da conferência FALCON → Console para que ID da conta, CPF/CNPJ ou final do cartão sejam efetivamente comparados.
- `TRANSFERÊNCIA FALCON → CONSOLE`: os pacotes são mesclados pelo horário da própria etapa, não pelo horário global da memória. Uma leitura não altera mais o relógio do estado, builds compatíveis da família V11 continuam o mesmo caso e a janela só fecha após confirmar a cópia do pacote.
- `CICLO DE VIDA`: a proteção de escrita da página agora só é instalada no Tabulador. Arraste, observadores, temporizadores e investigação são liberados junto com a janela correspondente.
- `DESEMPENHO`: aliases de dropdown, tipos de mídia e baixas de LISTAS são indexados uma vez, evitando reconstruções durante cada seleção ou leitura.
- `INTERFACE`: declarações duplicadas do PID e da investigação foram consolidadas na execução e na prévia, preservando as dimensões finais sem cascatas contraditórias.

Na V11, a memória é dividida por responsabilidade. Histórico, LISTAS e Configurações possuem armazenamento persistente dedicado. O caso atual usa transporte temporário por sessão, `window.name` e envelope HTML padrão no clipboard para atravessar as páginas. Os pacotes Falcon e Console levam somente o necessário para continuar a análise, junto com uma cópia compacta de Histórico, LISTAS e Configurações.

Ao clicar em `Copiar` na tabulação pronta, o caso atual e os pedidos temporários de mídia são apagados. Permanecem somente o Histórico concluído, as pendências reais de LISTAS, a assinatura, o tema, a fonte, as cores e os modos escolhidos pelo operador.

Os motores de investigação não persistem resultados cadastrais ou transacionais no pacote do caso. Ao recolher o painel, fechar a janela, avançar de etapa ou finalizar o fluxo, mapas de sessão, consultas e bases carregadas em memória são liberados. Uma classificação de CNPJ adicionada deliberadamente pelo operador continua salva porque passa a integrar a base local, não o resultado temporário da consulta.

LISTAS também possui um cofre dedicado da V11. Esse cofre guarda os casos pendentes por 12 horas, aplica tombstones quando um item é inserido ou removido, e impede que uma cópia antiga do clipboard traga de volta casos já baixados.

As gravações de LISTAS usam uma única fila canônica de mutação e cofre persistente. Ao finalizar um caso BANKING como NÃO FRAUDE, a gravação é confirmada antes de a janela fechar. A leitura da janela LISTAS passa primeiro pelos registros de baixa, impedindo que cópias antigas reapresentem itens já inseridos ou removidos. Os blocos compartilhados em `window.name` também são preservados sem apagar LISTAS, Histórico ou Configurações uns dos outros.

O Tabulador possui um mapa fixo de aplicação: cada campo tem tipo, seletor, valor esperado e validação. Dropdowns são selecionados pela opção real, não por texto colado, e qualquer inconsistência aparece no painel do Tabulador com o nome do campo.

Também foi feito pente fino no caminho ativo da V11: funções internas não utilizadas foram removidas e os aliases de fila de cartão aceitam tanto `APPROVE/AUTHORIZED` quanto `DECLINE/DENIED`, sempre selecionando a opção real do dropdown.

O bloco `FALCON` usa leitura contextual da linha laranja. A coleta prioriza os campos mapeados do grid (`RULESTEXT`, `TRANSACTION_DTTM`, `TRANSACTION_AMT`, `USER_DATA_20`, `MERCHANT_NAME`, `FALCON_DECISION_CODE` e `TRANSACTION_POSTING_ENTRY_XFLG`) e não usa busca global ampla para histórico de infrações.

Na V11, o bloco `CONSOLE` mantém a coleta mapeada. BANKING/HOLD validam `ID da conta + CPF/CNPJ`; CARTÃO valida o número pelo final do cartão coletado no Falcon. Com modo seguro ligado, divergência bloqueia a etapa; com modo seguro desligado, a mensagem `INFORMAÇÕES DIVERGENTES, VERIFIQUE O CASO NOVAMENTE` aparece, mas o fluxo pode continuar.

O Tabulador usa o mapa fixo da V11 e aceita pacotes Falcon/Console com o schema atual da família V11. Assim, uma atualização de correção entre as etapas não perde o caso, enquanto famílias e schemas incompatíveis continuam bloqueados.

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
- modo investigação e modo ajuda, de forma independente;
- cores dos fluxos;
- assinatura, apenas no Tabulador.

A assinatura é solicitada somente na primeira vez em que o Tabulador precisar finalizar uma decisão. Depois de salva, fica guardada na memória local enquanto o código estiver em uso.

O complemento padrão é `SAC Prevenção`. Também existem `Dock Teck Prevenção`, `Backoffice Prevenção` e opção personalizada.

## Investigação, Ajuda E BigData

Os modos `Investigação` e `Ajuda` são compartilhados entre as etapas, independentes e ficam desligados por padrão. `Analisar` executa apenas Transacional, CNPJ e Mídias; `Ajuda` mostra somente orientações. Os painéis laterais abrem sob demanda, fecham pela seta voltada para a janela principal e usam rolagem vertical somente quando necessário. O fluxo operacional principal permanece:

`FALCON > CONSOLE > TABULADOR`

Quando a consulta de mídia for necessária, o BigData pode ser usado em qualquer uma destas duas posições:

- `FALCON > BIGDATA > CONSOLE > TABULADOR`;
- `FALCON > CONSOLE > BIGDATA > TABULADOR`.

A solicitação fica vinculada ao número do caso e ao CPF titular até ser consumida. Finalizar o Console não a apaga. O resultado é aplicado no primeiro estágio seguinte compatível: Console, quando o BigData foi consultado antes dele; ou Tabulador, quando a consulta ocorreu depois do Console.

O BigData é uma consulta opcional e separada para mídia desabonadora e dados disponíveis do PID. No Falcon e no Console, o painel `Analisar` mostra somente as ações compatíveis com a página:

- `CNPJ`: cruza a classificação interna, a lista SPA e o cadastro público disponível. Exibe razão social, nome fantasia, abertura, situação e porte; o estado visual fica no próprio card. Também permite marcar localmente como confiável ou suspeito e excluir essa classificação.
- `Transacional no Console`: avalia total, valor, período, contatos, P2P emissor/pessoal, velocidade de 1/5/10 minutos, horários de atenção, recorrência e possível triangulação, além do agrupamento por CPF/CNPJ. Orientações e particularidades de emissor permanecem exclusivamente em `Ajuda`.
- `Análise transacional no Falcon`: em BANKING/HOLD, lê as linhas visíveis e apresenta a mesma estrutura de visão geral e agrupamento. Em CARTÃO, agrupa por estabelecimento e modo de entrada. Chip e senha é sinal favorável; duas ou mais tentativas no mesmo estabelecimento por aproximação, digitado manual ou e-commerce formam alerta. O painel não altera o caso.
- `Ajuda`: orientações cadastradas de regra e emissor aparecem em um painel próprio e dependem da configuração independente `Modo ajuda`.
- `PID`: o Console continua sendo a fonte principal. Quando o BigData for executado, nome, nome da mãe, nascimento, endereço e e-mail disponíveis podem complementar o painel; cada dado ausente ainda pode ser atualizado individualmente na página do Console.
- `Mídia desabonadora`: lê processos em `queryResult_judicialCasesHolderData`; só aceita ocorrência quando o CPF consultado coincide com a parte e ela está como réu/polo passivo. Variações de título são normalizadas por categoria. O Console recebe `sim` e as categorias automaticamente; sem ocorrência recebe `não`/`SEM MÍDIA`.
- antes de classificar processos, o CPF titular do bloco de dados pessoais do BigData deve coincidir com o CPF titular enviado pelo Falcon; CPF de quem transacionou não é usado nessa consulta.

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
- se o campo obrigatório desse lado não estiver disponível, o código não substitui pelo documento do lado oposto;
- somente um titular identificado como CPF é enviado para a busca de mídia no BigData;
- a conta do mesmo lado é usada como confirmação auxiliar.
- no fluxo CARTÃO essa regra não é usada; a ligação Falcon/Console é feita pelo número/final do cartão.

## Modo Seguro

O modo seguro é compartilhado entre Falcon, Console e Tabulador.

- Ligado: dados obrigatórios faltantes bloqueiam avanço.
- Desligado: permite seguir com alerta e permite edição manual por duplo clique nos grids.

Com o modo seguro desligado, o clique simples no grid não copia o dado. Isso evita cópia acidental durante edição manual.

## Investigação E Ajuda

Os dois modos ficam desligados por padrão e podem ser ativados separadamente.

Quando `Modo investigação` está ativo, o botão `Analisar` aparece à esquerda do Falcon, Console e Tabulador. Quando `Modo ajuda` está ativo, aparece um botão `Ajuda` separado. Os grids de `Regra` e `Emissor` exibem ícone de informação somente com ajuda ativa e quando houver orientação real cadastrada. Grids de status também podem exibir ajuda quando o valor for `bloqueio preventivo falcon 254`.

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
4. O `bookmarklet-v11.txt` continua disponível como carregador dedicado da mesma V11.

O bookmarklet dedicado e o favorito universal carregam a mesma versão V11 publicada.

## Pente fino da build 11.31

- `PID`: o painel respeita o estado minimizado do Console. Ao minimizar a janela principal, o PID e os popovers associados recolhem juntos; ao restaurar, voltam à posição lateral sem forçar largura, visibilidade ou deslocamento.
- `LISTAS`: a gravação confirma a fila inteira e reforça apenas os itens que não aparecerem no cofre local. A memória é transportada imediatamente por `window.name`, além do espelho local, para que a mesma fila esteja disponível na etapa seguinte sem depender da leitura tardia da área de transferência.
- `CONTA SIMPLES`: somente casos com o botão `JIRA` ligado entram na permissiva. Conta bloqueada ou com qualquer status SPD continua impedindo a permissiva mesmo em JIRA.
- `CNPJ`: o arquivo de apoio recebe limite curto de espera. Se estiver indisponível, a consulta automática ao serviço público segue normalmente, sem abrir outra página.
- `NOTIFICAÇÕES`: mensagens intermediárias de sucesso foram suprimidas. Permanecem alertas de erro/atenção e a confirmação final de cópia.
- `VALIDAÇÃO`: testes cobrem a restauração do PID, a regra Conta Simples/JIRA, a persistência imediata da fila entre origens e a consulta de CNPJ com falha da base de apoio.

Ao migrar de um favorito V11 antigo, substitua seu conteúdo uma vez pelo código atual de `bookmarklet-v11.txt`. O favorito fixa o próprio loader em um commit imutável; esse loader resolve o commit mais recente do repositório e carrega os oito módulos por outra referência imutável. Assim, a inicialização não depende do cache de `@main` nem recupera uma build anterior.
