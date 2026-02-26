

## Ativar busca no header da loja (icone de lupa)

O icone de busca (lupa) ao lado do carrinho no header nao faz nada — e apenas um botao sem funcionalidade (linha 66-68 de `Header.tsx`).

### O que sera feito

Ao clicar na lupa, abre uma barra de busca inline no header. O usuario digita o nome do produto e ao pressionar Enter (ou apos um debounce), e redirecionado para `/colecoes?search=TERMO` onde os produtos sao filtrados pelo texto digitado.

### Mudancas

**1. `src/components/Header.tsx`**
- Adicionar estado `searchOpen` e `searchQuery`
- Ao clicar na lupa, trocar os icones/nav por um input de busca com foco automatico
- Ao pressionar Enter ou clicar em buscar: navegar para `/colecoes?search=TERMO` usando `useNavigate`
- Clicar no X ou pressionar Escape fecha a barra de busca
- No mobile, incluir lupa tambem (atualmente e `hidden md:block`)

**2. `src/pages/Collections.tsx`**
- Ler o parametro `search` da URL (`searchParams.get('search')`)
- Adicionar filtro por nome/descricao no `useMemo` de `filtered`: `p.name.toLowerCase().includes(searchTerm)` ou `p.short_description.toLowerCase().includes(searchTerm)`
- Mostrar o termo buscado na interface (ex: "Resultados para: batom")
- Botao para limpar a busca

