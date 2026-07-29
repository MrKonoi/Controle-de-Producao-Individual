## Objetivo

Aplicar as 5 atualizações do documento, sem mexer no fluxo principal e sem login/backend. Tudo continua salvo no próprio aparelho.

## 1. Histórico permanente (prioridade 1)

- Cada registro de produção passa a guardar também o **nome do item** e o **nome do subitem** no momento do lançamento.
- Calendário e resumo mensal passam a ler esses nomes salvos, em vez de procurar o item/subitem atual. Assim nada some do histórico.
- Registros antigos (sem nome salvo) recebem o nome atual automaticamente na primeira abertura, uma única vez.
- **Excluir vira Arquivar**: em Ajustes, o botão de lixeira arquiva o item/medida. Arquivados somem das telas de novo lançamento, mas continuam no histórico e nos relatórios. Uma seção "Arquivados" permite restaurar.

## 2. Lançamento em datas passadas (prioridade 2)

- A tela de registro de um item passa a usar a **data selecionada**, não sempre hoje.
- No Calendário, ao escolher qualquer dia, aparece um botão "Adicionar produção neste dia" que leva à escolha do item já com aquela data.
- Editar (+/−) e excluir registros continuam funcionando em qualquer data, como hoje.
- Resumos diário e mensal já consideram esses registros automaticamente.

## 3. Observação opcional (prioridade 3)

- Ao confirmar o lançamento, abre uma tela de confirmação com resumo das quantidades e um campo de texto opcional "Observação".
- A observação aparece no resumo do dia (calendário) junto ao lançamento, e pode ser editada/apagada ali.

## 4. Foto opcional (prioridade 4)

- Na mesma tela de confirmação, botão "Anexar foto" que abre câmera ou galeria no celular.
- A imagem é reduzida automaticamente (máx. ~1000px, qualidade média) antes de salvar, para não pesar no aparelho.
- Miniatura aparece no resumo do dia; ao tocar, abre em tamanho grande com opção de remover.

## 5. PWA instalável (prioridade 5)

- Manifesto do app + ícones, modo tela cheia, cor do tema.
- Service worker simples para abrir o app já instalado (cache do próprio app; os dados já são locais).
- Compatível com Android e pronto para conversão futura via Capacitor.

## Detalhes técnicos

- `src/lib/producao-store.ts`: tipo `Producao` ganha `item_nome`, `subitem_nome`, `observacao?`, `foto?` (dataURL). `Item`/`Subitem` ganham `arquivado?: boolean`. `deleteItem`/`deleteSubitem` viram `arquivarItem`/`restaurarItem` etc. Migração leve na carga do localStorage.
- Confirmação: nova rota `/item/$itemId` com etapa de confirmação (ou modal na mesma tela), recebendo a data via search param `?data=YYYY-MM-DD`.
- Compressão de imagem via canvas no cliente; nenhum upload.
- PWA: `public/manifest.webmanifest`, ícones 192/512, `<link>`/meta no `__root.tsx` e registro de service worker.
