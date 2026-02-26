

## Melhorias na importacao em massa de produtos

### Situacao atual
A importacao CSV basica ja existe e funciona para campos simples. Porem tem limitacoes significativas para uso profissional.

### Melhorias propostas

**1. Botao "Baixar Modelo" na pagina de Produtos**
- Adicionar um botao ao lado do "Importar CSV" que gera e baixa um CSV modelo pre-preenchido com cabecalhos corretos e 2 linhas de exemplo
- Facilita para o cliente saber exatamente o formato esperado

**2. Campos adicionais no import**
- Adicionar suporte a: `badge`, `short_description` (descricao curta), `status` (draft/published), `is_active` (sim/nao)
- Mapear mais variantes de nomes de coluna em portugues

**3. Parser CSV robusto**
- Tratar campos entre aspas (ex: descricoes com virgula)
- Usar regex ou parser adequado em vez de `split(',')`

**4. Feedback visual melhorado**
- Mostrar preview dos dados antes de confirmar a importacao (tabela com as primeiras 5 linhas)
- Indicar quantas linhas serao importadas e quais foram ignoradas (com motivo)

### Detalhes tecnicos

**Arquivo: `src/pages/admin/Products.tsx`**

1. Adicionar funcao `downloadTemplate()` que gera CSV modelo:
```
Nome,SKU,Preco,Estoque,Descricao,Descricao Curta,Badge,Status
Produto Exemplo,SKU-001,49.90,100,Descricao completa,Descricao curta,Mais Vendido,ativo
```

2. Melhorar parser CSV para suportar campos entre aspas usando regex split

3. Adicionar campos extras ao mapeamento: `badge`, `short_description`, `status`

4. Adicionar dialog de preview antes da importacao final com contagem de linhas validas/invalidas

**Mudancas na UI:**
- Novo botao "Baixar Modelo" (icone Download) ao lado dos botoes existentes
- Dialog de confirmacao mostrando preview dos dados antes de inserir

