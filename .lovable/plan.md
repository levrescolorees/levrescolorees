

# Corrigir Scroll do Preview e Adicionar Edição de Imagens

## Problemas Identificados

1. **Preview sem scroll**: O `transform: scale()` aplicado no container reduz visualmente o conteúdo, mas o wrapper `overflow-auto` não reconhece a altura real porque CSS `transform` não afeta o layout flow. O container escalado fica "flutuando" dentro do espaço original.

2. **Sem edição de imagens**: Os cards de produto e o hero mostram apenas retângulos cinza (`hsl(var(--muted))`). Não há seção no editor para customizar imagens do hero banner, produtos mockados, ou logo.

---

## Correções

### 1. Fix do Scroll no Preview

**Arquivo**: `src/components/admin/ThemePreviewFrame.tsx`

- Envolver o container escalado em um `div` wrapper que define `height` e `width` explícitos baseados no tamanho real do conteúdo multiplicado pelo scale
- Usar `useEffect` + `ResizeObserver` no container interno para medir a altura real do conteúdo
- Aplicar no wrapper externo: `height: containerHeight * scale` e `width: viewport * scale`
- Isso permite ao `overflow-auto` do pai calcular corretamente a área de scroll

Lógica:
```text
containerReal = 1280px largura, ~900px altura (conteúdo do mockup)
scale = 0.65 (exemplo)
wrapperExplícito = { width: 1280 * 0.65, height: 900 * 0.65 }
O pai com overflow-auto agora sabe a altura certa e permite scroll
```

### 2. Adicionar Imagens ao Preview

**Arquivo**: `src/components/admin/ThemePreviewFrame.tsx`

- No `MockHero`: adicionar imagem de fundo usando a imagem do hero existente (`src/assets/hero-banner.jpg`) com overlay de gradiente usando as cores do tema
- Nos `MockProductCard`: usar as imagens de produto existentes (`src/assets/box-06.jpg`, `src/assets/box-12.jpg`, `src/assets/collection-lipgloss.jpg`) no lugar do retângulo cinza
- Importar as imagens como ES modules no topo do arquivo

### 3. Seção de Imagens no Editor (Nova)

**Arquivo**: `src/components/admin/ThemeEditor.tsx`

- Adicionar nova seção "Imagens" no Accordion com:
  - Upload/seleção de imagem do Hero Banner
  - Upload/seleção de logo da marca
- Por enquanto, as imagens do preview usarão as imagens existentes no projeto como placeholder
- Esta seção será marcada como "Em breve" para upload customizado (requer integração com storage)

---

## Detalhes Técnicos

### Fix do scroll (ThemePreviewFrame.tsx)

```text
1. Adicionar state: contentHeight (number)
2. Usar ResizeObserver no containerRef para capturar a altura real do conteúdo
3. Criar div intermediário (spacer) com:
   - width: viewport * scale
   - height: contentHeight * scale  
   - position: relative
4. O container escalado fica position: absolute dentro deste spacer
5. O pai overflow-auto agora tem a área correta para scroll
```

### Imagens no preview (ThemePreviewFrame.tsx)

```text
1. import heroBanner from '@/assets/hero-banner.jpg'
2. import box06 from '@/assets/box-06.jpg'
3. import box12 from '@/assets/box-12.jpg'
4. import lipgloss from '@/assets/collection-lipgloss.jpg'

MockHero:
- backgroundImage: url(heroBanner) com overlay gradiente semi-transparente
- Manter texto e botão por cima

MockProductCard:
- Substituir div cinza por <img> com as imagens importadas
- object-fit: cover no aspect-square
```

### Arquivos modificados

```text
src/components/admin/ThemePreviewFrame.tsx — fix scroll + adicionar imagens reais
```
