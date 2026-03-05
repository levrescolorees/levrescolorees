

## Corrigir encoding quebrado no Checkout.tsx

O arquivo `src/pages/Checkout.tsx` foi salvo com encoding incorreto (Latin-1 em vez de UTF-8), causando caracteres acentuados exibidos como "EndereÃ§o", "PrÃ³ximo", "GrÃ¡tis", etc. Este é o **único arquivo** afetado — todos os outros arquivos do projeto estão com encoding correto.

### Strings a corrigir

| Linha | Atual (quebrado) | Correto |
|-------|------------------|---------|
| 91 | `EndereÃ§o` | `Endereço` |
| 200 | `CEP nÃ£o encontrado` | `CEP não encontrado` |
| 513 | `â€" Pagamento aprovado! VocÃª receberÃ¡...` | `— Pagamento aprovado! Você receberá...` |
| 514 | `â€" Complete o pagamento abaixo.` | `— Complete o pagamento abaixo.` |
| 530 | `cÃ³digo Pix` | `código Pix` |
| 533 | `CÃ³digo copiado!` | `Código copiado!` |
| 539 | `â± Validade...â€¢` | `⏱ Validade...•` |
| 541 | `JÃ¡ paguei â€" verificar status` | `Já paguei — verificar status` |
| 550 | `BancÃ¡rio` | `Bancário` |
| 555 | `CÃ³digo copiado!` | `Código copiado!` |
| 565 | `dias Ãºteis â€¢` | `dias úteis •` |
| 577 | `cartÃ£o final` | `cartão final` |
| 612 | `esta vazio` / `Colecoes` | `está vazio` / `Coleções` |
| 692 | `PrÃ³ximo` | `Próximo` |
| 701 | `EndereÃ§o de Entrega` | `Endereço de Entrega` |
| 708 | `NÃºmero` | `Número` |
| 720 | `PrÃ³ximo` | `Próximo` |
| 802 | `CartÃ£o` / `AtÃ©` | `Cartão` / `Até` |
| 803 | `dias Ãºteis` | `dias úteis` |
| 964 | `GrÃ¡tis` | `Grátis` |

### Ação

Reescrever o arquivo `src/pages/Checkout.tsx` inteiro com encoding UTF-8 correto, corrigindo todas as ~20+ strings quebradas listadas acima. Também remover o BOM character (`﻿`) da linha 1.

