
# Editor de Produto Enterprise (Shopify-style)

Transformacao completa do formulario de produto atual em um editor enterprise com layout 2 colunas, autosave, workflow de publicacao, midia drag-and-drop, preview e sidebar.

---

## Etapa 1 -- Migracao no Banco de Dados

Adicionar 4 colunas na tabela `products`:

- `status` TEXT NOT NULL DEFAULT 'draft'
- `published_at` TIMESTAMPTZ (nullable)
- `seo_title` TEXT NOT NULL DEFAULT ''
- `meta_description` TEXT NOT NULL DEFAULT ''

Migrar dados existentes: produtos com `is_active = true` recebem `status = 'published'` e `published_at = now()`. Produtos inativos recebem `status = 'draft'`.

A coluna `images` (text[]) e `product_variants.images` (text[]) ja existem no schema -- nao precisam ser criadas.

---

## Etapa 2 -- Arquitetura de Componentes

Criar 11 componentes modulares e reescrever o orquestrador:

```text
src/pages/admin/ProductForm.tsx              -- orquestrador (state central, layout 2 colunas)
src/components/admin/product-editor/
  TopBar.tsx                                  -- barra sticky com breadcrumb, status, acoes
  BasicInfoCard.tsx                           -- nome, slug, SKU, badge, descricoes
  MediaCard.tsx                               -- upload, drag-drop, reorder, preview miniaturas
  PricingCard.tsx                             -- preco, estoque, rating, reviews
  VariantsCard.tsx                            -- variantes com price_override, imagens, estoque
  PriceRulesCard.tsx                          -- regras de preco + simulador lateral
  SidebarStatus.tsx                           -- status draft/published, botoes, published_at
  SidebarCollections.tsx                      -- multi-select com busca nas colecoes
  SidebarSEO.tsx                              -- SEO title, meta description, preview Google
  SidebarStock.tsx                            -- resumo estoque, alerta, revenda toggle
  ProductPreviewDrawer.tsx                    -- drawer com PDP preview completa
```

Criar hook auxiliar:

```text
src/hooks/useAutosave.ts                     -- debounce 1500ms, isDirty, indicadores
```

---

## Etapa 3 -- Layout 2 Colunas

O `ProductForm.tsx` sera reescrito com grid responsivo:

- **Coluna esquerda (~65%)**: TopBar (full-width sticky acima), BasicInfoCard, MediaCard, PricingCard, VariantsCard, PriceRulesCard
- **Sidebar direita (~35%)**: SidebarStatus, SidebarCollections, SidebarSEO, SidebarStock

Em mobile, a sidebar empilha abaixo da coluna principal.

---

## Etapa 4 -- TopBar Fixa

Componente sticky no topo com:

- Breadcrumb: "Produtos > Nome do produto" ou "Novo Produto"
- Badge de status: Rascunho (amarelo) / Publicado (verde)
- Botoes de acao:
  - **Salvar**: salva e redireciona para lista
  - **Salvar e continuar**: salva e permanece no editor
  - **Publicar** (visivel se draft): valida campos minimos, muda status
  - **Despublicar** (visivel se published): reverte para draft
  - **Preview**: abre drawer com PDP
  - **Duplicar** (visivel se editando produto existente)
- Indicador: "Salvando..." / "Salvo" / "Alteracoes nao salvas"
- Atalho Ctrl+S capturado globalmente

---

## Etapa 5 -- Autosave

Hook `useAutosave`:

- Debounce de 1500ms apos qualquer mudanca
- Rastreia `isDirty` comparando estado atual vs ultimo salvo (JSON stringify)
- So ativa apos primeiro save manual (produto tem ID)
- Cleanup ao desmontar componente
- Retorna estado: 'idle' | 'saving' | 'saved' | 'unsaved'
- `beforeunload` event para prevenir navegacao acidental quando dirty

---

## Etapa 6 -- Workflow Draft/Published

- Campo `status` no form state
- **Publicar** exige validacao:
  - `name` preenchido
  - `slug` preenchido
  - `retail_price > 0`
  - Pelo menos 1 imagem em `images`
- Ao publicar: `status='published'`, `published_at=now()`, `is_active=true`
- Ao despublicar: `status='draft'`, `is_active=false`
- Storefront continua filtrando `is_active = true` -- zero mudancas na loja

---

## Etapa 7 -- MediaCard (Fotos Shopify-like)

- Upload multiplo via `<input type="file" multiple accept="image/*">`
- Area de drag-and-drop visual
- Upload para bucket `product-images` com path `{product_id}/{timestamp}_{filename}`
- Para novos produtos (sem ID): upload com path temporario `temp/{sessionId}/...`, URLs salvas no state; apos primeiro save, as URLs ja apontam para o storage e sao persistidas
- Grid de miniaturas com:
  - Primeira imagem destacada como "principal"
  - Reordenacao via drag (usando state + botoes mover, sem lib extra para manter bundle leve)
  - Botao remover com confirmacao (AlertDialog)
- Persistir ordem no array `products.images`

---

## Etapa 8 -- ProductPreviewDrawer

- Drawer lateral (vaul) aberto pelo botao Preview
- Renderiza a PDP usando dados atuais do form (sem precisar salvar)
- Mostra: galeria de imagens, preco, variantes, tabela de precos
- Simulador de quantidade (1, 6, 12) integrado
- Funciona com produto em draft

---

## Etapa 9 -- Sidebar Direita

**SidebarStatus**:
- Card com status atual (badge colorido)
- Botoes publicar/despublicar
- Data de publicacao se published

**SidebarCollections**:
- Busca colecoes existentes via query
- Checkboxes multi-select
- Salva relacoes em `collection_products` (delete + insert ao salvar)

**SidebarSEO**:
- Campos: SEO Title, Meta Description, Slug editavel
- Preview snippet estilo Google:
  - Titulo em azul
  - URL ficticia (dominio + slug)
  - Meta description em cinza

**SidebarStock**:
- Resumo do estoque total (soma variantes se existirem, senao usa stock do produto)
- Alerta visual "estoque baixo" se < 5 unidades
- Toggle "Ideal para revenda" + campo margem sugerida

---

## Etapa 10 -- VariantsCard Evoluido

Cada variante com campos:
- Nome/label (cor, modelo)
- SKU
- Estoque
- Price override (opcional, campo numerico)
- Imagens por variante (opcional, upload simplificado)
- Botao remover com confirmacao
- Salva em `product_variants` (delete + re-insert, como ja funciona)

---

## Etapa 11 -- PriceRulesCard com Simulador

Tabela editavel:
- Colunas: Qtd Min | Preco Unitario | Label | Ativo (switch)
- Botao "Adicionar regra"

Simulador lateral (tempo real):
- Mostra calculo para qty 1, 6, 12
- Exibe preco unitario, total e economia vs varejo
- Recalcula conforme editar regras ou preco varejo

---

## Etapa 12 -- Duplicar Produto

Botao "Duplicar" na TopBar:
1. Clona dados do produto (novo ID, `status='draft'`, `is_active=false`, `published_at=null`)
2. Gera slug `{slug}-copia` (com sufixo incremental se necessario)
3. Insere produto clonado
4. Clona `product_variants` e `price_rules` com novo `product_id`
5. Clona relacoes `collection_products`
6. Redireciona para o editor do clone
7. Toast de sucesso

---

## Etapa 13 -- Qualidade Enterprise

- Validacao inline por campo (borda vermelha + mensagem)
- Toasts via `sonner` para sucesso/erro em todas as acoes
- Confirmacao AlertDialog para acoes destrutivas (remover variante, remover imagem, despublicar, duplicar)
- `beforeunload` para prevenir navegacao com alteracoes nao salvas
- Estados de loading em todos os botoes
- Labels e focus corretos para acessibilidade

---

## Etapa 14 -- Atualizar DBProduct e useProducts

- Adicionar campos `status`, `published_at`, `seo_title`, `meta_description` na interface `DBProduct`
- Carregar e mapear esses campos no form ao editar produto existente

---

## Secao Tecnica: Ordem de Execucao

1. Migracao SQL (status, published_at, seo_title, meta_description)
2. Atualizar `DBProduct` interface no `useProducts.ts`
3. Criar `useAutosave.ts` hook
4. Criar todos os 11 componentes do editor
5. Reescrever `ProductForm.tsx` como orquestrador
6. Testar fluxos: novo produto, editar, publicar, duplicar, preview

Nenhuma mudanca no storefront -- compatibilidade total via `is_active`.
