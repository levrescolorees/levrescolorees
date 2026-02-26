

## Problema

A biblioteca `react-easy-crop` nao suporta crop livre (free-form). Quando `aspect` e omitido, ela usa o default `4/3`. Por isso o crop continua com proporcao fixa.

## Solucao

Quando `aspect` for `undefined` (caso do logo), pular o modal de crop e fazer upload direto do arquivo original sem recorte.

### Mudancas

**`src/components/admin/theme-editor/ImageUploadRow.tsx`** (linhas 40-43)
- Se `aspect` for `undefined`, fazer upload direto do arquivo (chamar `handleCropConfirm` com o blob do file)
- Se `aspect` tiver valor, abrir o modal de crop normalmente

