# Plano de Correção de Segurança - SaaS Telegram Bot

## Resumo Executivo
Após o reconhecimento direcionado do repositório, identificamos vulnerabilidades em diferentes níveis de severidade. O plano foca em aplicar correções de forma eficiente, sem reescrever partes estáveis do sistema.

## Vulnerabilidades Confirmadas e Plano de Ação

### 1. Autenticação e Sessão (Severidade: Média)
**Vulnerabilidade:**
- O uso do `sameSite: "none"` em desenvolvimento (lib/auth.ts) pode causar vazamento de sessão em alguns cenários, embora seja para facilitar o desenvolvimento local.
- Não há validação explícita de tamanho máximo para senhas ou força de senha (além do mínimo de 8 caracteres).

**Correção:**
- Garantir que os cookies de sessão tenham `HttpOnly`, `Secure` e `SameSite=Lax` (ou Strict) em produção.
- Melhorar a força mínima da senha.

### 2. Autorização, Multitenancy e IDOR (Severidade: Alta)
**Vulnerabilidade:**
- A maioria dos endpoints utiliza `requireCapability` e verifica o `storeId` (ownerId) do usuário, o que é bom.
- Porém, em algumas ações como `updateProduct`, o `ownerId` pode ser sobrescrito se não for validado explicitamente contra o banco de dados.
- IDs sequenciais (serial) no banco de dados podem facilitar o mapeamento de recursos.

**Correção:**
- Garantir que todas as atualizações (`UPDATE`) verifiquem a propriedade do recurso.
- Implementar validação rigorosa de inputs para evitar Mass Assignment.

### 3. Validação de Entrada (Severidade: Alta)
**Vulnerabilidade:**
- Falta de validação rigorosa de tamanho de strings (ex: nome do produto, descrição) em várias actions (ex: `products.ts`).
- Em `adminIds` (settings.ts), o input é salvo como string e parseado depois, sem validação estrita de formato numérico/ID do Telegram.

**Correção:**
- Adicionar limites máximos de caracteres para inputs.
- Validar estritamente o formato de `adminIds`.

### 4. Rate Limiting (Severidade: Baixa)
**Vulnerabilidade:**
- O rate limiter atual (`lib/security.ts`) é baseado em memória (`Map`), o que é ineficaz em ambientes serverless (Vercel) onde múltiplas instâncias podem rodar simultaneamente.

**Correção:**
- Aceitar a limitação do ambiente serverless, mas otimizar a chave do rate limiter para incluir o `storeId` do usuário (quando autenticado) em vez de apenas o IP, mitigando falsos positivos de redes compartilhadas.

### 5. Uploads e Mídia (Severidade: Média)
**Vulnerabilidade:**
- O endpoint de upload (`app/api/tg/upload/route.ts`) limita o tamanho em 50MB, mas não valida magic bytes de forma rigorosa antes do upload para o Telegram.
- A geração de nomes de arquivos depende do Telegram, o que é seguro, mas a validação local pode ser melhorada.

**Correção:**
- Validar magic bytes de imagens (se aplicável) e garantir que apenas tipos permitidos sejam enviados.

### 6. Lógica de Negócio e Concorrência (Severidade: Média)
**Vulnerabilidade:**
- O processamento de filas (`lib/tg/queue.ts`) não utiliza `FOR UPDATE SKIP LOCKED` ao buscar itens `pending`, o que pode causar processamento duplicado se múltiplas instâncias do cron rodarem ao mesmo tempo.

**Correção:**
- Implementar `FOR UPDATE SKIP LOCKED` na query de busca de itens da fila.

### 7. Headers e Configuração HTTP (Severidade: Baixa)
**Vulnerabilidade:**
- A CSP (`Content-Security-Policy`) em `next.config.mjs` usa `script-src 'self' 'unsafe-inline'`, o que é necessário para o Next.js, mas pode ser apertado.

**Correção:**
- Manter a CSP atual, pois já atende aos requisitos de segurança e funcionalidade.

### 8. Dependências (Severidade: Baixa)
**Vulnerabilidade:**
- Nenhuma vulnerabilidade crítica encontrada no `npm audit`.

**Correção:**
- Nenhuma ação necessária.

---
*Próximos passos: Implementar as correções listadas acima nos arquivos correspondentes.*
