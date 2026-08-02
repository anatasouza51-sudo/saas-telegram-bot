# SaaS Telegram Bot

Este projeto é uma plataforma SaaS (Software as a Service) para gerenciamento de um bot do Telegram, permitindo a automação de vendas, gerenciamento de produtos, estoque, pedidos e clientes, com integração de pagamentos e funcionalidades administrativas.

## 🚀 Tecnologias Utilizadas

-   **Framework:** Next.js (com Server Components e Server Actions)
-   **Linguagem:** TypeScript
-   **Banco de Dados:** PostgreSQL (com Drizzle ORM)
-   **Autenticação:** Better Auth
-   **Estilização:** Tailwind CSS
-   **Gerenciamento de Pacotes:** pnpm
-   **Deploy:** Vercel

## ✨ Funcionalidades Principais

-   **Dashboard:** Visão geral e métricas do negócio.
-   **Gerenciamento de Produtos e Categorias:** Cadastro e organização de itens para venda.
-   **Controle de Estoque:** Gestão de itens disponíveis e alertas de baixo estoque.
-   **Pedidos e Clientes:** Acompanhamento de pedidos e informações detalhadas dos clientes.
-   **Integração com Telegram:**
    -   Envio de postagens e mídias para canais e grupos.
    -   Automações e agendamento de mensagens.
    -   Configuração de bot e canais CDN.
-   **Gateway de Pagamento:** Integração com VeoPag para processamento de pagamentos (PIX).
-   **Autenticação e Autorização:** Sistema de login, cadastro e controle de acesso baseado em papéis (admin, produtos, financeiro, suporte).
-   **Logs de Atividade:** Registro detalhado das ações dos usuários no painel.

## 🆕 Novas Funcionalidades Implementadas por Manus AI

Durante as últimas atualizações, as seguintes funcionalidades foram adicionadas e aprimoradas:

1.  **Atualização de Perfil do Usuário:**
    *   **Troca de Nome:** Agora é possível alterar o nome de usuário diretamente nas configurações de perfil.
    *   **Foto de Perfil:** Implementada a funcionalidade de upload e exibição de foto de perfil. A imagem é convertida para Base64 no frontend e armazenada diretamente no banco de dados (`PostgreSQL`), com um limite de 1MB para garantir performance e evitar sobrecarga do DB. A foto é exibida no painel de controle e no menu superior.

2.  **Redesign da Tela de Cadastro:**
    *   A tela de cadastro (`/sign-up`) foi remodelada para ter a mesma identidade visual e fundo estrelado da tela de login (`/sign-in`), proporcionando uma experiência de usuário mais consistente e profissional.

## 🔒 Segurança

O projeto foi desenvolvido com foco em segurança, incorporando as seguintes práticas:

-   **Better Auth:** Utiliza hashing de senhas (scrypt), gerenciamento seguro de sessões e proteção contra CSRF/XSS.
-   **Rate Limiting:** Proteção contra ataques de força bruta em rotas de autenticação.
-   **Validação de Inputs:** Sanitização e validação de dados no frontend e backend.
-   **Armazenamento Seguro:** Credenciais e dados sensíveis são tratados com criptografia e boas práticas de segurança.

## ⚙️ Como Rodar Localmente

Para configurar e rodar o projeto em seu ambiente de desenvolvimento:

### 1. Clonar o Repositório

```bash
git clone https://github.com/anatasouza51-sudo/saas-telegram-bot.git
cd saas-telegram-bot
```

### 2. Instalar Dependências

Utilize `pnpm` para instalar as dependências do projeto:

```bash
pnpm install
```

### 3. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto, baseado no `.env.example`, e preencha com suas credenciais e configurações:

```dotenv
# Exemplo de .env
DATABASE_URL="postgresql://user:password@host:port/database"
BETTER_AUTH_SECRET="sua_chave_secreta_para_autenticacao"
TELEGRAM_BOT_TOKEN="seu_token_do_bot_telegram"
# Outras variáveis necessárias...
```

### 4. Rodar Migrações do Banco de Dados

Certifique-se de que seu banco de dados PostgreSQL esteja configurado e execute as migrações:

```bash
pnpm drizzle-kit push:pg
```

### 5. Iniciar o Servidor de Desenvolvimento

```bash
pnpm dev
```

O aplicativo estará disponível em `http://localhost:3000`.

## 📂 Estrutura do Projeto

-   `app/`: Páginas e rotas da aplicação (Next.js).
-   `components/`: Componentes React reutilizáveis.
-   `lib/`: Funções utilitárias, configurações de autenticação, banco de dados e lógica de negócio.
-   `public/`: Arquivos estáticos como imagens e fontes.
-   `app/api/`: Rotas de API para comunicação com o backend.

## 🤝 Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues e pull requests.

## 📄 Licença

[Adicione sua licença aqui, se aplicável]
