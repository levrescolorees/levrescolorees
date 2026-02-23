

# Fix: iframe do preview bloqueado pelo Content-Security-Policy

## Problema raiz

O `index.html` define um header CSP com `frame-src https://*.mercadopago.com;` — isso significa que iframes so podem carregar URLs do Mercado Pago. O iframe do theme preview aponta para a propria origem (`window.location.origin`), que e bloqueado silenciosamente pelo navegador.

## Solucao

Adicionar `'self'` a diretiva `frame-src` no CSP do `index.html`.

## Implementacao

### Arquivo: `index.html` (linha 10)

Alterar de:
```text
frame-src https://*.mercadopago.com;
```

Para:
```text
frame-src 'self' https://*.mercadopago.com;
```

Isso permite que iframes carreguem a propria origem (necessario para o preview do tema) e mantem o suporte ao Mercado Pago.

### Nenhuma outra mudanca necessaria

A logica do `ThemePreviewFrame.tsx` (preservacao de query params, handshake postMessage, envio de drafts) ja esta correta. O unico bloqueio era o CSP impedindo o iframe de carregar.

## Risco

Nenhum — adicionar `'self'` ao `frame-src` e pratica padrao e nao abre vulnerabilidades. A pagina ja permite scripts e estilos `'self'`.
