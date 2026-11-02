# Assinaturas de email por pessoa

Em **Meu Perfil → Assinatura de email**, usuários OWNER, ADMIN e FINANCIAL podem configurar e ativar a própria assinatura. Ela tem nome, cargo, empresa, email, telefone, WhatsApp com código do país, site HTTPS, endereço e identificação da empresa, além do símbolo público da marca.

Os campos geram HTML com texto selecionável, contatos clicáveis e uma versão em texto simples. A assinatura acompanha a paleta do email. A configuração começa desativada e sua prévia usa dados fictícios sem envio SMTP. Não é necessário enviar uma imagem da assinatura inteira. A assinatura manuscrita de documentos permanece independente.

O servidor identifica a pessoa pela sessão, sem aceitar IDs de usuário ou empresa no corpo da configuração. Os endpoints próprios são GET/PUT `/users/me/email-signature` e POST `/users/me/email-signature/preview`. As listas de usuários não expõem o novo campo.

Prévias de modelos usam a assinatura da pessoa conectada. Na conferência de uma cobrança agendada, a assinatura da pessoa que confere é gravada no snapshot, junto da marca e do modelo. Alterações posteriores no perfil não mudam esse envio. A fila não escolhe uma assinatura por conta própria. Mensagens antigas já renderizadas permanecem preservadas; snapshots anteriores ao recurso não recebem uma assinatura arbitrária no worker.

O SMTP e o remetente técnico continuam definidos pela empresa. O email da assinatura é um contato e não altera as credenciais nem o cabeçalho From/Reply-To.

A migração `20261102190000_user_email_signature` acrescenta um JSONB opcional em `users`, sem modificar registros existentes. A remoção da assinatura dos próximos envios ocorre desativando-a no perfil; mensagens já conferidas continuam com o conteúdo registrado até uma nova conferência do rascunho.
