

## Erro ao excluir produtos — FK com order_items

### Diagnostico

A tabela `order_items` tem uma foreign key `order_items_product_id_fkey` que referencia `products` com regra **NO ACTION** (nao permite deletar). Quando voce tenta excluir um produto que ja foi comprado em algum pedido, o banco rejeita a operacao.

As outras tabelas (`product_variants`, `price_rules`, `collection_products`) ja usam **CASCADE** e funcionam normalmente.

### Correcao

**1. Migracao SQL — alterar a FK de `order_items.product_id` para SET NULL**

Isso faz sentido porque os pedidos devem ser preservados mesmo apos excluir um produto. O campo `product_name` ja armazena o nome do produto no item do pedido, entao o historico nao se perde.

```sql
ALTER TABLE order_items
  DROP CONSTRAINT order_items_product_id_fkey,
  ADD CONSTRAINT order_items_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;
```

Tambem alterar `variant_id` (mesma logica):
```sql
ALTER TABLE order_items
  DROP CONSTRAINT order_items_variant_id_fkey,
  ADD CONSTRAINT order_items_variant_id_fkey
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL;
```

**2. Nenhuma mudanca no codigo**

O codigo de exclusao em massa ja esta correto. O erro vem exclusivamente da restricao do banco.

### Resultado
Apos a migracao, ao excluir um produto que ja foi pedido, o `product_id` nos itens do pedido sera setado para `null`, mantendo o historico do pedido intacto (nome, preco, quantidade continuam salvos).

### Arquivo afetado

| Arquivo | Mudanca |
|---------|---------|
| Migracao SQL | Alterar FK de `order_items` para SET NULL |

