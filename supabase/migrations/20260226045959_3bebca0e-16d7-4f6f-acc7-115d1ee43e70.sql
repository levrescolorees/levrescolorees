ALTER TABLE order_items
  DROP CONSTRAINT order_items_product_id_fkey,
  ADD CONSTRAINT order_items_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;

ALTER TABLE order_items
  DROP CONSTRAINT order_items_variant_id_fkey,
  ADD CONSTRAINT order_items_variant_id_fkey
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL;