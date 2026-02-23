
# Usar Componentes Reais da Loja no Preview do Tema

## Problema

O preview atual usa componentes "mockados" (falsos) que simulam a loja mas nao correspondem ao layout e estilo real. O usuario quer ver a loja de verdade respondendo ao tema.

## Solucao

Substituir os componentes mockados pelos componentes reais da storefront (`Header`, `HeroBanner`, `BenefitsSection`, `CollectionsSection`, `SmartPricingSection`, `TestimonialsSection`, `FinalCTA`, `Footer`) renderizados dentro do container com CSS variables do draft. Como os componentes reais usam classes Tailwind que referenciam CSS custom properties (`bg-primary`, `text-foreground`, `font-display`), eles automaticamente refletem o tema do draft.

## Desafios e Solucoes

1. **Links (`react-router`)**: Os componentes usam `<Link>` que navegariam para fora do editor. Solucao: envolver tudo em um `div` com `pointer-events: none` para bloquear interacoes.

2. **`FeaturedProducts` busca dados do DB**: Se nao houver produtos, retorna `null`. Solucao: manter um fallback com cards mockados simples caso nao haja produtos no banco.

3. **`Header` usa `useCart`**: Ja disponivel no contexto do app (o admin esta dentro dos providers). Nao precisa de mudanca.

4. **`useStoreSettings`**: Os componentes leem configuracoes salvas (brand name, hero text). Isso funciona normalmente. As cores/fontes vem das CSS vars do container, que serao as do draft.

5. **Animacoes `framer-motion`**: `whileInView` pode nao disparar corretamente no container escalado. Solucao: desabilitar animacoes no preview com `initial={false}` ou `LazyMotion` com features reduzidas -- mas a abordagem mais simples e deixar as animacoes rodarem naturalmente (elas disparam ao scroll).

## Mudancas

### `src/components/admin/ThemePreviewFrame.tsx`

- Remover todos os componentes Mock (MockTopBar, MockHeader, MockHero, MockProductCard, MockCTA, MockFooter)
- Importar os componentes reais: `Header`, `HeroBanner`, `BenefitsSection`, `FeaturedProducts`, `SmartPricingSection`, `CollectionsSection`, `TestimonialsSection`, `FinalCTA`, `Footer`
- Renderizar os componentes reais dentro do container com scoped CSS vars
- Envolver em `div` com `pointer-events: none` e `user-select: none` para impedir interacao
- Manter a barra de ferramentas de viewport (Desktop/Tablet/Mobile)
- Manter o sistema de scaling e scroll com ResizeObserver

### Estrutura do preview

```text
<div style={{ ...scopedCssVars, width: viewport, transform: scale(...) }}>
  <div style={{ pointerEvents: 'none', userSelect: 'none' }}>
    <Header />
    <HeroBanner />
    <BenefitsSection />
    <FeaturedProducts />       // fallback se sem dados
    <SmartPricingSection />
    <CollectionsSection />
    <TestimonialsSection />
    <FinalCTA />
    <Footer />
  </div>
</div>
```

## Resultado

O preview mostrara a loja real com todas as secoes, imagens, layout e tipografia exatamente como o cliente final vera -- mas com as cores, fontes e radius do draft aplicados em tempo real. Qualquer alteracao no editor sera refletida instantaneamente.

## Secao Tecnica

### Arquivos modificados

```text
src/components/admin/ThemePreviewFrame.tsx — substituir mocks por componentes reais
```

### Como funciona a cascata de CSS vars

Os componentes reais usam classes Tailwind como `bg-primary` que compila para `background-color: hsl(var(--primary))`. O container pai define `--primary` via `style` attribute com o valor do draft. CSS custom properties cascateiam para filhos, entao todos os componentes herdam automaticamente as cores do draft sem nenhuma modificacao nos componentes originais.

### Dependencias dos componentes reais

```text
Header       -> useCart, useStoreSettings, Link, framer-motion
HeroBanner   -> useStoreSettings, Link, framer-motion
Benefits     -> framer-motion (sem deps externas)
Featured     -> useStorefrontProducts (DB query), ProductCard -> useCart, Link
SmartPricing -> framer-motion (sem deps externas)
Collections  -> Link, framer-motion (imports de imagens estaticas)
Testimonials -> framer-motion (sem deps externas)
FinalCTA     -> Link, framer-motion
Footer       -> useStoreSettings, Link
```

Todos os providers necessarios (CartProvider, QueryClientProvider, RouterProvider) ja existem no contexto pai do admin. Os componentes funcionarao sem modificacao.
