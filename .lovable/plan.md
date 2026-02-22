

# Atualizar Tema com Cores do Logo Levres Colorees

## O que muda

O logo da marca usa um **rosa magenta vibrante** (`#E5007D`, aproximadamente `HSL 328 100% 45%`), bem diferente do rosa queimado/escuro atual (`HSL 350 30% 42%`).

A proposta e atualizar todas as variaveis de cor do tema para refletir essa identidade visual vibrante, mantendo a harmonia com os tons complementares (nude, cream, gold).

## Cores extraidas do logo

| Cor | Hex | HSL |
|-----|-----|-----|
| Rosa principal (magenta) | #E5007D | 328 100% 45% |
| Rosa claro (hover/glow) | #F24DA0 | 328 85% 62% |
| Rosa glow (destaques) | #F77DBB | 328 88% 73% |

## Variaveis que serao atualizadas

**Arquivo:** `src/index.css`

### Modo claro (:root)
- `--primary`: 350 30% 42% → **328 100% 45%** (rosa magenta do logo)
- `--ring`: 350 30% 42% → **328 100% 45%**
- `--rose`: 350 30% 42% → **328 100% 45%**
- `--rose-light`: 350 35% 65% → **328 85% 62%**
- `--rose-glow`: 350 40% 75% → **328 88% 73%**

### Modo escuro (.dark)
- `--primary`: 350 35% 55% → **328 90% 55%**
- `--ring`: 350 35% 55% → **328 90% 55%**

## Tambem sera adicionado

- Copiar os dois logos (PDF) para `src/assets/` para uso futuro no Header ou em outros lugares.

## O que NAO muda

- Tons de nude, cream, gold, charcoal (complementam bem o magenta)
- Fontes (Playfair Display + Inter)
- Todas as classes utilitarias (gradient-rose, shadow-rose, etc.) continuam funcionando pois usam as variaveis CSS

## Secao Tecnica

### Arquivo modificado
- `src/index.css` — atualizar 7 variaveis CSS (5 no modo claro, 2 no modo escuro)

### Arquivos copiados
- `user-uploads://LEVRES_COLOREES_logo_1.pdf` → `src/assets/logo-bg.pdf`
- `user-uploads://LEVRES_COLOREES_logo_2.pdf` → `src/assets/logo-text.pdf`

