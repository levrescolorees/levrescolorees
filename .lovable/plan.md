
Objetivo: fazer a logo enviada no Editor de Tema aparecer imediatamente no preview (iframe) e também no storefront salvo, sem quebrar o comportamento atual de fallback para nome da marca em texto.

Diagnóstico baseado no código atual:

1) A imagem de logo é salva no draft corretamente
- `ThemeEditor.tsx` atualiza `draft.components.images.logo` via `updateImage`.
- `ThemePreviewFrame.tsx` envia o draft para o iframe via `postMessage(APPLY_THEME_DRAFT)`.

2) O preview dentro do iframe recebe o draft, mas os componentes visuais não consomem esse draft
- `ThemeProvider.tsx` aplica apenas CSS variables; os componentes não leem imagem da logo por ele.
- O `ThemeContext` expõe `theme` (salvo), não o tema ativo (`previewTheme || theme`), então mesmo usando contexto hoje a UI não receberia sempre o draft certo.

3) A logo não é renderizada no Header
- `Header.tsx` renderiza somente texto (`brandName`) e não usa `theme.components.images.logo`.
- Portanto, mesmo com upload/salvamento, não existe elemento visual para a logo aparecer.

4) O Hero também não usa imagem customizada
- `HeroBanner.tsx` usa asset estático `hero-banner.jpg` e ignora `theme.components.images.heroBanner`.
- Isso confirma que o pipeline de imagens do tema ainda não está conectado aos componentes da vitrine.

Plano de implementação:

1. Ajustar `ThemeProvider` para expor “tema ativo” no contexto
- Arquivo: `src/components/ThemeProvider.tsx`
- Alterar valor de contexto para sempre expor `theme: (previewTheme || theme)`.
- Manter `applyTheme` e `resetToSaved` como estão.
- Resultado: qualquer componente que usar `useTheme()` passa a enxergar draft em tempo real no iframe.

2. Conectar `Header` ao tema ativo e renderizar logo
- Arquivo: `src/components/Header.tsx`
- Importar `useTheme`.
- Derivar `logoUrl` de `theme.components.images.logo` (com fallback seguro).
- Substituir o bloco do brand por:
  - se `logoUrl` existir: `<img>` com `alt={brandName}`, altura responsiva e `object-contain`;
  - se não existir: manter texto atual (`brandName`).
- Aplicar o mesmo comportamento no drawer mobile para consistência.
- Preservar acessibilidade (alt, foco do link, layout estável).

3. Conectar `HeroBanner` ao tema ativo para banner customizado
- Arquivo: `src/components/HeroBanner.tsx`
- Importar `useTheme`.
- Derivar `heroBannerUrl` de `theme.components.images.heroBanner`.
- Usar `src={heroBannerUrl || heroBanner}` no `<img>` de fundo.
- Mantém fallback para asset local quando não houver imagem customizada.

4. Regras de fallback e robustez
- Prioridade de dados:
  - preview ativo: draft recebido por postMessage;
  - sem draft: tema salvo no DB;
  - sem imagem: fallback atual (texto/asset local).
- Garantir que URLs vazias (`''`) não quebrem render.
- Não alterar estrutura de banco nem contratos de upload (já existentes).

5. Validação funcional (fim a fim)
- No `/admin/theme-editor`:
  - subir logo → deve aparecer no iframe sem salvar;
  - remover logo → volta para nome em texto imediatamente;
  - subir hero banner → fundo do hero atualiza no iframe.
- Clicar “Salvar”, recarregar página da loja e confirmar persistência.
- Testar desktop + mobile no preview (logo no header e menu mobile).
- Verificar console/network para 404/CORS de imagem.

Riscos e mitigação:
- Risco de quebra visual por dimensões da logo:
  - mitigar com classe de altura fixa e `object-contain`.
- Risco de componente consumir tema antigo:
  - mitigado ao expor `previewTheme || theme` no contexto.
- Risco de URL inválida:
  - mitigado com fallback automático para texto/logo padrão.

Resultado esperado:
- Upload de logo e banner no editor reflete em tempo real no iframe.
- Após salvar, vitrine pública carrega as mesmas imagens.
- Sem imagem configurada, UI continua como hoje (texto + banner padrão).
