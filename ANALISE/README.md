# SAC Prevenção

## Versão ativa

A versão ativa é a `V12`.

Arquivos carregados pelo favorito:

- `favorito-universal.bookmarklet.txt`
- `motor-sac-universal.js`
- `V12/loader-v12.js`
- motores `V12/sac-*.js`

O carregador universal aponta para a V12 por um loader imutável. Cada publicação fixa os oito motores em uma única revisão, aguarda a inicialização completa do runtime e usa provedores alternativos sem misturar versões.

## Versões mantidas

- `V10`: referência estável arquivada.
- `V11`: referência estável anterior.
- `V12`: versão ativa do favorito universal e do bookmarklet próprio.

Cada pasta possui um bookmarklet próprio, no formato `bookmarklet-vX.txt`, para testes isolados. O favorito universal e o bookmarklet da V12 carregam a mesma versão ativa.

As versões V1 a V9 foram removidas e não participam de nenhum carregamento.

Consulte `V12/README-PASSO-A-PASSO.md` para instalação, regras, memória e testes.
