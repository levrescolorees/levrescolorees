

## Mudar peso de quilos (kg) para gramas (g)

### Problema
O campo de peso no cadastro de produto está em quilos (kg). Produtos leves como cosméticos pesam menos de 1 kg (ex: 150g, 300g), tornando difícil inserir valores precisos com decimais.

### Solução
Mudar a UI para aceitar gramas (g) e converter para kg apenas na hora de salvar no banco e enviar para a API SuperFrete (que exige kg).

### Mudanças

**1. `src/components/admin/product-editor/ShippingDimensionsCard.tsx`**
- Alterar label de "Peso (kg)" para "Peso (g)"
- Alterar placeholder de "0.30" para "300"
- Alterar step para "1" (gramas inteiras)

**2. `src/pages/admin/ProductForm.tsx`**
- Ao carregar produto do banco: converter kg → g (`weight * 1000`) para exibir no form
- Ao salvar: converter g → kg (`weight / 1000`) antes de enviar para o Supabase
- O banco continua armazenando em kg (sem migration)

**3. `supabase/functions/calculate-shipping/index.ts`**
- Nenhuma mudança necessária. A edge function já recebe o peso em kg do banco e envia para a SuperFrete em kg. O fluxo permanece inalterado.

### Resumo do fluxo
```
Admin digita: 300 (gramas)
→ Salva no banco: 0.3 (kg)
→ Edge function envia: 0.3 (kg) para SuperFrete
→ Admin abre produto: exibe 300 (gramas)
```

