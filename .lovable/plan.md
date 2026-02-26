

## Permitir logo com qualquer proporcao

### Mudancas

**1. `src/components/admin/ThemeEditor.tsx`** (linha 365)
- Remover `aspect={4}` do `ImageUploadRow` do logo, passando `undefined`

**2. `src/components/admin/theme-editor/ImageCropModal.tsx`**
- Tornar `aspect` opcional (aceitar `undefined`)
- Quando `aspect` for `undefined`, nao passar prop `aspect` ao `Cropper` — isso habilita crop livre (free-form)

Resultado: o usuario pode recortar o logo em qualquer proporcao.

