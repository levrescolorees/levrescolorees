

## Correcao: Logo nao aparece no preview do iframe

### Problema identificado

Apos analise detalhada do codigo, identifiquei duas causas provaveis:

1. **Draft inicial nunca e enviado ao iframe**: O `ThemeEditor` inicializa seu `draft` interno com `DEFAULT_THEME` mas so chama `onDraftChange` quando o usuario interage (ex.: upload). Porem o `AdminThemeEditor` inicia com `draft = null`. Quando o usuario faz upload da logo, `onDraftChange` e chamado com o tema completo (incluindo a logo), e o draft e enviado ao iframe. Isso DEVERIA funcionar.

2. **Causa mais provavel - O `ThemeEditor` chama `applyTheme` do contexto pai, o que pode causar efeitos colaterais**: `updateDraft` chama `applyTheme(next)` que e o `contextApply` do ThemeProvider pai. Isso seta `previewTheme` no provider pai, mas nao afeta o iframe. O iframe depende exclusivamente do `postMessage`.

3. **Possivel problema de referencia no efeito do ThemePreviewFrame**: Se `draft` muda de `null` para um objeto e depois muda internamente (por exemplo, ao mudar uma cor E depois subir a logo), cada chamada cria um novo objeto. Mas se `handleIframeLoad` dispara entre essas mudancas (navegacao interna do iframe), `isReady` reseta e o efeito nao reenvia o draft ate `isReady` voltar a `true`.

### Solucao proposta

**Arquivo 1: `src/components/admin/ThemePreviewFrame.tsx`**

Adicionar logica para reenviar o draft imediatamente apos o handshake completar (isReady = true), usando o `draftRef` que ja existe:

- Quando `isReady` muda para `true`, verificar `draftRef.current` e enviar imediatamente
- Isso garante que mesmo que o iframe recarregue internamente, o draft mais recente (com a logo) sera reenviado

**Arquivo 2: `src/components/admin/ThemeEditor.tsx`**  

Enviar draft inicial ao pai quando o componente carrega:

- No `useEffect` que inicializa o draft a partir do DB (ou usa DEFAULT_THEME), chamar `onDraftChange` para que o pai e o preview frame recebam o estado inicial
- Isso garante que o iframe sempre receba o draft completo, nao apenas quando o usuario interage

**Arquivo 3: `src/components/ThemeProvider.tsx`**

Adicionar log de debug para confirmar recebimento do draft com imagens no iframe.

### Detalhes tecnicos

```text
Fluxo corrigido:

ThemeEditor (carrega) 
  -> setDraft(DEFAULT_THEME) 
  -> onDraftChange(DEFAULT_THEME)      <-- NOVO: envia draft inicial
  -> AdminThemeEditor.draft = theme
  -> ThemePreviewFrame recebe draft

Usuario sobe logo:
  -> updateImage('logo', url)
  -> updateDraft(themeComLogo) 
  -> onDraftChange(themeComLogo)
  -> ThemePreviewFrame envia via postMessage
  -> ThemeProvider (iframe) recebe e seta previewTheme
  -> Header le logo do contexto e renderiza <img>

Iframe recarrega internamente:
  -> handleIframeLoad -> isReady = false -> retry INIT
  -> isReady = true
  -> efeito de reenvio usa draftRef.current   <-- REFORCO
  -> draft com logo e reenviado
```

### Mudancas especificas

1. **ThemePreviewFrame.tsx**: Adicionar `useEffect` que reenvia `draftRef.current` quando `isReady` muda para `true` (similar ao que foi removido na ultima edicao, mas agora usando o ref para evitar stale closures)

2. **ThemeEditor.tsx**: No `useEffect` de inicializacao, chamar `onDraftChange?.(draft)` apos setar o draft, para sincronizar o estado inicial com o pai

3. **ThemeProvider.tsx**: Log condicional ao receber `APPLY_THEME_DRAFT` mostrando se `components.images.logo` tem valor

### Validacao

- Subir logo no editor -> deve aparecer no preview imediatamente
- Trocar viewport (Desktop/Tablet/Mobile) -> logo deve persistir
- Salvar tema -> recarregar pagina -> logo deve aparecer na loja publica
