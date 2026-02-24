

## Ajuste da verificacao de contraste da cor Principal

### Problema
A badge de contraste da cor "Principal" (primary) esta comparando contra `background`, mas o uso real dessa cor e como fundo de botoes com texto `primary_foreground`. O par correto para verificacao WCAG e `primary` vs `primary_foreground`.

### Mudanca

**Arquivo: `src/components/admin/ThemeEditor.tsx`**

Na secao "Cores da Marca", o `ColorRow` da cor "Principal" atualmente usa `contrastAgainst={bg}` (onde `bg = draft.tokens.colors.background`).

Alterar para `contrastAgainst={draft.tokens.colors.primary_foreground}`.

Isso fara a badge mostrar o contraste entre a cor do botao e o texto dentro dele, que e o par realmente relevante para acessibilidade.

### Impacto
- Apenas uma linha alterada
- Nenhuma mudanca funcional no tema ou nos componentes
- A badge passara a mostrar o ratio correto (primary vs primary_foreground), que tipicamente sera um contraste alto (texto claro sobre fundo escuro/vibrante)

