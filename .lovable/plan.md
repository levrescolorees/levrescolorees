

## Adicionar indicador de versão no rodapé

Adicionar um número de versão visível no footer para confirmar se o deploy está atualizado.

### Implementação

1. **Criar constante de versão** em `src/lib/version.ts` com `export const APP_VERSION = '1.0.0';` — atualizada manualmente a cada deploy relevante.

2. **Exibir no Footer** (`src/components/Footer.tsx`) — ao lado do copyright, adicionar o texto `v1.0.0` em cinza discreto.

### Arquivos

| Arquivo | Mudança |
|---------|---------|
| `src/lib/version.ts` | Novo — constante `APP_VERSION` |
| `src/components/Footer.tsx` | Exibir versão ao lado do copyright |

