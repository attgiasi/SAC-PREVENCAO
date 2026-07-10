# Frases Prontas V4 - SAC Prevenção

Automação em bookmarklet para JIRA Prevenção e Tabulação JIRA.

Repositório de hospedagem: `attgiasi/SAC-PREVENCAO`.

## Arquivos

- `index.html`: página local de instalação.
- `preview.html`: prévia interativa fiel ao funcionamento do bookmarklet.
- `frases-data.json`: base universal e editável das frases.
- `frases-prontas.js`: código fonte do painel.
- `frases-prontas.min.js`: versão gerada com o JSON embutido.
- `frases-prontas-github.bookmarklet.txt`: bookmarklet pronto para copiar.
- `gerar-bookmarklet.cjs`: gera a versão final e o bookmarklet.

## Instalação

1. Abra `index.html`.
2. Copie o conteúdo do campo `Bookmarklet GitHub`.
3. Crie um favorito no navegador.
4. Cole o código copiado como URL do favorito.
5. Ao abrir um chamado, clique no favorito para carregar o painel.

## Funções Da V4

- Abas: `JIRA` e `TABULAÇÃO JIRA`.
- Frases do JIRA Prevenção importadas e organizadas por tópico.
- Frases de tabulação separadas na aba `TABULAÇÃO JIRA`.
- Clique no card da frase para copiar.
- Contador de uso por frase copiada, salvo no navegador.
- Frases com variáveis abrem uma janela única com todos os campos solicitados.
- Validação impede copiar com complemento pendente.
- Favoritos aparecem organizados por tópico.
- Arrastar e soltar tópicos e frases para reordenar.
- Botões de editar e excluir frases e tópicos.
- Exclusão com confirmação.
- Exportação e importação em JSON universal.
- Tema claro/escuro.
- Aumentar e diminuir fonte.
- Atalhos: `M` minimiza ou maximiza, `P` restaura, `ESC` fecha e `A` copia a assinatura e fecha.

## Sugestão Automática

A sugestão automática pode ser ligada ou desligada em `Configurações`.

Quando ligada, o painel analisa o texto visível da página, a busca digitada e termos operacionais comuns, como `SPD`, `Falcon`, `lista permissiva`, `subtask`, `saldo`, `cartão`, `cash-out`, `fila` e `documento`.

Com base nesses termos, ele pontua os tópicos e frases disponíveis e mostra a melhor sugestão no topo da aba. Ao clicar em `Abrir`, o tópico sugerido é aberto para conferência. Quando desligada, essa área não aparece.

## Variáveis E Validador

As variáveis seguem o formato:

```text
{{CONTA_ID|ID da conta}}
{{VALOR_SALDO|Valor do saldo}}
{{CHAMADO|Número do chamado}}
```

O texto antes da barra vertical é a chave interna. O texto depois da barra é o rótulo mostrado ao usuário.

Variáveis internas preenchidas automaticamente:

- `{{NOME}}`
- `{{ASSINATURA}}`
- `{{SAUDACAO}}`

O validador bloqueia a cópia se encontrar:

- variável não preenchida;
- marcador `XXX`;
- marcador entre colchetes, como `[Nome do Cliente]`.

## JSON Universal

O arquivo exportado pode ser aberto e editado em qualquer editor de texto. A estrutura principal é:

```json
{
  "schema": "jira-frases-v4",
  "settings": {},
  "data": {
    "version": 4,
    "tabs": [],
    "topics": []
  }
}
```

O campo `settings.usage` guarda a quantidade de vezes que cada frase foi copiada neste navegador.

Também é possível importar diretamente um JSON contendo apenas:

```json
{
  "version": 4,
  "tabs": [],
  "topics": []
}
```

## Atualizar Arquivos Gerados

Depois de alterar `frases-data.json` ou `frases-prontas.js`, execute:

```powershell
& "C:\Users\giasi\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" "JIRA\FRASES\V4\gerar-bookmarklet.cjs"
```

Isso atualiza `frases-prontas.min.js`, `frases-prontas-github.bookmarklet.txt` e `github-url-config.example.txt`.
