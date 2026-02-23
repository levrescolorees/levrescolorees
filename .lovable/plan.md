

# Editor de Tema Completo — Estilo Shopify

## Objetivo

Criar um editor visual de tema no painel admin que permite editar **todas as cores, fontes e estilos visuais** da loja sem tocar em codigo. As alteracoes sao salvas no banco (`store_settings` key `theme`) e aplicadas em tempo real via CSS custom properties.

---

## Como funciona

1. O admin edita cores e fontes no painel `/admin/configuracoes` (nova aba "Tema")
2. As configuracoes sao salvas no `store_settings` com key `theme`
3. Um componente `ThemeProvider` le essas configuracoes e injeta como CSS variables no `:root`
4. Toda a loja reflete as mudancas instantaneamente sem deploy

---

## Variaveis editaveis

### Cores (com color picker visual)

| Grupo | Variavel | Label para o admin |
|-------|----------|--------------------|
| **Marca** | `--primary` | Cor principal (botoes, links, destaques) |
| **Marca** | `--rose-light` | Cor principal clara (hover, gradientes) |
| **Marca** | `--rose-glow` | Cor brilho (badges, glow) |
| **Fundo** | `--background` | Fundo geral da loja |
| **Fundo** | `--card` | Fundo de cards e paineis |
| **Texto** | `--foreground` | Cor do texto principal |
| **Texto** | `--muted-foreground` | Cor do texto secundario |
| **Complementares** | `--accent` | Cor de destaque (gold) |
| **Complementares** | `--nude` | Tom nude (fundos suaves) |
| **Complementares** | `--charcoal` | Footer / areas escuras |
| **Bordas** | `--border` | Cor de bordas e divisores |
| **Destrutivo** | `--destructive` | Cor de erro/alerta |

### Fontes

| Variavel | Label | Opcoes |
|----------|-------|--------|
| `--font-display` | Fonte dos titulos | Playfair Display, Cormorant Garamond, Lora, Merriweather, Libre Baskerville |
| `--font-body` | Fonte do corpo | Inter, Poppins, Nunito, Open Sans, Lato |

### Outros

| Variavel | Label | Tipo |
|----------|-------|------|
| `--radius` | Arredondamento dos cantos | Slider (0 a 1.5rem) |
| Top bar text | Texto da barra superior | Input de texto |
| Top bar visivel | Mostrar barra superior | Toggle on/off |

---

## Arquivos envolvidos

### Novos
- `src/components/ThemeProvider.tsx` — Le `store_settings.theme` e injeta CSS variables no document
- `src/components/admin/ThemeEditor.tsx` — Editor visual com color pickers, font selectors, sliders e preview

### Modificados
- `src/pages/admin/AdminSettings.tsx` — Adicionar aba "Tema" com o `ThemeEditor`
- `src/hooks/useStoreSettings.ts` — Adicionar interface `ThemeSettings`
- `src/App.tsx` — Envolver app com `ThemeProvider`
- `src/components/Header.tsx` — Ler top bar text/visibility do tema

---

## Secao Tecnica

### Estrutura dos dados (store_settings key = 'theme')

```text
{
  colors: {
    primary: "328 100% 45%",
    primary_light: "328 85% 62%",
    primary_glow: "328 88% 73%",
    background: "30 25% 97%",
    card: "30 20% 99%",
    foreground: "0 0% 8%",
    muted_foreground: "0 0% 40%",
    accent: "30 40% 50%",
    nude: "20 30% 90%",
    charcoal: "0 0% 15%",
    border: "20 15% 88%",
    destructive: "0 84.2% 60.2%"
  },
  fonts: {
    display: "Playfair Display",
    body: "Inter"
  },
  radius: "0.5rem",
  topBar: {
    visible: true,
    text: "FRETE GRATIS acima de R$299 ..."
  }
}
```

### ThemeProvider (logica)

```text
1. useStoreSettings() para buscar theme
2. Se theme existe, iterar colors e setar document.documentElement.style.setProperty
3. Aplicar fontes: setar --font-display e --font-body
4. Carregar Google Fonts dinamicamente se a fonte mudar
5. Se nao houver theme salvo, manter defaults do CSS (nao quebra nada)
```

### ThemeEditor (UI do admin)

```text
- Secao "Cores da Marca" com 3 color pickers (primary, light, glow)
- Secao "Cores de Fundo" com 3 color pickers (background, card, nude)
- Secao "Cores de Texto" com 2 color pickers (foreground, muted)
- Secao "Complementares" com 3 color pickers (accent, charcoal, border)
- Secao "Fontes" com 2 selects (display, body)
- Secao "Cantos" com slider para border-radius
- Secao "Barra Superior" com toggle + input de texto
- Preview em tempo real: as mudancas aplicam no documento enquanto edita
- Botao "Salvar Tema"
- Botao "Restaurar Padrao" para voltar ao tema original
```

### Color Picker

Usar input `type="color"` nativo do browser + converter hex para HSL e vice-versa. Simples, funcional, sem dependencia extra.

### Google Fonts dinamico

Quando o admin selecionar uma fonte diferente, injetar um `<link>` no head com a URL do Google Fonts correspondente. Mapa de fontes com URLs pre-definidas.

### Ordem de execucao

1. Adicionar interface `ThemeSettings` em `useStoreSettings.ts`
2. Criar `ThemeProvider.tsx` (le tema do DB e aplica CSS vars)
3. Criar `ThemeEditor.tsx` (editor visual completo)
4. Adicionar aba "Tema" em `AdminSettings.tsx`
5. Envolver App com `ThemeProvider` em `App.tsx`
6. Atualizar `Header.tsx` para ler topBar settings do tema

