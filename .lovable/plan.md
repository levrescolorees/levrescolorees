## Objetivo
Você terá autonomia total no editor de tema para gerenciar os slides do banner principal da home: adicionar, remover, reordenar, trocar imagem, título, subtítulo, texto do botão e link. Autoplay de 5s com setas e dots.

## O que muda

### 1. Schema do tema (`src/theme/defaultTheme.ts` + `themeSchema.ts`)
Adicionar em `components`:
```
hero: {
  slides: [
    { id, image, headline, subheadline, ctaText, ctaLink, alignment: 'left'|'center'|'right' }
  ],
  autoplay: true,
  intervalMs: 5000
}
```
Migração converte o `heroBanner` atual + `hero` do `store_settings` em 1 slide inicial, para não perder nada. `components.images.heroBanner` continua como fallback.

### 2. Nova aba "Slides do Hero" no editor (`ThemeEditor.tsx`)
Novo `AccordionItem` "Slides do Hero" com:
- Lista de slides (cards arrastáveis para reordenar via ↑/↓)
- Botão **"+ Adicionar slide"**
- Em cada slide: `ImageUploadRow` (reaproveita upload+crop existente, aspect 1920/800), inputs para headline/subheadline/CTA/link, select de alinhamento, botão duplicar, botão remover
- Switch autoplay + input de intervalo (segundos)
- Preview ao vivo no iframe já existente (o `ThemeProvider` re-aplica a cada mudança)

### 3. HeroBanner vira carrossel (`src/components/HeroBanner.tsx`)
- Se houver 2+ slides → renderiza carrossel usando `@/components/ui/carousel` (Embla, já instalado)
- Autoplay via plugin `embla-carousel-autoplay` (adicionar dep)
- Setas + dots com cores do tema
- 1 slide só → mantém render estático atual (sem controles)
- Fallback total: se nenhum slide configurado, usa o `heroBanner` legacy + textos do `hero` legacy

### 4. Upload de imagens
Já funciona: `ImageUploadRow` faz upload no bucket `theme-assets` com crop. Reaproveitado sem mudança — cada slide usa `folder="hero/slides"`.

## Não incluso (deixado para depois, se quiser)
- Editar Cards de Coleções, Feed Instagram e banners intermediários — pediu só "hero como carrossel". Se quiser depois, abrimos outro plano.

## Detalhes técnicos
- Persistência: continua em `store_settings.theme` (JSONB). Sem nova migração de DB.
- Dep nova: `embla-carousel-autoplay` (~2kb).
- IDs de slides gerados com `crypto.randomUUID()`.
- Reordenação sem lib de drag: botões ↑/↓ (leve e sem regressão).
- Compat total com temas salvos — `migrateTheme` popula `hero.slides` a partir do estado antigo na primeira leitura.
