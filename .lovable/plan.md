

## Upgrade Visual Completo — Nível Charlotte Tilbury / Sephora

Este plano transforma o site de "amador funcional" para "beauty brand premium" com mudanças cirúrgicas em 9 arquivos.

---

### 1. Paleta e Tipografia (Fundação)

**`src/index.css`** — Atualizar variáveis CSS raiz:

| Variável | Atual | Novo |
|----------|-------|------|
| `--primary` | `328 100% 45%` (magenta gritante) | `340 78% 45%` (#C2185B rose profundo) |
| `--rose-light` | `328 85% 62%` | `340 65% 60%` |
| `--rose-glow` | `328 88% 73%` | `340 70% 75%` |
| `--background` | `30 25% 97%` | `20 60% 99%` (#FFF8F5 cream quente) |
| `--foreground` | `0 0% 8%` | `0 0% 18%` (#2D2D2D charcoal) |
| `--muted` | `20 15% 93%` | `340 20% 96%` (#FFF0F5 blush) |
| `--secondary` | `20 30% 90%` | `340 15% 95%` (blush suave) |
| `--nude` | `20 30% 90%` | `5 30% 88%` |
| `--ring` | acompanha primary | `340 78% 45%` |

Adicionar variável `--rose-gold: 0 25% 58%` (#B76E79) para acentos.

Atualizar import do Google Fonts: adicionar **Cormorant Garamond** (300, 400, 500 italic).

**`src/theme/defaultTheme.ts`** — Espelhar as mesmas mudanças nos DEFAULT_COLORS.

**`tailwind.config.ts`** — Adicionar `roseGold` ao extend colors e `cormorant` ao fontFamily.

---

### 2. Logo Elegante (Header)

**`src/components/Header.tsx`** — Quando `logoUrl` está vazio (fallback de texto):

- Trocar de `font-display text-xl font-semibold` para Cormorant Garamond italic, peso 300, cor rose profundo
- Renderizar "Lèvres Colorées" (com acentos) em itálico elegante
- Adicionar um ícone de lábio minimalista SVG inline à esquerda (rose gold, 20px), estilizado com traço fino

Layout: `[lip icon] Lèvres Colorées` — serifada fina, letter-spacing 0.05em

---

### 3. BenefitsSection — Faixa Compacta

**`src/components/BenefitsSection.tsx`** — Redesign total:

- Reduzir de `py-16 md:py-20` para `py-4` (faixa de ~80px)
- Fundo: gradiente blush `from-[#FFF0F5] to-[#FCE4EC]`
- Layout: 4 colunas inline com divisores verticais finos rose gold entre elas
- Ícones: trocar de circles preenchidos para thin-line (strokeWidth 1.5), cor rose gold
- Remover subtítulos — apenas ícone + título em uma linha
- Tipografia: texto em charcoal, sem descrição longa

---

### 4. ProductCard — Cards Premium

**`src/components/ProductCard.tsx`**:

- `rounded-sm` → `rounded-2xl` (border-radius 16px)
- Fundo da imagem: `bg-[#FFF8F5]` em vez de `bg-secondary`
- Sombra: `shadow-[0_4px_20px_rgba(194,24,91,0.08)]` (warm rose shadow)
- Hover: adicionar `hover:border hover:border-[#B76E79]/30` (borda rose gold sutil)
- Badge "Ideal Revenda": cor de fundo rose gold (#B76E79) em vez de accent

---

### 5. HeroBanner — Overlay Rose Profundo

**`src/components/HeroBanner.tsx`**:

- Overlay gradiente: trocar `from-foreground/70 via-foreground/40` para `from-[#C2185B]/50 via-[#C2185B]/25 to-transparent`
- Label "Nova Coleção 2025": adicionar `tracking-[0.2em]` e cor rose gold
- H1: `font-bold` → `font-normal` (leveza elegante Playfair)

---

### 6. SmartPricingSection — Fundo Editorial

**`src/components/SmartPricingSection.tsx`**:

- Fundo da seção: `bg-[#FFF0F5]` (blush) em vez de `bg-background`
- Label "Como Funciona": tracking `0.2em`, cor rose gold
- Cards não-highlight: borda sutil `border border-[#B76E79]/10`

---

### 7. Margem no ProductDetail — Visual Verde

**`src/pages/ProductDetail.tsx`** (linhas 158-172):

- Já calcula margem real (fix anterior funcionando)
- Adicionar ícone de seta para cima (TrendingUp) verde
- Cor do texto de margem: `text-emerald-600` em vez de `text-muted-foreground`
- Formato: "Preço sugerido de revenda: R$ X · Margem estimada: Y%" com Y em verde bold

---

### 8. CollectionsSection — Fundo Unificado

**`src/components/CollectionsSection.tsx`**:

- Fundo: `bg-[#FFF8F5]` em vez de `bg-secondary/50`

---

### 9. FeaturedProducts — Fundo Alternado

**`src/components/FeaturedProducts.tsx`**:

- Fundo: manter `bg-background` (que agora é cream quente)

---

### Resumo de Arquivos

| Arquivo | Ação |
|---------|------|
| `src/index.css` | Atualizar paleta CSS + importar Cormorant Garamond |
| `src/theme/defaultTheme.ts` | Espelhar novos DEFAULT_COLORS |
| `tailwind.config.ts` | Adicionar roseGold e font cormorant |
| `src/components/Header.tsx` | Logo serifado elegante + ícone lip |
| `src/components/BenefitsSection.tsx` | Redesign: faixa compacta blush |
| `src/components/ProductCard.tsx` | Cards premium: rounded, shadow, hover |
| `src/components/HeroBanner.tsx` | Overlay rose profundo, H1 leve |
| `src/components/SmartPricingSection.tsx` | Fundo blush editorial |
| `src/pages/ProductDetail.tsx` | Margem verde com ícone TrendingUp |
| `src/components/CollectionsSection.tsx` | Fundo cream unificado |

