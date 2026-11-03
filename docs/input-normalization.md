# Máscaras e normalização dos campos

As regras compartilhadas estão em `packages/validators/src/normalization.ts`. A API aplica essas regras nos schemas antes de gravar, inclusive nas importações CSV de usuários e inventário. Linhas inválidas do CSV são informadas no resultado e não são gravadas.

| Campo                                    | Durante a digitação                                | Valor persistido                                                                  |
| ---------------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------- |
| Telefone/celular/WhatsApp                | `+55 (11) 99999-9999` ou máscara internacional     | E.164, como `+5511999999999`                                                      |
| WhatsApp de cobrança                     | Mesma máscara, um telefone por linha               | Dígitos internacionais, como `5511999999999`, compatíveis com os links existentes |
| CPF/CNPJ                                 | Pontuação progressiva conforme o tipo de cliente   | Somente dígitos; cadastros de clientes validam o documento                        |
| E-mail                                   | Minúsculas, sem espaços                            | Minúsculas, com validação de endereço                                             |
| Endereço livre                           | CEP completo passa de `01234567` para `01234-567`  | Espaços uniformizados, acentos e escrita preservados                              |
| Website/URL                              | Sem espaços; protocolo completado ao sair do campo | URL HTTP/HTTPS, host canônico, caminho e parâmetros preservados                   |
| MAC                                      | `AA:BB:CC:DD:EE:FF`                                | Mesmo formato, com validação                                                      |
| Hostname/IP                              | Minúsculas, sem espaços                            | Valor aparado; IP validado como IPv4 ou IPv6                                      |
| Nome, cargo e outros textos de uma linha | Escrita livre, espaços ajustados ao sair           | Unicode NFC, sem espaços nas extremidades ou espaços repetidos                    |

O DDI padrão é **+55**. O DDD deve ser informado: `55999999999` é DDD 55 e resulta em `+5555999999999`. Para outro país, informar `+DDI` ou `00DDI`, por exemplo `+14155552671`. Números brasileiros completos com DDI, como `5511999999999`, também são aceitos sem duplicar o 55. Telefones incompletos ou inválidos são rejeitados ao salvar.

O endereço permanece um campo livre. Não há consulta postal, geocodificação nem separação automática de logradouro, bairro e cidade. O CEP é formatado quando identificado como sequência de oito dígitos no endereço.

`NormalizedInput` e `NormalizedTextarea` preservam a edição no meio do campo, exclusão de separadores, colagem e composição de texto. O componente `Input` usa essa base e aceita uma prop `mask` explícita. Senhas, credenciais e conteúdos livres de várias linhas não recebem transformação indiscriminada. Para inputs de credenciais do tipo texto, usar `mask={false}`.

Não há atualização em massa dos registros existentes. As regras valem para novas gravações, campos enviados em edições e novas importações. Campos omitidos em atualizações parciais permanecem omitidos; um campo opcional explicitamente apagado mantém a semântica de limpeza do respectivo cadastro.

## Verificação local

```powershell
pnpm --filter @peanut/validators build
pnpm --filter peanut-api build
pnpm test:input-normalization
pnpm --filter peanut-web build
pnpm test:input-normalization:ui
```

Os testes de API usam os controllers e serviços reais com persistência simulada. Os testes de interface usam o frontend compilado em Chromium e uma API fictícia, bloqueando solicitações externas. Evidências ficam em `data/qa/input-normalization`. Esses testes não estabelecem validação em produção nem alteram dados reais.
