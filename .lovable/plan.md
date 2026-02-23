
Objetivo
Corrigir de forma definitiva o caso em que a logo enviada no Editor de Tema “às vezes” não aparece no preview do iframe, mesmo aparecendo no card de upload.

Diagnóstico (com base no código atual + screenshot)
1) O pipeline de render da logo já existe:
- `ThemeEditor` grava em `draft.components.images.logo`.
- `ThemePreviewFrame` envia draft por `postMessage`.
- `ThemeProvider` no iframe recebe draft e expõe `theme`.
- `Header` renderiza `<img src={logoUrl} ...>` quando `logoUrl` existe.

2) O ponto frágil está no handshake do iframe:
- Em `ThemePreviewFrame`, o `THEME_PREVIEW_INIT` é enviado apenas 1 vez no `onLoad`.
- Se o listener do `ThemeProvider` ainda não estiver registrado naquele exato momento, a mensagem se perde.
- Sem `THEME_PREVIEW_READY`, `isReady` não sobe, e o draft não é reenviado.
- Isso explica comportamento intermitente (“problema novamente”).

3) O screenshot é compatível com falha de sincronização:
- O card de upload mostra a imagem no painel esquerdo.
- O preview da direita continua sem refletir draft da logo.

Escopo da correção
1. Tornar handshake resiliente em `ThemePreviewFrame`
- Manter `channelId` estável.
- Implementar retry automático de `THEME_PREVIEW_INIT` até receber `THEME_PREVIEW_READY`:
  - iniciar tentativa no `onLoad`;
  - repetir em intervalo curto (ex.: 250–400ms) enquanto `isReady === false`;
  - parar imediatamente quando `isReady` ficar `true`;
  - limpar intervalo em unmount/troca de navegação.
- Isso elimina dependência de timing entre `onLoad` e `useEffect` do iframe.

2. Garantir reenvio do draft após “ready”
- Assim que `isReady` virar `true`, reenviar o último `draft` imediatamente (já existe lógica parcial; manter e reforçar para cobrir navegações internas do iframe).
- Se `draft` for `null`, enviar `RESET_THEME_TO_SAVED`.

3. Melhorar observabilidade para depuração
- Adicionar logs de debug controlados (somente em dev):
  - INIT enviado;
  - READY recebido (com `channelId`);
  - APPLY_THEME_DRAFT enviado.
- Isso facilita validar se o problema é sincronização vs. URL de imagem.

4. Hardening no `ThemeProvider` (iframe)
- Manter validação por `channelId`.
- Garantir que `THEME_PREVIEW_READY` seja respondido sempre que receber `THEME_PREVIEW_INIT`.
- Não alterar contrato de tema nem schema.

Arquivos a ajustar
- `src/components/admin/ThemePreviewFrame.tsx` (principal)
- `src/components/ThemeProvider.tsx` (apenas robustez/logs de handshake)

Plano de validação (fim a fim)
1) Fluxo principal:
- Acessar `/admin/theme-editor`.
- Subir logo no bloco “Logo da Marca”.
- Confirmar atualização do header no iframe em tempo real (sem salvar).

2) Fluxo repetido/intermitência:
- Repetir upload/troca de logo 3–5 vezes.
- Alternar viewport Desktop/Tablet/Mobile no preview.
- Confirmar que nunca “trava” sem aplicar draft.

3) Navegação no preview:
- Clicar links internos no iframe (Home/Coleções/Mais Vendidos/Novidades).
- Confirmar que após reload interno o draft continua sendo aplicado.

4) Persistência:
- Salvar tema.
- Recarregar página.
- Confirmar que logo permanece com tema salvo.

Riscos e mitigação
- Risco: intervalos sem limpeza causarem mensagens duplicadas.
  - Mitigação: cleanup rigoroso em `useEffect` e stop no primeiro READY.
- Risco: excesso de `postMessage`.
  - Mitigação: intervalo curto apenas durante bootstrap; zero retry após ready.

Resultado esperado
- O preview deixa de depender de timing aleatório.
- Upload de logo passa a refletir consistentemente no iframe em tempo real.
- Não há impacto no fluxo de salvar tema nem na estrutura do banco.
