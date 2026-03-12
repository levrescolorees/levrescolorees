

## Plano: 5 Melhorias de Conversao

### 1. Secao "Revendedoras que confiam na Levres" (Homepage)

**Arquivo novo:** `src/components/ResellersTestimonials.tsx`

Grade de 3 depoimentos com foto circular (placeholder avatar), nome, cidade, estrelas magenta (5/5) e frase. Fundo distinto `bg-[#FFF5F0]` (creme rose). Posicionado na Index entre TestimonialsSection e FinalCTA.

**Editar:** `src/pages/Index.tsx` — importar e adicionar como LazySection.

---

### 2. Botao Flutuante WhatsApp

**Arquivo novo:** `src/components/WhatsAppButton.tsx`

Botao fixo `fixed bottom-6 right-6 z-50` com icone WhatsApp SVG verde, tooltip "Quero ser revendedora". Link: `https://wa.me/5500000000000?text=Oi!%20Vi%20a%20Lèvres%20Colorees%20e%20quero%20saber%20como%20me%20tornar%20revendedora.`

**Editar:** `src/pages/Index.tsx`, `src/pages/Atacado.tsx`, `src/pages/ProductDetail.tsx` — adicionar o componente.

---

### 3. Calculadora de Margem (Atacado)

**Arquivo novo:** `src/components/ProfitCalculator.tsx`

Card branco com borda rosa. Slider (6-120 unidades) usando o componente Slider existente. Campo de preco de venda sugerido (input). Calculo automatico: investimento, faturamento, lucro e percentual. Botao CTA magenta "Comece a Revender". Usa `getSmartPriceFromRules` do primeiro produto para calcular preco de compra dinamico.

**Editar:** `src/pages/Atacado.tsx` — adicionar entre a secao de boxes e "Todos os Produtos".

---

### 4. Feed Visual Instagram (Homepage)

**Arquivo novo:** `src/components/InstagramFeed.tsx`

Grid 2x3 (mobile) / 6 colunas (desktop) com 6 imagens placeholder. Hover: overlay escuro com icone Instagram. Titulo "Inspire-se · @levrescolorees". Link externo para perfil.

**Editar:** `src/pages/Index.tsx` — adicionar como LazySection antes do FinalCTA.

---

### 5. Margem Correta na Pagina de Produto

**Editar:** `src/pages/ProductDetail.tsx`

No bloco "Ideal para Revendedores", calcular margem real: `margin = ((retailPrice - atacadoPrice) / atacadoPrice) * 100`. Mostrar: "Preco sugerido de venda: R$ X | Margem estimada: Y%". Usar `box12.price` como base de custo do revendedor e `retail_price` como preco sugerido de venda.

---

### Resumo de Arquivos

| Arquivo | Acao |
|---------|------|
| `src/components/ResellersTestimonials.tsx` | Criar |
| `src/components/WhatsAppButton.tsx` | Criar |
| `src/components/ProfitCalculator.tsx` | Criar |
| `src/components/InstagramFeed.tsx` | Criar |
| `src/pages/Index.tsx` | Editar — adicionar 3 novas secoes + WhatsApp |
| `src/pages/Atacado.tsx` | Editar — adicionar calculadora + WhatsApp |
| `src/pages/ProductDetail.tsx` | Editar — corrigir margem + WhatsApp |

