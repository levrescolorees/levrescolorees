
Objetivo: fazer o botão “Mobile” do preview realmente aplicar layout mobile (breakpoints `md`, `lg`, etc.), porque hoje ele só reduz/escala um bloco dentro da mesma janela e não altera o viewport real usado pelas media queries.

Contexto confirmado no código e no print:
- O `ThemePreviewFrame` atual simula viewport com `width: 375` + `transform: scale(...)`.
- Isso não muda `window.innerWidth` nem os breakpoints CSS do Tailwind.
- Por isso, em “Mobile” ainda aparecem comportamentos desktop (ex.: navegação do `Header` com `md:flex`).

Solução proposta (robusta): migrar o preview para `iframe` real
- Um `iframe` possui viewport próprio.
- Com largura 375, os breakpoints passam a responder como mobile de verdade.
- O próprio projeto já tem infraestrutura pronta para isso em `ThemeProvider`:
  - `theme_preview=1`
  - handshake `THEME_PREVIEW_INIT` / `THEME_PREVIEW_READY`
  - aplicação de draft via `APPLY_THEME_DRAFT`.

Escopo de implementação

1) Reestruturar `ThemePreviewFrame` para renderizar `iframe` em vez de “storefront inline”
Arquivo: `src/components/admin/ThemePreviewFrame.tsx`
- Manter toolbar de viewport (Desktop/Tablet/Mobile).
- Manter cálculo de escala e “spacer” para enquadrar o frame no painel.
- Trocar conteúdo interno por:
  - `<iframe ref=... src={previewUrl} ... />`
  - largura fixa = viewport selecionado
  - altura calculada para visualização confortável (com scroll no wrapper externo).
- Remover imports de componentes de página inline (`Header`, `HeroBanner`, `Collections`, `Atacado`, etc.), pois o iframe carrega páginas reais.
- Remover lógica de interceptação `onClickCapture`/`onSubmitCapture` no wrapper (não será mais necessária).

2) Navegação entre Home/Coleções/Atacado via URL do iframe
Arquivo: `src/components/admin/ThemePreviewFrame.tsx`
- Manter estado `previewPage` (home/collections/atacado) e mapear para path:
  - home -> `/?theme_preview=1`
  - collections -> `/colecoes?theme_preview=1`
  - atacado -> `/atacado?theme_preview=1`
- Para links “Mais Vendidos” e afins, suportar query de filtro quando vier da navegação interna do iframe.
- Fluxo de navegação:
  - Clique na toolbar ou links dentro do iframe altera apenas o iframe (não a página admin).
- Para capturar navegação interna do iframe com mais confiabilidade:
  - usar evento `load` e ler `iframe.contentWindow.location` (same-origin), sincronizando `previewPage` no estado do parent.
  - fallback: quando não conseguir ler location, manter estado atual sem quebrar preview.

3) Conectar draft do editor ao iframe via postMessage
Arquivos:
- `src/components/admin/ThemePreviewFrame.tsx`
- `src/pages/admin/AdminThemeEditor.tsx` (ajuste mínimo se necessário)
Passos:
- Gerar `channelId` único no mount do preview.
- No `load` do iframe, enviar `THEME_PREVIEW_INIT` com esse `channelId`.
- Ouvir `window.message` e aguardar `THEME_PREVIEW_READY`.
- Quando `draft` mudar:
  - enviar `APPLY_THEME_DRAFT` para `iframe.contentWindow` com o mesmo `channelId`.
- Se `draft` for `null`, enviar `RESET_THEME_TO_SAVED`.
- Isso reaproveita 100% da lógica já existente no `ThemeProvider` sem duplicar injeção de CSS vars no parent.

4) Ajuste de estabilidade para “filtro inicial” em Coleções
Arquivo: `src/pages/Collections.tsx`
- Preservar suporte de `initialFilter` já implementado.
- Garantir compatibilidade com query string real (`/colecoes?filter=...`) dentro do iframe.
- Regra final:
  - prioridade de filtro: `initialFilter` (se vier por prop) -> query param -> `'all'`.
- Como no iframe a rota é real, este componente já tende a funcionar naturalmente; só validaremos se há regressão.

5) Limpeza e compatibilidade
Arquivos:
- `src/components/admin/ThemePreviewFrame.tsx`
- `src/components/admin/ThemeEditor.tsx` (somente se precisar alinhar callback do draft)
- Remover lógica residual do preview inline que ficou obsoleta.
- Garantir que preview continue:
  - com scroll suave,
  - com escala correta para caber no painel,
  - sem navegar fora de `/admin/theme-editor`.

Sequência de execução recomendada
1. Migrar render para iframe (estrutura visual primeiro).
2. Implementar handshake/mensageria do tema draft.
3. Sincronizar navegação iframe <-> estado da toolbar.
4. Validar Coleções/Atacado/Mais Vendidos.
5. Limpar código antigo e revisar imports.

Critérios de aceite
- Ao selecionar “Mobile (375px)”, layout muda para mobile real:
  - Header mostra comportamento mobile (menu ícone),
  - espaçamentos/tipografia `md:` deixam de aplicar.
- Clicar “Coleções”, “Mais Vendidos”, “Atacado” funciona no preview.
- Alterar cores/fontes no editor atualiza o iframe em tempo real.
- Nenhuma navegação do preview derruba a tela admin.
- Desktop e Tablet continuam funcionando.

Riscos e mitigação
- Risco: sincronização de mensagens antes do iframe estar pronto.
  - Mitigação: usar handshake explícito + estado `isPreviewReady`.
- Risco: perda de altura correta do conteúdo.
  - Mitigação: manter wrapper com scroll externo e altura fixa de frame (ex.: viewport visual disponível), evitando depender de medir conteúdo interno cross-document.
- Risco: filtros de coleção divergirem entre link e estado.
  - Mitigação: centralizar filtro em query da rota dentro do iframe e simplificar estado no parent.

Impacto esperado
- Resolve definitivamente o problema “modo mobile não respeita mobile”.
- Remove hacks de simulação de viewport por transform para responsividade.
- Deixa o preview mais fiel ao storefront real, reduzindo bugs futuros de breakpoint.
