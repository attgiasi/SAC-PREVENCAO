# SAC Prevenção

Repositório de automações para atendimento de Prevenção.

## Frases Prontas JIRA

A versão atual do bookmarklet de fraseologias está em:

- `JIRA/FRASES/V4/index.html`
- `JIRA/FRASES/V4/preview.html`
- `JIRA/FRASES/V4/frases-data.json`
- `JIRA/FRASES/V4/frases-prontas.js`

Bookmarklet hospedado via jsDelivr:

```text
https://cdn.jsdelivr.net/gh/attgiasi/SAC-PREVENCAO@main/JIRA/FRASES/V4/frases-prontas.min.js
```

Principais recursos:

- abas `JIRA` e `TABULAÇÃO JIRA`;
- clique no card para copiar a frase;
- primeira execução solicitando o nome e gravando a assinatura;
- sincronização automática entre abas/janelas e páginas diferentes pela ponte `sync.html`;
- contador de uso por frase copiada;
- variáveis com janela única para preenchimento;
- favoritos por tópico;
- busca, sugestão automática opcional e validador;
- edição, exclusão com confirmação e arrastar/soltar;
- exportação e importação em JSON;
- tema claro/escuro e ajuste de fonte;
- atalho `M` para minimizar ou maximizar.
