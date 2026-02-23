
# Preview com Navegacao entre Paginas

## Problema

Ao clicar nos links de navegacao (Colecoes, Atacado, etc.) no preview do tema, nada acontece porque o handler bloqueia todos os cliques em `<a>`.

## Solucao

Adicionar um estado `previewPage` ao `ThemePreviewFrame` que controla qual "pagina" esta sendo exibida no preview. Quando o usuario clica em um link de navegacao, em vez de navegar de verdade, interceptamos o clique, lemos o `href` do link e trocamos o conteudo renderizado para os componentes da pagina correspondente.

## Paginas suportadas no preview

| Link clicado | Rota | Conteudo renderizado |
|---|---|---|
| Home | `/` | HeroBanner + BenefitsSection + FeaturedProducts + SmartPricingSection + CollectionsSection + TestimonialsSection + FinalCTA |
| Colecoes / Mais Vendidos / Novidades | `/colecoes` | Pagina Collections (filtros + grid de produtos) |
| Atacado | `/atacado` | Pagina Atacado (hero atacado + beneficios + boxes + produtos) |

## Implementacao

### `src/components/admin/ThemePreviewFrame.tsx`

1. Adicionar estado `previewPage` com valor inicial `'home'`
2. No `onClickCapture`, quando detectar um `<a>`, ler o `href`:
   - Se contem `/colecoes` -> `setPreviewPage('collections')`
   - Se contem `/atacado` -> `setPreviewPage('atacado')`
   - Se e `/` (home) -> `setPreviewPage('home')`
   - Sempre chamar `e.preventDefault()` e `e.stopPropagation()`
3. Criar um componente interno `PreviewContent` que renderiza os componentes corretos baseado no `previewPage`
4. Importar os componentes das paginas Collections e Atacado (apenas o conteudo interno, sem Header/Footer duplicados)

### Componentes de conteudo por pagina

Como as paginas `Collections` e `Atacado` incluem `Header` e `Footer` internamente, vamos extrair apenas o conteudo do `<main>` dessas paginas criando versoes "inline" simplificadas diretamente no ThemePreviewFrame, ou importar as paginas completas e deixar o Header/Footer duplicar (menos ideal).

A abordagem mais limpa: importar as paginas completas mas esconder o Header/Footer duplicado via CSS, ou melhor, criar componentes de conteudo separados. Porem, para simplicidade e velocidade, vamos renderizar as paginas inteiras - o Header no topo do preview ja serve como navegacao funcional, e as paginas incluem seu proprio Header que ficara visivel no scroll.

**Abordagem escolhida**: Renderizar o conteudo completo de cada pagina (Collections, Atacado) dentro do preview. O Header e Footer ja fazem parte dessas paginas. Como o preview mostra a pagina inteira como o usuario final veria, isso e o comportamento correto.

## Secao Tecnica

### Arquivo modificado

```text
src/components/admin/ThemePreviewFrame.tsx
```

### Mudancas de codigo

- Novo state: `const [previewPage, setPreviewPage] = useState<'home' | 'collections' | 'atacado'>('home')`
- Importar `Collections` de `@/pages/Collections` e `Atacado` de `@/pages/Atacado`
- Handler `onClickCapture` atualizado para ler `href` do anchor e mudar `previewPage`
- Renderizacao condicional: se `home`, mostra os componentes atuais; se `collections`, mostra `<Collections />`; se `atacado`, mostra `<Atacado />`

### Problema potencial: react-router

As paginas `Collections` e `Atacado` usam `useSearchParams` e `Link` que dependem do Router context. Como o admin ja esta dentro do `BrowserRouter`, isso funciona. Porem, `useSearchParams` vai ler os params da URL real (`/admin/theme-editor`), nao da pagina simulada. Para Collections com filtros, os filtros internos (botoes de colecao/preco) funcionam via state local, entao nao ha problema.
