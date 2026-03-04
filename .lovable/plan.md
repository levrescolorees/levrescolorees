

## Redesign da Tela de Integrações — Estilo Enterprise com Grid de Cards

### Conceito

Transformar a página `AdminIntegrations` de uma lista vertical de formulários em um **hub de integrações estilo enterprise** (como na referência). A página principal mostra um grid de cards com logos, nome, descrição e status (Instalado/Inativo). Ao clicar num card, o usuário navega para a página de configuração daquela integração específica.

### Estrutura

```text
/admin/integracoes          → Grid de cards (hub)
/admin/integracoes/mercado-pago  → Config do Mercado Pago (formulário atual)
/admin/integracoes/superfrete    → Config da SuperFrete (formulário atual)
```

### Arquivos

| Arquivo | Ação |
|---|---|
| `src/assets/logo-mercadopago.png` | Copiar imagem enviada pelo usuário |
| `src/assets/logo-superfrete.png` | Copiar imagem enviada pelo usuário |
| `src/pages/admin/AdminIntegrations.tsx` | Reescrever como hub com grid de cards |
| `src/pages/admin/AdminIntegrationMercadoPago.tsx` | Novo — extrair formulário do MP |
| `src/pages/admin/AdminIntegrationSuperFrete.tsx` | Novo — extrair formulário da SF |
| `src/App.tsx` | Adicionar rotas `integracoes/:slug` |

### Design dos Cards (Hub)

- Grid responsivo: 2 colunas mobile, 3-4 desktop
- Cada card: logo grande (80x80), nome, descrição curta, badge de status (verde "Instalado" / cinza "Disponível")
- Hover: elevação suave + borda primary
- Categorias: "Pagamentos", "Frete" (como seções com título)
- Cards futuros placeholder: WhatsApp, Instagram (com label "Em breve" e desabilitados)

### Páginas de Config

- Header com botão voltar (ArrowLeft) + logo + título
- Formulário idêntico ao atual, apenas extraído para componente próprio
- Mantém toda a lógica de estado, mutations e useEffect existente

### Implementacao

1. Copiar as 2 logos (Mercado Pago e SuperFrete) para `src/assets/`
2. Criar `AdminIntegrationMercadoPago.tsx` com o formulário MP extraído
3. Criar `AdminIntegrationSuperFrete.tsx` com o formulário SF extraído
4. Reescrever `AdminIntegrations.tsx` como hub grid com cards clicáveis usando `useNavigate`
5. Adicionar rotas nested em `App.tsx`

