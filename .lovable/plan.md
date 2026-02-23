

# Corrigir Preview do Editor de Tema

## Problema

O iframe de preview esta travado em "Conectando..." porque:

1. O ambiente Lovable pode bloquear iframes do mesmo dominio (politicas de seguranca CSP/X-Frame-Options)
2. Mesmo que o iframe carregue, o SPA inteiro (incluindo admin) e carregado dentro do iframe, o que e pesado e pode causar problemas de roteamento

## Solucao

Substituir o iframe por um **preview inline em tempo real** que renderiza os componentes da loja diretamente dentro do painel admin, sem iframe. Isso elimina problemas de CSP, carregamento duplo e handshake postMessage.

### Abordagem: Preview Inline com Componentes Isolados

Em vez de carregar a loja inteira em um iframe, renderizar uma **miniatura estilizada** dos componentes da storefront (Header, HeroBanner, ProductCard, Footer) dentro de um container com dimensoes controladas e CSS vars aplicados localmente.

### Mudancas

**`src/components/admin/ThemePreviewFrame.tsx`** (reescrito)
- Remover iframe e toda logica de postMessage/handshake
- Criar container `div` com overflow auto e viewport controlado via CSS `transform: scale()`
- Aplicar CSS vars do draft diretamente no container via `style` attribute
- Renderizar componentes simplificados da loja: header mockup, hero section, cards de produto, footer
- Manter toolbar de viewport (Desktop/Tablet/Mobile) que altera a largura do container

**`src/components/admin/ThemeEditor.tsx`** (ajuste menor)
- Remover dependencia do postMessage para preview
- O draft ja e passado como prop para o ThemePreviewFrame, sem necessidade de canal

**`src/components/ThemeProvider.tsx`** (limpeza)
- Manter o codigo de postMessage para compatibilidade futura, mas nao sera usado atualmente

### Preview inline - o que sera renderizado

O preview mostrara uma versao simplificada da loja com:
- Barra superior (se ativa) com o texto configurado
- Header com logo e navegacao mockada
- Hero banner com gradiente usando as cores do tema
- Grid de 3 cards de produto com as cores/fontes/radius do tema
- Secao de CTA com botao primario
- Footer escuro

Todos os elementos usarao as cores, fontes e radius do `draft` aplicados via CSS custom properties no container, isolados do restante do admin.

### Beneficios vs iframe

- Sem problemas de CSP/X-Frame-Options
- Carregamento instantaneo (sem carregar SPA inteiro novamente)
- Preview 100% fiel as cores/fontes porque usa as mesmas CSS vars
- Sem necessidade de postMessage/handshake
- Funciona em qualquer ambiente (dev, staging, producao)

## Secao Tecnica

### Arquivo modificado

```text
src/components/admin/ThemePreviewFrame.tsx — reescrito como preview inline
```

### Logica do preview inline

```text
1. Receber draft (ThemeSettings) como prop
2. Construir objeto style com todas CSS vars: { '--primary': draft.tokens.colors.primary, ... }
3. Renderizar container div com essas vars
4. Componentes internos usam classes CSS normais (bg-primary, text-foreground, etc.)
5. Viewport controlado via width do container + transform scale para caber no painel
```

### Viewport scaling

```text
- Container tem largura fixa (1280, 768 ou 375px)
- CSS transform: scale(containerWidth / actualWidth) para caber no espaco disponivel
- transform-origin: top center
- Mantemos a proporcao correta de como ficaria em cada dispositivo
```
