

# Upgrade do Sistema de Temas — Nivel Shopify

## Resumo

Evoluir o editor de tema atual (basico, inline) para uma arquitetura profissional com modulos separados, validacao Zod, presets prontos, preview em iframe ao vivo, verificacao de contraste WCAG, historico de versoes, import/export JSON, e Edge Function segura com compare-and-swap.

---

## O que existe hoje

- `ThemeProvider.tsx` — aplica CSS vars via `style.setProperty` direto no DOM
- `ThemeEditor.tsx` — editor simples com color pickers, salva direto no Supabase client-side
- `useStoreSettings.ts` — query generica, interfaces `ThemeColors`/`ThemeSettings` basicas
- Tema salvo como JSON na tabela `store_settings` (key = `theme`)

## O que sera construido

### 1. Modulos de tema em `src/theme/`

**`src/theme/defaultTheme.ts`**
- Interfaces robustas: `ThemeColors` (23 cores com muted, accent-foreground, etc.), `ThemeTokens`, `ThemeTopBar`, `ThemeComponents`, `ThemeMeta`, `ThemeSettings` (com version e revision)
- `DEFAULT_THEME` — tema padrao completo
- 4 presets prontos: `elegant` (tons dourados), `minimal` (preto e branco), `premiumRose` (rosa quente), `dark` (modo escuro)
- Cada preset e um `ThemeSettings` completo que o admin pode aplicar com 1 clique

**`src/theme/themeSchema.ts`**
- Schema Zod para validar o tema inteiro (cores HSL, fontes permitidas, radius valido)
- Funcao `normalizeHsl()` — aceita `hsl(328, 100%, 45%)` ou `328 100% 45%` e normaliza
- Funcao `migrateTheme(raw)` — recebe tema salvo de qualquer versao e atualiza para a versao atual (deep merge com DEFAULT)
- Garante que tema corrompido nunca quebre a loja

**`src/theme/fontMap.ts`**
- Registry das 10 Google Fonts com specs completas
- `loadFont(family)` — injeta `<link>` no head se ainda nao carregada
- `getFontFamily(family)` — retorna string com fallbacks (`'Playfair Display', serif`)
- Exporta listas `DISPLAY_FONTS` e `BODY_FONTS`

**`src/theme/contrastUtils.ts`**
- `hslToHex()`, `hexToHsl()`, `hslToRgb()`
- `relativeLuminance(r, g, b)` — calculo WCAG 2.0
- `contrastRatio(color1, color2)` — retorna ratio numerico
- `checkContrast(fg, bg)` — retorna `{ ratio, levelAA, levelAAA }` com badges visuais

### 2. ThemeProvider refatorado

**`src/components/ThemeProvider.tsx`**
- Cria React Context (`ThemeContext`) com `{ theme, applyTheme, resetToSaved }`
- Aplica CSS via `<style id="lovable-theme-vars">` ao inves de inline styles (mais performatico, um unico reflow)
- `buildCssText(theme)` — gera bloco `:root { --primary: ...; --ring: ...; }` completo incluindo vars derivadas
- Deep merge: `migrateTheme(saved)` + `DEFAULT_THEME` = tema final seguro
- Modo preview via `postMessage`: detecta `?theme_preview=1` na URL, escuta mensagens `APPLY_THEME_DRAFT` e `RESET_THEME_TO_SAVED`
- Handshake com channelId para seguranca (nao aceita mensagens de origens desconhecidas)

### 3. ThemeEditor completo

**`src/components/admin/ThemeEditor.tsx`** (reescrito)
- Secoes organizadas com Accordion/Collapsible:
  - Cores da Marca (primary, light, glow) com indicador WCAG ao lado
  - Cores de Fundo (background, card, nude)
  - Cores de Texto (foreground, muted) com badge de contraste vs background
  - Complementares (accent, charcoal, border, destructive)
  - Fontes (display + body) com preview inline do texto
  - Cantos (slider + preview shapes)
  - Barra Superior (toggle + input)
- Presets: grid de cards clicaveis (elegant, minimal, premiumRose, dark) com miniatura de cores
- Import/Export: botao "Exportar JSON" e "Importar JSON" (upload de arquivo)
- Historico: lista das ultimas 5 versoes salvas (vem do campo `history` no banco)
- Botao "Restaurar Padrao" com confirmacao
- Preview em tempo real: aplica draft no DOM enquanto edita (sem salvar)
- Salvar via Edge Function `save-theme` (com revision para evitar conflitos)

### 4. Pagina AdminThemeEditor com Preview

**`src/pages/admin/AdminThemeEditor.tsx`**
- Layout 2 colunas: editor (esquerda, ~45%) + preview (direita, ~55%)
- Rota dedicada: `/admin/theme-editor`

**`src/components/admin/ThemePreviewFrame.tsx`**
- iframe apontando para `/?theme_preview=1`
- Toolbar com botoes de viewport: Desktop (1280px), Tablet (768px), Mobile (375px)
- Handshake `postMessage` com channelId (UUID unico por sessao)
- Throttle de 60ms + `requestAnimationFrame` para enviar draft ao iframe
- Indicador de status: "Conectando...", "Pronto", "Erro"

### 5. Edge Function `save-theme`

**`supabase/functions/save-theme/index.ts`**
- CORS headers padrao
- Auth: verifica JWT, valida que usuario tem role `admin`
- Recebe `{ theme, expectedRevision }`
- Compare-and-swap: le revision atual do banco, se nao bater retorna 409 Conflict
- Valida tema com Zod schema (inline, mesma logica do themeSchema)
- Incrementa revision, atualiza `meta.updatedAt` e `meta.updatedById`
- Salva historico (cap 5 entries) como array dentro do mesmo JSON
- Upsert em `store_settings` key `theme`
- Retorna `{ theme: savedTheme }` com nova revision

### 6. Integracao no Admin

- Adicionar link "Editor de Tema" no `AdminSidebar.tsx` (com icone Paintbrush)
- Adicionar rota `/admin/theme-editor` no `App.tsx`
- Manter aba "Tema" simples no `AdminSettings.tsx` como atalho (redireciona para o editor completo)

---

## Secao Tecnica

### Arquivos novos

```text
src/theme/defaultTheme.ts          — interfaces, DEFAULT_THEME, 4 presets
src/theme/themeSchema.ts           — Zod schema, normalizeHsl, migrateTheme
src/theme/fontMap.ts               — registry de fontes, loadFont, getFontFamily
src/theme/contrastUtils.ts         — HSL/Hex/RGB, luminance, contrastRatio, checkContrast
src/pages/admin/AdminThemeEditor.tsx   — pagina 2 colunas
src/components/admin/ThemePreviewFrame.tsx  — iframe + viewport toolbar + postMessage
supabase/functions/save-theme/index.ts     — edge function com auth + CAS + history
```

### Arquivos modificados

```text
src/components/ThemeProvider.tsx    — reescrito com Context, <style>, postMessage, deepMerge
src/components/admin/ThemeEditor.tsx — reescrito com presets, WCAG, import/export, history
src/hooks/useStoreSettings.ts      — remover interfaces de tema (movidas para defaultTheme.ts)
src/App.tsx                        — adicionar rota /admin/theme-editor
src/components/admin/AdminSidebar.tsx — adicionar link "Editor de Tema"
src/pages/admin/AdminSettings.tsx  — aba Tema vira link para /admin/theme-editor
supabase/config.toml               — adicionar [functions.save-theme] verify_jwt = false
```

### Estrutura de dados (store_settings key = 'theme')

```text
{
  version: 2,
  revision: 5,
  tokens: {
    colors: { primary, primary_light, primary_glow, background, card, foreground, ... (23 cores) },
    fonts: { display, body },
    radius: "0.5rem"
  },
  components: {
    topBar: { visible: true, text: "..." }
  },
  meta: {
    updatedAt: "2026-02-23T...",
    updatedById: "uuid",
    preset: "custom" | "elegant" | "minimal" | "premiumRose" | "dark"
  },
  history: [
    { savedAt, savedById, revision, theme: { tokens, components } }
  ]
}
```

### Fluxo de preview postMessage

```text
1. AdminThemeEditor renderiza ThemePreviewFrame
2. Frame cria channelId = crypto.randomUUID()
3. Iframe carrega /?theme_preview=1
4. ThemeProvider (no iframe) detecta ?theme_preview=1 e escuta messages
5. Frame envia THEME_PREVIEW_INIT { channelId }
6. ThemeProvider responde THEME_PREVIEW_READY { channelId }
7. A cada mudanca no editor, Frame envia APPLY_THEME_DRAFT { channelId, theme } (throttle 60ms)
8. ThemeProvider aplica draft via buildCssText()
9. Ao fechar preview ou salvar, Frame envia RESET_THEME_TO_SAVED { channelId }
```

### Edge Function save-theme (logica)

```text
1. Verificar CORS / OPTIONS
2. Extrair JWT do header Authorization
3. Verificar role admin via supabase.auth.getUser() + query user_roles
4. Parse body: { theme, expectedRevision }
5. Validar theme com schema Zod (inline)
6. Buscar revision atual do banco (store_settings key = 'theme')
7. Se revision != expectedRevision: retornar 409
8. Incrementar revision, setar meta.updatedAt e meta.updatedById
9. Manter history (max 5): push entry, shift se > 5
10. Upsert store_settings
11. Retornar { theme: newTheme }
```

### Calculo WCAG de contraste

```text
1. Converter ambas as cores HSL para RGB
2. Calcular luminancia relativa: L = 0.2126*R + 0.7152*G + 0.0722*B
3. Ratio = (L_lighter + 0.05) / (L_darker + 0.05)
4. AA normal text: ratio >= 4.5
5. AA large text: ratio >= 3.0
6. AAA normal text: ratio >= 7.0
```

### Ordem de execucao

1. Criar `src/theme/defaultTheme.ts` (interfaces + defaults + presets)
2. Criar `src/theme/themeSchema.ts` (Zod + migracao)
3. Criar `src/theme/fontMap.ts` (registry + loader)
4. Criar `src/theme/contrastUtils.ts` (conversoes + WCAG)
5. Reescrever `ThemeProvider.tsx` (Context + style tag + postMessage)
6. Reescrever `ThemeEditor.tsx` (presets, WCAG, import/export, historico)
7. Criar `ThemePreviewFrame.tsx` (iframe + viewport + handshake)
8. Criar `AdminThemeEditor.tsx` (pagina 2 colunas)
9. Criar Edge Function `save-theme`
10. Atualizar `App.tsx`, `AdminSidebar.tsx`, `AdminSettings.tsx`, `config.toml`
11. Atualizar `useStoreSettings.ts` (limpar interfaces duplicadas)

