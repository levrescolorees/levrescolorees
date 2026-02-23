

# Tornar o Preview Interativo (Clicavel/Scrollavel)

## Problema

Atualmente o preview tem `pointer-events: none` que bloqueia toda interacao -- hover, scroll, animacoes de hover nos cards, etc. O usuario quer poder interagir visualmente com o preview.

## Solucao

Remover `pointer-events: none` e `user-select: none`, e adicionar um handler `onClickCapture` no container que intercepta cliques em links e botoes para evitar navegacao acidental para fora do editor de tema.

## Mudancas

### `src/components/admin/ThemePreviewFrame.tsx`

- Remover `pointerEvents: 'none'` e `userSelect: 'none'` do wrapper
- Adicionar `onClickCapture` que chama `e.preventDefault()` para interceptar navegacao de links (`<a>`) e submissao de formularios, mas permitir efeitos visuais de hover, animacoes framer-motion, e scroll

```text
Antes:
  <div style={{ pointerEvents: 'none', userSelect: 'none' }}>

Depois:
  <div onClickCapture={(e) => { e.preventDefault(); e.stopPropagation(); }}>
```

Isso permite:
- Hover effects nos cards de produto
- Animacoes visuais (framer-motion whileHover)
- Scroll dentro do preview
- Mas BLOQUEIA navegacao real (Links do react-router)

## Arquivo modificado

```text
src/components/admin/ThemePreviewFrame.tsx (linha 156-157)
```

